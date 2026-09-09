-- Gap-audit item: old system's dashboard() endpoint returned three
-- widgets beyond the raw KPI numbers -- upcoming_events (next 5, ordered
-- by start_date), recent_registrants (last 5, each with a price
-- breakdown), and chart_data (per-event guest/earnings totals for a
-- graph). None of these had any equivalent here; the new dashboard only
-- ever showed the KPI tiles. Adding upcoming_events and recent_registrants
-- now (reuse existing data shapes, no new dependency); chart_data is left
-- for a follow-up since it implies picking and adding a charting library,
-- a separate decision from a straight gap-audit port.

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
  v_upcoming_events jsonb;
  v_recent_registrants jsonb;
begin
  if not v_is_admin and v_company_id is null then
    raise exception 'no company or admin context for this account' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(row_to_json(u)), '[]'::jsonb) into v_upcoming_events
  from (
    select e.id, e.title, e.slug, e.start_date, e.end_date, e.company_id
    from public.events e
    where not e.is_master_template
      and e.status = 'active'
      and e.start_date >= now()
      and (v_is_admin or e.company_id = v_company_id)
    order by e.start_date asc
    limit 5
  ) u;

  select coalesce(jsonb_agg(row_to_json(r)), '[]'::jsonb) into v_recent_registrants
  from (
    select
      reg.id,
      reg.primary_guest_name,
      reg.primary_guest_email,
      reg.status,
      reg.created_at,
      e.title as event_title,
      c.name as company_name,
      jsonb_build_object(
        'total_amount', reg.total_amount,
        'guest_amount', reg.subtotal,
        'donation', reg.donation_total,
        'commission', reg.commission_amount,
        'plateform_fee', reg.platform_fee_amount
      ) as price_breakdown
    from public.registrations reg
    join public.events e on e.id = reg.event_id
    join public.companies c on c.id = e.company_id
    where (v_is_admin or e.company_id = v_company_id)
    order by reg.created_at desc
    limit 5
  ) r;

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
    'active_companies', (
      case when v_is_admin then (select count(*) from public.companies where status = 'active') else null end
    ),
    'inactive_companies', (
      case when v_is_admin then (select count(*) from public.companies where status <> 'active') else null end
    ),
    'stripe_connected', (
      case when v_is_admin then (
        select count(*) from public.stripe_accounts where status = 'active'
      ) else null end
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
    ),
    'upcoming_events', v_upcoming_events,
    'recent_registrants', v_recent_registrants
  ) into v_result;

  return v_result;
end;
$$;
