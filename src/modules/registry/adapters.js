"use client";

import { useEffect, useId, useLayoutEffect, useRef } from "react";
import {
  REGISTRY_METADATA_KEYS,
  REGISTRY_SOURCES,
  withRegistryMetadata,
} from "./contracts";
import { usePageRegistry, useRegistry } from "./hooks";
import { useRegistryActions } from "./provider";

// ── Feature-facing registration adapters ─────────────────────────────────────

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getMetadata(options) {
  if (!isObject(options)) return {};

  const metadata = {};
  REGISTRY_METADATA_KEYS.forEach((key) => {
    if (options[key] !== undefined) metadata[key] = options[key];
  });

  return metadata;
}

function createFeatureConfig(feature, value, options) {
  if (options?.enabled === false || value === null || value === undefined) {
    return null;
  }

  const metadata = getMetadata(options);
  const payload = Array.isArray(value)
    ? value.map((entry) => withRegistryMetadata(entry, metadata))
    : withRegistryMetadata(value, metadata);

  return {
    [feature]: payload,
  };
}

/** Register one page navigation item without exposing the registry type. */
export function useNavRegistration(config, options) {
  usePageRegistry(createFeatureConfig("nav", config, options));
}

/** Register page background state without exposing the registry type. */
export function useBackgroundRegistration(config, options) {
  usePageRegistry(createFeatureConfig("background", config, options));
}

/** Register one or more page controls without exposing the registry type. */
export function useControlsRegistration(config, options) {
  usePageRegistry(createFeatureConfig("controls", config, options));
}

/** Register page loading state with the standard graceful lifecycle. */
export function useLoadingRegistration(config, options) {
  usePageRegistry(createFeatureConfig("loading", config, options));
}

/** Register the context-menu payload for the current route. */
export function useContextMenuRegistration(config, options) {
  usePageRegistry(createFeatureConfig("contextMenu", config, options));
}

/** Register one or more modal components by their registry keys. */
export function useModalRegistration(config, options) {
  usePageRegistry(createFeatureConfig("modal", config, options));
}

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

// ── Bootstrap and route adapters ─────────────────────────────────────────────

export function RegistryBootstrap({ entries = [] }) {
  const { batch } = useRegistryActions();
  const defaultId = useId();
  const instanceIdRef = useRef(`registry-bootstrap-${defaultId}`);

  useIsomorphicLayoutEffect(() => {
    const normalizedEntries = (Array.isArray(entries) ? entries : []).filter(
      (entry) => entry?.type && entry?.items && typeof entry.items === "object",
    );

    if (normalizedEntries.length === 0) return undefined;

    const registerEntry = (queue, entry) => {
      const source = entry.source || REGISTRY_SOURCES.STATIC;
      const options = {
        ...(entry.options || {}),
        instanceId: instanceIdRef.current,
      };

      Object.entries(entry.items).forEach(([key, value]) => {
        queue.register(entry.type, key, value, source, options);
      });
    };

    const unregisterEntry = (queue, entry) => {
      const source = entry.source || REGISTRY_SOURCES.STATIC;
      const options = {
        ...(entry.options || {}),
        instanceId: instanceIdRef.current,
      };

      Object.keys(entry.items).forEach((key) => {
        queue.unregister(entry.type, key, { ...options, source });
      });
    };

    batch((queue) => {
      normalizedEntries.forEach((entry) => registerEntry(queue, entry));
    });

    return () => {
      batch((queue) => {
        normalizedEntries.forEach((entry) => unregisterEntry(queue, entry));
      });
    };
  }, [batch, entries]);

  return null;
}

export function createRouteRegistry({
  displayName = "RouteRegistry",
  resolveConfig,
}) {
  function RouteRegistry(props) {
    const config =
      typeof resolveConfig === "function" ? resolveConfig(props) : null;
    useRegistry(config || {});
    return null;
  }

  RouteRegistry.displayName = displayName;
  return RouteRegistry;
}
