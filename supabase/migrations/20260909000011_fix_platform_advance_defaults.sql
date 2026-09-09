-- Bug fix caught by re-verifying against the old system's actual source
-- (app/Helpers/helper.php defaultFields()): the platform-wide hardcoded
-- fallback defaults set in 20260909000001 were wrong for 5 of the 8 flags
-- -- effectively inverted from what the old system actually shipped as
-- its "out of the box" behavior. Corrected to match defaultFields() exactly:
--   is_attendees_required = true   (was false)
--   is_show_address       = true   (was false)
--   is_cash_allowed       = false  (was true)
--   is_donation_allowed   = true   (was false)
--   is_show_regulation    = true   (was false)
--   is_show_stripe        = true   (unchanged, already correct)
--   is_show_app_fee       = true   (unchanged, already correct)
--   is_enable_donation    = true   (was false)

update public.platform_settings set
  default_is_attendees_required = true,
  default_is_show_address = true,
  default_is_cash_allowed = false,
  default_is_donation_allowed = true,
  default_is_show_regulation = true,
  default_is_enable_donation = true;

alter table public.platform_settings
  alter column default_is_attendees_required set default true,
  alter column default_is_show_address set default true,
  alter column default_is_cash_allowed set default false,
  alter column default_is_donation_allowed set default true,
  alter column default_is_show_regulation set default true,
  alter column default_is_enable_donation set default true;
