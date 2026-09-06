# Platform modules

The template includes two reusable layers:

- Identity core: `auth` and `account`, backed by Supabase.
- UI runtime: `registry`, `background`, `loading`, `modal`, `notification`, `context-menu`,
  `controls`, `error-boundary` and `nav`.
- Development tooling: experimental, read-only `platform-inspector`.

Registry is the descriptor seam. Product features publish route-scoped definitions; the owning
runtime resolves lifecycle and presentation. Product code must not be imported into a module.

## Dependency order

```text
shared events + UI primitives
  → registry
    → background / loading / context-menu
    → modal → error-boundary
    → nav → background + loading
    → controls
  → notification
  → platform-inspector → platform UI runtime snapshots (development only)
```

Auth/Account and the UI runtime do not import each other. Their optional coordination belongs in
`src/app/_composition` through event bridges and Registry entries.

## Public interface model

`src/modules/catalog.js` is the executable source of truth for every module's dependencies,
documentation and supported entrypoints. A file that is not declared there is an implementation
detail; consumers outside its owning module must not import it directly.

| Import shape                        | Runtime     | Stability     | Use                                                                   |
| ----------------------------------- | ----------- | ------------- | --------------------------------------------------------------------- |
| `@/modules/<name>`                  | Client      | Stable        | Providers, hooks, components and browser operations                   |
| `@/modules/<name>/contract`         | Universal   | Stable        | Constants, normalization, policies and serializable value contracts   |
| `@/modules/<name>/server`           | Server only | Stable        | Request-scoped reads, protected mutations and server trust boundaries |
| `@/modules/<name>/experimental`     | Declared    | Experimental  | Opt-in APIs whose compatibility is not guaranteed                     |
| Any other `@/modules/<name>/*` path | Internal    | Not supported | Only code inside the owning module                                    |

Not every module needs every entrypoint. Add a seam only when the module has a real client,
universal or server contract to expose. This keeps the public surface smaller than the file tree.

Stable interfaces require a deliberate compatibility decision before an export is removed or
renamed. Experimental interfaces may evolve, but their use must stay explicit at the import site.
`platform-inspector` is the intentional exception to the stable-root convention: the whole module
is development-only and its root entrypoint is marked experimental in the catalog.

## Changing a module interface

1. Update the implementation and, when needed, add the entrypoint to `src/modules/catalog.js`.
2. Run `npm run modules:check` to validate dependency direction, runtime boundaries and deep imports.
3. Review the reported export delta. If it is intentional, run `npm run modules:snapshot`.
4. Commit `src/modules/public-exports.json` with the interface change and update the module guide.

`modules:snapshot` is an approval step, not a generic repair command: its diff is the reviewable API
change record. CI runs `modules:check` and fails when code and snapshot diverge.

## Guides

- [Auth](./auth.md)
- [Account](./account.md)
- [Registry](./registry.md)
- [Background](./background.md)
- [Loading](./loading.md)
- [Modal](./modal.md)
- [Notification](./notification.md)
- [Context menu](./context-menu.md)
- [Controls](./controls.md)
- [Error boundary](./error-boundary.md)
- [Navigation](./nav.md)
- [Platform inspector](./platform-inspector.md)
