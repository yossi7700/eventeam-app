-- Gap-audit item found on closer re-verification: regulation_text,
-- donation_field_text, and cod_text are companion free-text fields the old
-- system copied from admin to every new company (see the adminKeys list in
-- LoginController::register / UserController::create), meant to be shown
-- alongside their corresponding advance-setting toggles on the public
-- booking page (is_show_regulation -> regulation_text, is_donation_allowed
-- -> donation_field_text, is_cash_allowed -> cod_text i.e. "cash on
-- delivery" instructions). None of these three existed anywhere in the
-- rebuild -- the toggles existed but had no text to actually display.
--
-- privacy_policy is deliberately NOT ported here: it was admin-only in the
-- old system with no API route at all (confirmed dead in the original
-- audit), so there is no company-level equivalent to add.

alter table public.company_settings
  add column regulation_text text,
  add column donation_field_text text,
  add column cod_text text;
