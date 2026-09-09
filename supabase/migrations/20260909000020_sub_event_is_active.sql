-- Gap-audit item: old system's SubEvent had its own independent status
-- toggle (0/1), separate from the parent event's status -- a company
-- could publish an event but hide one specific sub-event (e.g. a "VIP
-- dinner" not yet ready to open registration) while keeping others
-- visible. sub_events here had no equivalent column at all (products
-- already had is_active; sub_events was the one child table missing it).

alter table public.sub_events
  add column is_active boolean not null default true;

-- public_sub_events_view must filter on it the same way
-- public_products_view already filters products.is_active.
create or replace view public.public_sub_events_view
with (security_invoker = true) as
select se.id, se.event_id, se.title, se.description, se.location,
       se.start_at, se.end_at, se.capacity, se.is_sunset_relative,
       se.sunset_offset_minutes, se.sort_order
from public.sub_events se
join public.public_events_view pe on pe.id = se.event_id
where se.is_active;

grant select on public.public_sub_events_view to anon, authenticated;
