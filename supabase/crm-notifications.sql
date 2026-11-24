-- HVS CRM Alerts v1. Additive migration; does not overwrite existing company,
-- contact, activity or task data. Private backup: crm_backup_20261124.
create schema if not exists crm_internal;
revoke all on schema crm_internal from public, anon, authenticated;

create table public.crm_notifications (
 id uuid primary key default gen_random_uuid(),
 workspace_id uuid not null references public.workspaces(id) on delete cascade,
 recipient_id uuid not null references auth.users(id) on delete cascade,
 actor_id uuid references auth.users(id) on delete set null,
 event_kind text not null check(event_kind in('company_added','company_changed','activity_added','task_assigned','email_draft','email_sent','email_received')),
 title text not null check(length(title) between 1 and 180),
 message text not null default '',
 company_id uuid references public.companies(id) on delete set null,
 task_id uuid references public.tasks(id) on delete set null,
 email_id uuid references public.email_messages(id) on delete set null,
 read_at timestamptz,
 push_claimed_at timestamptz,
 created_at timestamptz not null default now()
);
create index crm_notifications_recipient_time on public.crm_notifications(recipient_id,created_at desc);
alter table public.crm_notifications enable row level security;
create policy "recipient reads own CRM alerts" on public.crm_notifications
 for select to authenticated
 using (recipient_id=(select auth.uid()) and public.crm_is_member(workspace_id));
create policy "recipient marks own CRM alert read" on public.crm_notifications
 for update to authenticated
 using (recipient_id=(select auth.uid()) and public.crm_is_member(workspace_id))
 with check (recipient_id=(select auth.uid()) and public.crm_is_member(workspace_id));
revoke all on public.crm_notifications from anon, authenticated;
grant select, update(read_at) on public.crm_notifications to authenticated;

create table public.crm_notification_settings (
 user_id uuid primary key references auth.users(id) on delete cascade,
 workspace_id uuid not null references public.workspaces(id) on delete cascade,
 enabled boolean not null default true,
 company_alerts boolean not null default true,
 activity_alerts boolean not null default true,
 task_alerts boolean not null default true,
 email_alerts boolean not null default true,
 updated_at timestamptz not null default now()
);
alter table public.crm_notification_settings enable row level security;
create policy "CRM users read own alert settings" on public.crm_notification_settings
 for select to authenticated
 using (user_id=(select auth.uid()) and public.crm_is_member(workspace_id));
create policy "CRM users create own alert settings" on public.crm_notification_settings
 for insert to authenticated
 with check (user_id=(select auth.uid()) and public.crm_is_member(workspace_id));
create policy "CRM users update own alert settings" on public.crm_notification_settings
 for update to authenticated
 using (user_id=(select auth.uid()) and public.crm_is_member(workspace_id))
 with check (user_id=(select auth.uid()) and public.crm_is_member(workspace_id));
revoke all on public.crm_notification_settings from anon, authenticated;
grant select, insert on public.crm_notification_settings to authenticated;
grant update(enabled,company_alerts,activity_alerts,task_alerts,email_alerts,updated_at) on public.crm_notification_settings to authenticated;

