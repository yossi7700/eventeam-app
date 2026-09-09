-- Gap-audit item: old system's LoginController::register()/UserController::create()
-- sent a 'signup_template' email the moment a company account was created.
-- The 'company_signup' email_template_kind exists here (fully editable in
-- Settings) but nothing ever triggered it -- the onboarding flow does a
-- direct client-side insert into companies with no Edge Function in the
-- loop to call send-email from.
--
-- Fixed by extending handle_new_company() (already fires on company
-- creation to seed company_settings) to also fire the signup email via
-- pg_net, using the same Vault-secret pattern as send_thank_you_emails --
-- safely no-ops until the user sets the service_role_key secret
-- themselves (documented in TODO-FOR-YOSSI.md).

create or replace function public.handle_new_company()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_service_key text;
  v_project_url text := 'https://nauyrqtdlqdqyxgrdlex.supabase.co';
begin
  insert into public.company_settings (company_id)
  values (new.id)
  on conflict (company_id) do nothing;

  select decrypted_secret into v_service_key
  from vault.decrypted_secrets
  where name = 'service_role_key';

  if v_service_key is not null then
    perform net.http_post(
      url := v_project_url || '/functions/v1/send-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_service_key
      ),
      body := jsonb_build_object(
        'kind', 'company_signup',
        'to', new.contact_email,
        'company_id', new.id,
        'variables', jsonb_build_object('company_name', new.name)
      )
    );
  end if;

  return new;
end;
$$;
