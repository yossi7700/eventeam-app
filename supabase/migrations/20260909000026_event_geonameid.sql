-- Prerequisite for resolving sub_event_activities' before_sunset/
-- after_sunset/before_candle/after_candle display times on an ongoing
-- basis (not just at template-publish time): events had no location/
-- geonameid field at all, so there was nothing to re-resolve sunset/
-- candle-lighting times against once an event existed. publish-template-event
-- already threads a geonameid through at publish time but never persists
-- it on the resulting event row.

alter table public.events
  add column geonameid text;

comment on column public.events.geonameid is
  'GeoNames.org location id used to resolve sunset/candle-lighting times for this event''s sunset-relative sub-events and activities (see sunset-times Edge Function). Set at creation/publish time; null means no location context is available for this event.';
