-- Transactional event + nested sub_events + products creation, called via
-- RPC from the create-event Edge Function. A single plpgsql function body
-- runs as one implicit transaction, giving us atomicity across the three
-- tables without needing a client-side multi-statement transaction.

create or replace function public.create_event_with_children(
  p_company_id uuid,
  p_title text,
  p_slug text,
  p_description text,
  p_cover_image_path text,
  p_start_date timestamptz,
  p_end_date timestamptz,
  p_timezone text,
  p_sub_events jsonb -- [{ title, description, location, start_at, end_at, capacity,
                     --    is_sunset_relative, sunset_offset_minutes, sort_order,
                     --    products: [{ name, description, price, currency, capacity, sort_order }] }]
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
  if p_company_id is null or p_company_id <> public.my_company_id() then
    if not public.is_admin() then
      raise exception 'not authorized for this company' using errcode = '42501';
    end if;
  end if;

  insert into public.events (
    company_id, title, slug, description, cover_image_path,
    start_date, end_date, timezone, status
  ) values (
    p_company_id, p_title, p_slug, p_description, p_cover_image_path,
    p_start_date, p_end_date, coalesce(p_timezone, 'America/New_York'), 'draft'
  )
  returning id into v_event_id;

  for v_sub_event in select * from jsonb_array_elements(coalesce(p_sub_events, '[]'::jsonb))
  loop
    insert into public.sub_events (
      event_id, title, description, location, start_at, end_at, capacity,
      is_sunset_relative, sunset_offset_minutes, sort_order
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
      coalesce((v_sub_event->>'sort_order')::integer, 0)
    )
    returning id into v_sub_event_id;

    for v_product in select * from jsonb_array_elements(coalesce(v_sub_event->'products', '[]'::jsonb))
    loop
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
      );
    end loop;
  end loop;

  return v_event_id;
end;
$$;

-- Callable by authenticated users only; the function itself enforces
-- company-ownership/admin checks against auth.uid() internally.
revoke execute on function public.create_event_with_children(
  uuid, text, text, text, text, timestamptz, timestamptz, text, jsonb
) from public, anon;
grant execute on function public.create_event_with_children(
  uuid, text, text, text, text, timestamptz, timestamptz, text, jsonb
) to authenticated;
