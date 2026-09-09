-- Advance/default settings cascade (gap-audit item 1, 2, 3, 4).
--
-- Old system: EventAdvance (per-admin/company default) + EventMeta (per-event
-- override) for 8 boolean flags, plus a separate platform-fee cascade
-- (company -> admin -> 0) and per-product color field. This migration adds
-- the same three-tier shape (event override -> company default ->
-- hardcoded fallback) using plain nullable columns instead of an EAV table,
-- since the flag set is small, fixed, and known at schema-design time.
--
-- NOTE: the platform_settings defaults declared below do NOT match the old
-- system's real defaultFields() -- they were corrected in migration
-- 20260909000011_fix_platform_advance_defaults.sql after a closer
-- re-verification against app/Helpers/helper.php. That later migration is
-- the source of truth for the actual default values; this file is kept
-- as-is for migration history.

-- ============================================================================
-- Company-level defaults (platform_settings = hardcoded fallback tier,
-- company_settings = per-company default tier)
-- ============================================================================

alter table public.platform_settings
  add column default_is_attendees_required boolean not null default false,
  add column default_is_show_address boolean not null default false,
  add column default_is_cash_allowed boolean not null default true,
  add column default_is_donation_allowed boolean not null default false,
  add column default_is_show_regulation boolean not null default false,
  add column default_is_show_stripe boolean not null default true,
  add column default_is_show_app_fee boolean not null default true,
  add column default_is_enable_donation boolean not null default false,
  add column platform_fee_pct numeric(5,2) not null default 0.00,
  add column platform_fee_text text;

alter table public.company_settings
  add column default_is_attendees_required boolean,
  add column default_is_show_address boolean,
  add column default_is_cash_allowed boolean,
  add column default_is_donation_allowed boolean,
  add column default_is_show_regulation boolean,
  add column default_is_show_stripe boolean,
  add column default_is_show_app_fee boolean,
  add column default_is_enable_donation boolean,
  add column platform_fee_pct numeric(5,2),
  add column platform_fee_text text;

comment on column public.company_settings.default_is_attendees_required is
  'Per-company default; null falls back to platform_settings. Overridable per-event via events.override_is_attendees_required.';
comment on column public.company_settings.platform_fee_pct is
  'Per-company override of the platform fee percentage; null falls back to platform_settings.platform_fee_pct. Separate from admin_commission_pct (mirrors the old system''s getPlateformFee() vs calculateAdminCommission() split).';

-- ============================================================================
-- Event-level overrides (nullable = "inherit from company/platform")
-- ============================================================================

alter table public.events
  add column override_is_attendees_required boolean,
  add column override_is_show_address boolean,
  add column override_is_cash_allowed boolean,
  add column override_is_donation_allowed boolean,
  add column override_is_show_regulation boolean,
  add column override_is_show_stripe boolean,
  add column override_is_show_app_fee boolean,
  add column override_is_enable_donation boolean;

-- ============================================================================
-- Resolved-settings helper: given an event id, returns the effective value
-- of each flag after the event -> company -> platform cascade. Used by the
-- public event views and by create-event/update-event/register-guest so the
-- resolution logic lives in exactly one place.
-- ============================================================================

create or replace function public.resolve_event_advance_settings(p_event_id uuid)
returns table (
  is_attendees_required boolean,
  is_show_address boolean,
  is_cash_allowed boolean,
  is_donation_allowed boolean,
  is_show_regulation boolean,
  is_show_stripe boolean,
  is_show_app_fee boolean,
  is_enable_donation boolean,
  platform_fee_pct numeric,
  platform_fee_text text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(e.override_is_attendees_required, cs.default_is_attendees_required, ps.default_is_attendees_required),
    coalesce(e.override_is_show_address, cs.default_is_show_address, ps.default_is_show_address),
    coalesce(e.override_is_cash_allowed, cs.default_is_cash_allowed, ps.default_is_cash_allowed),
    coalesce(e.override_is_donation_allowed, cs.default_is_donation_allowed, ps.default_is_donation_allowed),
    coalesce(e.override_is_show_regulation, cs.default_is_show_regulation, ps.default_is_show_regulation),
    coalesce(e.override_is_show_stripe, cs.default_is_show_stripe, ps.default_is_show_stripe),
    coalesce(e.override_is_show_app_fee, cs.default_is_show_app_fee, ps.default_is_show_app_fee),
    coalesce(e.override_is_enable_donation, cs.default_is_enable_donation, ps.default_is_enable_donation),
    coalesce(cs.platform_fee_pct, ps.platform_fee_pct),
    coalesce(cs.platform_fee_text, ps.platform_fee_text)
  from public.events e
  left join public.company_settings cs on cs.company_id = e.company_id
  cross join public.platform_settings ps
  where e.id = p_event_id;
$$;

revoke execute on function public.resolve_event_advance_settings(uuid) from public, anon;
grant execute on function public.resolve_event_advance_settings(uuid) to authenticated, anon;

-- ============================================================================
-- Ticket type (product) color field -- gap-audit item 3.
-- ============================================================================

alter table public.products
  add column color text;

comment on column public.products.color is
  'Hex color (e.g. #4f46e5) used to visually distinguish this ticket type on the public booking page and dashboard, matching the old system''s Product.color field.';
