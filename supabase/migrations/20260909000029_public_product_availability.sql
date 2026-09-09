-- Gap-audit item: old system's HomeController::getBookingEventDetail
-- computed remaining_seats per sub-event (capacity - taken seats) and
-- returned it to the public booking page, so a guest could see "3 seats
-- left" before submitting. No equivalent existed here -- the booking form
-- showed a bare quantity input with no upper-bound feedback until the
-- server-side capacity check in register_guest_for_event rejected an
-- over-limit submission.
--
-- Capacity lives on products (ticket types) here, not sub_events (a
-- finer-grained, more accurate model than the old system's sub-event-level
-- capacity) -- computed per product rather than per sub-event.
--
-- A dedicated view (not just adding a column to public_products_view)
-- because remaining count requires aggregating guest_line_items, a table
-- with zero public access by design (guest PII) -- security-definer view
-- semantics keep that aggregation queryable without ever exposing the
-- underlying rows.

create view public.public_product_availability_view
with (security_invoker = false) as
select
  p.id as product_id,
  p.capacity,
  case
    when p.capacity is null then null
    else greatest(p.capacity - coalesce(sum(gli.quantity), 0), 0)
  end as remaining
from public.products p
join public.public_sub_events_view pse on pse.id = p.sub_event_id
left join public.guest_line_items gli on gli.product_id = p.id
where p.is_active
group by p.id, p.capacity;

grant select on public.public_product_availability_view to anon, authenticated;
