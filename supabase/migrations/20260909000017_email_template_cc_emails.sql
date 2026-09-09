-- Gap-audit item: old system's EmailTemplateController stored cc_emails
-- per template (an array of extra recipients CC'd on every email of that
-- kind, e.g. CCing the event manager on every registration confirmation).
-- No equivalent column existed on email_templates here. Stored as a native
-- text[] rather than the old system's json_encode()'d string, which is a
-- cleaner fit for Postgres and for send-email's use of it.

alter table public.email_templates
  add column cc_emails text[] not null default '{}';
