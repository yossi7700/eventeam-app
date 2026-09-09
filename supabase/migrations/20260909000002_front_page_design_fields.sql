-- Front-page design fields present in the old FrontPageDesign model but
-- missing from company_settings (gap-audit item 4): the 5 step titles shown
-- during the public registration/checkout flow, plus twitter/youtube links
-- (facebook/instagram/website already existed). custom_js is deliberately
-- NOT ported -- executing admin-editable arbitrary JS on the public booking
-- page is a real security liability the old system carried; dropping it is
-- an intentional improvement, not an oversight.

alter table public.company_settings
  add column step_1_title text,
  add column step_2_title text,
  add column step_3_title text,
  add column step_4_title text,
  add column step_5_title text,
  add column twitter_url text,
  add column youtube_url text;
