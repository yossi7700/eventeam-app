-- Seeds the platform-default OTP email template. Must run in a separate
-- migration/transaction from the enum-value addition (Postgres disallows
-- using a newly-added enum value in the same transaction that added it).

insert into public.email_templates (company_id, kind, subject, body_html, is_active)
values (
  null,
  'otp_code',
  'Your EvenTeam verification code',
  '<p>Your verification code is <strong>{{otp_code}}</strong>. It expires in 10 minutes.</p><p>If you did not request this, you can safely ignore this email.</p>',
  true
)
on conflict (company_id, kind) do nothing;
