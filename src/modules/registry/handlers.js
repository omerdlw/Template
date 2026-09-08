import {
  DEFAULT_SOURCE,
  getRegistryDefinition,
  REGISTRY_KEYS,
  REGISTRY_LIFECYCLES,
  REGISTRY_TYPES,
  normalizeRegistryMetadata,
  validateControlsConfig,
  validateNavConfig,
  validateNavHudConfig,
  validateRegistryMetadata,
} from "./schema";
import { recordRegistryDiagnostic } from "./runtime";
function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function splitRegistryConfig(config, options = {}) {
  const definition = getRegistryDefinition(options.type) || {};
  const {
    defaultCleanupDelayMs = definition.defaultCleanupDelayMs ?? null,
    defaultLifecycle = definition.defaultLifecycle ?? null,
    defaultSource = DEFAULT_SOURCE,
  } = options;
  const registryMeta =
    isObject(config) && isObject(config.registry) ? config.registry : {};
  const { cleanupDelayMs, lifecycle, registerOptions, scope, source } =
    normalizeRegistryMetadata(registryMeta, {
      defaultCleanupDelayMs,
      defaultLifecycle,
      defaultSource,
    });
  const payload = isObject(config)
    ? Object.fromEntries(
        Object.entries(config).filter(([key]) => key !== "registry"),
      )
    : config;
  const metadataValidation = validateRegistryMetadata(registryMeta);
  const metadataIsStrict = registryMeta.validation === "strict";
  if (!metadataValidation.valid) {
    recordRegistryDiagnostic({
      action: metadataIsStrict ? "reject" : "validation-warning",
      issues: metadataValidation.issues,
      reason: "invalid-metadata",
      type: options.type,
      validation: metadataIsStrict ? "strict" : "warn",
    });
  }
  return {
    cleanupDelayMs,
    lifecycle,
    metadataInvalid: !metadataValidation.valid,
    metadataIsStrict,
    payload,
    registerOptions,
    scope,
    source,
  };
}
function isPersistentLifecycle(lifecycle) {
  return lifecycle === REGISTRY_LIFECYCLES.PERSISTENT;
}
function runRegistrationBatch(context, executor) {
  if (typeof context.batch === "function") return context.batch(executor);
  return executor(context);
}
function applyRegistrationEntries(type, registrations, context) {
  if (registrations.length === 0) return;
  const { instanceId, unregister } = context;
  const cleanupScope = getCleanupScope(context);
  runRegistrationBatch(context, (queue) => {
    registrations.forEach(({ key, registerOptions, scope, source, value }) => {
      clearCleanupTimer(
        cleanupScope,
        createCleanupKey(key, source, instanceId, scope),
      );
      queue.register(type, key, value, source, registerOptions);
    });
  });
  return () => {
    registrations.forEach(
      ({ cleanupDelayMs, key, lifecycle, scope, source }) => {
        if (isPersistentLifecycle(lifecycle)) return;
        scheduleOrRunCleanup(
          cleanupScope,
          createCleanupKey(key, source, instanceId, scope),
          () =>
            unregister(type, key, {
              source,
              instanceId,
              scope,
            }),
          cleanupDelayMs,
        );
      },
    );
  };
}
const backgroundHandler = {
  name: "background",
  apply: (config, context) => {
    const { instanceId, register, unregister } = context;
    const cleanupScope = getCleanupScope(context);
    const background = config?.background;
    if (background) {
      const {
        cleanupDelayMs,
        lifecycle,
        metadataInvalid,
        metadataIsStrict,
        payload,
        registerOptions,
        scope,
        source,
      } = splitRegistryConfig(background, {
        type: REGISTRY_TYPES.BACKGROUND,
      });
      if (metadataInvalid && metadataIsStrict) return;
      const cleanupKey = createCleanupKey(
        REGISTRY_KEYS.BACKGROUND,
        source,
        instanceId,
        scope,
      );
      clearCleanupTimer(cleanupScope, cleanupKey);
      register(
        REGISTRY_TYPES.BACKGROUND,
        REGISTRY_KEYS.BACKGROUND,
        payload,
        source,
        registerOptions,
      );
      return () => {
        if (isPersistentLifecycle(lifecycle)) return;
        scheduleOrRunCleanup(
          cleanupScope,
          cleanupKey,
          () => {
            unregister(REGISTRY_TYPES.BACKGROUND, REGISTRY_KEYS.BACKGROUND, {
              source,
              instanceId,
              scope,
            });
          },
          cleanupDelayMs,
        );
      };
    }
  },
};
const contextMenuHandler = {
  name: "contextMenu",
  apply: (config, context) => {
    const { instanceId, pathname, register, unregister } = context;
    const cleanupScope = getCleanupScope(context);
    const contextMenu = config?.contextMenu;
    if (!contextMenu) return;
    const {
      cleanupDelayMs,
      lifecycle,
      metadataInvalid,
      metadataIsStrict,
      payload,
      registerOptions,
      scope,
      source,
    } = splitRegistryConfig(contextMenu, {
      type: REGISTRY_TYPES.CONTEXT_MENU,
    });
    if (metadataInvalid && metadataIsStrict) return;
    const key = pathname || REGISTRY_KEYS.CONTEXT_MENU_CURRENT;
    const cleanupKey = createCleanupKey(key, source, instanceId, scope);
    clearCleanupTimer(cleanupScope, cleanupKey);
    register(
      REGISTRY_TYPES.CONTEXT_MENU,
      key,
      payload,
      source,
      registerOptions,
    );
    return () => {
      if (isPersistentLifecycle(lifecycle)) return;
      scheduleOrRunCleanup(
        cleanupScope,
        cleanupKey,
        () => {
          unregister(REGISTRY_TYPES.CONTEXT_MENU, key, {
            source,
            instanceId,
            scope,
          });
        },
        cleanupDelayMs,
      );
    };
  },
};
const controlsHandler = {
  name: "controls",
  apply: (config, context) => {
    const { pathname } = context;
    const controls = config?.controls;
    const controlConfigs = Array.isArray(controls)
      ? controls
      : controls
        ? [controls]
        : [];
    if (controlConfigs.length === 0) return;
    const registrations = controlConfigs.flatMap((controlConfig) => {
      const {
        cleanupDelayMs,
        lifecycle,
        metadataInvalid,
        metadataIsStrict,
        payload,
        registerOptions,
        scope,
        source,
      } = splitRegistryConfig(controlConfig, {
        type: REGISTRY_TYPES.CONTROLS,
      });
      if (metadataInvalid && metadataIsStrict) return [];
      const validation = validateControlsConfig(payload);
      if (!validation.valid) {
        recordRegistryDiagnostic({
          action: "reject",
          issues: validation.issues,
          reason: "invalid-controls-config",
          type: REGISTRY_TYPES.CONTROLS,
        });
        console.warn("[Registry] Invalid CONTROLS config:", validation.issues);
        return [];
      }
      const path = pathname || "/";
      return [
        {
          cleanupDelayMs,
          key: `${path}::${payload.id}`,
          lifecycle,
          scope,
          source,
          value: {
            ...payload,
            path,
          },
          registerOptions,
        },
      ];
    });
    return applyRegistrationEntries(
      REGISTRY_TYPES.CONTROLS,
      registrations,
      context,
    );
  },
};
function createScopedCleanupKey(source, instanceId = null, scope = null) {
  return JSON.stringify([scope, source, instanceId || null]);
}
function getCleanupScope(context) {
  return context?.cleanupScope || new Map();
}
function clearCleanupTimer(scope, cleanupKey) {
  const lifecycle = scope.get(cleanupKey);
  if (!lifecycle) return;
  lifecycle.cancelled = true;
  clearTimeout(lifecycle.timerId);
  scope.delete(cleanupKey);
}
function scheduleCleanup(scope, cleanupKey, callback, delayMs) {
  clearCleanupTimer(scope, cleanupKey);
  const lifecycle = {
    cancelled: false,
    timerId: null,
  };
  lifecycle.timerId = setTimeout(() => {
    if (lifecycle.cancelled || scope.get(cleanupKey) !== lifecycle) return;
    scope.delete(cleanupKey);
    callback();
  }, delayMs);
  scope.set(cleanupKey, lifecycle);
}
function scheduleOrRunCleanup(scope, cleanupKey, callback, delayMs) {
  if (Number.isFinite(delayMs) && delayMs > 0) {
    scheduleCleanup(scope, cleanupKey, callback, delayMs);
    return;
  }
  callback();
}
const loadingHandler = {
  name: "loading",
  apply: (config, context) => {
    const { instanceId, register, unregister } = context;
    const cleanupScope = getCleanupScope(context);
    const loading = config?.loading;
    if (!loading) return;
    const {
      cleanupDelayMs,
      lifecycle,
      metadataInvalid,
      metadataIsStrict,
      payload,
      registerOptions,
      scope,
      source,
    } = splitRegistryConfig(loading, {
      type: REGISTRY_TYPES.LOADING,
    });
    if (metadataInvalid && metadataIsStrict) return;
    const cleanupKey = createScopedCleanupKey(source, instanceId, scope);
    clearCleanupTimer(cleanupScope, cleanupKey);
    register(
      REGISTRY_TYPES.LOADING,
      REGISTRY_KEYS.LOADING,
      payload,
      source,
      registerOptions,
    );
    return () => {
      if (isPersistentLifecycle(lifecycle)) return;
      scheduleCleanup(
        cleanupScope,
        cleanupKey,
        () => {
          unregister(REGISTRY_TYPES.LOADING, REGISTRY_KEYS.LOADING, {
            source,
            instanceId,
            scope,
          });
        },
        cleanupDelayMs,
      );
    };
  },
};
const modalHandler = {
  name: "modals",
  apply: (config, context) => {
    const { instanceId } = context;
    const cleanupScope = getCleanupScope(context);
    const modals = config?.modal || config?.modals;
    if (!modals) return;
    const modalConfig = Array.isArray(modals)
      ? Object.assign({}, ...modals)
      : modals;
    const {
      cleanupDelayMs,
      lifecycle,
      metadataInvalid,
      metadataIsStrict,
      payload,
      registerOptions,
      scope,
      source,
    } = splitRegistryConfig(modalConfig, {
      type: REGISTRY_TYPES.MODAL,
    });
    if (metadataInvalid && metadataIsStrict) return;
    const modalItems = Object.entries(
      payload && typeof payload === "object" && !Array.isArray(payload)
        ? payload
        : {},
    ).filter(([key]) => key !== "registry");
    if (modalItems.length === 0) return;
    const cleanupKey = createCleanupKey("modals", source, instanceId, scope);
    clearCleanupTimer(cleanupScope, cleanupKey);
    runRegistrationBatch(context, (queue) => {
      modalItems.forEach(([key, component]) => {
        queue.register(
          REGISTRY_TYPES.MODAL,
          key,
          component,
          source,
          registerOptions,
        );
      });
    });
    return () => {
      if (isPersistentLifecycle(lifecycle)) return;
      scheduleOrRunCleanup(
        cleanupScope,
        cleanupKey,
        () =>
          runRegistrationBatch(context, (queue) => {
            modalItems.forEach(([key]) => {
              queue.unregister(REGISTRY_TYPES.MODAL, key, {
                source,
                instanceId,
                scope,
              });
            });
          }),
        cleanupDelayMs,
      );
    };
  },
};
function createCleanupKey(path, source, instanceId = null, scope = null) {
  return JSON.stringify([path, scope, source, instanceId || null]);
}
function getLoadingFallback(config) {
  const loading = config?.loading;
  if (!loading || typeof loading !== "object" || Array.isArray(loading)) {
    return undefined;
  }
  const { payload } = splitRegistryConfig(loading);
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return undefined;
  }
  if (!Object.prototype.hasOwnProperty.call(payload, "isLoading")) {
    return undefined;
  }
  return payload.isLoading;
}
const navHandler = {
  name: "nav",
  apply: (config, context) => {
    const { instanceId, register, unregister, pathname } = context;
    const cleanupScope = getCleanupScope(context);
    const nav = config?.nav;
    if (!nav) return;
    const {
      cleanupDelayMs,
      lifecycle,
      metadataInvalid,
      metadataIsStrict,
      payload,
      registerOptions,
      scope,
      source,
    } = splitRegistryConfig(nav, {
      type: REGISTRY_TYPES.NAV,
    });
    if (metadataInvalid && metadataIsStrict) return;
    const navConfig =
      payload && typeof payload === "object" && !Array.isArray(payload)
        ? payload
        : {};
    const normalizedNavConfig = {
      ...navConfig,
    };
    delete normalizedNavConfig.confirmation;
    const itemPath = normalizedNavConfig.path || pathname;
    const navItem = {
      ...normalizedNavConfig,
      path: itemPath,
      action: normalizedNavConfig.action,
      actions: normalizedNavConfig.actions,
      surface: normalizedNavConfig.surface,
    };
    const validation = validateNavConfig(navItem);
    if (!validation.valid) {
      recordRegistryDiagnostic({
        action: "reject",
        issues: validation.issues,
        reason: "invalid-nav-config",
        type: REGISTRY_TYPES.NAV,
      });
      console.warn("[Registry] Invalid NAV config:", validation.issues);
      return;
    }
    const resolvedIsLoading =
      normalizedNavConfig.isLoading !== undefined
        ? normalizedNavConfig.isLoading
        : getLoadingFallback(config);
    if (resolvedIsLoading !== undefined) {
      navItem.isLoading = resolvedIsLoading;
    }
    const filteredNavItem = Object.fromEntries(
      Object.entries(navItem).filter(([, val]) => val !== undefined),
    );
    if (itemPath) {
      const cleanupKey = createCleanupKey(itemPath, source, instanceId, scope);
      clearCleanupTimer(cleanupScope, cleanupKey);
      register(
        REGISTRY_TYPES.NAV,
        itemPath,
        filteredNavItem,
        source,
        registerOptions,
      );
    }
    return () => {
      if (isPersistentLifecycle(lifecycle)) return;
      if (itemPath) {
        const cleanup = () => {
          unregister(REGISTRY_TYPES.NAV, itemPath, {
            source,
            instanceId,
            scope,
          });
        };
        if (cleanupDelayMs > 0) {
          const cleanupKey = createCleanupKey(
            itemPath,
            source,
            instanceId,
            scope,
          );
          scheduleCleanup(cleanupScope, cleanupKey, cleanup, cleanupDelayMs);
          return;
        }
        cleanup();
      }
    };
  },
};
const navHudHandler = {
  name: "navHud",
  apply: (config, context) => {
    const navHud = config?.navHud;
    const hudConfigs = Array.isArray(navHud) ? navHud : navHud ? [navHud] : [];
    if (hudConfigs.length === 0) return;
    const registrations = hudConfigs.flatMap((hudConfig) => {
      const {
        cleanupDelayMs,
        lifecycle,
        metadataInvalid,
        metadataIsStrict,
        payload,
        registerOptions,
        scope,
        source,
      } = splitRegistryConfig(hudConfig, {
        type: REGISTRY_TYPES.NAV_HUD,
      });
      if (metadataInvalid && metadataIsStrict) return [];
      const validation = validateNavHudConfig(payload);
      if (!validation.valid) {
        recordRegistryDiagnostic({
          action: "reject",
          issues: validation.issues,
          reason: "invalid-nav-hud-config",
          type: REGISTRY_TYPES.NAV_HUD,
        });
        console.warn("[Registry] Invalid NAV_HUD config:", validation.issues);
        return [];
      }
      return [
        {
          cleanupDelayMs,
          key: payload.id,
          lifecycle,
          registerOptions,
          scope,
          source,
          value: {
            ...payload,
            priority: payload.priority ?? registerOptions.priority ?? 0,
          },
        },
      ];
    });
    return applyRegistrationEntries(
      REGISTRY_TYPES.NAV_HUD,
      registrations,
      context,
    );
  },
};
const titleHandler = {
  name: "title",
  apply: (config) => {
    const title = config?.title;
    if (!title) return;
    const originalTitle = typeof document !== "undefined" ? document.title : "";
    if (typeof document !== "undefined") {
      document.title = title;
    }
    return () => {
      if (typeof document !== "undefined") {
        document.title = originalTitle;
      }
    };
  },
};
const REGISTRY_HANDLERS = [
  titleHandler,
  contextMenuHandler,
  controlsHandler,
  navHandler,
  navHudHandler,
  modalHandler,
  backgroundHandler,
  loadingHandler,
];
export function applyRegistryConfig(config, context) {
  if (!config) return () => {};
  const cleanups = REGISTRY_HANDLERS.map((handler) => {
    try {
      return handler.apply(config, context);
    } catch (error) {
      recordRegistryDiagnostic({
        action: "error",
        error: error?.message || String(error),
        handler: handler.name,
        phase: "apply",
      });
      console.error(`[Registry] Failed to apply ${handler.name}:`, error);
      return null;
    }
  });
  return () => {
    cleanups.forEach((cleanup) => {
      if (typeof cleanup !== "function") return;
      try {
        cleanup();
      } catch (error) {
        recordRegistryDiagnostic({
          action: "error",
          error: error?.message || String(error),
          phase: "cleanup",
        });
        console.error("[Registry] Failed to clean up registration:", error);
      }
    });
  };
}
