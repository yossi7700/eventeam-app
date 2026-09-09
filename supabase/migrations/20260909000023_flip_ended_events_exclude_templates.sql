-- Bug fix caught by re-verifying against the old system's
-- HomeController::eventStatusHandler(): the old cron excluded admin
-- master-template events (is_auto = 0 filter, i.e. "not an auto-template",
-- combined with user_id <> adminId()) from the auto-ended-flip. This
-- version had no equivalent exclusion for is_master_template, so a
-- template event with a manually-set status='active' and a past end_date
-- would get silently flipped to 'ended' by this cron -- confusing state
-- for something templates-client.tsx doesn't even filter on (a low-
-- severity edge case, but a real correctness bug in what the cron
-- touches).

create or replace function public.flip_ended_events()
returns void
language sql
security definer set search_path = public
as $$
  update public.events
  set status = 'ended', updated_at = now()
  where status = 'active' and end_date < now() and not is_master_template;
$$;
