-- Bug fix caught by re-verifying against the old system's actual live
-- booking-flow code (EventRegistrationController::bookEventsRegisteration,
-- not the unused countAmountBasedOnGuests()/dead-path variant read
-- earlier): the platform fee ($pf = (plateform_fee/100) * $amount) is
-- computed against $amount, which already includes donations by the time
-- it reaches that line. register_guest_for_event here computed the
-- platform fee against v_subtotal alone, undercounting it whenever a
-- registration included a donation. User confirmed (2026-09-09): fix the
-- base to (subtotal + donations), keep the server-side is_show_app_fee
-- gate rather than adding a client-supplied allow-fee flag.

create or replace function public.register_guest_for_event(
  p_event_id uuid,
  p_primary_guest_name text,
  p_primary_guest_email text,
  p_primary_guest_phone text,
  p_payment_method public.payment_method,
  p_guests jsonb,
  p_donations jsonb
)
returns table (registration_id uuid, total_amount numeric, currency text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
  v_commission_pct numeric := 0;
  v_donation_excluded boolean := false;
  v_settings record;
  v_registration_id uuid;
  v_guest jsonb;
  v_guest_id uuid;
  v_line_item jsonb;
  v_product record;
  v_booked_count integer;
  v_subtotal numeric := 0;
  v_donation_total numeric := 0;
  v_commission_amount numeric := 0;
  v_platform_fee_amount numeric := 0;
  v_total numeric := 0;
  v_donation jsonb;
  v_currency text := 'USD';
begin
  select e.company_id into v_company_id
  from public.events e
  join public.companies c on c.id = e.company_id
  where e.id = p_event_id
    and not e.is_master_template
    and e.status = 'active'
    and c.status = 'active';

  if v_company_id is null then
    raise exception 'event is not open for registration' using errcode = 'P0002';
  end if;

  select cs.admin_commission_pct, cs.donation_excluded_from_commission
  into v_commission_pct, v_donation_excluded
  from public.company_settings cs
  where cs.company_id = v_company_id;

  v_commission_pct := coalesce(v_commission_pct, 0);
  v_donation_excluded := coalesce(v_donation_excluded, false);

  select * into v_settings from public.resolve_event_advance_settings(p_event_id);

  if p_payment_method = 'cash' and coalesce(v_settings.is_cash_allowed, true) is false then
    raise exception 'cash payment is not allowed for this event' using errcode = 'P0001';
  end if;

  if p_donations is not null and jsonb_array_length(p_donations) > 0
     and coalesce(v_settings.is_donation_allowed, false) is false
  then
    raise exception 'donations are not allowed for this event' using errcode = 'P0001';
  end if;

  if p_guests is null or jsonb_array_length(p_guests) = 0 then
    raise exception 'at least one guest is required' using errcode = '22023';
  end if;

  if coalesce(v_settings.is_attendees_required, false) then
    for v_guest in select * from jsonb_array_elements(p_guests)
    loop
      if coalesce(nullif(v_guest->>'email', ''), nullif(v_guest->>'phone', '')) is null then
        raise exception 'each attendee requires an email or phone number for this event' using errcode = '22023';
      end if;
    end loop;
  end if;

  insert into public.registrations (
    event_id, status, primary_guest_name, primary_guest_email, primary_guest_phone,
    payment_method, currency
  ) values (
    p_event_id, 'pending', p_primary_guest_name, p_primary_guest_email, p_primary_guest_phone,
    p_payment_method, v_currency
  )
  returning id into v_registration_id;

  for v_guest in select * from jsonb_array_elements(p_guests)
  loop
    insert into public.guests (registration_id, full_name, email, phone)
    values (
      v_registration_id,
      v_guest->>'full_name',
      nullif(v_guest->>'email', ''),
      nullif(v_guest->>'phone', '')
    )
    returning id into v_guest_id;

    for v_line_item in select * from jsonb_array_elements(coalesce(v_guest->'line_items', '[]'::jsonb))
    loop
      select p.id, p.price, p.currency, p.capacity, p.sub_event_id
      into v_product
      from public.products p
      join public.sub_events se on se.id = p.sub_event_id
      join public.events e on e.id = se.event_id
      where p.id = (v_line_item->>'product_id')::uuid
        and se.id = (v_line_item->>'sub_event_id')::uuid
        and e.id = p_event_id
        and p.is_active
      for update of p;

      if v_product.id is null then
        raise exception 'invalid or unavailable product selection' using errcode = 'P0002';
      end if;

      if v_product.capacity is not null then
        select coalesce(sum(gli.quantity), 0) into v_booked_count
        from public.guest_line_items gli
        where gli.product_id = v_product.id;

        if v_booked_count + coalesce((v_line_item->>'quantity')::integer, 1) > v_product.capacity then
          raise exception 'not enough capacity remaining for this ticket type' using errcode = 'P0001';
        end if;
      end if;

      insert into public.guest_line_items (guest_id, sub_event_id, product_id, unit_price, quantity, line_total)
      values (
        v_guest_id,
        v_product.sub_event_id,
        v_product.id,
        v_product.price,
        coalesce((v_line_item->>'quantity')::integer, 1),
        v_product.price * coalesce((v_line_item->>'quantity')::integer, 1)
      );

      v_subtotal := v_subtotal + (v_product.price * coalesce((v_line_item->>'quantity')::integer, 1));
      v_currency := v_product.currency;
    end loop;
  end loop;

  for v_donation in select * from jsonb_array_elements(coalesce(p_donations, '[]'::jsonb))
  loop
    if (v_donation->>'amount')::numeric > 0 then
      insert into public.donations (registration_id, donation_field_id, amount)
      values (
        v_registration_id,
        nullif(v_donation->>'donation_field_id', '')::uuid,
        (v_donation->>'amount')::numeric
      );
      v_donation_total := v_donation_total + (v_donation->>'amount')::numeric;
    end if;
  end loop;

  v_commission_amount := round(
    (case when v_donation_excluded then v_subtotal else v_subtotal + v_donation_total end)
    * (v_commission_pct / 100.0),
    2
  );

  v_platform_fee_amount := case
    when coalesce(v_settings.is_show_app_fee, true) then
      round((v_subtotal + v_donation_total) * (coalesce(v_settings.platform_fee_pct, 0) / 100.0), 2)
    else 0
  end;

  v_total := v_subtotal + v_donation_total;

  update public.registrations set
    subtotal = v_subtotal,
    donation_total = v_donation_total,
    commission_amount = v_commission_amount,
    platform_fee_amount = v_platform_fee_amount,
    total_amount = v_total,
    currency = v_currency
  where id = v_registration_id;

  insert into public.guest_payments (registration_id, method, status, amount, currency, application_fee_amount)
  values (
    v_registration_id,
    p_payment_method,
    'pending',
    v_total,
    v_currency,
    v_commission_amount + v_platform_fee_amount
  );

  return query select v_registration_id, v_total, v_currency;
end;
$$;
