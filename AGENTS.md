<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Architecture rules

- This repository is JavaScript-first. Do not convert examples or implementation files to TypeScript.
  `open-next.config.ts` is the only exception because the OpenNext CLI requires that exact filename.
- `src/modules/auth` and `src/modules/account` are reusable core modules. They must not import from
  `src/app` or `src/domains` and must not import each other.
- Platform UI modules must not import Auth, Account or product domains. Connect them only from
  `src/app/_composition` using public interfaces, Registry descriptors or shared events.
- Registry owns descriptor validation, priority and cleanup. Product features should use its typed
  registration hooks instead of mutating global UI runtime state directly.
- `src/app` is the composition root. It may combine verified Auth identity, Account operations and
  project-domain UI.
- Product tables, metrics, tabs and workflows belong under `src/domains/<project>` and project-owned
  Supabase migrations.
- Use Server Components for reads, Server Actions for first-party form mutations, and Route Handlers
  only for callbacks or browser/external protocols.
- Every exposed Supabase table must enable RLS. Ownership policies must also apply the core account
  lifecycle and current-session predicates where appropriate.
- Never expose `SUPABASE_SECRET_KEY` to client code or authorize with `user_metadata`.
