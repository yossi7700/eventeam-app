-- Gap-audit item: products.color (old system's Product.color, a required
-- field used to visually distinguish ticket types) was added to the
-- products table in 20260909000001 and threaded through create/update
-- RPCs, but never added to public_products_view -- so a company could set
-- a ticket color and the public booking page could never read it back.
-- Same class of bug as the earlier public_company_profile
-- twitter_url/youtube_url miss. CREATE OR REPLACE VIEW can only append
-- columns, not reorder, hence appending at the end.

create or replace view public.public_products_view
with (security_invoker = true) as
select p.id, p.sub_event_id, p.name, p.description, p.price, p.currency,
       p.capacity, p.sort_order, p.color
from public.products p
join public.public_sub_events_view pse on pse.id = p.sub_event_id
where p.is_active;

grant select on public.public_products_view to anon, authenticated;
