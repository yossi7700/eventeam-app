-- Security hardening pass (based on Supabase security advisor findings after
-- the initial schema/RLS/cron migrations).

-- Fix search_path on set_updated_at (was missing, flagged as mutable-search-path risk).
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Explicit no-access policy on otp_verifications so intent is unambiguous
-- (RLS was enabled with no policy at all, which the linter correctly flags
-- as ambiguous even though the practical effect — zero access — was right).
create policy "otp_verifications: no client access" on public.otp_verifications
  for all using (false) with check (false);

-- Trigger functions and internal helpers should never be callable directly
-- via PostgREST RPC (/rest/v1/rpc/<fn>). Revoke from PUBLIC (the default
-- grantee for new functions) as well as anon/authenticated explicitly.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.prevent_company_self_approval() from public, anon, authenticated;
revoke execute on function public.prevent_company_self_commission_change() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;

-- flip_ended_events is an internal pg_cron target only, never a client RPC.
revoke execute on function public.flip_ended_events() from public, anon, authenticated;

-- is_admin() / my_company_id() are intentionally callable by authenticated
-- users (used client-side and inside RLS policies) since they only ever
-- return a value derived from the caller's own auth.uid() -- no data leak,
-- no privilege elevation. anon has no session so no legitimate use.
revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.my_company_id() from public, anon;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.my_company_id() to authenticated;

-- Note: pg_net remaining in the public schema is a Supabase-managed
-- extension limitation (it does not support ALTER EXTENSION ... SET SCHEMA)
-- and is left as-is; not something under our control to relocate.
