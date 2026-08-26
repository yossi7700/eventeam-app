-- Transactional event + nested sub_events + products update. Reconciles the
-- nested arrays against existing rows: an item with an `id` that still
-- exists gets updated, an item with no `id` (or an id not already present)
-- gets inserted, and any existing row whose id is missing from the payload
-- gets deleted. This mirrors typical "edit this whole event form" UX where
-- the client always sends the full current shape of sub_events/products.

create or replace function public.update_event_with_children(
  p_event_id uuid,
  p_title text,
  p_slug text,
  p_description text,
  p_cover_image_path text,
  p_start_date timestamptz,
  p_end_date timestamptz,
  p_timezone text,
  p_sub_events jsonb -- same shape as create_event_with_children, but each
                     -- sub_event/product object may include an "id" to
                     -- update an existing row.
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
    timezone = coalesce(p_timezone, timezone)
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
        sort_order = coalesce((v_sub_event->>'sort_order')::integer, 0)
      where id = v_sub_event_id;
    else
      insert into public.sub_events (
        event_id, title, description, location, start_at, end_at, capacity,
        is_sunset_relative, sunset_offset_minutes, sort_order
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
          sort_order = coalesce((v_product->>'sort_order')::integer, 0)
        where id = (v_product->>'id')::uuid;

        v_keep_product_ids := array_append(v_keep_product_ids, (v_product->>'id')::uuid);
      else
        insert into public.products (
          sub_event_id, name, description, price, currency, capacity, sort_order
        ) values (
          v_sub_event_id,
          v_product->>'name',
          v_product->>'description',
          (v_product->>'price')::numeric,
          coalesce(v_product->>'currency', 'USD'),
          nullif(v_product->>'capacity', '')::integer,
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
  uuid, text, text, text, text, timestamptz, timestamptz, text, jsonb
) from public, anon;
grant execute on function public.update_event_with_children(
  uuid, text, text, text, text, timestamptz, timestamptz, text, jsonb
) to authenticated;
