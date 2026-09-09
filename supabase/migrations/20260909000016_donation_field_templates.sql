-- Gap-audit item (architecturally significant, user-confirmed 2026-09-09):
-- old system's CompanyDonationFields was a per-company reusable catalog of
-- donation definitions (title, amount, description, status), and
-- EventDonation was just a join table selecting which of a company's
-- catalog entries applied to a given event (see
-- apiHelper.php::storeEventDonations and CompanyDonationFieldController).
-- This rebuild's donation_fields table was per-event only, with no
-- reusable catalog -- every event required re-typing the same donation
-- fields from scratch, a real UX regression from the old system.
--
-- Fix: add donation_field_templates as the company-level reusable catalog
-- (mirrors CompanyDonationFields), and add donation_fields.template_id so
-- a per-event donation field can optionally originate from a template
-- (pre-filled, but still independently editable/deletable per event --
-- matches the old system's model where EventDonation rows could be
-- deleted/recreated per event without touching the company's catalog).

create table public.donation_field_templates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  title text not null,
  description text,
  suggested_amount numeric(10,2),
  allow_custom_amount boolean not null default true,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, title)
);

create index donation_field_templates_company_id_idx on public.donation_field_templates (company_id);

create trigger donation_field_templates_set_updated_at
  before update on public.donation_field_templates
  for each row execute function public.set_updated_at();

alter table public.donation_fields
  add column template_id uuid references public.donation_field_templates(id) on delete set null;

alter table public.donation_field_templates enable row level security;

create policy "donation_field_templates: company or admin select" on public.donation_field_templates
  for select using (company_id = public.my_company_id() or public.is_admin());

create policy "donation_field_templates: company or admin insert" on public.donation_field_templates
  for insert with check (company_id = public.my_company_id() or public.is_admin());

create policy "donation_field_templates: company or admin update" on public.donation_field_templates
  for update using (company_id = public.my_company_id() or public.is_admin())
  with check (company_id = public.my_company_id() or public.is_admin());

create policy "donation_field_templates: company or admin delete" on public.donation_field_templates
  for delete using (company_id = public.my_company_id() or public.is_admin());
