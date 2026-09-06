# Account

`src/modules/account` owns the reusable account profile contract and lifecycle operations. It turns a
verified identity plus an injected data client into account state; it does not own authentication,
request cookies or product-specific records.

## Boundary

Account must not import Auth, App composition or product domains. The App layer supplies identity and
data access through explicit interfaces. Universal account migrations own only the `accounts` and
`profiles` lifecycle; orders, metrics, tabs and other product concepts stay under `src/domains` and
project-owned migrations.

## Public entrypoints

| Import                       | Runtime     | Use                                                          |
| ---------------------------- | ----------- | ------------------------------------------------------------ |
| `@/modules/account`          | Client      | `AccountProvider`, `useAccount` and universal value helpers  |
| `@/modules/account/contract` | Universal   | Username/profile normalization and public-profile projection |
| `@/modules/account/server`   | Server only | Request-scoped reads, updates and lifecycle operations       |

All other files are internal. Consumers should not import `provider.js` directly.

## Client composition

`AccountProvider` receives a narrow client interface and the already-resolved identity:

```jsx
<AccountProvider client={accountClient} identity={authIdentity}>
  {children}
</AccountProvider>
```

The client must provide `getCurrentAccount()` and `updateCurrentAccount(patch)`. The provider clears
state when identity disappears, loads only after identity is ready, and exposes account data with
`isLoading`, `error`, `refresh` and `update`. This injection keeps Account reusable and makes its
client behavior testable without teaching it about Auth or transport details.

## API selection

| Need                                | API                        |
| ----------------------------------- | -------------------------- |
| Normalize a username                | `normalizeUsername`        |
| Sanitize a profile patch            | `normalizeProfilePatch`    |
| Project a safe public profile       | `toPublicProfile`          |
| Read the signed-in account          | `getCurrentAccount`        |
| Read a public profile               | `getPublicProfile`         |
| Update the signed-in profile        | `updateAccountProfile`     |
| Soft-deactivate the current account | `deactivateCurrentAccount` |
| Reactivate the current account      | `reactivateCurrentAccount` |

Server operations accept `{ client, userId }`. The App layer obtains both values from their real
owners and composes them. Permanent deletion remains App orchestration because it combines recent
Auth verification, the Supabase Admin API and cross-domain cascade behavior.

## Invariants

- `userId` always comes from verified server identity, never request body or `user_metadata`.
- Profile normalization is shared through the universal contract so client and server agree.
- Username validation and reservation remain atomic in the database operation.
- Account does not cache Auth state or create its own Supabase client.
- Product extensions are passed into the shell as data or React nodes; Account does not import them.
- Server helpers keep their `server-only` boundary and are never re-exported from the client facade.

## Verification

```bash
npm run modules:check
npm test
npx eslint src/modules/account docs/modules/account.md
npx prettier --check src/modules/account docs/modules/account.md
```
