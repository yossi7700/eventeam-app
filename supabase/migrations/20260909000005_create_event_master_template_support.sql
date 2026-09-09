-- Gap-audit item: there was no way to create a master-template event at all
-- (create_event_with_children always inserted is_master_template = false,
-- and no UI called it with company_id = null). This adds the parameter and
-- wires it through the create-event Edge Function so admins can build
-- templates, matching the old system's admin-only automatic-form CRUD
-- (FormController) that this rebuild never ported. Also adds the currently
-- missing update path used for editing an existing master template:
-- update_event_with_children today lets ANY event through as long as the
-- caller is_admin(), which already covers editing templates -- no schema
-- change needed there, just a UI to call it for a template id.

drop function if exists public.create_event_with_children(
  uuid, text, text, text, text, timestamptz, timestamptz, text, jsonb, jsonb
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
  p_is_master_template boolean default false
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
    start_date, end_date, timezone, status, is_master_template,
    override_is_attendees_required, override_is_show_address, override_is_cash_allowed,
    override_is_donation_allowed, override_is_show_regulation, override_is_show_stripe,
    override_is_show_app_fee, override_is_enable_donation
  ) values (
    p_company_id, p_title, p_slug, p_description, p_cover_image_path,
    p_start_date, p_end_date, coalesce(p_timezone, 'America/New_York'), 'draft',
    coalesce(p_is_master_template, false),
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
  uuid, text, text, text, text, timestamptz, timestamptz, text, jsonb, jsonb, boolean
) from public, anon;
grant execute on function public.create_event_with_children(
  uuid, text, text, text, text, timestamptz, timestamptz, text, jsonb, jsonb, boolean
) to authenticated;
