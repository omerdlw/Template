# Supabase security contract

## Core tables

- `accounts`: private email and lifecycle status; owner-readable only.
- `profiles`: public profile document with privacy-aware RLS.
- `account_handle_reservations`: atomic ownership of usernames; no direct Data API grants.
- `reserved_account_handles`: project route reservations; service-role managed.
- `auth_sessions`: device inventory and revocation state; owner-readable, RPC-written.
- `auth_audit_events`: append-only security history; owner-readable, RPC-written.

All exposed tables have RLS enabled. Privileged RPC functions revoke the default `PUBLIC` execute
grant and grant only `authenticated` explicitly.

## Domain table policy

Every user-owned project table should combine row ownership, account lifecycle and session
revocation. Example:

```sql
create table public.orders (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.accounts (id) on delete cascade,
  total_cents integer not null check (total_cents >= 0),
  created_at timestamptz not null default now()
);

alter table public.orders enable row level security;
grant select on public.orders to authenticated;

create policy orders_select_own
on public.orders for select
to authenticated
using (
  (select auth.uid()) = user_id
  and (select core.is_account_active())
  and (select core.is_current_session_active())
);
```

Using `on delete cascade` is the default cleanup contract for user-owned project data. If legal or
business retention rules require preserving rows, point them at a separate retention identity and
implement that policy in a project migration; do not add project-table knowledge to the Core
account deletion action.

For UPDATE, add both `USING` and `WITH CHECK`. Do not treat `TO authenticated` as ownership.

## Remote revocation model

Supabase access JWTs remain valid until expiry. This template closes that gap for application data
by recording revoked `session_id` values and checking `core.is_current_session_active()` in RLS and
server authorization. The proxy signs a revoked browser out on its next application request.

`Sign out other sessions` also calls Supabase Auth with `{ scope: "others" }` so other refresh tokens
are revoked. A targeted device revocation is enforced by the session predicate; include that
predicate on every sensitive domain policy.

## MFA and step-up

- The access token's `aal` claim is the authoritative AAL1/AAL2 state.
- Users with a verified factor are redirected to `/auth/mfa` after first-factor authentication.
- Sensitive Server Actions call `requireRecentAuthentication()`.
- AAL2 satisfies step-up; otherwise `auth.reauthenticate()` and a reauthentication OTP refresh the
  Authentication Methods Reference timestamp.

For data that always requires MFA, add a restrictive policy:

```sql
create policy sensitive_rows_require_aal2
on public.sensitive_rows
as restrictive
for all
to authenticated
using ((select core.has_aal2()))
with check ((select core.has_aal2()));
```

## Passkeys

Passkeys use Supabase Auth's experimental native implementation. No credential private keys or
WebAuthn challenges are stored in project tables. Keep `@supabase/supabase-js` pinned, enable
Passkeys in the hosted dashboard, and treat API changes as an explicit upgrade task.
