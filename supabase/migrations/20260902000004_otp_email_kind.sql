-- Adds a dedicated "otp_code" email_template_kind. request-otp originally
-- reused the "thank_you" kind as a placeholder, which is actively wrong:
-- it would send whatever content a company configured for "thank you"
-- (or nothing, if none exists) instead of the actual OTP code, and a
-- company-level override could accidentally clobber a security-critical
-- email. OTP delivery is platform-owned and must not depend on any
-- company having configured anything, so this ships with a seeded
-- platform-default (company_id null) template that can't be touched by a
-- company since email_templates RLS only lets companies write their own
-- company_id rows.

alter type email_template_kind add value 'otp_code';

-- Bug found while adding this: `unique (company_id, kind)` uses standard
-- Postgres NULL semantics, where NULL <> NULL -- so it does NOT actually
-- prevent two platform-default (company_id is null) rows for the same
-- kind from being inserted. Nothing relied on that gap yet, but the next
-- migration's ON CONFLICT (company_id, kind) needs it fixed to behave
-- correctly for platform-default rows, and it's a real integrity gap
-- regardless (an admin could otherwise create duplicate platform
-- defaults). NULLS NOT DISTINCT (Postgres 15+) makes NULL = NULL for
-- uniqueness purposes, closing the gap.
alter table public.email_templates drop constraint email_templates_company_id_kind_key;
alter table public.email_templates add constraint email_templates_company_id_kind_key
  unique nulls not distinct (company_id, kind);
