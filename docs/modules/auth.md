# Auth

`src/modules/auth` owns authentication identity and Supabase Auth workflows. It answers “who is the
current user and how was the session authenticated?” It does not own profiles, product permissions
or Account lifecycle.

## Boundary

Auth may depend on shared code and the Supabase infrastructure adapters. It must not import Account,
product domains or App composition. `src/app/providers.js` translates verified Auth identity into
Account's input interface and mounts domain-owned UI integrations.

Never authorize from `user_metadata`, browser context or raw `getSession()` output. Server trust is
established through verified claims and the server-only guards.

## Public interfaces

| Import                  | Runtime     | Use                                                              |
| ----------------------- | ----------- | ---------------------------------------------------------------- |
| `@/modules/auth`        | Client      | Provider, hooks, browser auth operations and callback URL helper |
| `@/modules/auth/server` | Server only | Validation, identity, AAL2, recent-auth and audit boundaries     |

All other files are internal. In particular, consumers should not couple themselves to
`client.js`, `provider.js`, `constants.js` or `utils.js`.

## Client setup

Mount `AuthProvider` once at the App composition root, then read its state through `useAuth`,
`useUser` or `useSession`:

```jsx
<AuthProvider>{children}</AuthProvider>
```

The provider owns one browser client and one auth-state subscription. It exposes `client`, `user`,
`session`, `isReady`, `isConfigured`, `error`, `refresh` and `signOut`. When Supabase is not
configured, it settles into a ready unauthenticated state instead of leaving the app suspended.

Use the root facade for email OTP, OAuth, passkey, MFA, reauthentication, sign-out and client audit
operations. UI components should orchestrate those operations; they should not call Supabase Auth
directly.

## Server API selection

| Need                                     | API                           |
| ---------------------------------------- | ----------------------------- |
| Optional verified identity               | `getOptionalUser`             |
| Authentication required                  | `requireUser`                 |
| Authenticator assurance level 2 required | `requireAal2`                 |
| Fresh authentication required            | `requireRecentAuthentication` |
| Same-origin mutation check               | `assertSameOrigin`            |
| Normalize an email address               | `normalizeEmail`              |
| Sanitize a redirect target               | `sanitizeNextPath`            |
| Server-side security event               | `recordAuthEvent`             |

Pass a request-scoped Supabase client to server helpers. Route Handlers own browser/external
protocols such as callbacks; Server Actions own first-party form mutations.

## Invariants

- Auth and Account remain independent modules.
- Auth state is identity, not a profile cache or a product authorization store.
- Redirect targets pass through `sanitizeNextPath`; external or protocol-relative paths are rejected.
- AAL2 and recent-auth checks happen on the server at the sensitive operation boundary.
- Sign-out and auth-state subscriptions remain provider-owned so features do not create competing listeners.
- Server helpers keep their `server-only` boundary and are never re-exported from the client facade.

## Verification

```bash
npm test
npx eslint src/modules/auth docs/modules/auth.md
npx prettier --check src/modules/auth docs/modules/auth.md
```

## Doğrulama

```bash
npm test
npx eslint src/modules/auth
npx prettier --check src/modules/auth docs/modules/auth.md
```
