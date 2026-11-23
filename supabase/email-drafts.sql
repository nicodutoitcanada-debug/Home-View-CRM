-- Home View CRM: email draft preparation only.
-- Apply AFTER the existing supabase/schema.sql. Does NOT send email or alter existing tables.
create table if not exists public.email_messages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  company_id uuid references public.companies(id) on delete set null,
  created_by uuid not null references auth.users(id),
  to_email text not null check (char_length(trim(to_email)) between 3 and 320 and position('@' in to_email)>1),
  subject text not null check (char_length(trim(subject)) between 1 and 250),
  body text not null check (char_length(trim(body)) between 1 and 30000),
  legal_basis text not null default 'review_required'
    check (legal_basis in ('review_required','customer_request','express_consent','implied_consent','b2b_exemption')),
  basis_note text not null default '',
  status text not null default 'draft' check (status in ('draft','sending','sent','failed')),
  sent_at timestamptz,
  provider_message_id text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists email_messages_workspace_time
  on public.email_messages(workspace_id,created_at desc);
alter table public.email_messages enable row level security;

-- Every member may see the shared team draft list, but only the author may edit a draft.
-- Sent/sending/failed states are RESERVED for a future server-side sender.
create policy "crm email members can view" on public.email_messages
  for select to authenticated
  using (public.crm_is_member(workspace_id));
create policy "crm email authors can draft" on public.email_messages
  for insert to authenticated
  with check (
    public.crm_is_member(workspace_id)
    and created_by=(select auth.uid())
    and status='draft'
    and sent_at is null and provider_message_id is null and error_message is null
    and (company_id is null or exists(
      select 1 from public.companies c
      where c.id=company_id and c.workspace_id=email_messages.workspace_id
    ))
  );
create policy "crm email authors can edit drafts" on public.email_messages
  for update to authenticated
  using (
    public.crm_is_member(workspace_id)
    and created_by=(select auth.uid()) and status='draft'
  )
  with check (
    public.crm_is_member(workspace_id)
    and created_by=(select auth.uid()) and status='draft'
    and sent_at is null and provider_message_id is null and error_message is null
    and (company_id is null or exists(
      select 1 from public.companies c
      where c.id=company_id and c.workspace_id=email_messages.workspace_id
    ))
  );

revoke all on public.email_messages from anon;
grant select, insert, update on public.email_messages to authenticated;

-- No email send function, provider API key or shared mailbox integration in this phase.
