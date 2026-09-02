-- Companies need to browse admin-authored master template events in order
-- to pick one to publish (publish-template-event). The existing "events:
-- select" policy only allows admin or the owning company to see a row, and
-- template events have company_id = null, so no company could ever see
-- them -- publish-template-event worked around this by reading templates
-- via the service role, but the dashboard UI also needs a real RLS-backed
-- way to list templates for the "choose a template to publish" picker.

-- Note: "to authenticated" matters here -- without it these policies would
-- also apply to anon (RLS policies apply to all roles by default; role
-- differentiation elsewhere in this schema happens inside the USING
-- expression via is_admin()/my_company_id() returning false/null for anon).
-- Templates are internal admin content with no public-booking purpose, so
-- anon must never see is_master_template rows regardless of status.

drop policy "events: select" on public.events;
create policy "events: select for authenticated" on public.events
  for select to authenticated using (
    company_id = public.my_company_id()
    or public.is_admin()
    or is_master_template
    or (
      not is_master_template
      and status in ('active', 'ended')
      and exists (
        select 1 from public.companies c
        where c.id = events.company_id and c.status = 'active'
      )
    )
  );
create policy "events: select for anon" on public.events
  for select to anon using (
    not is_master_template
    and status in ('active', 'ended')
    and exists (
      select 1 from public.companies c
      where c.id = events.company_id and c.status = 'active'
    )
  );

-- sub_events/products of a template also need to be visible so the picker
-- can show what a template actually contains before publishing.
drop policy "sub_events: select" on public.sub_events;
create policy "sub_events: select for authenticated" on public.sub_events
  for select to authenticated using (
    exists (
      select 1 from public.events e
      where e.id = sub_events.event_id
        and (
          e.company_id = public.my_company_id()
          or public.is_admin()
          or e.is_master_template
          or (
            not e.is_master_template
            and e.status in ('active', 'ended')
            and exists (select 1 from public.companies c where c.id = e.company_id and c.status = 'active')
          )
        )
    )
  );
create policy "sub_events: select for anon" on public.sub_events
  for select to anon using (
    exists (
      select 1 from public.events e
      where e.id = sub_events.event_id
        and not e.is_master_template
        and e.status in ('active', 'ended')
        and exists (select 1 from public.companies c where c.id = e.company_id and c.status = 'active')
    )
  );

drop policy "products: select" on public.products;
create policy "products: select for authenticated" on public.products
  for select to authenticated using (
    exists (
      select 1 from public.sub_events se join public.events e on e.id = se.event_id
      where se.id = products.sub_event_id
        and (
          e.company_id = public.my_company_id()
          or public.is_admin()
          or e.is_master_template
          or (
            is_active
            and not e.is_master_template
            and e.status in ('active', 'ended')
            and exists (select 1 from public.companies c where c.id = e.company_id and c.status = 'active')
          )
        )
    )
  );
create policy "products: select for anon" on public.products
  for select to anon using (
    is_active
    and exists (
      select 1 from public.sub_events se join public.events e on e.id = se.event_id
      where se.id = products.sub_event_id
        and not e.is_master_template
        and e.status in ('active', 'ended')
        and exists (select 1 from public.companies c where c.id = e.company_id and c.status = 'active')
    )
  );
