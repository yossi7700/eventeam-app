-- Storage buckets per the plan. Public-read buckets for branding/media
-- assets shown on public pages; a private bucket for generated exports
-- accessed only via short-lived signed URLs from export-leads-csv.

insert into storage.buckets (id, name, public)
values
  ('avatars', 'avatars', true),
  ('company-logos', 'company-logos', true),
  ('front-page-assets', 'front-page-assets', true),
  ('event-images', 'event-images', true),
  ('exports', 'exports', false)
on conflict (id) do nothing;

-- avatars: user manages their own {profile_id}/* path, public read
create policy "avatars: public read" on storage.objects
  for select using (bucket_id = 'avatars');
create policy "avatars: owner manage" on storage.objects
  for all using (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text
  ) with check (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- company-logos: company manages own {company_id}/* path, public read
create policy "company-logos: public read" on storage.objects
  for select using (bucket_id = 'company-logos');
create policy "company-logos: owner manage" on storage.objects
  for all using (
    bucket_id = 'company-logos'
    and (storage.foldername(name))[1] = (select public.my_company_id())::text
  ) with check (
    bucket_id = 'company-logos'
    and (storage.foldername(name))[1] = (select public.my_company_id())::text
  );

-- front-page-assets: company manages own {company_id}/* path, public read
create policy "front-page-assets: public read" on storage.objects
  for select using (bucket_id = 'front-page-assets');
create policy "front-page-assets: owner manage" on storage.objects
  for all using (
    bucket_id = 'front-page-assets'
    and (storage.foldername(name))[1] = (select public.my_company_id())::text
  ) with check (
    bucket_id = 'front-page-assets'
    and (storage.foldername(name))[1] = (select public.my_company_id())::text
  );

-- event-images: company manages own {event_id}/* path (validated by
-- checking the event belongs to them), public read
create policy "event-images: public read" on storage.objects
  for select using (bucket_id = 'event-images');
create policy "event-images: owner manage" on storage.objects
  for all using (
    bucket_id = 'event-images'
    and exists (
      select 1 from public.events e
      where e.id::text = (storage.foldername(name))[1]
        and (e.company_id = public.my_company_id() or public.is_admin())
    )
  ) with check (
    bucket_id = 'event-images'
    and exists (
      select 1 from public.events e
      where e.id::text = (storage.foldername(name))[1]
        and (e.company_id = public.my_company_id() or public.is_admin())
    )
  );

-- exports: no client access at all. Only the export-leads-csv Edge Function
-- (service role) writes here; downloads happen exclusively via short-lived
-- signed URLs it generates, never a direct authenticated/anon bucket read.
