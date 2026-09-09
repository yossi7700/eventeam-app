-- Bug fix caught by re-verifying my own earlier work: twitter_url,
-- youtube_url, and step_1_title..step_5_title were added to
-- company_settings in 20260909000002, but public_company_profile (the
-- view the public booking page actually reads from) was never updated to
-- expose them -- a company could set these fields in Settings, but the
-- public page could never read them back. Same bug would have applied to
-- the new regulation_text/donation_field_text/cod_text fields
-- (20260909000014) had they not been caught in the same pass.
--
-- Views can't ADD columns via CREATE OR REPLACE VIEW unless the new
-- columns are appended at the end (changing an existing column's position
-- or type requires DROP+CREATE) -- appending is safe here since nothing
-- depends on public_company_profile's column order.

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
  cs.cod_text
from public.companies c
left join public.company_settings cs on cs.company_id = c.id
where c.status = 'active';

grant select on public.public_company_profile to anon, authenticated;
