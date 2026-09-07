-- Defense in depth: nothing previously restricted which `kind` a company
-- could write into email_templates, so a company could technically insert
-- a company_id-scoped row with kind='otp_code'. request-otp always passes
-- company_id: null when resolving the OTP template, so such a row is never
-- actually read by the real send path today -- but there's no reason to
-- leave the door open on a security-critical email kind, so companies are
-- now explicitly blocked from writing (insert/update) otp_code rows at
-- all; only company_id is null (i.e. only an admin, via is_admin()) may
-- touch them.

drop policy "email_templates: company or admin insert" on public.email_templates;
create policy "email_templates: company or admin insert" on public.email_templates
  for insert with check (
    (company_id = public.my_company_id() and kind <> 'otp_code')
    or public.is_admin()
  );

drop policy "email_templates: company or admin update" on public.email_templates;
create policy "email_templates: company or admin update" on public.email_templates
  for update using (
    (company_id = public.my_company_id() and kind <> 'otp_code')
    or public.is_admin()
  ) with check (
    (company_id = public.my_company_id() and kind <> 'otp_code')
    or public.is_admin()
  );
