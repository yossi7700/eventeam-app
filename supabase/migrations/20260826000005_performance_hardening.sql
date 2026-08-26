-- Performance hardening pass (based on Supabase performance advisor findings).

-- Missing covering indexes on foreign keys.
create index companies_approved_by_idx on public.companies (approved_by);
create index donations_donation_field_id_idx on public.donations (donation_field_id);
create index events_template_id_idx on public.events (template_id);
create index guest_payments_cleared_by_idx on public.guest_payments (cleared_by);

-- RLS policies were calling auth.uid()/auth.<fn>() directly, which Postgres
-- re-evaluates per row instead of once per query. Wrapping in `(select ...)`
-- lets the planner treat it as a stable initplan value, which matters once
-- these tables have real row counts (events/registrations lists, etc.).

drop policy "profiles: self or admin select" on public.profiles;
create policy "profiles: self or admin select" on public.profiles
  for select using (id = (select auth.uid()) or public.is_admin());

drop policy "profiles: self update" on public.profiles;
create policy "profiles: self update" on public.profiles
  for update using (id = (select auth.uid()) or public.is_admin())
  with check (id = (select auth.uid()) or public.is_admin());

drop policy "companies: owner or admin select" on public.companies;
create policy "companies: owner or admin select" on public.companies
  for select using (profile_id = (select auth.uid()) or public.is_admin());

drop policy "companies: owner insert" on public.companies;
create policy "companies: owner insert" on public.companies
  for insert with check (profile_id = (select auth.uid()));

drop policy "companies: owner or admin update" on public.companies;
create policy "companies: owner or admin update" on public.companies
  for update using (profile_id = (select auth.uid()) or public.is_admin())
  with check (profile_id = (select auth.uid()) or public.is_admin());
