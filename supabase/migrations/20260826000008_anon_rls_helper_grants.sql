-- Fix: the security_invoker public_*_view views were hard-erroring for
-- anonymous (anon) callers instead of just returning zero rows.
--
-- Root cause: the RLS policies on events/companies (and everything else
-- scoped by company) include `... or public.is_admin()` /
-- `... or company_id = public.my_company_id()`. Postgres evaluates the
-- function call as part of resolving the boolean expression regardless of
-- short-circuit opportunities in this context, so when anon (no JWT,
-- auth.uid() is null) queried through a public_*_view, it hit a hard
-- "permission denied for function is_admin" error instead of the policy
-- simply evaluating to false.
--
-- Both functions only ever return a value derived from the caller's own
-- auth.uid() -- for anon that is always null, so granting execute here does
-- not expose anything; it only lets the RLS boolean expression evaluate to
-- false instead of erroring.
grant execute on function public.is_admin() to anon;
grant execute on function public.my_company_id() to anon;
