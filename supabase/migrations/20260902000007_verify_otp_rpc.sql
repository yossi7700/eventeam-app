-- Verifies a submitted OTP code against the stored hash, enforcing expiry
-- and a max-attempt lockout, and marks it consumed atomically with the
-- check. This function ONLY validates the code -- it does not perform the
-- gated mutation itself (commission %, Stripe key rotation, password/email
-- change are each different enough in shape, especially the auth.users
-- changes which need the Auth Admin API, not raw SQL) -- the Edge Function
-- calls this first, and only proceeds to the actual mutation if it
-- returns true, using the same code_hash comparison so there's no gap
-- between "verified" and "acted on".

create or replace function public.verify_and_consume_otp(
  p_purpose public.otp_purpose,
  p_code text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_id uuid := auth.uid();
  v_record record;
  v_code_hash text;
begin
  if v_profile_id is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;

  select id, code_hash, expires_at, consumed_at, attempt_count
  into v_record
  from public.otp_verifications
  where profile_id = v_profile_id and purpose = p_purpose
  order by created_at desc
  limit 1
  for update;

  if v_record.id is null then
    raise exception 'no verification code has been requested for this action' using errcode = 'P0002';
  end if;

  if v_record.consumed_at is not null then
    raise exception 'this code has already been used' using errcode = 'P0001';
  end if;

  if v_record.expires_at < now() then
    raise exception 'this code has expired, request a new one' using errcode = 'P0001';
  end if;

  if v_record.attempt_count >= 5 then
    raise exception 'too many incorrect attempts, request a new code' using errcode = 'P0001';
  end if;

  -- digest() lives in the "extensions" schema on Supabase (pgcrypto is
  -- installed there, not public) -- schema-qualified explicitly rather
  -- than relying on search_path, since this function's `set search_path =
  -- public` intentionally does NOT include extensions (found via a live
  -- authenticated-role test call failing with "function digest does not
  -- exist" even though it worked when applied as the postgres superuser,
  -- whose default search_path happens to include extensions).
  v_code_hash := encode(extensions.digest(p_code, 'sha256'), 'hex');

  if v_code_hash <> v_record.code_hash then
    update public.otp_verifications
    set attempt_count = attempt_count + 1
    where id = v_record.id;
    return false;
  end if;

  update public.otp_verifications
  set consumed_at = now()
  where id = v_record.id;

  return true;
end;
$$;

revoke execute on function public.verify_and_consume_otp(public.otp_purpose, text) from public, anon;
grant execute on function public.verify_and_consume_otp(public.otp_purpose, text) to authenticated;
