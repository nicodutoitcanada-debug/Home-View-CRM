# HOME VIEW CRM

Private sales data, simple shared workflow. Responsive CRM frontend for Home View Solutions, hosted on GitHub Pages.

## Open the app

**Live site:** https://nicodutoitcanada-debug.github.io/Home-View-CRM/

The site starts with a clearly marked preview containing **fictional builders only**. Preview data is temporary: it is not real sales data and does not sync between browsers.

## Connect Supabase (one-time setup)

1. Create a fresh Supabase project at https://supabase.com/dashboard . **Do not use the Pixel Streaming lead-gen database until permissions and compatibility have been reviewed.**
2. Open the project's SQL Editor and run [supabase/schema.sql](supabase/schema.sql). This creates all tables, required functions, access policies and real-time subscriptions. Run on a new project; this SQL is not a migration for an existing schema.
3. In **Project Settings → API**, copy the **Project URL** and **publishable key** (or legacy `anon` key). Do **not** copy a `service_role` or `sb_secret_` key.
4. Open the CRM live website. Click **Connect database**, paste the URL and *public* key, then Save connection. The settings are stored only in that device's browser; each device needs this step, unless you later configure the public values in `config.js`.
5. In **Supabase → Authentication → Providers → Email**, enable email/password authentication and email confirmation. Configure **Authentication → URL Configuration** with the GitHub Pages site URL and allowlisted redirect URL(s). Do not disable confirmation in production.
6. Sign up using the intended administrator's real email, confirm the email, and sign in.
7. Select **Create workspace** once, using “Home View Solutions”.
8. Under **Team & settings**, invite Marie and Zanna by email. **This stores invitation permissions but does not send an email.** Share the site URL with them, and have them register with the *same* invited email. After email confirmation and sign-in they automatically join the shared workspace.
9. Enter actual client records only when signed in to your own protected workspace.

## What is included

- Dashboard with builder counts, stage metrics, recent activity and upcoming tasks
- Company directory, searchable and filterable
- Company profiles with priority, assigned owner, potential deal value and background context
- Multiple contacts with email and telephone shortcuts
- Chronological activity notes: call, meeting, email, general note
- Task reminders with dates, ownership, priority and completion
- Seven-stage sales pipeline; drag cards to change stage on desktop, edit companies on mobile
- Multi-user access with Supabase login and row-level security
- Admin-controlled teammate invitation by verified email
- Real-time change subscriptions, plus refresh on refocus
- Mobile-responsive layout; zero Unreal/Arcware streaming required

## Important security notes

The GitHub repository and its assets may be **public**. Never commit customer records, passwords or secret API keys. Public client-side keys are normal for Supabase only when Row Level Security is configured and tested. The SQL file contains RLS policies restricting reads and writes to members of the same workspace. The creator is admin. Invites are claimed only by users with matching **verified** email addresses. Members can edit company and task data by design; admins manage invites. Do not use this version for sensitive personal information beyond routine business contact records without further security and privacy review.

### Limits of this first version

- No automatic outgoing email, WhatsApp sync, Google Calendar sync, file uploads, scheduled notifications or import workflow yet.
- The invite system does not email people automatically.
- Realtime requires the Supabase publication and subscription to be enabled; the app also refreshes when focused.
- No delete workflow by design in this version; records can be amended. Later add soft-archive / audit logs.
- Frontend browser and end-to-end database testing are required after credentials are configured; do not assume production-readiness based only on deployment.
- There is no connection to the separate Home View buyer-lead dashboard yet.

## Files

- `index.html` — application shell
- `app.css` — responsive layout and visual theme
- `app.js` — CRM frontend, demo preview and Supabase integration
- `config.js` — optional **public** keys only (empty by default)
- `supabase/schema.sql` — database schema, row-level policies and workspace functions

## Safely testing real data

Log in as administrator and create a fake test company. Sign in as an invited teammate using a different browser and confirm the same company appears. Test a note and a completed task. To test workspace isolation, register a separate account without an invitation, create its own workspace, and confirm the first workspace's records are unavailable. Avoid entering real client information until these checks pass.

## Email drafts — available in CRM, sending intentionally disabled (2026-11-24)

