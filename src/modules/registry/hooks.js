"use client";

import { usePathname } from "next/navigation";
import { useIsomorphicLayoutEffect } from "@/shared";
import {
  Children,
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import { applyRegistryConfig } from "./handlers";
import {
  DEFAULT_SOURCE,
  DYNAMIC_SOURCE,
  normalizePageRegistryConfig,
  REGISTRY_KEYS,
  REGISTRY_TYPES,
} from "./schema";
import { runScopedBatch } from "./operations";
import {
  useRegistryActions,
  useRegistryEntries,
  useRegistrySelector,
  useRegistryValue,
} from "./provider";
function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function useModalRegistryActions() {
  const { batch, register, unregister } = useRegistryActions();
  const modalRegister = useCallback(
    (key, component, options = {}) =>
      register(REGISTRY_TYPES.MODAL, key, component, DYNAMIC_SOURCE, options),
    [register],
  );
  const modalUnregister = useCallback(
    (key) => unregister(REGISTRY_TYPES.MODAL, key, DYNAMIC_SOURCE),
    [unregister],
  );
  const modalBatch = useCallback(
    (executor) =>
      runScopedBatch(batch, executor, (queue) => ({
        register: (key, component, options = {}) => {
          return queue.register(
            REGISTRY_TYPES.MODAL,
            key,
            component,
            DYNAMIC_SOURCE,
            options,
          );
        },
        unregister: (key) => {
          queue.unregister(REGISTRY_TYPES.MODAL, key, DYNAMIC_SOURCE);
        },
      })),
    [batch],
  );
  return useMemo(
    () => ({
      batch: modalBatch,
      register: modalRegister,
      unregister: modalUnregister,
    }),
    [modalBatch, modalRegister, modalUnregister],
  );
}
export function useNavRegistryActions() {
  const { batch, register, unregister } = useRegistryActions();
  const navRegister = useCallback(
    (key, config, sourceOrOptions = DEFAULT_SOURCE, options = {}) =>
      register(REGISTRY_TYPES.NAV, key, config, sourceOrOptions, options),
    [register],
  );
  const navUnregister = useCallback(
    (key, sourceOrOptions = DEFAULT_SOURCE) =>
      unregister(REGISTRY_TYPES.NAV, key, sourceOrOptions),
    [unregister],
  );
  const navBatch = useCallback(
    (executor) =>
      runScopedBatch(batch, executor, (queue) => ({
        register: (
          key,
          config,
          sourceOrOptions = DEFAULT_SOURCE,
          options = {},
        ) => {
          return queue.register(
            REGISTRY_TYPES.NAV,
            key,
            config,
            sourceOrOptions,
            options,
          );
        },
        unregister: (key, sourceOrOptions = DEFAULT_SOURCE) => {
          queue.unregister(REGISTRY_TYPES.NAV, key, sourceOrOptions);
        },
      })),
    [batch],
  );
  return useMemo(
    () => ({
      batch: navBatch,
      register: navRegister,
      unregister: navUnregister,
    }),
    [navBatch, navRegister, navUnregister],
  );
}
export function useModalRegistry() {
  const { batch, register, unregister } = useModalRegistryActions();
  const entries = useRegistryEntries(REGISTRY_TYPES.MODAL);
  return useMemo(
    () => ({
      batch,
      unregister,
      register,
      get: (key) => entries[key],
    }),
    [batch, entries, register, unregister],
  );
}
export function useNavRegistry() {
  const { batch, register, unregister } = useNavRegistryActions();
  const entries = useRegistryEntries(REGISTRY_TYPES.NAV);
  return useMemo(
    () => ({
      batch,
      get: (key) => entries[key],
      getAll: () => entries,
      unregister,
      register,
    }),
    [batch, entries, register, unregister],
  );
}
export function useNavHudRegistry() {
  return useRegistryEntries(REGISTRY_TYPES.NAV_HUD);
}
export function useNavRuntimeRegistry() {
  return (
    useRegistryValue(REGISTRY_TYPES.NAV_RUNTIME, REGISTRY_KEYS.NAV_RUNTIME) ||
    {}
  );
}
export function useBackgroundValue(selector, isEqual) {
  return useRegistrySelector(
    REGISTRY_TYPES.BACKGROUND,
    REGISTRY_KEYS.BACKGROUND,
    selector,
    isEqual,
  );
}
export function useLoadingValue(selector, isEqual) {
  return useRegistrySelector(
    REGISTRY_TYPES.LOADING,
    REGISTRY_KEYS.LOADING,
    selector,
    isEqual,
  );
}
export function useNavRuntimeValue(selector, isEqual) {
  return useRegistrySelector(
    REGISTRY_TYPES.NAV_RUNTIME,
    REGISTRY_KEYS.NAV_RUNTIME,
    selector,
    isEqual,
  );
}
export function useNavValue(key, selector, isEqual) {
  return useRegistrySelector(REGISTRY_TYPES.NAV, key, selector, isEqual);
}
export function useModalValue(key, selector, isEqual) {
  return useRegistrySelector(REGISTRY_TYPES.MODAL, key, selector, isEqual);
}
export function useContextMenuValue(key, selector, isEqual) {
  return useRegistrySelector(
    REGISTRY_TYPES.CONTEXT_MENU,
    key,
    selector,
    isEqual,
  );
}
export function useContextMenuRegistry() {
  const { batch, register, unregister } = useRegistryActions();
  const entries = useRegistryEntries(REGISTRY_TYPES.CONTEXT_MENU);
  const contextMenuRegister = useCallback(
    (key, config, options = {}) =>
      register(
        REGISTRY_TYPES.CONTEXT_MENU,
        key,
        config,
        DYNAMIC_SOURCE,
        options,
      ),
    [register],
  );
  const contextMenuUnregister = useCallback(
    (key, sourceOrOptions = DYNAMIC_SOURCE) =>
      unregister(REGISTRY_TYPES.CONTEXT_MENU, key, sourceOrOptions),
    [unregister],
  );
  const contextMenuBatch = useCallback(
    (executor) =>
      runScopedBatch(batch, executor, (queue) => ({
        register: (key, config, options = {}) => {
          return queue.register(
            REGISTRY_TYPES.CONTEXT_MENU,
            key,
            config,
            DYNAMIC_SOURCE,
            options,
          );
        },
        unregister: (key, sourceOrOptions = DYNAMIC_SOURCE) => {
          queue.unregister(REGISTRY_TYPES.CONTEXT_MENU, key, sourceOrOptions);
        },
      })),
    [batch],
  );
  return useMemo(
    () => ({
      batch: contextMenuBatch,
      get: (key) => entries[key],
      getAll: () => entries,
      register: contextMenuRegister,
      unregister: contextMenuUnregister,
    }),
    [contextMenuBatch, contextMenuRegister, contextMenuUnregister, entries],
  );
}

function withInstanceId(instanceId, sourceOrOptions, optionsArg) {
  if (typeof sourceOrOptions === "string") {
    return {
      optionsArg: {
        ...(isObject(optionsArg) ? optionsArg : {}),
        instanceId,
      },
      sourceOrOptions,
    };
  }
  if (isObject(sourceOrOptions)) {
    return {
      optionsArg,
      sourceOrOptions: {
        ...sourceOrOptions,
        instanceId,
      },
    };
  }
  return {
    optionsArg: undefined,
    sourceOrOptions: {
      ...(isObject(optionsArg) ? optionsArg : {}),
      instanceId,
    },
  };
}
function withInstanceIdForUnregister(instanceId, sourceOrOptions) {
  if (typeof sourceOrOptions === "string") {
    return {
      instanceId,
      source: sourceOrOptions,
    };
  }
  if (isObject(sourceOrOptions)) {
    return {
      ...sourceOrOptions,
      instanceId,
    };
  }
  return {
    instanceId,
  };
}
function resolveRegisterArgsWithInstance(
  instanceId,
  sourceOrOptions,
  optionsArg,
) {
  const input = withInstanceId(instanceId, sourceOrOptions, optionsArg);
  return [input.sourceOrOptions, input.optionsArg];
}
function resolveUnregisterArgWithInstance(instanceId, sourceOrOptions) {
  return withInstanceIdForUnregister(instanceId, sourceOrOptions);
}
export function useRegistry(config) {
  const { batch, register, unregister } = useRegistryActions();
  const pathname = usePathname();
  const defaultId = useId();
  const instanceIdRef = useRef(`registry-instance-${defaultId}`);
  const cleanupScopeRef = useRef(new Map());
  const registerWithInstance = useCallback(
    (type, key, item, sourceOrOptions, optionsArg) => {
      const [resolvedSourceOrOptions, resolvedOptionsArg] =
        resolveRegisterArgsWithInstance(
          instanceIdRef.current,
          sourceOrOptions,
          optionsArg,
        );
      return register(
        type,
        key,
        item,
        resolvedSourceOrOptions,
        resolvedOptionsArg,
      );
    },
    [register],
  );
  const unregisterWithInstance = useCallback(
    (type, key, sourceOrOptions) => {
      return unregister(
        type,
        key,
        resolveUnregisterArgWithInstance(
          instanceIdRef.current,
          sourceOrOptions,
        ),
      );
    },
    [unregister],
  );
  const batchWithInstance = useCallback(
    (executor) => {
      if (typeof executor !== "function") {
        return 0;
      }
      return batch((queue) => {
        executor({
          register: (type, key, item, sourceOrOptions, optionsArg) => {
            const [resolvedSourceOrOptions, resolvedOptionsArg] =
              resolveRegisterArgsWithInstance(
                instanceIdRef.current,
                sourceOrOptions,
                optionsArg,
              );
            return queue.register(
              type,
              key,
              item,
              resolvedSourceOrOptions,
              resolvedOptionsArg,
            );
          },
          unregister: (type, key, sourceOrOptions) => {
            queue.unregister(
              type,
              key,
              resolveUnregisterArgWithInstance(
                instanceIdRef.current,
                sourceOrOptions,
              ),
            );
          },
        });
      });
    },
    [batch],
  );
  const context = useMemo(
    () => ({
      register: registerWithInstance,
      unregister: unregisterWithInstance,
      batch: batchWithInstance,
      instanceId: instanceIdRef.current,
      cleanupScope: cleanupScopeRef.current,
      pathname,
    }),
    [batchWithInstance, registerWithInstance, unregisterWithInstance, pathname],
  );
  const normalizedConfig = normalizePageRegistryConfig(config);
  const stabilizedConfig = useStabilizedRegistryConfig(normalizedConfig);
  const stableConfig = useStableDiff(stabilizedConfig, deepCompare);
  useIsomorphicLayoutEffect(() => {
    return applyRegistryConfig(stableConfig, context);
  }, [stableConfig, context]);
}
export function usePageRegistry(config) {
  return useRegistry(config);
}
const MAX_STABILIZATION_DEPTH = 64;
export function useStableDiff(value, compareFn) {
  const ref = useRef(value);
  if (!compareFn(ref.current, value)) {
    ref.current = value;
  }
  return ref.current;
}
function createStableFunctionEntry(fn) {
  const entry = {
    current: fn,
    stable(...args) {
      return entry.current?.apply(this, args);
    },
  };
  return entry;
}
function isDirectRegistryComponentPath(path) {
  return /^config\.(modal|modals)\.[^.[]+$/.test(path);
}
function isReactNodeLike(value) {
  return (
    value === null ||
    value === undefined ||
    typeof value === "boolean" ||
    typeof value === "string" ||
    typeof value === "number" ||
    isValidElement(value)
  );
}
function isStabilizableObject(value) {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    !isValidElement(value)
  );
}
function hasSameObjectKeys(previousValue, nextValue) {
  if (
    !isStabilizableObject(previousValue) ||
    !isStabilizableObject(nextValue)
  ) {
    return false;
  }
  const previousKeys = Object.keys(previousValue);
  const nextKeys = Object.keys(nextValue);
  if (previousKeys.length !== nextKeys.length) return false;
  return nextKeys.every((key) =>
    Object.prototype.hasOwnProperty.call(previousValue, key),
  );
}
function stabilizeRegistryValue(
  value,
  path,
  functionEntries,
  usedPaths,
  previousValue,
  seen = new WeakSet(),
  depth = 0,
) {
  if (depth > MAX_STABILIZATION_DEPTH) return value;
  if (typeof value === "function") {
    const isComponent = value.name && /^[A-Z]/.test(value.name);
    if (isComponent || isDirectRegistryComponentPath(path)) {
      return value;
    }
    usedPaths.add(path);
    let entry = functionEntries.get(path);
    if (!entry) {
      entry = createStableFunctionEntry(value);
      functionEntries.set(path, entry);
    } else {
      entry.current = value;
    }
    return entry.stable;
  }
  if (value && typeof value === "object") {
    if (seen.has(value)) return value;
    seen.add(value);
  }
  if (isValidElement(value)) {
    const nextProps = stabilizeRegistryValue(
      value.props,
      `${path}.props`,
      functionEntries,
      usedPaths,
      isValidElement(previousValue) ? previousValue.props : undefined,
      seen,
      depth + 1,
    );
    if (
      isValidElement(previousValue) &&
      previousValue.type === value.type &&
      previousValue.key === value.key &&
      previousValue.props === nextProps
    ) {
      return previousValue;
    }
    return cloneElement(value, nextProps);
  }
  if (Array.isArray(value)) {
    const nextValue = value.every(isReactNodeLike)
      ? Children.toArray(value)
      : value;
    const previousArray = Array.isArray(previousValue) ? previousValue : null;
    let hasChanged =
      !previousArray || previousArray.length !== nextValue.length;
    const stabilizedValue = nextValue.map((item, index) => {
      const nextItem = stabilizeRegistryValue(
        item,
        `${path}[${index}]`,
        functionEntries,
        usedPaths,
        previousArray?.[index],
        seen,
        depth + 1,
      );
      if (!previousArray || nextItem !== previousArray[index]) {
        hasChanged = true;
      }
      return nextItem;
    });
    return !hasChanged ? previousArray : stabilizedValue;
  }
  if (typeof value !== "object" || value === null) {
    return value;
  }
  const stabilizedValue = {};
  const canReusePrevious = hasSameObjectKeys(previousValue, value);
  let hasChanged = !canReusePrevious;
  Object.keys(value).forEach((key) => {
    const nextValue = stabilizeRegistryValue(
      value[key],
      `${path}.${key}`,
      functionEntries,
      usedPaths,
      previousValue?.[key],
      seen,
      depth + 1,
    );
    stabilizedValue[key] = nextValue;
    if (!canReusePrevious || nextValue !== previousValue[key]) {
      hasChanged = true;
    }
  });
  return !hasChanged ? previousValue : stabilizedValue;
}
export function useStabilizedRegistryConfig(config) {
  const functionEntriesRef = useRef(new Map());
  const stabilizedConfigRef = useRef();
  return useMemo(() => {
    const usedPaths = new Set();
    const stabilizedConfig = stabilizeRegistryValue(
      config,
      "config",
      functionEntriesRef.current,
      usedPaths,
      stabilizedConfigRef.current,
    );
    functionEntriesRef.current.forEach((_entry, path) => {
      if (!usedPaths.has(path)) {
        functionEntriesRef.current.delete(path);
      }
    });
    stabilizedConfigRef.current = stabilizedConfig;
    return stabilizedConfig;
  }, [config]);
}
export const deepCompare = (prev, next, seen = new WeakMap(), depth = 0) => {
  if (Object.is(prev, next)) return true;
  if (depth > MAX_STABILIZATION_DEPTH) return false;
  if (
    typeof prev !== "object" ||
    prev === null ||
    typeof next !== "object" ||
    next === null
  ) {
    return false;
  }
  const seenNext = seen.get(prev);
  if (seenNext === next) return true;
  seen.set(prev, next);
  if (isValidElement(prev) && isValidElement(next)) {
    return (
      prev.type === next.type &&
      prev.key === next.key &&
      deepCompare(prev.props, next.props, seen, depth + 1)
    );
  }
  if (Array.isArray(prev) !== Array.isArray(next)) return false;
  const keys1 = Object.keys(prev);
  const keys2 = Object.keys(next);
  if (keys1.length !== keys2.length) return false;
  for (const key of keys1) {
    if (
      !Object.prototype.hasOwnProperty.call(next, key) ||
      !deepCompare(prev[key], next[key], seen, depth + 1)
    ) {
      return false;
    }
  }
  return true;
};
