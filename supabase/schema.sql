-- HOME VIEW CRM v1
-- Run once in the Supabase SQL Editor, on a NEW project.
-- Secure multi-user sales CRM. No sensitive keys in frontend.
create extension if not exists pgcrypto;

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 160),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
create table if not exists public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  role text not null default 'member' check(role in ('admin','member')),
  joined_at timestamptz not null default now(),
  primary key(workspace_id,user_id)
);
create unique index if not exists workspace_members_one_workspace_per_user on public.workspace_members(user_id);
create table if not exists public.workspace_invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  email text not null,
  invited_by uuid not null references auth.users(id),
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  unique(workspace_id,email),
  check(email=lower(trim(email)))
);
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null check(length(trim(name))>0),
  city text,
  province text,
  phone text,
  website text,
  status text not null default 'prospect' check(status in('prospect','contacted','meeting','proposal','negotiation','won','lost')),
  priority text not null default 'warm' check(priority in('hot','warm','cold')),
  assigned_to uuid references auth.users(id) on delete set null,
  estimated_value numeric(14,2) check(estimated_value>=0),
  description text,
  created_at timestamptz not null default now()
);
create index if not exists crm_companies_workspace on public.companies(workspace_id,status);
create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null check(length(trim(name))>0),
  title text,
  email text,
  phone text,
  created_at timestamptz not null default now()
);
create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  type text not null default 'note' check(type in('note','call','meeting','email')),
  content text not null check(length(trim(content))>0),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists crm_activities_company_time on public.activities(company_id,created_at desc);
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  company_id uuid references public.companies(id) on delete set null,
  title text not null check(length(trim(title))>0),
  assigned_to uuid references auth.users(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  priority text not null default 'normal' check(priority in('normal','high')),
  due_date date,
  completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists crm_tasks_workspace_due on public.tasks(workspace_id,due_date);

-- SECURITY DEFINER function avoids recursive policies on workspace_members.
create or replace function public.crm_is_member(wid uuid)
returns boolean language sql stable security definer set search_path=''
as $$ select exists(select 1 from public.workspace_members m where m.workspace_id=wid and m.user_id=(select auth.uid())); $$;
create or replace function public.crm_is_admin(wid uuid)
returns boolean language sql stable security definer set search_path=''
as $$ select exists(select 1 from public.workspace_members m where m.workspace_id=wid and m.user_id=(select auth.uid()) and m.role='admin'); $$;
revoke all on function public.crm_is_member(uuid) from public;
revoke all on function public.crm_is_admin(uuid) from public;
grant execute on function public.crm_is_member(uuid) to authenticated;
grant execute on function public.crm_is_admin(uuid) to authenticated;

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.workspace_invites enable row level security;
alter table public.companies enable row level security;
alter table public.contacts enable row level security;
alter table public.activities enable row level security;
alter table public.tasks enable row level security;

create policy "members read workspace" on public.workspaces for select to authenticated using(public.crm_is_member(id));
create policy "members read members" on public.workspace_members for select to authenticated using(public.crm_is_member(workspace_id));
create policy "admins read invites" on public.workspace_invites for select to authenticated using(public.crm_is_admin(workspace_id));
create policy "admins create invites" on public.workspace_invites for insert to authenticated with check(public.crm_is_admin(workspace_id) and invited_by=(select auth.uid()));
create policy "members read companies" on public.companies for select to authenticated using(public.crm_is_member(workspace_id));
create policy "members add companies" on public.companies for insert to authenticated with check(public.crm_is_member(workspace_id));
create policy "members edit companies" on public.companies for update to authenticated using(public.crm_is_member(workspace_id)) with check(public.crm_is_member(workspace_id));
create policy "members read contacts" on public.contacts for select to authenticated using(public.crm_is_member(workspace_id));
create policy "members add contacts" on public.contacts for insert to authenticated with check(public.crm_is_member(workspace_id) and exists(select 1 from public.companies c where c.id=company_id and c.workspace_id=contacts.workspace_id));
create policy "members edit contacts" on public.contacts for update to authenticated using(public.crm_is_member(workspace_id)) with check(public.crm_is_member(workspace_id) and exists(select 1 from public.companies c where c.id=company_id and c.workspace_id=contacts.workspace_id));
create policy "members read activities" on public.activities for select to authenticated using(public.crm_is_member(workspace_id));
create policy "members add activities" on public.activities for insert to authenticated with check(public.crm_is_member(workspace_id) and created_by=(select auth.uid()) and exists(select 1 from public.companies c where c.id=company_id and c.workspace_id=activities.workspace_id));
create policy "members read tasks" on public.tasks for select to authenticated using(public.crm_is_member(workspace_id));
create policy "members add tasks" on public.tasks for insert to authenticated with check(public.crm_is_member(workspace_id) and created_by=(select auth.uid()) and (company_id is null or exists(select 1 from public.companies c where c.id=company_id and c.workspace_id=tasks.workspace_id)));
create policy "members edit tasks" on public.tasks for update to authenticated using(public.crm_is_member(workspace_id)) with check(public.crm_is_member(workspace_id) and (company_id is null or exists(select 1 from public.companies c where c.id=company_id and c.workspace_id=tasks.workspace_id)));

-- Workspace creation and invitation claiming are the only membership-mutating entry points.
-- Registered users can create their first workspace; only an admin can invite another member.
create or replace function public.create_workspace(workspace_name text)
returns uuid language plpgsql security definer set search_path=''
as $$
declare wid uuid; caller uuid; address text;
begin
  caller := auth.uid();
  if caller is null then raise exception 'You must sign in first'; end if;
  if length(trim(coalesce(workspace_name,'')))<2 or length(workspace_name)>160 then raise exception 'Invalid workspace name'; end if;
  if exists(select 1 from public.workspace_members where user_id=caller) then raise exception 'You already belong to a workspace'; end if;
  select lower(email) into address from auth.users where id=caller and email_confirmed_at is not null;
  if address is null then raise exception 'Verify your email before creating a workspace'; end if;
  insert into public.workspaces(name,created_by) values(trim(workspace_name),caller) returning id into wid;
  insert into public.workspace_members(workspace_id,user_id,email,display_name,role)
  values(wid,caller,address,split_part(address,'@',1),'admin');
  return wid;
end;$$;
create or replace function public.claim_invites()
returns integer language plpgsql security definer set search_path=''
as $$
declare caller uuid; address text; inv record; n integer:=0;
begin
 caller:=auth.uid();
 if caller is null then raise exception 'Sign in first'; end if;
 select lower(email) into address from auth.users where id=caller and email_confirmed_at is not null;
 if address is null then return 0; end if;
 if exists(select 1 from public.workspace_members where user_id=caller) then return 0; end if;
 select * into inv from public.workspace_invites where email=address and accepted_at is null order by created_at desc limit 1 for update;
 if not found then return 0; end if;
 insert into public.workspace_members(workspace_id,user_id,email,display_name,role)
 values(inv.workspace_id,caller,address,split_part(address,'@',1),'member');
 update public.workspace_invites set accepted_at=now() where id=inv.id;
 return 1;
end;$$;
revoke all on function public.create_workspace(text) from public;
revoke all on function public.claim_invites() from public;
grant execute on function public.create_workspace(text) to authenticated;
grant execute on function public.claim_invites() to authenticated;

-- Explicit Data API privileges (Supabase changed defaults on October 30, 2026).
-- Signed-out visitors may not read or write any CRM tables.
revoke all on table public.workspaces, public.workspace_members,
  public.workspace_invites, public.companies, public.contacts,
  public.activities, public.tasks from anon;
grant usage on schema public to authenticated;
grant select on table public.workspaces, public.workspace_members to authenticated;
grant select, insert on table public.workspace_invites to authenticated;
grant select, insert, update on table public.companies,
  public.contacts, public.tasks to authenticated;
grant select, insert on table public.activities to authenticated;
-- RPCs deliberately accept only verified authenticated users.
-- Their code checks auth.uid() and workspace membership before mutations.
revoke execute on function public.create_workspace(text) from anon;
revoke execute on function public.claim_invites() from anon;
revoke execute on function public.crm_is_member(uuid) from anon;
revoke execute on function public.crm_is_admin(uuid) from anon;

-- Realtime change feed requires publication enrollment.
-- Publication may already exist; this block is safe to execute once.
do $$ begin
  alter publication supabase_realtime add table public.companies;
  alter publication supabase_realtime add table public.contacts;
  alter publication supabase_realtime add table public.activities;
  alter publication supabase_realtime add table public.tasks;
  alter publication supabase_realtime add table public.workspace_members;
  alter publication supabase_realtime add table public.workspace_invites;
exception when duplicate_object then null;
end $$;
