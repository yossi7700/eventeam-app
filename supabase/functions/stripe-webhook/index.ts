import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createServiceClient, errorResponse, invokeEmailFunction, jsonResponse } from "../_shared/supabase.ts";
import { getStripeClient, getStripeWebhookSecret } from "../_shared/stripe.ts";
import type Stripe from "npm:stripe@22";

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return errorResponse("method not allowed", 405);
  }

  const signature = req.headers.get("Stripe-Signature");
  if (!signature) {
    return errorResponse("missing Stripe-Signature header", 400);
  }

  const payload = await req.text();

  let event: Stripe.Event;
  try {
    const stripe = getStripeClient();
    event = await stripe.webhooks.constructEventAsync(
      payload,
      signature,
      getStripeWebhookSecret()
    );
  } catch (err) {
    // Covers both "Stripe not configured yet" (getStripeClient /
    // getStripeWebhookSecret throwing) and genuine signature-verification
    // failures -- either way this is a client-facing 4xx, not a server crash.
    return errorResponse(`webhook rejected: ${(err as Error).message}`, 400);
  }

  const supabase = createServiceClient();

  switch (event.type) {
    case "payment_intent.succeeded": {
      const pi = event.data.object as Stripe.PaymentIntent;
      const registrationId = pi.metadata?.registration_id;

      await supabase
        .from("guest_payments")
        .update({
          status: "succeeded",
          stripe_charge_id: typeof pi.latest_charge === "string" ? pi.latest_charge : null,
        })
        .eq("stripe_payment_intent_id", pi.id);

      if (registrationId) {
        const { data: registration } = await supabase
          .from("registrations")
          .update({ status: "confirmed" })
          .eq("id", registrationId)
          .select("primary_guest_name, primary_guest_email, total_amount, currency, event_id")
          .single();

        if (registration) {
          const { data: registrationEvent } = await supabase
            .from("events")
            .select("company_id, title")
            .eq("id", registration.event_id)
            .single();

          await invokeEmailFunction(
            "registration_confirmation",
            registration.primary_guest_email,
            registrationEvent?.company_id ?? null,
            {
              guest_name: registration.primary_guest_name,
              event_title: registrationEvent?.title ?? "",
              total_amount: String(registration.total_amount),
              currency: registration.currency,
            }
          );
        }
      }
      break;
    }

    case "payment_intent.payment_failed": {
      const pi = event.data.object as Stripe.PaymentIntent;
      await supabase
        .from("guest_payments")
        .update({
          status: "failed",
          failure_reason: pi.last_payment_error?.message ?? "payment failed",
        })
        .eq("stripe_payment_intent_id", pi.id);
      break;
    }

    case "charge.refunded": {
      const charge = event.data.object as Stripe.Charge;
      await supabase
        .from("guest_payments")
        .update({ status: "cancelled" })
        .eq("stripe_charge_id", charge.id);
      break;
    }

    case "account.updated": {
      const account = event.data.object as Stripe.Account;
      await supabase
        .from("stripe_accounts")
        .update({
          charges_enabled: account.charges_enabled ?? false,
          payouts_enabled: account.payouts_enabled ?? false,
          details_submitted: account.details_submitted ?? false,
          status: account.charges_enabled ? "active" : "restricted",
          raw_last_webhook_event: event as unknown as Record<string, unknown>,
        })
        .eq("stripe_account_id", account.id);
      break;
    }

    default:
      // Unhandled event types are acknowledged (200) so Stripe doesn't
      // retry them indefinitely, but no state change happens.
      break;
  }

  return jsonResponse({ received: true });
});
