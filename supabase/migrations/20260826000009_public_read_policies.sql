-- Fix: the public_*_view views use security_invoker=true, which means they
-- do NOT bypass RLS on their underlying tables -- they only filter on top
-- of whatever RLS already allows. Since anon had no `select` policy at all
-- on events/companies/sub_events/products/donation_fields, anonymous
-- callers got zero rows back from every public_*_view even when active
-- events genuinely existed. This is the public booking flow's read path,
-- so it's a blocking bug for Phase 3.
--
-- Fix: add explicit, narrowly-scoped `select` policies that let anon read
-- exactly the same set of rows the public_*_view WHERE clauses already
-- restrict to (active company, active/ended non-template event). The view
-- layer still does the column-level narrowing; these policies only grant
-- row-level visibility.

create policy "companies: public can view active companies" on public.companies
  for select using (status = 'active');

create policy "company_settings: public can view active company settings" on public.company_settings
  for select using (
    exists (
      select 1 from public.companies c
      where c.id = company_settings.company_id and c.status = 'active'
    )
  );

create policy "events: public can view active/ended events of active companies" on public.events
  for select using (
    not is_master_template
    and status in ('active', 'ended')
    and exists (
      select 1 from public.companies c
      where c.id = events.company_id and c.status = 'active'
    )
  );

create policy "sub_events: public can view sub_events of publicly visible events" on public.sub_events
  for select using (
    exists (
      select 1 from public.events e
      join public.companies c on c.id = e.company_id
      where e.id = sub_events.event_id
        and not e.is_master_template
        and e.status in ('active', 'ended')
        and c.status = 'active'
    )
  );

create policy "products: public can view products of publicly visible sub_events" on public.products
  for select using (
    is_active
    and exists (
      select 1 from public.sub_events se
      join public.events e on e.id = se.event_id
      join public.companies c on c.id = e.company_id
      where se.id = products.sub_event_id
        and not e.is_master_template
        and e.status in ('active', 'ended')
        and c.status = 'active'
    )
  );

create policy "donation_fields: public can view donation_fields of publicly visible events" on public.donation_fields
  for select using (
    is_active
    and exists (
      select 1 from public.events e
      join public.companies c on c.id = e.company_id
      where e.id = donation_fields.event_id
        and not e.is_master_template
        and e.status in ('active', 'ended')
        and c.status = 'active'
    )
  );
