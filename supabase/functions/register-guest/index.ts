import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createServiceClient, errorResponse, invokeEmailFunction, jsonResponse } from "../_shared/supabase.ts";
import { getStripeClient } from "../_shared/stripe.ts";

type LineItemInput = {
  sub_event_id: string;
  product_id: string;
  quantity?: number;
};

type GuestInput = {
  full_name: string;
  email?: string;
  phone?: string;
  line_items: LineItemInput[];
};

type DonationInput = {
  donation_field_id?: string;
  amount: number;
};

type RegisterGuestInput = {
  event_id: string;
  primary_guest_name: string;
  primary_guest_email: string;
  primary_guest_phone?: string;
  payment_method: "card" | "cash";
  guests: GuestInput[];
  donations?: DonationInput[];
};

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return errorResponse("method not allowed", 405);
  }

  let body: RegisterGuestInput;
  try {
    body = await req.json();
  } catch {
    return errorResponse("invalid JSON body", 400);
  }

  if (
    !body.event_id ||
    !body.primary_guest_name ||
    !body.primary_guest_email ||
    !body.payment_method ||
    !body.guests?.length
  ) {
    return errorResponse(
      "event_id, primary_guest_name, primary_guest_email, payment_method, and at least one guest are required",
      422
    );
  }

  // Uses the service role because public booking is unauthenticated (no
  // user JWT to scope RLS to) -- all validation/authorization happens
  // inside register_guest_for_event itself (re-checks the event is
  // genuinely publicly bookable, locks capacity, computes pricing
  // server-side), not by trusting this being "the service role" alone.
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .rpc("register_guest_for_event", {
      p_event_id: body.event_id,
      p_primary_guest_name: body.primary_guest_name,
      p_primary_guest_email: body.primary_guest_email,
      p_primary_guest_phone: body.primary_guest_phone ?? null,
      p_payment_method: body.payment_method,
      p_guests: body.guests,
      p_donations: body.donations ?? [],
    })
    .single();

  if (error) {
    const status = error.code === "P0002" ? 404 : error.code === "P0001" ? 409 : 400;
    return errorResponse(error.message, status);
  }

  const { registration_id, total_amount, currency } = data as {
    registration_id: string;
    total_amount: number;
    currency: string;
  };

  if (body.payment_method === "cash") {
    // Cash needs no Stripe confirmation step, so the registration is
    // final immediately -- fire the confirmation email now rather than
    // waiting on a webhook that will never come for this payment method.
    const { data: cashEvent } = await supabase
      .from("events")
      .select("company_id, title")
      .eq("id", body.event_id)
      .single();

    await invokeEmailFunction(
      "registration_confirmation",
      body.primary_guest_email,
      cashEvent?.company_id ?? null,
      {
        guest_name: body.primary_guest_name,
        event_title: cashEvent?.title ?? "",
        total_amount: String(total_amount),
        currency,
      }
    );

    return jsonResponse({ registration_id, total_amount, currency, requires_payment: false });
  }

  // Card payment: create a Stripe PaymentIntent and return its client_secret
  // so the frontend can confirm it with Stripe Elements (modern SCA/3DS-
  // capable flow -- never a server-side raw-card-token confirm).
  let clientSecret: string | null = null;
  try {
    const stripe = getStripeClient();

    const { data: event } = await supabase
      .from("events")
      .select("company_id")
      .eq("id", body.event_id)
      .single();

    if (!event?.company_id) {
      throw new Error("Could not resolve the company for this event.");
    }

    const { data: stripeAccount } = await supabase
      .from("stripe_accounts")
      .select("stripe_account_id, charges_enabled")
      .eq("company_id", event.company_id)
      .maybeSingle();

    if (!stripeAccount?.stripe_account_id || !stripeAccount.charges_enabled) {
      throw new Error("This company has not completed Stripe Connect onboarding yet.");
    }

    const { data: registration } = await supabase
      .from("registrations")
      .select("commission_amount")
      .eq("id", registration_id)
      .single();

    const applicationFeeAmount = Math.round(
      Number(registration?.commission_amount ?? 0) * 100
    );

    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount: Math.round(total_amount * 100),
        currency: currency.toLowerCase(),
        application_fee_amount: applicationFeeAmount,
        transfer_data: { destination: stripeAccount.stripe_account_id },
        metadata: { registration_id },
      },
      { idempotencyKey: `register-guest-${registration_id}` }
    );

    await supabase
      .from("guest_payments")
      .update({ stripe_payment_intent_id: paymentIntent.id, status: "requires_action" })
      .eq("registration_id", registration_id);

    clientSecret = paymentIntent.client_secret;
  } catch (stripeError) {
    return errorResponse(
      `Registration was recorded but payment could not be initialized: ${
        (stripeError as Error).message
      }`,
      502
    );
  }

  return jsonResponse({
    registration_id,
    total_amount,
    currency,
    requires_payment: true,
    client_secret: clientSecret,
  });
});
