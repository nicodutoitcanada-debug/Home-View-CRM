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
