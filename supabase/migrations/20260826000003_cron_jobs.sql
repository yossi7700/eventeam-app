-- Scheduled jobs: replace the old external-HTTP-cron pattern with pg_cron.

create extension if not exists pg_cron;
create extension if not exists pg_net;

create or replace function public.flip_ended_events()
returns void
language sql
security definer set search_path = public
as $$
  update public.events
  set status = 'ended', updated_at = now()
  where status = 'active' and end_date < now();
$$;

select cron.schedule(
  'flip-ended-events',
  '*/15 * * * *',
  $$select public.flip_ended_events();$$
);

select cron.schedule(
  'cleanup-otp',
  '0 3 * * *',
  $$delete from public.otp_verifications where expires_at < now() - interval '1 day';$$
);
