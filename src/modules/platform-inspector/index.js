"use client";

import { useMemo } from "react";

import { useBackgroundState } from "@/modules/background";
import { useLoadingState } from "@/modules/loading";
import { useModalState } from "@/modules/modal";
import { useNavigationSelector } from "@/modules/nav";
import { useNavigationRuntimeHealth } from "@/modules/nav/experimental";
import { useNotificationState } from "@/modules/notification";
import {
  REGISTRY_TYPES,
  useRegistryDiagnostics,
  useRegistryEntries,
} from "@/modules/registry";

const INSPECTED_REGISTRY_TYPES = Object.freeze([
  REGISTRY_TYPES.BACKGROUND,
  REGISTRY_TYPES.CONTEXT_MENU,
  REGISTRY_TYPES.CONTROLS,
  REGISTRY_TYPES.LOADING,
  REGISTRY_TYPES.MODAL,
  REGISTRY_TYPES.NAV,
  REGISTRY_TYPES.NAV_RUNTIME,
]);

function countEntries(entries) {
  if (Array.isArray(entries)) return entries.length;
  return entries && typeof entries === "object"
    ? Object.keys(entries).length
    : 0;
}

function sameNavigationSnapshot(left, right) {
  return (
    left.compactLocked === right.compactLocked &&
    left.expanded === right.expanded &&
    left.navHeight === right.navHeight &&
    left.operationCount === right.operationCount &&
    left.surfaceCount === right.surfaceCount &&
    left.surfaceLifecycle === right.surfaceLifecycle &&
    left.surfacePhase === right.surfacePhase
  );
}

function DevelopmentPlatformInspector() {
  const background = useBackgroundState();
  const loading = useLoadingState();
  const modal = useModalState();
  const notification = useNotificationState();
  const navigation = useNavigationSelector(
    (state) => ({
      compactLocked: state.compactLocked,
      expanded: state.expanded,
      navHeight: state.navHeight,
      operationCount: state.operations.length,
      surfaceCount: state.surfaceStack.length,
      surfaceLifecycle: state.surfaceLifecycle,
      surfacePhase: state.surfacePhase,
    }),
    sameNavigationSnapshot,
  );
  const navigationHealth = useNavigationRuntimeHealth();
  const registryDiagnostics = useRegistryDiagnostics();
  const backgroundEntries = useRegistryEntries(REGISTRY_TYPES.BACKGROUND);
  const contextMenuEntries = useRegistryEntries(REGISTRY_TYPES.CONTEXT_MENU);
  const controlsEntries = useRegistryEntries(REGISTRY_TYPES.CONTROLS);
  const loadingEntries = useRegistryEntries(REGISTRY_TYPES.LOADING);
  const modalEntries = useRegistryEntries(REGISTRY_TYPES.MODAL);
  const navEntries = useRegistryEntries(REGISTRY_TYPES.NAV);
  const navRuntimeEntries = useRegistryEntries(REGISTRY_TYPES.NAV_RUNTIME);

  const snapshot = useMemo(() => {
    const registryEntries = [
      backgroundEntries,
      contextMenuEntries,
      controlsEntries,
      loadingEntries,
      modalEntries,
      navEntries,
      navRuntimeEntries,
    ];
    return {
      background: {
        active: Boolean(background.hasBackground),
        playing: Boolean(background.isPlaying),
        type: background.isVideo
          ? "video"
          : background.hasBackground
            ? "image"
            : null,
      },
      loading: {
        active: Boolean(loading.isLoading),
        overlay: Boolean(loading.showOverlay),
      },
      modal: {
        active: Boolean(modal.isOpen),
        count: Array.isArray(modal.modalStack) ? modal.modalStack.length : 0,
      },
      navigation: {
        ...navigation,
        diagnostics: navigationHealth.diagnostics.slice(-8).map((event) => ({
          timestamp: event.timestamp,
          type: event.type,
        })),
        scheduler: navigationHealth.scheduler,
      },
      notifications: {
        count: countEntries(notification?.notifications),
      },
      registry: {
        diagnostics: registryDiagnostics.slice(-8).map((event) => ({
          action: event.action || null,
          timestamp: event.timestamp,
          type: event.type || null,
        })),
        entries: Object.fromEntries(
          INSPECTED_REGISTRY_TYPES.map((type, index) => [
            type,
            countEntries(registryEntries[index]),
          ]),
        ),
      },
    };
  }, [
    background.hasBackground,
    background.isPlaying,
    background.isVideo,
    loading.isLoading,
    loading.showOverlay,
    modal.isOpen,
    modal.modalStack,
    navigation,
    navigationHealth,
    notification?.notifications,
    registryDiagnostics,
    backgroundEntries,
    contextMenuEntries,
    controlsEntries,
    loadingEntries,
    modalEntries,
    navEntries,
    navRuntimeEntries,
  ]);

  return (
    <aside className="pointer-events-none fixed bottom-3 left-3 z-[2147483647] max-w-[min(32rem,calc(100vw-1.5rem))] text-xs text-white">
      <details className="pointer-events-auto overflow-hidden rounded-xl border border-white/10 bg-black/90 shadow-2xl backdrop-blur-xl">
        <summary className="cursor-pointer select-none px-3 py-2 font-semibold tracking-wide text-white/80">
          Platform Inspector
        </summary>
        <pre className="max-h-[60vh] overflow-auto border-t border-white/10 p-3 font-mono leading-relaxed text-white/70">
          {JSON.stringify(snapshot, null, 2)}
        </pre>
      </details>
    </aside>
  );
}

/** Renders a read-only platform health panel in development builds only. */
export function PlatformInspector() {
  if (process.env.NODE_ENV === "production") return null;
  return <DevelopmentPlatformInspector />;
}
