"use client";

import {
  createContext,
  createElement,
  isValidElement,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useSyncExternalStore,
} from "react";
import {
  applyOperation,
  createInitialRegistries,
  createRecordKey,
  createRegisterOperation,
  createResolverCache,
  createUnregisterOperation,
  hasOperationEffect,
  isValidRegistryTarget,
  resolveEffectiveOperations,
  resolveEntryValue,
} from "./operations";
import {
  DEFAULT_SOURCE,
  REGISTRY_SOURCES,
  REGISTRY_VALIDATION_MODES,
  validateRegistryKey,
  validateRegistryMetadata,
  validateRegistryValue,
} from "./schema";
import { createRegistryTransaction, recordRegistryDiagnostic } from "./runtime";
const NOOP = () => {};
const IDENTITY_SELECTOR = (value) => value;
const EMPTY_ENTRIES = Object.freeze({});
function createNoopHandle(status = "rejected", reason = "unknown") {
  const handle = () => {};
  handle.dispose = handle;
  handle.update = () => handle;
  Object.defineProperties(handle, {
    active: {
      enumerable: true,
      value: false,
    },
    reason: {
      enumerable: true,
      value: reason,
    },
    status: {
      enumerable: true,
      value: status,
    },
  });
  return handle;
}
const NOOP_HANDLE = createNoopHandle();
function isNoopHandle(handle) {
  return (
    handle === NOOP_HANDLE ||
    handle?.status === "rejected" ||
    handle?.status === "ignored"
  );
}
function cloneRegistryValue(value, seen = new WeakMap()) {
  if (value === null || typeof value !== "object" || isValidElement(value)) {
    return value;
  }
  const prototype = Object.getPrototypeOf(value);
  const isPlainObject =
    !Array.isArray(value) &&
    (prototype === Object.prototype || prototype === null);
  if (!Array.isArray(value) && !isPlainObject) return value;
  if (seen.has(value)) return seen.get(value);
  const clone = Array.isArray(value) ? [] : {};
  seen.set(value, clone);
  Object.keys(value).forEach((key) => {
    clone[key] = cloneRegistryValue(value[key], seen);
  });
  return Object.freeze(clone);
}
const DEFAULT_REGISTRY_ACTIONS = Object.freeze({
  batch: (fn) =>
    typeof fn === "function"
      ? fn({
          register: () => NOOP_HANDLE,
          unregister: NOOP,
        })
      : 0,
  register: () => NOOP_HANDLE,
  transaction: () => ({
    status: "unavailable",
  }),
  unregister: NOOP,
});
const DEFAULT_REGISTRY_SUBSCRIPTION = Object.freeze({
  getEntriesSnapshot: () => EMPTY_ENTRIES,
  getSnapshot: () => null,
  subscribe: () => NOOP,
});
function useLazyRef(factory) {
  const ref = useRef(null);
  if (ref.current === null) {
    ref.current = factory();
  }
  return ref;
}
function normalizeInitialEntries(entries) {
  return (Array.isArray(entries) ? entries : []).filter(
    (entry) => entry?.type && entry?.items && typeof entry.items === "object",
  );
}
function createInitialState(entries) {
  const normalizedEntries = normalizeInitialEntries(entries);
  if (normalizedEntries.length === 0) return createInitialRegistries();
  const timestamp = Date.now();
  let sequence = 0;
  let state = createInitialRegistries();
  normalizedEntries.forEach((entry) => {
    const source = entry.source || REGISTRY_SOURCES.STATIC;
    const options = {
      ...(entry.options || {}),
      instanceId:
        entry.instanceId || entry.options?.instanceId || "registry-initial",
    };
    Object.entries(entry.items).forEach(([key, value]) => {
      const validation = validateRegistration(
        entry.type,
        key,
        value,
        source,
        options,
      );
      if (!validation.valid) return;
      const operation = createRegisterOperation(
        entry.type,
        key,
        cloneRegistryValue(value),
        source,
        options,
        timestamp,
        ++sequence,
      );
      if (hasOperationEffect(state, operation)) {
        state = applyOperation(state, operation);
      }
    });
  });
  return state;
}
function notifyListeners(listeners) {
  listeners?.forEach((listener) => {
    try {
      listener();
    } catch (error) {
      recordRegistryDiagnostic({
        action: "error",
        error: error?.message || String(error),
        phase: "notify",
      });
    }
  });
}
function getOrCreateKeyListeners(listenersByType, type, key) {
  const listeners = listenersByType.get(type) || new Map();
  const keyListeners = listeners.get(key) || new Set();
  listeners.set(key, keyListeners);
  listenersByType.set(type, listeners);
  return keyListeners;
}
function resolveRegistrationOptions(sourceOrOptions, optionsArg) {
  if (sourceOrOptions && typeof sourceOrOptions === "object")
    return sourceOrOptions;
  return optionsArg && typeof optionsArg === "object" ? optionsArg : {};
}
function validateRegistration(type, key, value, sourceOrOptions, optionsArg) {
  const options = resolveRegistrationOptions(sourceOrOptions, optionsArg);
  const metadataValidation = validateRegistryMetadata(options);
  const isStrict = options.validation === REGISTRY_VALIDATION_MODES.STRICT;
  const source =
    typeof sourceOrOptions === "string"
      ? sourceOrOptions
      : typeof options.source === "string"
        ? options.source
        : DEFAULT_SOURCE;
  const hasExplicitPriority = Object.prototype.hasOwnProperty.call(
    options,
    "priority",
  );
  const hasKnownSourcePriority = Object.prototype.hasOwnProperty.call(
    REGISTRY_SOURCES,
    source.toUpperCase(),
  );
  if (!hasKnownSourcePriority && !hasExplicitPriority) {
    recordRegistryDiagnostic({
      action: "validation-warning",
      key,
      reason: "implicit-source-priority",
      source,
      type,
    });
  }
  if (!metadataValidation.valid) {
    recordRegistryDiagnostic({
      action: isStrict ? "reject" : "validation-warning",
      issues: metadataValidation.issues,
      key,
      reason: "invalid-metadata",
      type,
      validation: isStrict ? "strict" : "warn",
    });
    if (isStrict) {
      return {
        issues: metadataValidation.issues,
        reason: "invalid-metadata",
        valid: false,
      };
    }
  }
  const validation = validateRegistryValue(type, key, value);
  if (validation.valid)
    return {
      valid: true,
    };
  recordRegistryDiagnostic({
    action: isStrict ? "reject" : "validation-warning",
    issues: validation.issues,
    key,
    reason: "invalid-value",
    type,
    validation: options.validation || REGISTRY_VALIDATION_MODES.WARN,
  });
  return {
    issues: validation.issues,
    reason: "invalid-value",
    valid: !isStrict,
  };
}
function createRegistrationHandle(store, operation) {
  let disposed = false;
  const dispose = (reason = "manual") => {
    if (disposed) return false;
    disposed = true;
    store.dispose(operation, reason);
    return true;
  };
  const handle = (reason) => handle.dispose(reason);
  handle.dispose = dispose;
  handle.update = (value, options = {}) => {
    if (disposed || !store.isCurrent(operation)) return NOOP_HANDLE;
    const nextHandle = store.register(
      operation.type,
      operation.key,
      cloneRegistryValue(value),
      operation.source,
      {
        ...(options && typeof options === "object" ? options : {}),
        instanceId: operation.instanceId,
        priority: operation.record.priority,
        ...(operation.scope
          ? {
              scope: operation.scope,
            }
          : {}),
        ...(operation.validation
          ? {
              validation: operation.validation,
            }
          : {}),
      },
    );
    if (isNoopHandle(nextHandle)) return handle;
    disposed = true;
    return nextHandle;
  };
  Object.defineProperties(handle, {
    active: {
      enumerable: true,
      get: () => !disposed && store.isCurrent(operation),
    },
    instanceId: {
      enumerable: true,
      value: operation.instanceId,
    },
    key: {
      enumerable: true,
      value: operation.key,
    },
    priority: {
      enumerable: true,
      value: operation.record.priority,
    },
    source: {
      enumerable: true,
      value: operation.source,
    },
    status: {
      enumerable: true,
      get: () =>
        disposed
          ? "disposed"
          : store.isCurrent(operation)
            ? "active"
            : "superseded",
    },
    type: {
      enumerable: true,
      value: operation.type,
    },
    updatedAt: {
      enumerable: true,
      value: operation.record.updatedAt,
    },
    validation: {
      enumerable: true,
      value: operation.validation || "warn",
    },
  });
  return handle;
}
export function createRegistryStore(initialEntries = []) {
  let registries = createInitialState(initialEntries);
  let sequence = normalizeInitialEntries(initialEntries).reduce(
    (count, entry) => count + Object.keys(entry.items).length,
    0,
  );
  const listenersByType = new Map();
  const entrySnapshots = new Map();
  const valueSnapshots = new Map();
  const resolveCachedValue = createResolverCache();
  const subscribe = (type, key, listener) => {
    const keyListeners = getOrCreateKeyListeners(
      listenersByType,
      type,
      key ?? null,
    );
    keyListeners.add(listener);
    return () => {
      keyListeners.delete(listener);
      if (keyListeners.size > 0) return;
      const listeners = listenersByType.get(type);
      listeners?.delete(key ?? null);
      if (listeners?.size === 0) listenersByType.delete(type);
    };
  };
  const commit = (nextState, operations = []) => {
    if (registries === nextState) return;
    const previousState = registries;
    registries = nextState;
    const changedKeysByType = new Map();
    operations.forEach((operation) => {
      if (!isValidRegistryTarget(operation?.type, operation?.key)) return;
      const keys = changedKeysByType.get(operation.type) || new Set();
      keys.add(operation.key);
      changedKeysByType.set(operation.type, keys);
    });
    changedKeysByType.forEach((changedKeys, type) => {
      const previousRegistry = previousState[type] || {};
      const nextRegistry = nextState[type] || {};
      let typeChanged = false;
      changedKeys.forEach((key) => {
        if (previousRegistry[key] === nextRegistry[key]) return;
        typeChanged = true;
        notifyListeners(listenersByType.get(type)?.get(key));
      });
      if (typeChanged) {
        notifyListeners(listenersByType.get(type)?.get(null));
      }
    });
  };
  const isCurrent = (operation) => {
    const entry = registries[operation.type]?.[operation.key];
    const recordKey = createRecordKey(
      operation.source,
      operation.instanceId,
      operation.scope,
    );
    return entry?.[recordKey] === operation.record;
  };
  const dispose = (operation, reason = "manual") => {
    if (!isCurrent(operation)) return false;
    const unregisterOperation = createUnregisterOperation(
      operation.type,
      operation.key,
      {
        source: operation.source,
        instanceId: operation.instanceId,
        scope: operation.scope,
      },
    );
    if (!hasOperationEffect(registries, unregisterOperation)) return false;
    commit(applyOperation(registries, unregisterOperation), [
      unregisterOperation,
    ]);
    recordRegistryDiagnostic({
      action: "dispose",
      instanceId: operation.instanceId,
      key: operation.key,
      reason,
      source: operation.source,
      type: operation.type,
    });
    return true;
  };
  const register = (
    type,
    key,
    item,
    sourceOrOptions = DEFAULT_SOURCE,
    optionsArg = {},
  ) => {
    if (!isValidRegistryTarget(type, key)) {
      recordRegistryDiagnostic({
        action: "reject",
        issues: validateRegistryKey(type, key).issues,
        key,
        reason: "invalid-target",
        type,
      });
      return createNoopHandle("rejected", "invalid-target");
    }
    const validation = validateRegistration(
      type,
      key,
      item,
      sourceOrOptions,
      optionsArg,
    );
    if (!validation.valid) {
      return createNoopHandle("rejected", validation.reason);
    }
    const timestamp = Date.now();
    const operation = createRegisterOperation(
      type,
      key,
      cloneRegistryValue(item),
      sourceOrOptions,
      optionsArg,
      timestamp,
      ++sequence,
    );
    if (!hasOperationEffect(registries, operation)) {
      recordRegistryDiagnostic({
        action: "ignore",
        instanceId: operation.instanceId,
        key,
        reason: "unchanged",
        source: operation.source,
        type,
      });
      return createNoopHandle("ignored", "unchanged");
    }
    commit(applyOperation(registries, operation), [operation]);
    recordRegistryDiagnostic({
      action: "register",
      instanceId: operation.instanceId,
      key,
      priority: operation.record.priority,
      source: operation.source,
      type,
    });
    return createRegistrationHandle(store, operation);
  };
  const unregister = (type, key, sourceOrOptions = DEFAULT_SOURCE) => {
    if (!isValidRegistryTarget(type, key)) {
      recordRegistryDiagnostic({
        action: "reject",
        issues: validateRegistryKey(type, key).issues,
        key,
        reason: "invalid-target",
        type,
      });
      return;
    }
    const operation = createUnregisterOperation(type, key, sourceOrOptions);
    if (!hasOperationEffect(registries, operation)) {
      recordRegistryDiagnostic({
        action: "ignore",
        instanceId: operation.instanceId,
        key,
        reason: "missing-record",
        source: operation.source,
        type,
      });
      return;
    }
    commit(applyOperation(registries, operation), [operation]);
    recordRegistryDiagnostic({
      action: "unregister",
      instanceId: operation.instanceId,
      key,
      source: operation.source,
      type,
    });
  };
  const batch = (executor) => {
    if (typeof executor !== "function") return 0;
    const timestamp = Date.now();
    const operations = [];
    const queue = {
      register: (
        type,
        key,
        item,
        sourceOrOptions = DEFAULT_SOURCE,
        optionsArg = {},
      ) => {
        if (!isValidRegistryTarget(type, key)) {
          recordRegistryDiagnostic({
            action: "reject",
            issues: validateRegistryKey(type, key).issues,
            key,
            reason: "invalid-target",
            type,
          });
          return createNoopHandle("rejected", "invalid-target");
        }
        const validation = validateRegistration(
          type,
          key,
          item,
          sourceOrOptions,
          optionsArg,
        );
        if (!validation.valid) {
          return createNoopHandle("rejected", validation.reason);
        }
        const operation = createRegisterOperation(
          type,
          key,
          cloneRegistryValue(item),
          sourceOrOptions,
          optionsArg,
          timestamp,
          ++sequence,
        );
        operations.push(operation);
        return createRegistrationHandle(store, operation);
      },
      unregister: (type, key, sourceOrOptions = DEFAULT_SOURCE) => {
        if (!isValidRegistryTarget(type, key)) {
          recordRegistryDiagnostic({
            action: "reject",
            issues: validateRegistryKey(type, key).issues,
            key,
            reason: "invalid-target",
            type,
          });
          return;
        }
        operations.push(createUnregisterOperation(type, key, sourceOrOptions));
      },
    };
    executor(queue);
    if (operations.length === 0) return 0;
    const { effectiveOperations, nextState } = resolveEffectiveOperations(
      registries,
      operations,
    );
    if (effectiveOperations.length === 0) return 0;
    commit(nextState, effectiveOperations);
    effectiveOperations.forEach((operation) => {
      recordRegistryDiagnostic({
        action: operation.kind,
        instanceId: operation.instanceId,
        key: operation.key,
        priority: operation.record?.priority,
        source: operation.source,
        type: operation.type,
      });
    });
    return effectiveOperations.length;
  };
  const getSnapshot = (type, key, scope = null) => {
    const entry = registries[type]?.[key];
    const snapshots = valueSnapshots.get(type) || new Map();
    const cacheKey = JSON.stringify([scope, key]);
    const cached = snapshots.get(cacheKey);
    if (cached && cached.entry === entry) return cached.value;
    const value = cloneRegistryValue(resolveCachedValue(type, entry, scope));
    snapshots.set(cacheKey, {
      entry,
      value,
    });
    valueSnapshots.set(type, snapshots);
    return value;
  };
  const getEntriesSnapshot = (type, scope = null) => {
    const typeRegistry = registries[type] || {};
    const cacheKey = JSON.stringify([type, scope]);
    const cached = entrySnapshots.get(cacheKey);
    if (cached?.typeRegistry === typeRegistry) return cached.value;
    const resolved = {};
    Object.keys(typeRegistry).forEach((key) => {
      const value = cloneRegistryValue(
        resolveCachedValue(type, typeRegistry[key], scope),
      );
      if (value !== undefined) resolved[key] = value;
    });
    entrySnapshots.set(cacheKey, {
      typeRegistry,
      value: resolved,
    });
    return Object.freeze(resolved);
  };
  const store = {
    batch,
    dispose,
    getEntriesSnapshot,
    getSnapshot,
    isCurrent,
    register,
    subscribe,
    transaction: (executor, metadata = {}) =>
      createRegistryTransaction(store, metadata).run(executor),
    unregister,
  };
  return store;
}
const RegistryActionsContext = createContext(null);
const RegistrySubscriptionContext = createContext(null);
export function RegistryProvider({ children, initialEntries = [] }) {
  const storeRef = useLazyRef(() => createRegistryStore(initialEntries));
  const actionsValue = useMemo(
    () => ({
      batch: storeRef.current.batch,
      register: storeRef.current.register,
      transaction: storeRef.current.transaction,
      unregister: storeRef.current.unregister,
    }),
    [storeRef],
  );
  const subscriptionValue = useMemo(
    () => ({
      getEntriesSnapshot: storeRef.current.getEntriesSnapshot,
      getSnapshot: storeRef.current.getSnapshot,
      subscribe: storeRef.current.subscribe,
    }),
    [storeRef],
  );
  return createElement(
    RegistryActionsContext.Provider,
    {
      value: actionsValue,
    },
    createElement(
      RegistrySubscriptionContext.Provider,
      {
        value: subscriptionValue,
      },
      children,
    ),
  );
}
export function useRegistryActions() {
  return useContext(RegistryActionsContext) ?? DEFAULT_REGISTRY_ACTIONS;
}
function useRegistrySubscription() {
  return (
    useContext(RegistrySubscriptionContext) ?? DEFAULT_REGISTRY_SUBSCRIPTION
  );
}
export function useRegistryValue(type, key) {
  const { getSnapshot, subscribe } = useRegistrySubscription();
  const subscribeToKey = useCallback(
    (listener) => subscribe(type, key, listener),
    [key, subscribe, type],
  );
  const getValue = useCallback(
    () => getSnapshot(type, key),
    [getSnapshot, key, type],
  );
  return useSyncExternalStore(subscribeToKey, getValue, getValue);
}
export function useRegistrySelector(
  type,
  key,
  selector = IDENTITY_SELECTOR,
  isEqual = Object.is,
) {
  const { getSnapshot, subscribe } = useRegistrySubscription();
  const resolvedSelector =
    typeof selector === "function" ? selector : IDENTITY_SELECTOR;
  const resolvedIsEqual = typeof isEqual === "function" ? isEqual : Object.is;
  const selectionRef = useRef(null);
  const subscribeToKey = useCallback(
    (listener) => subscribe(type, key, listener),
    [key, subscribe, type],
  );
  const getSelection = useCallback(() => {
    const snapshot = getSnapshot(type, key);
    const previous = selectionRef.current;
    if (
      previous &&
      previous.snapshot === snapshot &&
      previous.selector === resolvedSelector &&
      previous.isEqual === resolvedIsEqual
    ) {
      return previous.value;
    }
    const nextValue = resolvedSelector(snapshot);
    if (
      previous &&
      previous.selector === resolvedSelector &&
      previous.isEqual === resolvedIsEqual &&
      resolvedIsEqual(previous.value, nextValue)
    ) {
      selectionRef.current = {
        ...previous,
        snapshot,
      };
      return previous.value;
    }
    selectionRef.current = {
      isEqual: resolvedIsEqual,
      selector: resolvedSelector,
      snapshot,
      value: nextValue,
    };
    return nextValue;
  }, [getSnapshot, key, resolvedIsEqual, resolvedSelector, type]);
  return useSyncExternalStore(subscribeToKey, getSelection, getSelection);
}
export function useRegistryEntries(type) {
  const { getEntriesSnapshot, subscribe } = useRegistrySubscription();
  const subscribeToType = useCallback(
    (listener) => subscribe(type, null, listener),
    [subscribe, type],
  );
  const getEntries = useCallback(
    () => getEntriesSnapshot(type),
    [getEntriesSnapshot, type],
  );
  return useSyncExternalStore(subscribeToType, getEntries, getEntries);
}
