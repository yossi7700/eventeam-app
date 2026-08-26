-- EvenTeam initial schema
-- Conventions: uuid PKs, timestamptz everywhere, numeric money, enums for stable status sets.

-- ============================================================================
-- Extensions
-- ============================================================================
create extension if not exists pgcrypto;

-- ============================================================================
-- Enums
-- ============================================================================
create type user_role as enum ('admin','company','client');
create type company_status as enum ('pending','active','suspended','rejected');
create type event_status as enum ('draft','active','ended','cancelled');
create type event_source as enum ('standalone','published_from_template');
create type registration_status as enum ('pending','confirmed','cancelled','refunded');
create type payment_method as enum ('card','cash');
create type payment_status as enum ('pending','requires_action','processing','succeeded','failed','cancelled','cleared_manually');
create type stripe_account_status as enum ('not_connected','onboarding','restricted','active','disabled');
create type email_template_kind as enum ('registration_confirmation','thank_you','company_signup','company_approved','company_rejected');
create type otp_purpose as enum ('change_stripe_keys','change_commission_rate','change_password','change_email');

-- ============================================================================
-- updated_at trigger helper
-- ============================================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================================
-- Identity
-- ============================================================================

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null default 'company',
  full_name text,
  phone text,
  avatar_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  name text not null,
  slug text not null unique,
  status company_status not null default 'pending',
  contact_email text not null,
  contact_phone text,
  address_line1 text,
  address_line2 text,
  city text,
  region text,
  postal_code text,
  country text,
  logo_path text,
  approved_at timestamptz,
  approved_by uuid references public.profiles(id),
  rejected_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index companies_status_idx on public.companies (status);
create index companies_slug_idx on public.companies (slug);

create trigger companies_set_updated_at
  before update on public.companies
  for each row execute function public.set_updated_at();

create table public.company_settings (
  company_id uuid primary key references public.companies(id) on delete cascade,
  primary_color text,
  secondary_color text,
  font_family text,
  custom_css text,
  facebook_url text,
  instagram_url text,
  website_url text,
  hero_image_path text,
  about_text text,
  admin_commission_pct numeric(5,2) not null default 5.00,
  donation_excluded_from_commission boolean not null default false,
  updated_at timestamptz not null default now()
);

create trigger company_settings_set_updated_at
  before update on public.company_settings
  for each row execute function public.set_updated_at();

create table public.platform_settings (
  id boolean primary key default true check (id),
  default_commission_pct numeric(5,2) not null default 5.00,
  support_email text,
  updated_at timestamptz not null default now()
);

create trigger platform_settings_set_updated_at
  before update on public.platform_settings
  for each row execute function public.set_updated_at();

insert into public.platform_settings (id) values (true);

-- ============================================================================
-- Events domain
-- ============================================================================

create table public.events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  template_id uuid references public.events(id) on delete set null,
  source event_source not null default 'standalone',
  title text not null,
  slug text not null,
  description text,
  cover_image_path text,
  status event_status not null default 'draft',
  start_date timestamptz not null,
  end_date timestamptz not null,
  is_master_template boolean not null default false,
  timezone text not null default 'America/New_York',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_end_after_start check (end_date >= start_date),
  constraint events_template_company_shape check (
    (is_master_template and company_id is null) or
    (not is_master_template and company_id is not null)
  ),
  unique (company_id, slug)
);

create index events_company_status_idx on public.events (company_id, status);
create index events_status_end_date_idx on public.events (status, end_date);
create index events_is_master_template_idx on public.events (is_master_template) where is_master_template;

create trigger events_set_updated_at
  before update on public.events
  for each row execute function public.set_updated_at();

