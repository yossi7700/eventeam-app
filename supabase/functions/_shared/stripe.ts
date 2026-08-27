import Stripe from "npm:stripe@22";

// STRIPE_SECRET_KEY must be set via `supabase secrets set STRIPE_SECRET_KEY=sk_test_...`
// before this function can actually create PaymentIntents. Until then, any
// card-payment registration will fail with a clear "not configured" error
// rather than a confusing downstream Stripe SDK crash.
export function getStripeClient(): Stripe {
  const key = Deno.env.get("STRIPE_SECRET_KEY");
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY is not configured. Set it with `supabase secrets set STRIPE_SECRET_KEY=sk_test_...`."
    );
  }
  return new Stripe(key, { apiVersion: "2026-07-29.dahlia" });
}

export function getStripeWebhookSecret(): string {
  const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!secret) {
    throw new Error(
      "STRIPE_WEBHOOK_SECRET is not configured. Set it with `supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...`."
    );
  }
  return secret;
}

export function getStripeConnectClientId(): string {
  const id = Deno.env.get("STRIPE_CONNECT_CLIENT_ID");
  if (!id) {
    throw new Error(
      "STRIPE_CONNECT_CLIENT_ID is not configured. Set it with `supabase secrets set STRIPE_CONNECT_CLIENT_ID=ca_...`."
    );
  }
  return id;
}
