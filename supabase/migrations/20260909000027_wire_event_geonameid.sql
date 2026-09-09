-- Wires events.geonameid through:
--  1. public_events_view, so the public event page can read it back to
--     call sunset-times itself for activity time resolution.
--  2. create_event_with_children / update_event_with_children, so a
--     company can set it directly when creating a standalone event.
--  3. publish-template-event, which already resolves a geonameid at
--     publish time but never persisted it on the resulting event row.

create or replace view public.public_events_view
with (security_invoker = true) as
select
  e.id,
  e.title,
  e.slug,
  e.description,
  e.cover_image_path,
  e.start_date,
  e.end_date,
  e.status,
  e.timezone,
  c.id as company_id,
  c.slug as company_slug,
  c.name as company_name,
  e.geonameid
from public.events e
join public.companies c on c.id = e.company_id
where e.status in ('active','ended') and c.status = 'active' and not e.is_master_template;

grant select on public.public_events_view to anon, authenticated;

-- Postgres treats a changed parameter list as a new overload rather than
-- replacing the existing function -- drop the old 10-arg signature first
-- so callers can't accidentally hit a stale version.
drop function if exists public.create_event_with_children(
  uuid, text, text, text, text, timestamptz, timestamptz, text, jsonb, jsonb, boolean
);

