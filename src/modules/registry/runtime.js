"use client";

import { useSyncExternalStore } from "react";
import { REGISTRY_TYPES } from "./contracts";

// ── Development diagnostics ──────────────────────────────────────────────────

const MAX_DIAGNOSTICS = 200;
const diagnostics = [];
const listeners = new Set();
let diagnosticsSnapshot = Object.freeze([]);

function publishDiagnosticsSnapshot() {
  diagnosticsSnapshot = Object.freeze(diagnostics.slice());
}

function isDiagnosticsEnabled() {
  return (
    typeof process === "undefined" || process.env?.NODE_ENV !== "production"
  );
}

export function recordRegistryDiagnostic(event) {
  if (!isDiagnosticsEnabled() || !event || typeof event !== "object") return;

  diagnostics.push(
    Object.freeze({
      ...event,
      timestamp: Date.now(),
    }),
  );

  if (diagnostics.length > MAX_DIAGNOSTICS) {
    diagnostics.splice(0, diagnostics.length - MAX_DIAGNOSTICS);
  }
  publishDiagnosticsSnapshot();

  listeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // Diagnostics must never affect registry state or application rendering.
    }
  });
}

export function getRegistryDiagnostics(filter = null) {
  if (!filter || typeof filter !== "object") return diagnosticsSnapshot;
  return Object.freeze(
    diagnosticsSnapshot.filter((event) =>
      Object.entries(filter).every(([key, value]) => event[key] === value),
    ),
  );
}

export function queryRegistryDiagnostics(filter) {
  return getRegistryDiagnostics(filter);
}

export function clearRegistryDiagnostics() {
  diagnostics.length = 0;
  publishDiagnosticsSnapshot();
  listeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // Diagnostics must never affect registry state or application rendering.
    }
  });
}

export function subscribeRegistryDiagnostics(listener) {
  if (typeof listener !== "function") return () => {};

  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useRegistryDiagnostics() {
  return useSyncExternalStore(
    subscribeRegistryDiagnostics,
    getRegistryDiagnostics,
    getRegistryDiagnostics,
  );
}

export const REGISTRY_SCOPE_KINDS = Object.freeze({
  APP: "app",
  SESSION: "session",
  ROUTE: "route",
  INSTANCE: "instance",
  WORKSPACE: "workspace",
});

export const DEFAULT_REGISTRY_SCOPE = REGISTRY_SCOPE_KINDS.APP;

export function normalizeRegistryScope(
  scope,
  fallback = DEFAULT_REGISTRY_SCOPE,
) {
  const candidate =
    typeof scope === "string"
      ? scope
      : scope && typeof scope.id === "string"
        ? scope.id
        : fallback;
  const normalized = candidate.trim();
  return normalized || fallback;
}

export function createRegistryScope(id, parent = null, kind = id) {
  const scopeId = normalizeRegistryScope(id);
  return Object.freeze({
    id: scopeId,
    kind: normalizeRegistryScope(kind, REGISTRY_SCOPE_KINDS.APP),
    parent: parent ? normalizeRegistryScope(parent) : null,
  });
}

export function createScopedRegistryStore(store, scope) {
  if (!store || typeof store.register !== "function") return store;

  const normalizedScope = normalizeRegistryScope(scope);
  const withScope = (options) => ({
    ...(options && typeof options === "object" ? options : {}),
    scope: normalizedScope,
  });

  return {
    ...store,
    register: (type, key, value, sourceOrOptions, optionsArg) => {
      if (typeof sourceOrOptions === "string") {
        return store.register(
          type,
          key,
          value,
          sourceOrOptions,
          withScope(optionsArg),
        );
      }
      return store.register(type, key, value, withScope(sourceOrOptions));
    },
    unregister: (type, key, sourceOrOptions) => {
      if (typeof sourceOrOptions === "string") {
        return store.unregister(type, key, {
          source: sourceOrOptions,
          scope: normalizedScope,
        });
      }
      return store.unregister(type, key, withScope(sourceOrOptions));
    },
    getSnapshot: (type, key) => store.getSnapshot(type, key, normalizedScope),
    getEntriesSnapshot: (type) =>
      store.getEntriesSnapshot(type, normalizedScope),
    transaction: (executor, metadata = {}) =>
      store.transaction(executor, { ...metadata, scope: normalizedScope }),
  };
}

function createTraceId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `registry-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function createRegistryTransaction(store, metadata = {}) {
  const operations = [];
  const traceId = metadata.traceId || createTraceId();
  let status = "open";

  const ensureOpen = () => status === "open";
  const mergeOptions = (options) => ({
    ...(options && typeof options === "object" ? options : {}),
    ...(metadata.source && !options?.source ? { source: metadata.source } : {}),
    ...(metadata.scope && !options?.scope ? { scope: metadata.scope } : {}),
  });

  const register = (type, key, value, sourceOrOptions, optionsArg) => {
    if (!ensureOpen()) return { status, traceId };
    const options =
      typeof sourceOrOptions === "string"
        ? mergeOptions({ ...(optionsArg || {}), source: sourceOrOptions })
        : mergeOptions(sourceOrOptions);
    operations.push({ key, item: value, options, type });
    return { index: operations.length - 1, status: "queued", traceId };
  };

  const unregister = (type, key, sourceOrOptions) => {
    if (!ensureOpen()) return { status, traceId };
    operations.push({
      key,
      options: mergeOptions(
        typeof sourceOrOptions === "string"
          ? { source: sourceOrOptions }
          : sourceOrOptions,
      ),
      type,
      unregister: true,
    });
    return { index: operations.length - 1, status: "queued", traceId };
  };

  const rollback = (reason = "manual") => {
    if (!ensureOpen()) return { status, traceId };
    status = "rolled-back";
    operations.length = 0;
    recordRegistryDiagnostic({
      action: "rollback",
      reason,
      traceId,
    });
    return { status, traceId };
  };

  const commit = () => {
    if (!ensureOpen()) return { status, traceId };
    status = "committed";
    let applied = 0;
    const result = store.batch((queue) => {
      operations.forEach((operation) => {
        if (operation.unregister) {
          queue.unregister(operation.type, operation.key, operation.options);
        } else {
          queue.register(
            operation.type,
            operation.key,
            operation.item,
            operation.options,
          );
        }
      });
    });
    applied = Number.isFinite(result) ? result : 0;
    recordRegistryDiagnostic({
      action: "commit",
      applied,
      queued: operations.length,
      traceId,
    });
    return { applied, queued: operations.length, status, traceId };
  };

  const run = (executor) => {
    if (typeof executor !== "function") return rollback("invalid-executor");
    try {
      executor({ register, unregister });
      return commit();
    } catch (error) {
      rollback(error?.message || String(error));
      throw error;
    }
  };

  return {
    commit,
    get operations() {
      return operations.slice();
    },
    register,
    rollback,
    run,
    get status() {
      return status;
    },
    traceId,
    unregister,
  };
}

export function createRegistryInspector(store, getDiagnostics = () => []) {
  if (!store) return null;

  return {
    getSnapshot: () => ({
      diagnostics: getDiagnostics(),
      entries: Object.fromEntries(
        Object.values(REGISTRY_TYPES).map((type) => [
          type,
          store.getEntriesSnapshot(type),
        ]),
      ),
    }),
    subscribe(listener) {
      if (typeof listener !== "function") return () => {};
      const cleanups = Object.values(REGISTRY_TYPES).map((type) =>
        store.subscribe(type, null, listener),
      );
      return () => cleanups.forEach((cleanup) => cleanup());
    },
  };
}
