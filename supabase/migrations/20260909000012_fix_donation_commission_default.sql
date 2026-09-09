-- Bug fix caught by re-verifying against the old system's actual source
-- (calculateAdminCommission() in app/Helpers/helper.php): the old system
-- reads settings('get_donation_percentage', adminId()) which returns NULL
-- when unset (Setting::where(...)->value('value') with no matching row),
-- and `null == 1` is false in PHP -- so the old system's real default is
-- isDonationEnabled = false, meaning commission EXCLUDES donations by
-- default. donation_excluded_from_commission's default of `false` here
-- had the opposite effect (commission INCLUDES donations by default),
-- inverted from the old system's actual out-of-the-box behavior.
--
-- User confirmed (2026-09-09): correct the default to match the old
-- system, and update the existing test row (pre-launch data, no real
-- companies/registrations yet) to match.

alter table public.company_settings
  alter column donation_excluded_from_commission set default true;

update public.company_settings
set donation_excluded_from_commission = true
where donation_excluded_from_commission = false;
