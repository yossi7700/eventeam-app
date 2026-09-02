-- Root-cause fix for the missing-company_settings bug: rather than relying
-- on every future consumer to remember to defensively handle a
-- company_settings row not existing, create one automatically the moment a
-- company is created. This makes "a company has settings" an actual
-- invariant instead of an assumption, matching how handle_new_user()
-- already guarantees every auth user gets a profiles row.

create or replace function public.handle_new_company()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.company_settings (company_id)
  values (new.id)
  on conflict (company_id) do nothing;
  return new;
end;
$$;

create trigger on_company_created
  after insert on public.companies
  for each row execute function public.handle_new_company();

revoke execute on function public.handle_new_company() from public, anon, authenticated;

-- Backfill: any existing company (from earlier testing) that predates this
-- trigger should also get a default settings row.
insert into public.company_settings (company_id)
select c.id from public.companies c
left join public.company_settings cs on cs.company_id = c.id
where cs.company_id is null;