create or replace function public.create_event_with_children(
  p_company_id uuid,
  p_title text,
  p_slug text,
  p_description text,
  p_cover_image_path text,
  p_start_date timestamptz,
  p_end_date timestamptz,
  p_timezone text,
  p_sub_events jsonb,
  p_advance jsonb default null,
  p_is_master_template boolean default false,
  p_geonameid text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id uuid;
  v_sub_event jsonb;
  v_sub_event_id uuid;
  v_product jsonb;
begin
  if p_is_master_template then
    if not public.is_admin() then
      raise exception 'only admins can create master templates' using errcode = '42501';
    end if;
    if p_company_id is not null then
      raise exception 'master templates must not have a company_id' using errcode = '22023';
    end if;
  else
    if p_company_id is null or p_company_id <> public.my_company_id() then
      if not public.is_admin() then
        raise exception 'not authorized for this company' using errcode = '42501';
      end if;
    end if;
  end if;

  insert into public.events (
    company_id, title, slug, description, cover_image_path,
    start_date, end_date, timezone, status, is_master_template, geonameid,
    override_is_attendees_required, override_is_show_address, override_is_cash_allowed,
    override_is_donation_allowed, override_is_show_regulation, override_is_show_stripe,
    override_is_show_app_fee, override_is_enable_donation
  ) values (
    p_company_id, p_title, p_slug, p_description, p_cover_image_path,
    p_start_date, p_end_date, coalesce(p_timezone, 'America/New_York'), 'draft',
    coalesce(p_is_master_template, false), p_geonameid,
    (p_advance->>'is_attendees_required')::boolean,
    (p_advance->>'is_show_address')::boolean,
    (p_advance->>'is_cash_allowed')::boolean,
    (p_advance->>'is_donation_allowed')::boolean,
    (p_advance->>'is_show_regulation')::boolean,
    (p_advance->>'is_show_stripe')::boolean,
    (p_advance->>'is_show_app_fee')::boolean,
    (p_advance->>'is_enable_donation')::boolean
  )
  returning id into v_event_id;

  for v_sub_event in select * from jsonb_array_elements(coalesce(p_sub_events, '[]'::jsonb))
  loop
    insert into public.sub_events (
      event_id, title, description, location, start_at, end_at, capacity,
      is_sunset_relative, sunset_offset_minutes, is_active, sort_order
    ) values (
      v_event_id,
      v_sub_event->>'title',
      v_sub_event->>'description',
      v_sub_event->>'location',
      (v_sub_event->>'start_at')::timestamptz,
      nullif(v_sub_event->>'end_at', '')::timestamptz,
      nullif(v_sub_event->>'capacity', '')::integer,
      coalesce((v_sub_event->>'is_sunset_relative')::boolean, false),
      nullif(v_sub_event->>'sunset_offset_minutes', '')::integer,
      coalesce((v_sub_event->>'is_active')::boolean, true),
      coalesce((v_sub_event->>'sort_order')::integer, 0)
    )
    returning id into v_sub_event_id;

    for v_product in select * from jsonb_array_elements(coalesce(v_sub_event->'products', '[]'::jsonb))
    loop
      insert into public.products (
        sub_event_id, name, description, price, currency, capacity, color, sort_order
      ) values (
        v_sub_event_id,
        v_product->>'name',
        v_product->>'description',
        (v_product->>'price')::numeric,
        coalesce(v_product->>'currency', 'USD'),
        nullif(v_product->>'capacity', '')::integer,
        nullif(v_product->>'color', ''),
        coalesce((v_product->>'sort_order')::integer, 0)
      );
    end loop;
  end loop;

  return v_event_id;
end;
$$;

revoke execute on function public.create_event_with_children(
  uuid, text, text, text, text, timestamptz, timestamptz, text, jsonb, jsonb, boolean, text
) from public, anon;
grant execute on function public.create_event_with_children(
  uuid, text, text, text, text, timestamptz, timestamptz, text, jsonb, jsonb, boolean, text
) to authenticated;

drop function if exists public.update_event_with_children(
  uuid, text, text, text, text, timestamptz, timestamptz, text, jsonb, jsonb
);

create or replace function public.update_event_with_children(
  p_event_id uuid,
  p_title text,
  p_slug text,
  p_description text,
  p_cover_image_path text,
  p_start_date timestamptz,
  p_end_date timestamptz,
  p_timezone text,
  p_sub_events jsonb,
  p_advance jsonb default null,
  p_geonameid text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
  v_sub_event jsonb;
  v_sub_event_id uuid;
  v_product jsonb;
  v_product_id uuid;
  v_keep_sub_event_ids uuid[] := '{}';
  v_keep_product_ids uuid[];
begin
  select company_id into v_company_id from public.events where id = p_event_id;

  if v_company_id is null then
    raise exception 'event not found' using errcode = 'P0002';
  end if;

  if v_company_id <> public.my_company_id() and not public.is_admin() then
    raise exception 'not authorized for this event' using errcode = '42501';
  end if;

  update public.events set
    title = p_title,
    slug = p_slug,
    description = p_description,
    cover_image_path = p_cover_image_path,
    start_date = p_start_date,
    end_date = p_end_date,
    timezone = coalesce(p_timezone, timezone),
    geonameid = coalesce(p_geonameid, geonameid),
    override_is_attendees_required = (p_advance->>'is_attendees_required')::boolean,
    override_is_show_address = (p_advance->>'is_show_address')::boolean,
    override_is_cash_allowed = (p_advance->>'is_cash_allowed')::boolean,
    override_is_donation_allowed = (p_advance->>'is_donation_allowed')::boolean,
    override_is_show_regulation = (p_advance->>'is_show_regulation')::boolean,
    override_is_show_stripe = (p_advance->>'is_show_stripe')::boolean,
    override_is_show_app_fee = (p_advance->>'is_show_app_fee')::boolean,
    override_is_enable_donation = (p_advance->>'is_enable_donation')::boolean
  where id = p_event_id;

  for v_sub_event in select * from jsonb_array_elements(coalesce(p_sub_events, '[]'::jsonb))
  loop
    if v_sub_event->>'id' is not null
       and exists (select 1 from public.sub_events where id = (v_sub_event->>'id')::uuid and event_id = p_event_id)
    then
      v_sub_event_id := (v_sub_event->>'id')::uuid;
      update public.sub_events set
        title = v_sub_event->>'title',
        description = v_sub_event->>'description',
        location = v_sub_event->>'location',
        start_at = (v_sub_event->>'start_at')::timestamptz,
        end_at = nullif(v_sub_event->>'end_at', '')::timestamptz,
        capacity = nullif(v_sub_event->>'capacity', '')::integer,
        is_sunset_relative = coalesce((v_sub_event->>'is_sunset_relative')::boolean, false),
        sunset_offset_minutes = nullif(v_sub_event->>'sunset_offset_minutes', '')::integer,
        is_active = coalesce((v_sub_event->>'is_active')::boolean, true),
        sort_order = coalesce((v_sub_event->>'sort_order')::integer, 0)
      where id = v_sub_event_id;
    else
      insert into public.sub_events (
        event_id, title, description, location, start_at, end_at, capacity,
        is_sunset_relative, sunset_offset_minutes, is_active, sort_order
      ) values (
        p_event_id,
        v_sub_event->>'title',
        v_sub_event->>'description',
        v_sub_event->>'location',
        (v_sub_event->>'start_at')::timestamptz,
        nullif(v_sub_event->>'end_at', '')::timestamptz,
        nullif(v_sub_event->>'capacity', '')::integer,
        coalesce((v_sub_event->>'is_sunset_relative')::boolean, false),
        nullif(v_sub_event->>'sunset_offset_minutes', '')::integer,
        coalesce((v_sub_event->>'is_active')::boolean, true),
        coalesce((v_sub_event->>'sort_order')::integer, 0)
      )
      returning id into v_sub_event_id;
    end if;

    v_keep_sub_event_ids := array_append(v_keep_sub_event_ids, v_sub_event_id);
    v_keep_product_ids := '{}';

    for v_product in select * from jsonb_array_elements(coalesce(v_sub_event->'products', '[]'::jsonb))
    loop
      if v_product->>'id' is not null
         and exists (select 1 from public.products where id = (v_product->>'id')::uuid and sub_event_id = v_sub_event_id)
      then
        update public.products set
          name = v_product->>'name',
          description = v_product->>'description',
          price = (v_product->>'price')::numeric,
          currency = coalesce(v_product->>'currency', 'USD'),
          capacity = nullif(v_product->>'capacity', '')::integer,
          color = nullif(v_product->>'color', ''),
          sort_order = coalesce((v_product->>'sort_order')::integer, 0)
        where id = (v_product->>'id')::uuid;

        v_keep_product_ids := array_append(v_keep_product_ids, (v_product->>'id')::uuid);
      else
        insert into public.products (
          sub_event_id, name, description, price, currency, capacity, color, sort_order
        ) values (
          v_sub_event_id,
          v_product->>'name',
          v_product->>'description',
          (v_product->>'price')::numeric,
          coalesce(v_product->>'currency', 'USD'),
          nullif(v_product->>'capacity', '')::integer,
          nullif(v_product->>'color', ''),
          coalesce((v_product->>'sort_order')::integer, 0)
        )
        returning id into v_product_id;

        v_keep_product_ids := array_append(v_keep_product_ids, v_product_id);
      end if;
    end loop;

    delete from public.products
    where sub_event_id = v_sub_event_id
      and id <> all (coalesce(v_keep_product_ids, '{}'));
  end loop;

  delete from public.sub_events
  where event_id = p_event_id
    and id <> all (v_keep_sub_event_ids);
end;
$$;

revoke execute on function public.update_event_with_children(
  uuid, text, text, text, text, timestamptz, timestamptz, text, jsonb, jsonb, text
) from public, anon;
grant execute on function public.update_event_with_children(
  uuid, text, text, text, text, timestamptz, timestamptz, text, jsonb, jsonb, text
) to authenticated;
