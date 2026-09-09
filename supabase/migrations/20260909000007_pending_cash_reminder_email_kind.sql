-- Gap-audit item: old system's notifyCompany() emailed the company about a
-- registration with a pending cash payment, using an admin-defined
-- 'notify_company' template. Add the matching kind here so send-email can
-- resolve a template for it (company override -> platform default, same
-- as every other kind).

alter type public.email_template_kind add value if not exists 'pending_cash_reminder';
