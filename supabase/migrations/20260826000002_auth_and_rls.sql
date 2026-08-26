-- Auth trigger, RLS helper functions, RLS policies, public views.

-- ============================================================================
-- New-user trigger: create a profiles row on signup
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, role, full_name)
  values (new.id, 'company', new.raw_user_meta_data->>'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- RLS helper functions
-- ============================================================================

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.my_company_id()
returns uuid
language sql stable security definer set search_path = public
as $$
  select id from public.companies where profile_id = auth.uid();
$$;

-- ============================================================================
-- Enable RLS everywhere
-- ============================================================================

alter table public.profiles enable row level security;
alter table public.companies enable row level security;
alter table public.company_settings enable row level security;
alter table public.platform_settings enable row level security;
alter table public.events enable row level security;
alter table public.sub_events enable row level security;
alter table public.products enable row level security;
alter table public.donation_fields enable row level security;
alter table public.donations enable row level security;
alter table public.registrations enable row level security;
alter table public.guests enable row level security;
alter table public.guest_line_items enable row level security;
alter table public.guest_payments enable row level security;
alter table public.stripe_accounts enable row level security;
alter table public.email_templates enable row level security;
alter table public.otp_verifications enable row level security;
alter table public.audit_logs enable row level security;

-- ============================================================================
-- profiles
-- ============================================================================

create policy "profiles: self or admin select" on public.profiles
  for select using (id = auth.uid() or public.is_admin());

create policy "profiles: self update" on public.profiles
  for update using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- ============================================================================
-- companies
-- ============================================================================

create policy "companies: owner or admin select" on public.companies
  for select using (profile_id = auth.uid() or public.is_admin());

create policy "companies: owner insert" on public.companies
  for insert with check (profile_id = auth.uid());

create policy "companies: owner or admin update" on public.companies
  for update using (profile_id = auth.uid() or public.is_admin())
  with check (profile_id = auth.uid() or public.is_admin());

create policy "companies: admin delete" on public.companies
  for delete using (public.is_admin());

-- A company can update its own row but must not be able to change its own
-- approval status or approval metadata (RLS with-check alone can't compare
-- old vs new row values, so enforce it with a trigger instead).
create or replace function public.prevent_company_self_approval()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;
  new.status := old.status;
  new.approved_at := old.approved_at;
  new.approved_by := old.approved_by;
  new.rejected_reason := old.rejected_reason;
  return new;
end;
$$;

create trigger companies_prevent_self_approval
  before update on public.companies
  for each row execute function public.prevent_company_self_approval();

-- ============================================================================
-- company_settings
-- ============================================================================

create policy "company_settings: owner or admin select" on public.company_settings
  for select using (company_id = public.my_company_id() or public.is_admin());

create policy "company_settings: owner or admin upsert" on public.company_settings
  for insert with check (company_id = public.my_company_id() or public.is_admin());

create policy "company_settings: owner or admin update" on public.company_settings
  for update using (company_id = public.my_company_id() or public.is_admin())
  with check (company_id = public.my_company_id() or public.is_admin());

-- A company can update its own branding/settings but must not change its own
-- commission rate (that's OTP-gated and admin-controlled) — enforced by
-- trigger since RLS with-check can't compare old vs new row values.
create or replace function public.prevent_company_self_commission_change()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;
  new.admin_commission_pct := old.admin_commission_pct;
  return new;
end;
$$;

create trigger company_settings_prevent_self_commission_change
  before update on public.company_settings
  for each row execute function public.prevent_company_self_commission_change();

-- ============================================================================
-- platform_settings (admin only)
-- ============================================================================

create policy "platform_settings: admin only" on public.platform_settings
  for all using (public.is_admin()) with check (public.is_admin());

-- ============================================================================
-- events
-- ============================================================================

create policy "events: company or admin select" on public.events
  for select using (company_id = public.my_company_id() or public.is_admin());

create policy "events: company or admin insert" on public.events
  for insert with check (company_id = public.my_company_id() or public.is_admin());

create policy "events: company or admin update" on public.events
  for update using (company_id = public.my_company_id() or public.is_admin())
  with check (company_id = public.my_company_id() or public.is_admin());

create policy "events: company or admin delete" on public.events
  for delete using (company_id = public.my_company_id() or public.is_admin());

-- ============================================================================
-- sub_events / products (scoped via parent event -> company)
-- ============================================================================

create policy "sub_events: via event ownership" on public.sub_events
  for all using (
    exists (select 1 from public.events e where e.id = sub_events.event_id
      and (e.company_id = public.my_company_id() or public.is_admin()))
  ) with check (
    exists (select 1 from public.events e where e.id = sub_events.event_id
      and (e.company_id = public.my_company_id() or public.is_admin()))
  );

create policy "products: via sub_event->event ownership" on public.products
  for all using (
    exists (
      select 1 from public.sub_events se join public.events e on e.id = se.event_id
      where se.id = products.sub_event_id and (e.company_id = public.my_company_id() or public.is_admin())
    )
  ) with check (
    exists (
      select 1 from public.sub_events se join public.events e on e.id = se.event_id
      where se.id = products.sub_event_id and (e.company_id = public.my_company_id() or public.is_admin())
    )
  );

-- ============================================================================
-- donation_fields (via event ownership)
-- ============================================================================

create policy "donation_fields: via event ownership" on public.donation_fields
  for all using (
    exists (select 1 from public.events e where e.id = donation_fields.event_id
      and (e.company_id = public.my_company_id() or public.is_admin()))
  ) with check (
    exists (select 1 from public.events e where e.id = donation_fields.event_id
      and (e.company_id = public.my_company_id() or public.is_admin()))
  );

-- ============================================================================
-- registrations / guests / guest_line_items / donations / guest_payments
-- Read-only for company/admin (all writes go through the register-guest Edge
-- Function using the service role, which bypasses RLS entirely).
-- ============================================================================

create policy "registrations: company or admin select" on public.registrations
  for select using (
    exists (select 1 from public.events e where e.id = registrations.event_id
      and (e.company_id = public.my_company_id() or public.is_admin()))
  );

create policy "guests: company or admin select" on public.guests
  for select using (
    exists (
      select 1 from public.registrations r join public.events e on e.id = r.event_id
      where r.id = guests.registration_id and (e.company_id = public.my_company_id() or public.is_admin())
    )
  );

create policy "guest_line_items: company or admin select" on public.guest_line_items
  for select using (
    exists (
      select 1 from public.guests g
      join public.registrations r on r.id = g.registration_id
      join public.events e on e.id = r.event_id
      where g.id = guest_line_items.guest_id and (e.company_id = public.my_company_id() or public.is_admin())
    )
  );

create policy "donations: company or admin select" on public.donations
  for select using (
    exists (
      select 1 from public.registrations r join public.events e on e.id = r.event_id
      where r.id = donations.registration_id and (e.company_id = public.my_company_id() or public.is_admin())
    )
  );

create policy "guest_payments: company or admin select" on public.guest_payments
  for select using (
    exists (
      select 1 from public.registrations r join public.events e on e.id = r.event_id
      where r.id = guest_payments.registration_id and (e.company_id = public.my_company_id() or public.is_admin())
    )
  );

-- ============================================================================
-- stripe_accounts (read-only for company; writes only via Edge Functions/service role)
-- ============================================================================

create policy "stripe_accounts: owner or admin select" on public.stripe_accounts
  for select using (company_id = public.my_company_id() or public.is_admin());

-- ============================================================================
-- email_templates
-- ============================================================================

create policy "email_templates: company or admin select" on public.email_templates
  for select using (company_id = public.my_company_id() or company_id is null or public.is_admin());

create policy "email_templates: company or admin insert" on public.email_templates
  for insert with check (
    (company_id = public.my_company_id()) or (public.is_admin())
  );

create policy "email_templates: company or admin update" on public.email_templates
  for update using (
    (company_id = public.my_company_id()) or (public.is_admin())
  ) with check (
    (company_id = public.my_company_id()) or (public.is_admin())
  );

create policy "email_templates: company or admin delete" on public.email_templates
  for delete using (
    (company_id = public.my_company_id()) or (public.is_admin())
  );

-- ============================================================================
-- audit_logs: admin read-only (writes are via service role only)
-- ============================================================================

create policy "audit_logs: admin select" on public.audit_logs
  for select using (public.is_admin());

-- ============================================================================
-- Public views for anonymous booking pages
-- ============================================================================

create view public.public_company_profile
with (security_invoker = true) as
select
  c.id as company_id,
  c.slug,
  c.name,
  c.logo_path,
  cs.primary_color,
  cs.secondary_color,
  cs.font_family,
  cs.custom_css,
  cs.facebook_url,
  cs.instagram_url,
  cs.website_url,
  cs.hero_image_path,
  cs.about_text
from public.companies c
left join public.company_settings cs on cs.company_id = c.id
where c.status = 'active';

create view public.public_events_view
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
  c.name as company_name
from public.events e
join public.companies c on c.id = e.company_id
where e.status in ('active','ended') and c.status = 'active' and not e.is_master_template;

create view public.public_sub_events_view
with (security_invoker = true) as
select se.id, se.event_id, se.title, se.description, se.location,
       se.start_at, se.end_at, se.capacity, se.is_sunset_relative,
       se.sunset_offset_minutes, se.sort_order
from public.sub_events se
join public.public_events_view pe on pe.id = se.event_id;

create view public.public_products_view
with (security_invoker = true) as
select p.id, p.sub_event_id, p.name, p.description, p.price, p.currency,
       p.capacity, p.sort_order
from public.products p
join public.public_sub_events_view pse on pse.id = p.sub_event_id
where p.is_active;

create view public.public_donation_fields_view
with (security_invoker = true) as
select df.id, df.event_id, df.title, df.description, df.suggested_amount, df.allow_custom_amount, df.sort_order
from public.donation_fields df
join public.public_events_view pe on pe.id = df.event_id
where df.is_active;

grant select on public.public_company_profile to anon, authenticated;
grant select on public.public_events_view to anon, authenticated;
grant select on public.public_sub_events_view to anon, authenticated;
grant select on public.public_products_view to anon, authenticated;
grant select on public.public_donation_fields_view to anon, authenticated;
