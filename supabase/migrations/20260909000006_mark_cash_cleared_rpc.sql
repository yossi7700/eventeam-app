-- Gap-audit follow-up: the dashboard KPIs already surfaced cash_cleared /
-- cash_pending totals (guest_payments.cleared_by/cleared_at columns have
-- existed since 20260826000001), but there was no write path anywhere to
-- actually mark a cash payment cleared -- old system's
-- EventRegistrationController::isClear (toggle, cash-only) had no
-- equivalent here at all.
--
-- Old isClear() scoped the lookup by `Registration::where(['id'=>$id])`
-- with NO user_id/company ownership check, meaning any authenticated
-- company could flip another company's cash payment by guessing an id --
-- a real bug in the old system. This RPC intentionally does NOT reproduce
-- that: it requires the caller to own the event (via company_id) or be
-- admin, mirroring the ownership check already used everywhere else here.
--
-- Toggle semantics matched from the old system: pending <-> cleared_manually,
-- cash method only (card payments are rejected, same as isClear()).

create or replace function public.toggle_cash_payment_cleared(p_payment_id uuid)
returns public.guest_payments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment public.guest_payments;
  v_company_id uuid;
begin
  select gp.* into v_payment from public.guest_payments gp where gp.id = p_payment_id;

  if v_payment.id is null then
    raise exception 'payment not found' using errcode = 'P0002';
  end if;

  if v_payment.method <> 'cash' then
    raise exception 'cannot change payment status of card payments' using errcode = 'P0001';
  end if;

  select e.company_id into v_company_id
  from public.registrations r
  join public.events e on e.id = r.event_id
  where r.id = v_payment.registration_id;

  if v_company_id is null or (v_company_id <> public.my_company_id() and not public.is_admin()) then
    raise exception 'not authorized for this payment' using errcode = '42501';
  end if;

  update public.guest_payments set
    status = case when status = 'cleared_manually' then 'pending'::payment_status else 'cleared_manually'::payment_status end,
    cleared_by = case when status = 'cleared_manually' then null else auth.uid() end,
    cleared_at = case when status = 'cleared_manually' then null else now() end
  where id = p_payment_id
  returning * into v_payment;

  return v_payment;
end;
$$;

revoke execute on function public.toggle_cash_payment_cleared(uuid) from public, anon;
grant execute on function public.toggle_cash_payment_cleared(uuid) to authenticated;
