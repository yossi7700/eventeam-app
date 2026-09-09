-- Gap-audit item: old system's before_sunset_time (candle-lighting
-- minutes before sunset, passed to hebcal's 'b' parameter) and
-- after_sunset_time (minutes after sunset used for the "second event"
-- time calculation) were per-company settings copied from admin on
-- signup. Neither existed anywhere in company_settings here, and
-- publish-template-event never passed a before_sunset_minutes to
-- sunset-times at all (always used hebcal's bare default).
--
-- second_event_end_time (a static end-of-Shabbat time string, old
-- system's fallback when the "second event" isn't computed via API) and
-- calculate_via_api (an on/off toggle for whether to compute via hebcal at
-- all vs. use static settings) are deliberately NOT ported: they belong
-- to the old system's dual first/second-event ad-hoc time model that this
-- rebuild's is_sunset_relative/sunset_offset_minutes per-sub-event model
-- already replaces more generally (documented as an intentional
-- modernization in the original plan) -- before/after_sunset_minutes are
-- the one piece of that old model (the actual candle-lighting offset
-- passed to hebcal) that was a real, functional gap rather than a
-- superseded pattern.

alter table public.company_settings
  add column before_sunset_minutes integer,
  add column after_sunset_minutes integer;

comment on column public.company_settings.before_sunset_minutes is
  'Candle-lighting minutes before sunset, passed to hebcal.com''s /shabbat "b" parameter via sunset-times. Null means hebcal''s own default (18 minutes) applies.';
