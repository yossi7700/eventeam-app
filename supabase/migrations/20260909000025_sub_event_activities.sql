-- Gap-audit item (architecturally significant, user-confirmed 2026-09-09):
-- old system's SubEventActivity gave each sub-event a list of named
-- "activities" (e.g. "Kiddush", "Drasha") shown on the public event page,
-- each with:
--   - is_show: visibility toggle
--   - type: one of fixed_time | before_sunset | after_sunset |
--     before_candle | after_candle
--   - time: a hh:mm string (fixed_time) or a minutes offset (the other 4
--     types), applied against that sub-event's own candle-lighting/sunset
--     time (see helper.php::showActivity())
-- No equivalent existed anywhere in the rebuild. This is a genuinely
-- separate concept from is_sunset_relative/sunset_offset_minutes (which
-- places the *sub-event itself* in time) -- activities are a schedule
-- *within* a sub-event, each independently offset from either
-- candle-lighting or sunset, or shown at a flat fixed time.

create type public.sub_event_activity_type as enum (
  'fixed_time', 'before_sunset', 'after_sunset', 'before_candle', 'after_candle'
);

create table public.sub_event_activities (
  id uuid primary key default gen_random_uuid(),
  sub_event_id uuid not null references public.sub_events(id) on delete cascade,
  title text not null,
  activity_type public.sub_event_activity_type not null default 'fixed_time',
  -- fixed_time: "HH:MM" (24h) stored as text, same shape the old system
  -- used. All other types: minutes offset, stored as time_minutes.
  fixed_time text,
  time_minutes integer,
  is_show boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sub_event_activities_time_shape check (
    (activity_type = 'fixed_time' and fixed_time is not null and time_minutes is null)
    or (activity_type <> 'fixed_time' and time_minutes is not null and fixed_time is null)
  )
);

create index sub_event_activities_sub_event_id_idx on public.sub_event_activities (sub_event_id, sort_order);

create trigger sub_event_activities_set_updated_at
  before update on public.sub_event_activities
  for each row execute function public.set_updated_at();

alter table public.sub_event_activities enable row level security;

-- Company/admin manage their own event's activities (scoped via
-- sub_event -> event -> company, same pattern as sub_events/products).
create policy "sub_event_activities: via event ownership" on public.sub_event_activities
  for all using (
    exists (
      select 1 from public.sub_events se
      join public.events e on e.id = se.event_id
      where se.id = sub_event_activities.sub_event_id
        and (e.company_id = public.my_company_id() or public.is_admin())
    )
  )
  with check (
    exists (
      select 1 from public.sub_events se
      join public.events e on e.id = se.event_id
      where se.id = sub_event_activities.sub_event_id
        and (e.company_id = public.my_company_id() or public.is_admin())
    )
  );

-- Public can read visible activities of publicly-visible sub-events
-- (mirrors public_sub_events_view's own visibility rule).
create policy "sub_event_activities: public can view shown activities" on public.sub_event_activities
  for select using (
    is_show and exists (
      select 1 from public.public_sub_events_view pse where pse.id = sub_event_activities.sub_event_id
    )
  );

create view public.public_sub_event_activities_view
with (security_invoker = true) as
select a.id, a.sub_event_id, a.title, a.activity_type, a.fixed_time, a.time_minutes, a.sort_order
from public.sub_event_activities a
join public.public_sub_events_view pse on pse.id = a.sub_event_id
where a.is_show;

grant select on public.public_sub_event_activities_view to anon, authenticated;
