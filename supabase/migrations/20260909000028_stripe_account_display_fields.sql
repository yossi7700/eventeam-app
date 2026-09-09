-- Gap-audit item: old system's StripeConnectDetail captured display
-- metadata about a connected Stripe account (business_name, business_email,
-- stripe_account_type, external bank account name/last4) so companies/
-- admins could see which bank account and business profile were actually
-- connected. stripe-connect-onboarding here already calls
-- stripe.accounts.retrieve() (which returns all of this in the response)
-- but only ever persisted 4 fields, discarding the rest.

alter table public.stripe_accounts
  add column business_name text,
  add column business_email text,
  add column account_type text,
  add column bank_name text,
  add column bank_account_last4 text;
