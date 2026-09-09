-- Gap-audit item: old system's EventController::companyAutomaticConfigsSave
-- rejected before_sunset_time < 18 (18 minutes before sunset is the
-- standard halachic minimum for candle-lighting, and hebcal.com's own
-- default for the same purpose). before_sunset_minutes had no equivalent
-- floor anywhere -- a company could set it to 0 or a negative number.

alter table public.company_settings
  add constraint company_settings_before_sunset_minimum
  check (before_sunset_minutes is null or before_sunset_minutes >= 18);
