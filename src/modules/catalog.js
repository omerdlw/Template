export const MODULE_INTERFACE_LEVELS = Object.freeze({
  EXPERIMENTAL: "experimental",
  INTERNAL: "internal",
  STABLE: "stable",
});

export const MODULE_RUNTIMES = Object.freeze({
  CLIENT: "client",
  SERVER: "server",
  UNIVERSAL: "universal",
});

function defineEntrypoint(
  file,
  runtime,
  stability = MODULE_INTERFACE_LEVELS.STABLE,
) {
  return Object.freeze({ file, runtime, stability });
}

function defineModule({
  dependencies = [],
  docs,
  entrypoints,
  stability = MODULE_INTERFACE_LEVELS.STABLE,
}) {
  return Object.freeze({
    dependencies: Object.freeze([...dependencies]),
    docs,
    entrypoints: Object.freeze(entrypoints),
    stability,
  });
}

const client = (file = "index.js") =>
  defineEntrypoint(
    file,
    MODULE_RUNTIMES.CLIENT,
    MODULE_INTERFACE_LEVELS.STABLE,
  );
const contract = (file = "contract.js") =>
  defineEntrypoint(
    file,
    MODULE_RUNTIMES.UNIVERSAL,
    MODULE_INTERFACE_LEVELS.STABLE,
  );
const server = (file = "server.js") =>
  defineEntrypoint(
    file,
    MODULE_RUNTIMES.SERVER,
    MODULE_INTERFACE_LEVELS.STABLE,
  );
const experimental = (file = "experimental.js") =>
  defineEntrypoint(
    file,
    MODULE_RUNTIMES.CLIENT,
    MODULE_INTERFACE_LEVELS.EXPERIMENTAL,
  );

/**
 * Executable source of truth for module dependencies and supported imports.
 * Files not declared as entrypoints are internal implementation details.
 */
export const MODULE_CATALOG = Object.freeze({
  account: defineModule({
    docs: "docs/modules/account.md",
    entrypoints: {
      ".": client(),
      "./contract": contract(),
      "./server": server(),
    },
  }),
  auth: defineModule({
    docs: "docs/modules/auth.md",
    entrypoints: {
      ".": client(),
      "./contract": contract(),
      "./server": server(),
    },
  }),
  background: defineModule({
    dependencies: ["registry"],
    docs: "docs/modules/background.md",
    entrypoints: {
      ".": client(),
      "./contract": contract(),
    },
  }),
  "context-menu": defineModule({
    dependencies: ["registry"],
    docs: "docs/modules/context-menu.md",
    entrypoints: {
      ".": client(),
      "./contract": contract(),
    },
  }),
  controls: defineModule({
    dependencies: ["registry"],
    docs: "docs/modules/controls.md",
    entrypoints: {
      ".": client(),
      "./contract": contract(),
    },
  }),
  "error-boundary": defineModule({
    docs: "docs/modules/error-boundary.md",
    entrypoints: { ".": client() },
  }),
  loading: defineModule({
    dependencies: ["registry"],
    docs: "docs/modules/loading.md",
    entrypoints: { ".": client() },
  }),
  modal: defineModule({
    dependencies: ["error-boundary", "registry"],
    docs: "docs/modules/modal.md",
    entrypoints: {
      ".": client(),
      "./contract": contract(),
    },
  }),
  nav: defineModule({
    dependencies: ["background", "loading", "registry"],
    docs: "docs/modules/nav.md",
    entrypoints: {
      ".": client(),
      "./contract": contract(),
      "./experimental": experimental(),
    },
  }),
  notification: defineModule({
    docs: "docs/modules/notification.md",
    entrypoints: { ".": client() },
  }),
  "platform-inspector": defineModule({
    dependencies: [
      "background",
      "loading",
      "modal",
      "nav",
      "notification",
      "registry",
    ],
    docs: "docs/modules/platform-inspector.md",
    entrypoints: { ".": experimental("index.js") },
    stability: MODULE_INTERFACE_LEVELS.EXPERIMENTAL,
  }),
  registry: defineModule({
    docs: "docs/modules/registry.md",
    entrypoints: {
      ".": client(),
      "./contract": contract(),
      "./experimental": experimental(),
    },
  }),
});

export function getModuleDefinition(moduleName) {
  return MODULE_CATALOG[moduleName] || null;
}

export function getModuleEntrypoint(moduleName, entrypoint = ".") {
  return getModuleDefinition(moduleName)?.entrypoints?.[entrypoint] || null;
}
