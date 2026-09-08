import { isValidElement } from "react";
export const REGISTRY_TYPES = Object.freeze({
  CONTEXT_MENU: "CONTEXT_MENU",
  BACKGROUND: "BACKGROUND",
  CONTROLS: "CONTROLS",
  LOADING: "LOADING",
  MODAL: "MODAL",
  NAV: "NAV",
  NAV_HUD: "NAV_HUD",
  NAV_RUNTIME: "NAV_RUNTIME",
});
export const REGISTRY_KEYS = Object.freeze({
  CONTEXT_MENU_CURRENT: "current-page",
  BACKGROUND: "page-background",
  LOADING: "page-loading",
  NAV_RUNTIME: "default",
});
export const DEFAULT_SOURCE = "dynamic";
export const DYNAMIC_SOURCE = DEFAULT_SOURCE;
export const REGISTRY_SOURCES = Object.freeze({
  STATIC: "static",
  DYNAMIC: "dynamic",
  USER: "user",
});
export const REGISTRY_LIFECYCLES = Object.freeze({
  IMMEDIATE: "immediate",
  GRACEFUL: "graceful",
  PERSISTENT: "persistent",
  ROUTE: "route",
});
export const REGISTRY_VALIDATION_MODES = Object.freeze({
  WARN: "warn",
  STRICT: "strict",
});
export const REGISTRY_METADATA_KEYS = Object.freeze([
  "cleanup",
  "cleanupDelayMs",
  "instanceId",
  "lifecycle",
  "priority",
  "source",
  "scope",
  "validation",
]);
export const REGISTRY_RESOLVERS = Object.freeze({
  [REGISTRY_TYPES.NAV]: "merge",
  [REGISTRY_TYPES.NAV_RUNTIME]: "merge",
});
export const REGISTRY_DEFINITIONS = Object.freeze({
  [REGISTRY_TYPES.CONTEXT_MENU]: Object.freeze({
    defaultCleanupDelayMs: 600,
    defaultLifecycle: REGISTRY_LIFECYCLES.IMMEDIATE,
    keyPolicy: "route",
    resolver: "priority",
    valueKind: "object",
  }),
  [REGISTRY_TYPES.BACKGROUND]: Object.freeze({
    defaultCleanupDelayMs: 600,
    defaultLifecycle: REGISTRY_LIFECYCLES.IMMEDIATE,
    keyPolicy: "singleton",
    resolver: "priority",
    valueKind: "object",
  }),
  [REGISTRY_TYPES.CONTROLS]: Object.freeze({
    defaultCleanupDelayMs: null,
    defaultLifecycle: REGISTRY_LIFECYCLES.IMMEDIATE,
    keyPolicy: "named",
    resolver: "priority",
    valueKind: "object",
  }),
  [REGISTRY_TYPES.LOADING]: Object.freeze({
    defaultCleanupDelayMs: 600,
    defaultLifecycle: REGISTRY_LIFECYCLES.GRACEFUL,
    keyPolicy: "singleton",
    resolver: "priority",
    valueKind: "object",
  }),
  [REGISTRY_TYPES.MODAL]: Object.freeze({
    defaultCleanupDelayMs: 600,
    defaultLifecycle: REGISTRY_LIFECYCLES.IMMEDIATE,
    keyPolicy: "named",
    resolver: "priority",
    valueKind: "component",
  }),
  [REGISTRY_TYPES.NAV]: Object.freeze({
    defaultCleanupDelayMs: 600,
    defaultLifecycle: REGISTRY_LIFECYCLES.ROUTE,
    keyPolicy: "path",
    resolver: "merge",
    valueKind: "object",
  }),
  [REGISTRY_TYPES.NAV_HUD]: Object.freeze({
    defaultCleanupDelayMs: 0,
    defaultLifecycle: REGISTRY_LIFECYCLES.IMMEDIATE,
    keyPolicy: "named",
    resolver: "priority",
    valueKind: "object",
  }),
  [REGISTRY_TYPES.NAV_RUNTIME]: Object.freeze({
    defaultCleanupDelayMs: null,
    defaultLifecycle: REGISTRY_LIFECYCLES.PERSISTENT,
    keyPolicy: "singleton",
    resolver: "merge",
    valueKind: "object",
  }),
});
export function getRegistryDefinition(type) {
  return REGISTRY_DEFINITIONS[type] || null;
}
export const REGISTRY_SOURCE_PRIORITY = Object.freeze({
  [REGISTRY_SOURCES.STATIC]: 100,
  [REGISTRY_SOURCES.DYNAMIC]: 200,
  [REGISTRY_SOURCES.USER]: 300,
});
export const REGISTRY_SOURCE_RANK = Object.freeze({
  [REGISTRY_SOURCES.STATIC]: 10,
  [REGISTRY_SOURCES.DYNAMIC]: 20,
  [REGISTRY_SOURCES.USER]: 30,
});
const REGISTRY_FEATURE_KEYS = new Set([
  "background",
  "controls",
  "contextMenu",
  "loading",
  "modal",
  "modals",
  "nav",
  "navHud",
]);
const REGISTRY_LIFECYCLE_VALUES = new Set(Object.values(REGISTRY_LIFECYCLES));
const REGISTRY_SINGLETON_KEYS = Object.freeze({
  [REGISTRY_TYPES.BACKGROUND]: REGISTRY_KEYS.BACKGROUND,
  [REGISTRY_TYPES.LOADING]: REGISTRY_KEYS.LOADING,
  [REGISTRY_TYPES.NAV_RUNTIME]: REGISTRY_KEYS.NAV_RUNTIME,
});
const REGISTRY_ROUTE_KEYS = new Set([REGISTRY_KEYS.CONTEXT_MENU_CURRENT, "*"]);
const REGISTRY_METADATA_KEY_SET = new Set([...REGISTRY_METADATA_KEYS]);
function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function isPlainObject(value) {
  if (!isObject(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
function parseFiniteNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
function resolveLifecycle(metadata, fallback) {
  const lifecycle = metadata?.lifecycle ?? metadata?.cleanup;
  return REGISTRY_LIFECYCLE_VALUES.has(lifecycle) ? lifecycle : fallback;
}
export function validateRegistryMetadata(metadata) {
  if (metadata === undefined || metadata === null) {
    return {
      issues: [],
      valid: true,
    };
  }
  if (!isObject(metadata)) {
    return {
      issues: ["registry metadata must be an object"],
      valid: false,
    };
  }
  const issues = [];
  Object.keys(metadata).forEach((key) => {
    if (!REGISTRY_METADATA_KEY_SET.has(key)) {
      issues.push(`unknown registry metadata field: ${key}`);
    }
  });
  if (
    metadata.source !== undefined &&
    (typeof metadata.source !== "string" || metadata.source.trim().length === 0)
  ) {
    issues.push("source must be a non-empty string");
  }
  if (
    metadata.instanceId !== undefined &&
    (typeof metadata.instanceId !== "string" ||
      metadata.instanceId.trim().length === 0)
  ) {
    issues.push("instanceId must be a non-empty string");
  }
  if (
    metadata.scope !== undefined &&
    (typeof metadata.scope !== "string" || metadata.scope.trim().length === 0)
  ) {
    issues.push("scope must be a non-empty string");
  }
  if (
    metadata.priority !== undefined &&
    parseFiniteNumber(metadata.priority) === null
  ) {
    issues.push("priority must be a finite number");
  }
  if (
    metadata.cleanupDelayMs !== undefined &&
    (parseFiniteNumber(metadata.cleanupDelayMs) === null ||
      Number(metadata.cleanupDelayMs) < 0)
  ) {
    issues.push("cleanupDelayMs must be a non-negative finite number");
  }
  const lifecycle = metadata.lifecycle ?? metadata.cleanup;
  if (lifecycle !== undefined && !REGISTRY_LIFECYCLE_VALUES.has(lifecycle)) {
    issues.push(
      `lifecycle must be one of: ${[...REGISTRY_LIFECYCLE_VALUES].join(", ")}`,
    );
  }
  if (
    metadata.validation !== undefined &&
    !Object.values(REGISTRY_VALIDATION_MODES).includes(metadata.validation)
  ) {
    issues.push(
      `validation must be one of: ${Object.values(REGISTRY_VALIDATION_MODES).join(", ")}`,
    );
  }
  return {
    issues,
    valid: issues.length === 0,
  };
}
function isRenderableValue(value) {
  if (
    value === null ||
    value === undefined ||
    typeof value === "boolean" ||
    typeof value === "string" ||
    typeof value === "number" ||
    isValidElement(value)
  ) {
    return true;
  }
  return Array.isArray(value) && value.every(isRenderableValue);
}
const NAV_CONFIG_FIELD_TYPES = Object.freeze({
  expandHorizontal: "boolean",
  dismissible: "boolean",
  isOverlay: "boolean",
  isLoading: "boolean",
  width: "number",
  path: "string",
  name: "string",
});
const NAVIGATION_POLICY_FIELD_TYPES = Object.freeze({
  clearTransientState: "boolean",
  dismissSurfaces: "boolean",
  prefetch: "boolean",
});
export function validateNavConfig(config) {
  const issues = [];
  if (!isPlainObject(config)) {
    return {
      valid: false,
      issues: ["NAV config must be a plain object"],
    };
  }
  Object.entries(NAV_CONFIG_FIELD_TYPES).forEach(([field, expectedType]) => {
    if (config[field] === undefined || config[field] === null) return;
    if (typeof config[field] !== expectedType) {
      issues.push(`NAV.${field} must be a ${expectedType}`);
    }
  });
  ["title", "description"].forEach((field) => {
    if (config[field] === undefined || config[field] === null) return;
    if (!isRenderableValue(config[field])) {
      issues.push(`NAV.${field} must be a renderable value`);
    }
  });
  if (config.path !== undefined && !String(config.path).startsWith("/")) {
    issues.push("NAV.path must start with /");
  }
  if (config.actions !== undefined && !Array.isArray(config.actions)) {
    issues.push("NAV.actions must be an array");
  }
  if (config.style !== undefined && !isPlainObject(config.style)) {
    issues.push("NAV.style must be a plain object");
  }
  if (config.navigationPolicy !== undefined) {
    if (!isPlainObject(config.navigationPolicy)) {
      issues.push("NAV.navigationPolicy must be a plain object");
    } else {
      Object.entries(NAVIGATION_POLICY_FIELD_TYPES).forEach(
        ([field, expectedType]) => {
          const value = config.navigationPolicy[field];
          if (value !== undefined && typeof value !== expectedType) {
            issues.push(
              `NAV.navigationPolicy.${field} must be a ${expectedType}`,
            );
          }
        },
      );
    }
  }
  return {
    valid: issues.length === 0,
    issues,
  };
}
const CONTROL_SIDES = new Set(["left", "right"]);
export function validateControlsConfig(config) {
  const issues = [];
  if (!isPlainObject(config)) {
    return {
      issues: ["CONTROLS config must be a plain object"],
      valid: false,
    };
  }
  if (typeof config.id !== "string" || config.id.trim().length === 0) {
    issues.push("CONTROLS.id must be a non-empty string");
  }
  if (!CONTROL_SIDES.has(config.side)) {
    issues.push("CONTROLS.side must be left or right");
  }
  if (
    config.content === undefined ||
    config.content === null ||
    config.content === false ||
    !isRenderableValue(config.content)
  ) {
    issues.push("CONTROLS.content must be renderable");
  }
  if (!Number.isFinite(Number(config.order))) {
    issues.push("CONTROLS.order must be a finite number");
  }
  return {
    issues,
    valid: issues.length === 0,
  };
}
export function validateNavHudConfig(config) {
  const issues = [];
  if (!isPlainObject(config)) {
    return {
      issues: ["NAV_HUD config must be a plain object"],
      valid: false,
    };
  }
  if (typeof config.id !== "string" || config.id.trim().length === 0) {
    issues.push("NAV_HUD.id must be a non-empty string");
  }
  const hasComponent = typeof config.component === "function";
  const hasContent =
    config.content !== undefined &&
    config.content !== null &&
    config.content !== false &&
    isRenderableValue(config.content);
  if (!hasComponent && !hasContent) {
    issues.push("NAV_HUD requires a renderable content node or component");
  }
  if (
    config.content !== undefined &&
    config.content !== null &&
    config.content !== false &&
    !isRenderableValue(config.content)
  ) {
    issues.push("NAV_HUD.content must be renderable");
  }
  if (config.isActive !== undefined && typeof config.isActive !== "boolean") {
    issues.push("NAV_HUD.isActive must be a boolean");
  }
  if (
    config.priority !== undefined &&
    parseFiniteNumber(config.priority) === null
  ) {
    issues.push("NAV_HUD.priority must be a finite number");
  }
  return {
    issues,
    valid: issues.length === 0,
  };
}
export function validateRegistryKey(type, key) {
  const definition = getRegistryDefinition(type);
  const issues = [];
  if (!definition) {
    issues.push(`unknown registry type: ${String(type)}`);
  }
  if (typeof key !== "string" || key.trim().length === 0) {
    issues.push("key must be a non-empty string");
    return {
      issues,
      valid: false,
    };
  }
  const normalizedKey = key.trim();
  if (definition?.keyPolicy === "singleton") {
    const expectedKey = REGISTRY_SINGLETON_KEYS[type];
    if (expectedKey && normalizedKey !== expectedKey) {
      issues.push(`${type} key must be ${expectedKey}`);
    }
  } else if (definition?.keyPolicy === "path") {
    if (!normalizedKey.startsWith("/")) {
      issues.push(`${type} key must be an absolute path`);
    }
  } else if (definition?.keyPolicy === "route") {
    if (
      !normalizedKey.startsWith("/") &&
      !REGISTRY_ROUTE_KEYS.has(normalizedKey)
    ) {
      issues.push(`${type} key must be a route path or a reserved route key`);
    }
  }
  return {
    issues,
    valid: issues.length === 0,
  };
}
export function validateRegistryValue(type, key, value) {
  const definition = getRegistryDefinition(type);
  const issues = [];
  issues.push(...validateRegistryKey(type, key).issues);
  if (definition?.valueKind === "object" && !isPlainObject(value)) {
    issues.push(`${type} values must be plain objects`);
  }
  if (
    definition?.valueKind === "component" &&
    typeof value !== "function" &&
    !isPlainObject(value)
  ) {
    issues.push(
      `${type} values must be component functions or component objects`,
    );
  }
  if (definition && type === REGISTRY_TYPES.NAV) {
    issues.push(...validateNavConfig(value).issues);
  }
  if (definition && type === REGISTRY_TYPES.CONTROLS) {
    issues.push(...validateControlsConfig(value).issues);
  }
  if (definition && type === REGISTRY_TYPES.NAV_HUD) {
    issues.push(...validateNavHudConfig(value).issues);
  }
  return {
    issues,
    valid: issues.length === 0,
  };
}
export function normalizeRegistryMetadata(
  metadata,
  {
    defaultCleanupDelayMs = null,
    defaultLifecycle = null,
    defaultSource = DEFAULT_SOURCE,
  } = {},
) {
  const registryMeta = isObject(metadata) ? metadata : {};
  const normalizedDefaultDelay = parseFiniteNumber(defaultCleanupDelayMs);
  const fallbackCleanupDelayMs =
    normalizedDefaultDelay !== null && normalizedDefaultDelay >= 0
      ? normalizedDefaultDelay
      : null;
  const fallbackLifecycle = REGISTRY_LIFECYCLE_VALUES.has(defaultLifecycle)
    ? defaultLifecycle
    : null;
  const source =
    typeof registryMeta.source === "string" &&
    registryMeta.source.trim().length > 0
      ? registryMeta.source.trim()
      : typeof defaultSource === "string" && defaultSource.trim().length > 0
        ? defaultSource.trim()
        : DEFAULT_SOURCE;
  const scope =
    typeof registryMeta.scope === "string" && registryMeta.scope.trim()
      ? registryMeta.scope.trim()
      : null;
  const priority = parseFiniteNumber(registryMeta.priority);
  const lifecycle = resolveLifecycle(registryMeta, fallbackLifecycle);
  const validation = Object.values(REGISTRY_VALIDATION_MODES).includes(
    registryMeta.validation,
  )
    ? registryMeta.validation
    : null;
  const cleanupDelayCandidate = parseFiniteNumber(registryMeta.cleanupDelayMs);
  let cleanupDelayMs =
    cleanupDelayCandidate !== null && cleanupDelayCandidate >= 0
      ? cleanupDelayCandidate
      : fallbackCleanupDelayMs;
  if (lifecycle === REGISTRY_LIFECYCLES.IMMEDIATE) {
    cleanupDelayMs = 0;
  } else if (
    (lifecycle === REGISTRY_LIFECYCLES.GRACEFUL ||
      lifecycle === REGISTRY_LIFECYCLES.ROUTE) &&
    cleanupDelayMs === null
  ) {
    cleanupDelayMs = fallbackCleanupDelayMs;
  }
  return {
    cleanupDelayMs,
    lifecycle,
    priority,
    registerOptions: {
      ...(priority === null
        ? {}
        : {
            priority,
          }),
      ...(validation === REGISTRY_VALIDATION_MODES.STRICT
        ? {
            validation,
          }
        : {}),
      ...(scope
        ? {
            scope,
          }
        : {}),
    },
    source,
    ...(scope
      ? {
          scope,
        }
      : {}),
    ...(validation
      ? {
          validation,
        }
      : {}),
  };
}
export function withRegistryMetadata(value, metadata) {
  if (
    !isObject(value) ||
    !isObject(metadata) ||
    Object.keys(metadata).length === 0
  ) {
    return value;
  }
  const currentMetadata = isObject(value.registry) ? value.registry : {};
  return {
    ...value,
    registry: {
      ...metadata,
      ...currentMetadata,
    },
  };
}
export function normalizePageRegistryConfig(config) {
  if (!isObject(config) || !isObject(config.registry)) {
    return config;
  }
  const pageMetadata = config.registry;
  const normalizedConfig = {};
  Object.entries(config).forEach(([key, value]) => {
    if (key === "registry") return;
    if (!REGISTRY_FEATURE_KEYS.has(key)) {
      normalizedConfig[key] = value;
      return;
    }
    if (Array.isArray(value)) {
      normalizedConfig[key] = value.map((entry) =>
        withRegistryMetadata(entry, pageMetadata),
      );
      return;
    }
    normalizedConfig[key] = withRegistryMetadata(value, pageMetadata);
  });
  return normalizedConfig;
}
export function defineRegistryConfig(config, defaults = {}) {
  if (!isObject(config) || !isObject(defaults)) return config;
  const metadata = pickRegistryMetadata(defaults);
  if (Object.keys(metadata).length === 0) return config;
  return {
    ...config,
    registry: {
      ...metadata,
      ...(isObject(config.registry) ? config.registry : {}),
    },
  };
}
export function pickRegistryMetadata(options) {
  if (!isObject(options)) return {};
  return Object.fromEntries(
    REGISTRY_METADATA_KEYS.filter((key) => options[key] !== undefined).map(
      (key) => [key, options[key]],
    ),
  );
}