create table public.crm_push_subscriptions (
 id uuid primary key default gen_random_uuid(),
 workspace_id uuid not null references public.workspaces(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 endpoint text not null unique check(endpoint like 'https://%' and length(endpoint)<3000),
 p256dh text,
 auth text,
 device_label text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index crm_push_subscriptions_by_user on public.crm_push_subscriptions(user_id);
alter table public.crm_push_subscriptions enable row level security;
create policy "CRM users read own push devices" on public.crm_push_subscriptions
 for select to authenticated using(user_id=(select auth.uid()) and public.crm_is_member(workspace_id));
create policy "CRM users register own push devices" on public.crm_push_subscriptions
 for insert to authenticated with check(user_id=(select auth.uid()) and public.crm_is_member(workspace_id));
create policy "CRM users update own push devices" on public.crm_push_subscriptions
 for update to authenticated using(user_id=(select auth.uid()) and public.crm_is_member(workspace_id))
 with check(user_id=(select auth.uid()) and public.crm_is_member(workspace_id));
create policy "CRM users delete own push devices" on public.crm_push_subscriptions
 for delete to authenticated using(user_id=(select auth.uid()) and public.crm_is_member(workspace_id));
revoke all on public.crm_push_subscriptions from anon;
grant select,insert,update,delete on public.crm_push_subscriptions to authenticated;

-- Reusable internal routine. Only triggers call it; never expose as a public RPC.
create function crm_internal.alert_team(
  p_workspace uuid, p_actor uuid, p_kind text, p_title text, p_message text,
  p_company uuid default null, p_task uuid default null, p_email uuid default null,
  p_audience text default 'admins', p_assignee uuid default null
) returns void language sql security definer set search_path='' as $$
 insert into public.crm_notifications(workspace_id,recipient_id,actor_id,event_kind,title,message,company_id,task_id,email_id)
 select p_workspace,m.user_id,p_actor,p_kind,left(p_title,180),left(p_message,600),
 p_company,p_task,p_email
 from public.workspace_members m
 left join public.crm_notification_settings s on s.user_id=m.user_id and s.workspace_id=m.workspace_id
 where m.workspace_id=p_workspace
 and m.user_id is distinct from p_actor
 and (
   p_audience='team'
   or m.role='admin'
   or (p_audience='admins_assignee' and m.user_id=p_assignee)
 )
 and coalesce(s.enabled,true)
 and (case
  when p_kind in ('company_added','company_changed') then coalesce(s.company_alerts,true)
  when p_kind='activity_added' then coalesce(s.activity_alerts,true)
  when p_kind='task_assigned' then coalesce(s.task_alerts,true)
  else coalesce(s.email_alerts,true)
 end);
$$;
revoke all on function crm_internal.alert_team(uuid,uuid,text,text,text,uuid,uuid,uuid,text,uuid) from public, anon, authenticated;

create function crm_internal.notify_company_changes()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if TG_OP='INSERT' then
  perform crm_internal.alert_team(new.workspace_id, auth.uid(), 'company_added',
    'New potential customer', new.name||' was added to the CRM.',new.id,null,null,
    'admins_assignee',new.assigned_to);
 elsif new.status is distinct from old.status or new.assigned_to is distinct from old.assigned_to then
  perform crm_internal.alert_team(new.workspace_id, auth.uid(), 'company_changed',
    'Customer record updated',new.name||' — status or assignment changed.',new.id,null,null,
    'admins_assignee',new.assigned_to);
 end if;
 return new;
end;
$$;
create trigger hvs_notify_company after insert or update on public.companies
 for each row execute function crm_internal.notify_company_changes();

create function crm_internal.notify_activity_added()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 perform crm_internal.alert_team(new.workspace_id,coalesce(new.created_by,auth.uid()),
   'activity_added','New customer activity',
   'A '||coalesce(new.type,'note')||' was logged for '||coalesce((select name from public.companies where id=new.company_id),'a customer')||'.',
   new.company_id,null,null,'team');
 return new;
end;
$$;
create trigger hvs_notify_activity after insert on public.activities
 for each row execute function crm_internal.notify_activity_added();

create function crm_internal.notify_task_change()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if TG_OP='INSERT' or new.assigned_to is distinct from old.assigned_to then
  perform crm_internal.alert_team(new.workspace_id,auth.uid(),'task_assigned','Follow-up task assigned',
   new.title,new.company_id,new.id,null,'admins_assignee',new.assigned_to);
 end if;
 return new;
end;
$$;
create trigger hvs_notify_task after insert or update on public.tasks
 for each row execute function crm_internal.notify_task_change();

create function crm_internal.notify_email_draft()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if TG_OP='INSERT' and new.status='draft' then
  perform crm_internal.alert_team(new.workspace_id,new.created_by,'email_draft',
    'New follow-up email draft',new.subject,new.company_id,null,new.id,'admins');
 end if;
 return new;
end;
$$;
create trigger hvs_notify_email_draft after insert on public.email_messages
 for each row execute function crm_internal.notify_email_draft();

do $$ begin
 if not exists(
   select 1 from pg_publication_tables
   where pubname='supabase_realtime' and schemaname='public' and tablename='crm_notifications'
 ) then
  alter publication supabase_realtime add table public.crm_notifications;
 end if;
end $$;
