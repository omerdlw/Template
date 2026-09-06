# Architecture

## Dependency direction

```text
Next.js app composition
├── modules/auth
├── modules/account
├── modules/platform UI runtimes
├── shared + ui primitives
├── infrastructure/supabase
└── domains/<project>

modules/auth    ─X→ modules/account
modules/account ─X→ modules/auth
platform UI     ─X→ modules/auth | modules/account
modules/*       ─X→ domains/*
domains/*       ─X→ app/*
```

The application is the composition root. It resolves Supabase identity through Auth, passes the
verified `userId` and request-scoped client into Account server operations, and attaches project UI
to the Account shell.

## Module interfaces

`src/modules/catalog.js` declares the supported import paths, runtime class, stability level,
documentation and direct dependencies of every module. The root entrypoint is the stable client
facade; `/contract` is runtime-neutral; `/server` is protected by `server-only`; and explicitly
unstable APIs live under `/experimental`. Undeclared files are internal.

`npm run modules:check` verifies this catalog against the actual import graph, rejects dependency
cycles and cross-module deep imports, follows entrypoint imports to detect client/server leakage,
and compares the public exports with `src/modules/public-exports.json`.

## Ownership

| Area                                           | Owner                        | Knows                                      |
| ---------------------------------------------- | ---------------------------- | ------------------------------------------ |
| Cookie refresh and Supabase clients            | `infrastructure/supabase`    | Next.js cookies and Supabase configuration |
| OTP, OAuth, passkeys, MFA and session identity | `modules/auth`               | Supabase Auth only                         |
| Profile contract and lifecycle operations      | `modules/account`            | Universal account tables only              |
| Route protection and orchestration             | `app`                        | Auth and Account interfaces                |
| Product data, tabs and metrics                 | `domains/<project>`          | Product tables and product UI              |
| Descriptor registration and conflict policy    | `modules/registry`           | Generic descriptor types and lifecycle     |
| Global interactive surfaces                    | Platform UI modules          | Registry, shared tokens and UI primitives  |
| Cross-module integration                       | `app/_composition`           | Public module interfaces only              |
| Development runtime observability              | `modules/platform-inspector` | Public read-only platform snapshots        |

## Platform runtime flow

```text
Product feature
  → usePageRegistry / typed registration hook
  → Registry resolves source, priority and cleanup
  → owning runtime updates state
  → root-mounted renderer presents the surface
```

`src/app/providers.js` is the only root composition point. It mounts each provider and global
renderer once. Static route descriptors live in `src/app/_composition/platform-registry.js`.
Product-specific commands, unread-count subscriptions and Auth actions attach there instead of
being built into Nav.

In development, `PlatformInspector` is mounted at this composition root. It observes public module
state, Registry diagnostics and the Nav scheduler without gaining mutation authority; production
builds render no inspector UI.

## Auth flow

```text
Browser auth form
  → Supabase Auth (OTP, magic link, OAuth or passkey)
  → Supabase SSR cookies
  → src/proxy.js refreshes and validates claims
  → optional TOTP challenge when nextLevel is AAL2
  → protected Server Component
```

`getClaims()` is the server trust boundary. Server Components and Route Handlers never authorize
from browser state or raw `getSession()` output.

## Account flow

The `auth.users` provisioning trigger creates one `accounts` row and one `profiles` row. Email sync
is trigger-owned. Profile writes go through `update_account_profile`, which atomically validates and
reserves the username. Permanent deletion is intentionally orchestrated in the App layer: it
requires recent authentication, invokes the server-only Supabase Admin API, and lets foreign-key
cascades clean both Core and project-owned rows.

The Account module accepts `{ client, userId }`; it does not read Auth cookies or import Auth. App
Router files obtain those dependencies from their real owners and compose them.

## Account extension model

`AccountShell` accepts `extensionTabs` and a `summary` React node. Project pages remain normal App
Router routes. The sample wiring is:

```text
domains/project/account-extension.js
  ↓ imported by
app/(protected)/account/layout.js
  ↓ passes props to
modules/account/AccountShell
```

For an e-commerce product, replace the sample tab with Orders and Invoices. For a social product,
add Activity and Collections. The shell does not query those tables and the Account migration never
references them.

## Server Actions versus Route Handlers

- Server Actions own mutations initiated by the template's own profile/lifecycle forms.
- Route Handlers own callback protocols and browser-consumed session/device operations.
- Server Components read profiles and account state directly through the request-scoped Supabase
  client.
- Domain APIs are added only when another client or protocol actually needs an HTTP interface.
