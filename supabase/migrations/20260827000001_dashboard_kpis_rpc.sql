-- Role-scoped dashboard KPI aggregation in a single round trip. Admin sees
-- platform-wide numbers; company sees only their own. Mirrors the old
-- system's KPI set (total/active events, companies, guests, registrations,
-- cash cleared/pending, total earnings, commission) but computed as one
-- query per metric inside a single function call instead of many
-- client-triggered round trips.

create or replace function public.get_dashboard_kpis()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_admin boolean := public.is_admin();
  v_company_id uuid := public.my_company_id();
  v_result jsonb;
begin
  if not v_is_admin and v_company_id is null then
    raise exception 'no company or admin context for this account' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'total_events', (
      select count(*) from public.events e
      where not e.is_master_template
        and (v_is_admin or e.company_id = v_company_id)
    ),
    'active_events', (
      select count(*) from public.events e
      where not e.is_master_template and e.status = 'active'
        and (v_is_admin or e.company_id = v_company_id)
    ),
    'total_companies', (
      case when v_is_admin then (select count(*) from public.companies) else null end
    ),
    'pending_companies', (
      case when v_is_admin then (select count(*) from public.companies where status = 'pending') else null end
    ),
    'total_guests', (
      select coalesce(count(*), 0) from public.guests g
      join public.registrations r on r.id = g.registration_id
      join public.events e on e.id = r.event_id
      where (v_is_admin or e.company_id = v_company_id)
    ),
    'total_registrations', (
      select coalesce(count(*), 0) from public.registrations r
      join public.events e on e.id = r.event_id
      where (v_is_admin or e.company_id = v_company_id)
    ),
    'total_earnings', (
      select coalesce(sum(r.total_amount), 0) from public.registrations r
      join public.events e on e.id = r.event_id
      where r.status = 'confirmed'
        and (v_is_admin or e.company_id = v_company_id)
    ),
    'total_commission', (
      select coalesce(sum(r.commission_amount), 0) from public.registrations r
      join public.events e on e.id = r.event_id
      where r.status = 'confirmed'
        and (v_is_admin or e.company_id = v_company_id)
    ),
    'cash_cleared', (
      select coalesce(sum(gp.amount), 0) from public.guest_payments gp
      join public.registrations r on r.id = gp.registration_id
      join public.events e on e.id = r.event_id
      where gp.method = 'cash' and gp.status = 'cleared_manually'
        and (v_is_admin or e.company_id = v_company_id)
    ),
    'cash_pending', (
      select coalesce(sum(gp.amount), 0) from public.guest_payments gp
      join public.registrations r on r.id = gp.registration_id
      join public.events e on e.id = r.event_id
      where gp.method = 'cash' and gp.status = 'pending'
        and (v_is_admin or e.company_id = v_company_id)
    )
  ) into v_result;

  return v_result;
end;
$$;

revoke execute on function public.get_dashboard_kpis() from public, anon;
grant execute on function public.get_dashboard_kpis() to authenticated;
