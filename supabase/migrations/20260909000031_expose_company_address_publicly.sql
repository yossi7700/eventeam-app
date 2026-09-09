-- Gap-audit item: old system's UserController::saveAddress stored a
-- structured address (address/city/state/zip_code/country) OR a
-- googlemaplink on the company/user, and HomeController::getBookingEventDetail
-- returned both (formatUSAddress(...) + googlemaplink) on the public event
-- detail page, gated by the event's is_show_address flag (already ported
-- here as EventAdvanceSettings.is_show_address).
--
-- companies already carries the structured address fields
-- (address_line1/2, city, region, postal_code, country) from the initial
-- schema, but:
--   1. googlemaplink has no equivalent column anywhere.
--   2. Neither the address fields nor a maps link were ever exposed on
--      public_company_profile -- the public event page has never been
--      able to render an address at all, regardless of is_show_address.
--
-- google_maps_url lives on companies (not company_settings) since it's
-- part of the same physical-location data as the existing address_line1/2
-- etc., not a branding/design setting.

alter table public.companies
  add column if not exists google_maps_url text;

comment on column public.companies.google_maps_url is
  'Optional Google Maps link shown alongside (or instead of) the structured address on the public event page, matching the old system''s UserAdress.googlemaplink field.';

create or replace view public.public_company_profile
with (security_invoker = true) as
select
  c.id as company_id,
  c.slug,
  c.name,
  c.logo_path,
  cs.primary_color,
  cs.secondary_color,
  cs.font_family,
  cs.custom_css,
  cs.facebook_url,
  cs.instagram_url,
  cs.website_url,
  cs.hero_image_path,
  cs.about_text,
  cs.twitter_url,
  cs.youtube_url,
  cs.step_1_title,
  cs.step_2_title,
  cs.step_3_title,
  cs.step_4_title,
  cs.step_5_title,
  cs.regulation_text,
  cs.donation_field_text,
  cs.cod_text,
  c.address_line1,
  c.address_line2,
  c.city,
  c.region,
  c.postal_code,
  c.country,
  c.google_maps_url
from public.companies c
left join public.company_settings cs on cs.company_id = c.id
where c.status = 'active';

grant select on public.public_company_profile to anon, authenticated;
