-- Gap-audit item: old system's HomeController::sendEmailToRegistrants was a
-- cron job that, once a day, found events whose end_date was yesterday and
-- hadn't had feedback sent yet, deduped registrants by email across those
-- events, and emailed each one the admin's 'after_event_end' template. That
-- automation had no equivalent anywhere in the rebuild -- the 'thank_you'
-- email kind exists and is fully editable in Settings, but nothing ever
-- triggers it. This closes that gap using the existing 'thank_you' kind
-- (equivalent purpose to the old 'after_event_end') and pg_cron + pg_net,
-- following the same pattern as flip_ended_events.
--
-- Deliberately built against `registrations` (this system's one clean,
-- live registration model) rather than the old system's actual
-- implementation, which operated on the dead Registrant/RegistrantDetail
-- schema that the rest of this rebuild never carried forward.

alter table public.events
  add column thank_you_sent_at timestamptz;

create or replace function public.send_thank_you_emails()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event record;
  v_recipient record;
  v_service_key text;
  v_project_url text := 'https://nauyrqtdlqdqyxgrdlex.supabase.co';
begin
  select decrypted_secret into v_service_key
  from vault.decrypted_secrets
  where name = 'service_role_key';

  if v_service_key is null then
    raise notice 'send_thank_you_emails: service_role_key not found in Vault, skipping this run';
    return;
  end if;

  for v_event in
    select e.id, e.title, e.company_id
    from public.events e
    where e.status = 'ended'
      and e.thank_you_sent_at is null
      and e.end_date < now() - interval '1 day'
      and e.end_date > now() - interval '2 days'
  loop
    -- One email per unique address across this event's registrations,
    -- matching the old system's per-email dedup (a guest who registered
    -- twice for the same event gets one thank-you, not two). The primary
    -- registrant's email and each named guest's email are both real,
    -- independent recipients on the same registration -- they must be
    -- UNIONed, not coalesced, or the primary registrant's own email is
    -- silently dropped whenever any guest row also has an email set.
    for v_recipient in
      select distinct on (email) email, full_name
      from (
        select r.primary_guest_email as email, r.primary_guest_name as full_name
        from public.registrations r
        where r.event_id = v_event.id and r.status = 'confirmed'
        union all
        select g.email, g.full_name
        from public.registrations r
        join public.guests g on g.registration_id = r.id
        where r.event_id = v_event.id and r.status = 'confirmed' and g.email is not null
      ) recipients
      where email is not null
    loop
      perform net.http_post(
        url := v_project_url || '/functions/v1/send-email',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || v_service_key
        ),
        body := jsonb_build_object(
          'kind', 'thank_you',
          'to', v_recipient.email,
          'company_id', v_event.company_id,
          'variables', jsonb_build_object(
            'guest_name', v_recipient.full_name,
            'event_title', v_event.title
          )
        )
      );
    end loop;

    update public.events set thank_you_sent_at = now() where id = v_event.id;
  end loop;
end;
$$;

select cron.schedule(
  'send-thank-you-emails',
  '0 10 * * *',
  $$select public.send_thank_you_emails();$$
);
