-- Incremental CRM alerts tuning and protected dispatcher claim function.
-- Does not alter or remove any customer data.

create or replace function crm_internal.notify_company_changes()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if TG_OP='INSERT' then
  perform crm_internal.alert_team(new.workspace_id,auth.uid(),'company_added',
    'New potential customer',new.name||' was added to the CRM.',new.id,null,null,'admins_assignee',new.assigned_to);
 elsif new.description is distinct from old.description then
  perform crm_internal.alert_team(new.workspace_id,auth.uid(),'company_changed',
    'Customer notes updated',new.name||' — company notes were changed.',new.id,null,null,'team');
 elsif new.status is distinct from old.status or new.assigned_to is distinct from old.assigned_to then
  perform crm_internal.alert_team(new.workspace_id,auth.uid(),'company_changed',
    'Customer record updated',new.name||' — status or assignment changed.',new.id,null,null,'admins_assignee',new.assigned_to);
 end if;
 return new;
end;
$$;

-- Only the server-side Edge Function with an admin key may claim an alert for push delivery.
create function public.crm_claim_push_alert(alert_id uuid)
returns boolean language plpgsql security definer set search_path='' as $$
declare touched integer;
begin
 update public.crm_notifications
    set push_claimed_at=now()
  where id=alert_id and push_claimed_at is null;
 get diagnostics touched=row_count;
 return touched=1;
end;
$$;
revoke all on function public.crm_claim_push_alert(uuid) from public,anon,authenticated;
grant execute on function public.crm_claim_push_alert(uuid) to service_role;
