-- Performance fix: companies/company_settings/events/sub_events/products/
-- donation_fields each ended up with two separate permissive `select`
-- policies (the original "owner or admin" policy plus the new "public can
-- view active" policy from the previous migration). Postgres evaluates
-- every permissive policy for a table and ORs the results together, so
-- having two policies for the same role/action means double the policy
-- evaluation work on every single read -- including the highest-traffic
-- public booking pages. Consolidating each pair into one policy avoids
-- that duplicate evaluation without changing which rows are visible to
-- whom.

drop policy "companies: owner or admin select" on public.companies;
drop policy "companies: public can view active companies" on public.companies;
create policy "companies: select" on public.companies
  for select using (
    profile_id = (select auth.uid())
    or public.is_admin()
    or status = 'active'
  );

drop policy "company_settings: owner or admin select" on public.company_settings;
drop policy "company_settings: public can view active company settings" on public.company_settings;
create policy "company_settings: select" on public.company_settings
  for select using (
    company_id = public.my_company_id()
    or public.is_admin()
    or exists (
      select 1 from public.companies c
      where c.id = company_settings.company_id and c.status = 'active'
    )
  );

drop policy "events: company or admin select" on public.events;
drop policy "events: public can view active/ended events of active companies" on public.events;
create policy "events: select" on public.events
  for select using (
    company_id = public.my_company_id()
    or public.is_admin()
    or (
      not is_master_template
      and status in ('active', 'ended')
      and exists (
        select 1 from public.companies c
        where c.id = events.company_id and c.status = 'active'
      )
    )
  );

drop policy "sub_events: via event ownership" on public.sub_events;
drop policy "sub_events: public can view sub_events of publicly visible events" on public.sub_events;
create policy "sub_events: select" on public.sub_events
  for select using (
    exists (
      select 1 from public.events e
      where e.id = sub_events.event_id
        and (
          e.company_id = public.my_company_id()
          or public.is_admin()
          or (
            not e.is_master_template
            and e.status in ('active', 'ended')
            and exists (select 1 from public.companies c where c.id = e.company_id and c.status = 'active')
          )
        )
    )
  );
-- sub_events still needs separate insert/update/delete policies since the
-- old combined "for all" policy is being replaced by a select-only one here.
create policy "sub_events: insert" on public.sub_events
  for insert with check (
    exists (select 1 from public.events e where e.id = sub_events.event_id
      and (e.company_id = public.my_company_id() or public.is_admin()))
  );
create policy "sub_events: update" on public.sub_events
  for update using (
    exists (select 1 from public.events e where e.id = sub_events.event_id
      and (e.company_id = public.my_company_id() or public.is_admin()))
  ) with check (
    exists (select 1 from public.events e where e.id = sub_events.event_id
      and (e.company_id = public.my_company_id() or public.is_admin()))
  );
create policy "sub_events: delete" on public.sub_events
  for delete using (
    exists (select 1 from public.events e where e.id = sub_events.event_id
      and (e.company_id = public.my_company_id() or public.is_admin()))
  );

drop policy "products: via sub_event->event ownership" on public.products;
drop policy "products: public can view products of publicly visible sub_events" on public.products;
create policy "products: select" on public.products
  for select using (
    exists (
      select 1 from public.sub_events se join public.events e on e.id = se.event_id
      where se.id = products.sub_event_id
        and (
          e.company_id = public.my_company_id()
          or public.is_admin()
          or (
            is_active
            and not e.is_master_template
            and e.status in ('active', 'ended')
            and exists (select 1 from public.companies c where c.id = e.company_id and c.status = 'active')
          )
        )
    )
  );
create policy "products: insert" on public.products
  for insert with check (
    exists (
      select 1 from public.sub_events se join public.events e on e.id = se.event_id
      where se.id = products.sub_event_id and (e.company_id = public.my_company_id() or public.is_admin())
    )
  );
create policy "products: update" on public.products
  for update using (
    exists (
      select 1 from public.sub_events se join public.events e on e.id = se.event_id
      where se.id = products.sub_event_id and (e.company_id = public.my_company_id() or public.is_admin())
    )
  ) with check (
    exists (
      select 1 from public.sub_events se join public.events e on e.id = se.event_id
      where se.id = products.sub_event_id and (e.company_id = public.my_company_id() or public.is_admin())
    )
  );
create policy "products: delete" on public.products
  for delete using (
    exists (
      select 1 from public.sub_events se join public.events e on e.id = se.event_id
      where se.id = products.sub_event_id and (e.company_id = public.my_company_id() or public.is_admin())
    )
  );

drop policy "donation_fields: via event ownership" on public.donation_fields;
drop policy "donation_fields: public can view donation_fields of publicly visible events" on public.donation_fields;
create policy "donation_fields: select" on public.donation_fields
  for select using (
    exists (
      select 1 from public.events e
      where e.id = donation_fields.event_id
        and (
          e.company_id = public.my_company_id()
          or public.is_admin()
          or (
            is_active
            and not e.is_master_template
            and e.status in ('active', 'ended')
            and exists (select 1 from public.companies c where c.id = e.company_id and c.status = 'active')
          )
        )
    )
  );
create policy "donation_fields: insert" on public.donation_fields
  for insert with check (
    exists (select 1 from public.events e where e.id = donation_fields.event_id
      and (e.company_id = public.my_company_id() or public.is_admin()))
  );
create policy "donation_fields: update" on public.donation_fields
  for update using (
    exists (select 1 from public.events e where e.id = donation_fields.event_id
      and (e.company_id = public.my_company_id() or public.is_admin()))
  ) with check (
    exists (select 1 from public.events e where e.id = donation_fields.event_id
      and (e.company_id = public.my_company_id() or public.is_admin()))
  );
create policy "donation_fields: delete" on public.donation_fields
  for delete using (
    exists (select 1 from public.events e where e.id = donation_fields.event_id
      and (e.company_id = public.my_company_id() or public.is_admin()))
  );
