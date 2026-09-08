# Platform modules

The template includes three reusable layers:

- Identity core: `auth` and `account`, backed by Supabase.
- UI runtime: `registry`, `background`, `loading`, `modal`, `notification`, `context-menu`,
  `controls`, `error-boundary` and `nav`.

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
```

Auth/Account and the UI runtime do not import each other. Domain-owned integrations publish their
descriptors and actions, while `src/app/providers.js` mounts them at the composition root.

## Public interface model

Every module has one root facade. Auth and Account add a
`server.js` interface because they own real server trust boundaries; every other file is an internal
implementation detail.

| Import shape                        | Runtime     | Use                                                                   |
| ----------------------------------- | ----------- | --------------------------------------------------------------------- |
| `@/modules/<name>`                  | Client      | Providers, hooks, components and browser operations                   |
| `@/modules/<name>/server`           | Server only | Request-scoped reads, protected mutations and server trust boundaries |
| Any other `@/modules/<name>/*` path | Internal    | Only code and colocated tests inside the owning module                |

Do not add public entrypoints for file categories such as contracts, utilities or experimental
features. Put shared behavior in a responsibility-named internal file and expose only the smallest
supported interface from `index.js` or `server.js`.

Published interfaces require a deliberate compatibility decision before an export is removed or
renamed.

## Internal organization

Use the same names for the same responsibilities. A module needs only the files its behavior
actually requires; the vocabulary is shared, the file count is not prescribed.

| File                                       | Responsibility                                                              |
| ------------------------------------------ | --------------------------------------------------------------------------- |
| `index.js`                                 | Supported client exports and, where cohesive, the module's primary renderer |
| `constants.js`                             | Immutable configuration values, enumerations and static options             |
| `utils.js`                                 | Pure helper functions, normalization, formatters and guards                 |
| `provider.js`                              | React contexts, provider composition, actions and subscription lifecycle    |
| `server.js`                                | Server-only operations across a real trust boundary                         |
| `motion.js`                                | Motion policy, animation variants and transition parameters                 |
| `runtime.js`                               | Stateful services such as external stores, transactions and diagnostics     |
| `schema.js`                                | Validations, descriptor contracts and metadata schemas                      |
| `layout.js`                                | Geometry, measurements and visual layout calculations                       |
| `resolver.js`, `routing.js`, `handlers.js` | Resolution, routing or descriptor application owned by that module          |

- Use kebab-case filenames. Inside a module, use relative imports; across modules, use
  `@/modules/<name>` or its supported server entrypoint. Implementation imports must stay acyclic.
- List public exports explicitly. Moving an internal implementation must not add or remove exports.
  Do not route exports through unrelated implementation files.
- Keep normalization beside the feature it describes. Nav routing owns path comparisons; media owns
  time labels; layout owns card geometry. A generic helper file must not become a second feature layer.
- Share code when the responsibility and behavior match. Similar-looking contexts can intentionally
  be strict, optional or have fallback actions; retain those distinct contracts.
- Keep timer handles, subscription disposal, source/instance identity and delayed cleanup with their
  lifecycle owner. Preserve synchronous versus deferred behavior during simplification.
- Add a file only for a distinct responsibility that needs independent ownership. Avoid empty
  `hooks`, `config`, `utils` or one-function facade files added only to match another module.
- Keep code sections in dependency order: imports, local defaults/model, implementation, public
  composition. Comments explain lifecycle constraints and compatibility decisions.

### Module responsibility map

| Module             | Organization decision                                                                                       |
| ------------------ | ----------------------------------------------------------------------------------------------------------- |
| Account            | Profile normalization, injected-client provider and server operations stay separate                         |
| Auth               | Explicit facade; browser operations, session provider, configuration and server verification stay separate  |
| Background         | Pure visual model, provider/video lifecycle and overlay                                                     |
| Context menu       | Candidate/item resolution, provider/native listeners and menu presentation                                  |
| Controls           | Pair resolution and geometry in layout; DOM observation and rails in the renderer; no provider needed       |
| Error boundary     | React boundary, browser listener and reporter remain independent                                            |
| Loading            | Provider owns minimum-duration timers; the small overlay stays in the facade                                |
| Modal              | Provider owns stack and completion promises; config, motion and portal presentation stay distinct           |
| Nav                | Provider composes domain-independent features; runtime stores and responsibility-named helpers are separate |
| Notification       | Provider owns persistence/timers; toast owns message policy; motion exports come directly from motion       |
| Registry           | Schema owns metadata; handlers own application/cleanup; adapters and hooks consume these without cycles     |

## Adding a module

1. Define its responsibility and supported root interface. Add a server interface only when needed.
2. Follow the internal vocabulary above without scaffolding unused files.
3. Test the observable contract, including cleanup where the module owns effects. Use public interfaces
   for cross-module tests and colocated tests for private behavior.
4. Run `npm test`, `npm run lint` and `npm run build`. Update the guide in `docs/modules`.

Node tests stub Next.js navigation and headers. They verify pure contracts and initial server-rendered
provider snapshots, not live navigation or Supabase delivery. Check affected interactions separately
in the browser and verify real provider flows when those integrations change.

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
