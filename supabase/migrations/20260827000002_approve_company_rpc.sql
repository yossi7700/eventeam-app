-- Admin approves or rejects a pending company. Writes an audit log entry
-- atomically with the status change (the old system had no audit trail at
-- all for this kind of action).

create or replace function public.approve_or_reject_company(
  p_company_id uuid,
  p_approve boolean,
  p_rejected_reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_profile_id uuid := auth.uid();
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;

  if p_approve then
    update public.companies set
      status = 'active',
      approved_at = now(),
      approved_by = v_admin_profile_id,
      rejected_reason = null
    where id = p_company_id;

    insert into public.audit_logs (actor_profile_id, action, target_table, target_id)
    values (v_admin_profile_id, 'company.approve', 'companies', p_company_id);
  else
    update public.companies set
      status = 'rejected',
      rejected_reason = p_rejected_reason
    where id = p_company_id;

    insert into public.audit_logs (actor_profile_id, action, target_table, target_id, metadata)
    values (v_admin_profile_id, 'company.reject', 'companies', p_company_id, jsonb_build_object('reason', p_rejected_reason));
  end if;
end;
$$;

revoke execute on function public.approve_or_reject_company(uuid, boolean, text) from public, anon;
grant execute on function public.approve_or_reject_company(uuid, boolean, text) to authenticated;