create table public.sub_events (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  title text not null,
  description text,
  location text,
  start_at timestamptz not null,
  end_at timestamptz,
  capacity integer check (capacity is null or capacity >= 0),
  is_sunset_relative boolean not null default false,
  sunset_offset_minutes integer,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index sub_events_event_id_idx on public.sub_events (event_id, sort_order);

create trigger sub_events_set_updated_at
  before update on public.sub_events
  for each row execute function public.set_updated_at();

create table public.products (
  id uuid primary key default gen_random_uuid(),
  sub_event_id uuid not null references public.sub_events(id) on delete cascade,
  name text not null,
  description text,
  price numeric(10,2) not null check (price >= 0),
  currency char(3) not null default 'USD',
  capacity integer check (capacity is null or capacity >= 0),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index products_sub_event_id_idx on public.products (sub_event_id);

create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

-- ============================================================================
-- Registration domain (single clean model)
-- ============================================================================

create table public.registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete restrict,
  status registration_status not null default 'pending',
  primary_guest_name text not null,
  primary_guest_email text not null,
  primary_guest_phone text,
  subtotal numeric(12,2) not null default 0,
  donation_total numeric(12,2) not null default 0,
  commission_amount numeric(12,2) not null default 0,
  total_amount numeric(12,2) not null default 0,
  currency char(3) not null default 'USD',
  payment_method payment_method not null default 'card',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index registrations_event_status_idx on public.registrations (event_id, status);
create index registrations_primary_guest_email_idx on public.registrations (primary_guest_email);

create trigger registrations_set_updated_at
  before update on public.registrations
  for each row execute function public.set_updated_at();

create table public.guests (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.registrations(id) on delete cascade,
  full_name text not null,
  email text,
  phone text,
  created_at timestamptz not null default now()
);

create index guests_registration_id_idx on public.guests (registration_id);

create table public.guest_line_items (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid not null references public.guests(id) on delete cascade,
  sub_event_id uuid not null references public.sub_events(id) on delete restrict,
  product_id uuid not null references public.products(id) on delete restrict,
  unit_price numeric(10,2) not null,
  quantity integer not null default 1 check (quantity > 0),
  line_total numeric(12,2) not null,
  created_at timestamptz not null default now()
);

create index guest_line_items_guest_id_idx on public.guest_line_items (guest_id);
create index guest_line_items_sub_event_id_idx on public.guest_line_items (sub_event_id);
create index guest_line_items_product_id_idx on public.guest_line_items (product_id);

create table public.guest_payments (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.registrations(id) on delete cascade,
  method payment_method not null,
  status payment_status not null default 'pending',
  amount numeric(12,2) not null,
  currency char(3) not null default 'USD',
  stripe_payment_intent_id text,
  stripe_charge_id text,
  stripe_transfer_id text,
  application_fee_amount numeric(12,2),
  cleared_by uuid references public.profiles(id),
  cleared_at timestamptz,
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index guest_payments_stripe_pi_idx on public.guest_payments (stripe_payment_intent_id) where stripe_payment_intent_id is not null;
create index guest_payments_registration_id_idx on public.guest_payments (registration_id);
create index guest_payments_status_idx on public.guest_payments (status);

create trigger guest_payments_set_updated_at
  before update on public.guest_payments
  for each row execute function public.set_updated_at();

-- ============================================================================
-- Donations
-- ============================================================================

create table public.donation_fields (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  title text not null,
  description text,
  suggested_amount numeric(10,2),
  allow_custom_amount boolean not null default true,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index donation_fields_event_id_idx on public.donation_fields (event_id);

create table public.donations (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.registrations(id) on delete cascade,
  donation_field_id uuid references public.donation_fields(id) on delete set null,
  amount numeric(10,2) not null check (amount >= 0),
  created_at timestamptz not null default now()
);

create index donations_registration_id_idx on public.donations (registration_id);

-- ============================================================================
-- Stripe Connect
-- ============================================================================

create table public.stripe_accounts (
  company_id uuid primary key references public.companies(id) on delete cascade,
  stripe_account_id text unique,
  status stripe_account_status not null default 'not_connected',
  charges_enabled boolean not null default false,
  payouts_enabled boolean not null default false,
  details_submitted boolean not null default false,
  connected_at timestamptz,
  disconnected_at timestamptz,
  raw_last_webhook_event jsonb,
  updated_at timestamptz not null default now()
);

create trigger stripe_accounts_set_updated_at
  before update on public.stripe_accounts
  for each row execute function public.set_updated_at();

-- ============================================================================
-- Email templates
-- ============================================================================

create table public.email_templates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  kind email_template_kind not null,
  subject text not null,
  body_html text not null,
  is_active boolean not null default true,
  updated_at timestamptz not null default now(),
  unique (company_id, kind)
);

create trigger email_templates_set_updated_at
  before update on public.email_templates
  for each row execute function public.set_updated_at();

-- ============================================================================
-- OTP-gated sensitive actions
-- ============================================================================

create table public.otp_verifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  purpose otp_purpose not null,
  code_hash text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  attempt_count integer not null default 0,
  created_at timestamptz not null default now()
);

create index otp_verifications_lookup_idx on public.otp_verifications (profile_id, purpose, expires_at);

-- No client access at all: revoke default PostgREST-exposed grants.
revoke all on public.otp_verifications from anon, authenticated;

-- ============================================================================
-- Audit log
-- ============================================================================

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_profile_id uuid references public.profiles(id),
  action text not null,
  target_table text,
  target_id uuid,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index audit_logs_actor_created_idx on public.audit_logs (actor_profile_id, created_at desc);
create index audit_logs_target_idx on public.audit_logs (target_table, target_id);

revoke insert, update, delete on public.audit_logs from anon, authenticated;