The CRM includes a **draft-only** email composer for sales representatives without Microsoft 365 accounts. It **cannot send email** until a verified outbound provider is configured.

- Adds `Email drafts` navigation, compose/edit modal, customer email, subject, body, related company and legal-basis notes.
- Drafts are visible to CRM workspace members, while only their author can edit a draft.
- Supabase storage **installed on 2026-11-23** in the existing **Home View CRM** project. The file `supabase/email-drafts.sql` is retained as the deployment record. **Do not re-run it** in that project.
- The SQL creates only the new `email_messages` table with row-level security; it does not modify existing CRM tables.
- The frontend treats a missing `email_messages` table as optional and keeps existing CRM pages functional.
- Sender credentials must **never** go into GitHub, `config.js`, browser storage or the client code.
- Sending/replies are **not implemented**. A later server-side send function needs sender verification, provider selection appropriate to the message type, strict auth/workspace checks, send audit log, rate limiting and CASL compliance controls.
- `sales@homeviewsolutions.com` is not created by this code. Marie's mailbox remains separate. Incoming replies will not appear in the CRM until a later inbound integration.
- Do not send prospecting emails through a transactional-only API. Distinguish requested customer responses from commercial outreach, and verify consent or an applicable exemption under CASL as well as provider policy.

**Release sequence:** Review draft PR, test with two CRM accounts (including unauthorized access), verify sending service and reply routing, then merge with a separate explicit go-live step. RLS and grants were checked after applying SQL; interactive user isolation tests remain.

## CRM notifications and safe rollout (2026-11-24)

### Data preservation
Before changes, an additive private backup was created **inside Supabase** in schema `crm_backup_20261124`, containing the original CRM workspaces, membership, invitations, companies (including description notes), contacts, activities, tasks and email drafts. It is not exposed through the Data API. The original live tables were not deleted, recreated or overwritten. Company-description fingerprints and entity counts matched between live and backup after the notification migrations.

### In-app alerts
- A bell button and Notifications page display personal unread/read alerts.
- Private `crm_notifications` rows are created by protected database triggers for new companies, company status/assignment changes, edits to company notes, new activity notes/calls/meetings, new task assignments and new sales email drafts.
- Each authorized team member can see **only their own** alerts, mark them read and configure preferences for lead updates, activity, tasks and email.
- Inactive/revoked workspace members cannot query alerts due to membership-restricted Row Level Security.
- `crm_notification_settings` stores per-account alert preferences.
- Alert events are realtime while the CRM is open, and refresh when the app regains focus.
- Incoming `sales@` email notifications, scheduled due-date reminders and automatic handoff after email send **are not yet active** because outbound/inbound email integration is not connected.

### Background phone push — prepared, not yet activated
- `crm-sw.js` is a minimal service worker; it **does not cache app assets**.
- `crm_push_subscriptions` is private per user for storing opt-in device subscriptions.
- `supabase/functions/crm-web-push/index.ts` is deployed with authentication via the Supabase webhook service key; it cannot send without VAPID configuration.
- Configure Edge Function Secrets `HVS_CRM_VAPID_PUBLIC` and `HVS_CRM_VAPID_PRIVATE`. Never paste private keys into GitHub or browser JS.
- Put only the matching **public** VAPID key in `config.js` under `webPushPublicKey`.
- In Supabase Dashboard create a Database Webhook on `public.crm_notifications`, **INSERT only**, pointing to the `crm-web-push` Edge Function. Enable the built-in **auth header with service key** so anonymous callers cannot dispatch alerts.
- Test with a consenting CRM teammate on an iPhone after adding the CRM to the Home Screen; each user must explicitly allow notifications from inside the app.
- The service will show a **generic** phone lock-screen message, with personal details viewable only in the signed-in CRM.
- Email and push provider costs/quotas are separate from the CRM itself. Do not assume all sending will be free at higher volume.

### Rollout notes
The CRM website files can be updated independently of Supabase customer records. Retain the private backup and test live login, note saves and alert display with Marie and Zanna. If a UI regression appears, revert the GitHub commit; **do not reset the database**. Real device testing is necessary to confirm push delivery after the remaining setup.
