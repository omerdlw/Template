"use client";

import { useEffect, useId, useLayoutEffect, useRef } from "react";
import { useIsomorphicLayoutEffect } from "@/shared";
import {
  pickRegistryMetadata,
  REGISTRY_SOURCES,
  withRegistryMetadata,
} from "./schema";
import { usePageRegistry, useRegistry } from "./hooks";
import { useRegistryActions } from "./provider";
function createFeatureConfig(feature, value, options) {
  if (options?.enabled === false || value === null || value === undefined) {
    return null;
  }
  const metadata = pickRegistryMetadata(options);
  const payload = Array.isArray(value)
    ? value.map((entry) => withRegistryMetadata(entry, metadata))
    : withRegistryMetadata(value, metadata);
  return {
    [feature]: payload,
  };
}
export function useNavRegistration(config, options) {
  usePageRegistry(createFeatureConfig("nav", config, options));
}
export function useNavHudRegistration(config, options) {
  usePageRegistry(createFeatureConfig("navHud", config, options));
}
export function useBackgroundRegistration(config, options) {
  usePageRegistry(createFeatureConfig("background", config, options));
}
export function useControlsRegistration(config, options) {
  usePageRegistry(createFeatureConfig("controls", config, options));
}
export function useLoadingRegistration(config, options) {
  usePageRegistry(createFeatureConfig("loading", config, options));
}
export function useContextMenuRegistration(config, options) {
  usePageRegistry(createFeatureConfig("contextMenu", config, options));
}
export function useModalRegistration(config, options) {
  usePageRegistry(createFeatureConfig("modal", config, options));
}
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
        queue.unregister(entry.type, key, {
          ...options,
          source,
        });
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
