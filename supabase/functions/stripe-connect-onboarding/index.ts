import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createServiceClient, createUserClient, errorResponse, jsonResponse } from "../_shared/supabase.ts";
import { getStripeClient, getStripeConnectClientId } from "../_shared/stripe.ts";

// GET  ?action=authorize-url   -> returns the Stripe Connect OAuth URL to redirect the company to
// POST { code }                -> exchanges the OAuth code for a connected account id

Deno.serve(async (req: Request) => {
  const supabase = createUserClient(req);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return errorResponse("authentication required", 401);
  }

  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (!company) {
    return errorResponse("no company found for this account", 404);
  }

  if (req.method === "GET") {
    const url = new URL(req.url);
    if (url.searchParams.get("action") !== "authorize-url") {
      return errorResponse("unsupported action", 400);
    }

    let clientId: string;
    try {
      clientId = getStripeConnectClientId();
    } catch (err) {
      return errorResponse((err as Error).message, 503);
    }

    const redirectUri = Deno.env.get("STRIPE_CONNECT_REDIRECT_URI");
    if (!redirectUri) {
      return errorResponse(
        "STRIPE_CONNECT_REDIRECT_URI is not configured. Set it with `supabase secrets set STRIPE_CONNECT_REDIRECT_URI=https://.../settings/payment`.",
        503
      );
    }

    const authorizeUrl = new URL("https://connect.stripe.com/oauth/authorize");
    authorizeUrl.searchParams.set("response_type", "code");
    authorizeUrl.searchParams.set("client_id", clientId);
    authorizeUrl.searchParams.set("scope", "read_write");
    authorizeUrl.searchParams.set("redirect_uri", redirectUri);
    authorizeUrl.searchParams.set("state", company.id);

    return jsonResponse({ url: authorizeUrl.toString() });
  }

  if (req.method === "POST") {
    let body: { code?: string };
    try {
      body = await req.json();
    } catch {
      return errorResponse("invalid JSON body", 400);
    }

    if (!body.code) {
      return errorResponse("code is required", 422);
    }

    let stripe;
    try {
      stripe = getStripeClient();
    } catch (err) {
      return errorResponse((err as Error).message, 503);
    }

    try {
      const response = await stripe.oauth.token({
        grant_type: "authorization_code",
        code: body.code,
      });

      const account = await stripe.accounts.retrieve(response.stripe_user_id!);

      // stripe_accounts has no client-facing insert/update RLS policy by
      // design (writes are Edge-Function-only) -- use the service role for
      // this write, having already verified `company` belongs to the
      // caller via the user-scoped client above.
      const serviceClient = createServiceClient();
      await serviceClient.from("stripe_accounts").upsert({
        company_id: company.id,
        stripe_account_id: response.stripe_user_id,
        status: account.charges_enabled ? "active" : "onboarding",
        charges_enabled: account.charges_enabled ?? false,
        payouts_enabled: account.payouts_enabled ?? false,
        details_submitted: account.details_submitted ?? false,
        connected_at: new Date().toISOString(),
      });

      return jsonResponse({ connected: true, stripe_account_id: response.stripe_user_id });
    } catch (err) {
      return errorResponse(`Stripe Connect onboarding failed: ${(err as Error).message}`, 502);
    }
  }

  return errorResponse("method not allowed", 405);
});
