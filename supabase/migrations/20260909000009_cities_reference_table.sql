-- Gap-audit item: old system's DashboardController::searchCities read a
-- static 16MB public/geo.json file on every request and did a linear
-- stripos() substring scan for city name matches (>=3 chars), used to let
-- a company pick a manual_geonameid for their location (feeding directly
-- into the sunset/candle-lighting time calculation, geonameid being the
-- parameter both the old system and this rebuild's sunset-times function
-- already accept). No equivalent search exists anywhere in the new system
-- -- templates-client.tsx currently makes the user type raw
-- latitude/longitude by hand, which is unrealistic for a non-technical
-- company user.
--
-- Ported as a real indexed Postgres table (not a JSON file re-read per
-- request) using the same geonameid identifiers, searched via pg_trgm for
-- fast case-insensitive substring matching -- functionally equivalent to
-- the old stripos() scan, but indexed instead of O(n) per search.

create extension if not exists pg_trgm;

create table public.cities (
  geonameid text primary key,
  city_name text not null,
  region_name text,
  country_code text not null
);

create index cities_city_name_trgm_idx on public.cities using gin (city_name gin_trgm_ops);

alter table public.cities enable row level security;

-- Read-only reference data, safe for anyone (including anon, for the
-- public booking flow's own location needs) to query.
create policy "cities: anyone can read" on public.cities
  for select using (true);

comment on table public.cities is
  'Static geonames reference data (ported from the old system''s geo.json) used to resolve a human-readable city search into a geonameid for the sunset-times Edge Function.';
