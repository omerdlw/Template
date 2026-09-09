"use client";

import {
  useNavigationDiagnostics,
  recordNavigationDiagnostic,
  updateNavigationInspectorSnapshot,
  createNavigationOperationState,
  createNavigationOperation,
  navigationOperationReducer,
  resolveActiveNavigationOperation,
  createNavigationSelectorStore,
} from "./runtime";
import { areShallowCollectionsEqual, toArray, toSearchableText } from "./utils";
import {
  createContext,
  createElement,
  memo,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { EVENT_TYPES, globalEvents } from "@/shared";
import {
  MAX_VISIBLE_STACKED_CARDS,
  NAV_ATTENTION_KIND,
  NAV_ATTENTION_PRIORITY,
  NAV_ATTENTION_PRIORITY_OFFSET_MAX,
  NAVIGATION_DIAGNOSTIC_EVENTS,
  NAVIGATION_OPERATION_EVENTS,
  NAVIGATION_OPERATION_STATUS,
  NAV_EVENTS,
  NAV_HUD_PRIORITY,
  NAVIGATION_EVENTS,
} from "./constants";
import {
  blurActiveElement,
  useNavigationCompactController,
  useNavigationRouteReset,
} from "./behavior";
import {
  isPathPrefix,
  isSameItem,
  isSamePath,
  normalizePath,
  createNavigationTopology,
  getNavigationLocationKey,
  resolveNavigationRoutePolicy,
  useNavigationContinuity,
  useNavigationTransactions,
} from "./routing";
import {
  applySurfaceToNavItem,
  createInlineSurfaceEntry,
  createSurfaceLifecycleState,
  SurfaceExtensionsProvider,
  SurfaceFlowProvider,
  surfaceLifecycleReducer,
  useSurfaceStack,
} from "./surface";
import {
  areSelectionModeStatesEqual,
  createHudDefinition,
  createNavigationOperationHud,
  createSelectionModeState,
  getActiveNavigationHud,
  removeHudEntries,
  upsertHudEntry,
  NavHudView,
  useNavHudLifecycle,
  useNavHudRegistryLifecycle,
} from "./hud";
import { applyStatusOverlay, useNavigationStatus } from "./status";
import { applyMediaAction } from "./media";
import { BreadcrumbProvider } from "./breadcrumbs";
import { useNavCommandRegistry } from "./commands";
import { createNavigationScheduler } from "./scheduler";
import { useBackgroundActions, useBackgroundState } from "@/modules/background";
import { useLoadingActions, useLoadingState } from "@/modules/loading";
import {
  useNavHudRegistry,
  useNavRegistry,
  useNavRuntimeRegistry,
} from "@/modules/registry";
function useRequiredContext(context, hookName, providerName) {
  const value = useContext(context);
  if (value === null) {
    throw new Error(`${hookName} must be used within ${providerName}`);
  }
  return value;
}
function emitNavigationEvent(eventType, data = {}) {
  return globalEvents.emit(eventType, {
    timestamp: Date.now(),
    type: eventType,
    ...data,
  });
}
const guardRegistry = new Map();
let guardIdCounter = 0;
export function clearNavigationGuards() {
  guardRegistry.clear();
  guardIdCounter = 0;
}
export function getNavigationGuardCount() {
  return guardRegistry.size;
}
export function registerGuard(guard) {
  const id = ++guardIdCounter;
  guardRegistry.set(id, guard);
  return () => guardRegistry.delete(id);
}
export async function checkGuards(to, from) {
  for (const [id, guard] of guardRegistry) {
    let shouldBlock = false;
    try {
      const guardResult =
        typeof guard.when === "function" ? guard.when(to, from) : guard.when;
      shouldBlock = await Promise.resolve(guardResult);
    } catch (error) {
      console.error("[Navigation Guard] Guard evaluation failed:", error);
    }
    if (shouldBlock) {
      const message =
        guard.message || "Are you sure you want to leave this page?";
      try {
        guard.onBlock?.({
          to,
          from,
          guardId: id,
          message,
        });
      } catch (error) {
        console.error("[Navigation Guard] Block handler failed:", error);
      }
      return {
        message,
        blocked: true,
        guardId: id,
      };
    }
  }
  return {
    blocked: false,
  };
}
export function useNavigationGuard(options = {}) {
  const {
    message = "You have unsaved changes. Are you sure you want to leave?",
    when = false,
    onBlock,
  } = options;
  const whenRef = useRef(when);
  const [isActive, setIsActive] = useState(Boolean(when));
  useEffect(() => {
    whenRef.current = when;
    setIsActive(Boolean(when));
    if (!when) {
      globalEvents.emit(EVENT_TYPES.NAV_GUARD, {
        clear: true,
      });
    }
  }, [when]);
  useEffect(() => {
    const unregister = registerGuard({
      when: () => whenRef.current,
      message,
      onBlock,
    });
    return () => {
      unregister();
      globalEvents.emit(EVENT_TYPES.NAV_GUARD, {
        clear: true,
      });
    };
  }, [message, onBlock]);
  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (whenRef.current) {
        event.preventDefault();
        event.returnValue = message;
        return message;
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [message]);
  const setGuard = useCallback((active) => {
    whenRef.current = active;
    setIsActive(Boolean(active));
    if (!active) {
      globalEvents.emit(EVENT_TYPES.NAV_GUARD, {
        clear: true,
      });
    }
  }, []);
  const clearGuard = useCallback(() => {
    whenRef.current = false;
    setIsActive(false);
    globalEvents.emit(EVENT_TYPES.NAV_GUARD, {
      clear: true,
    });
  }, []);
  return {
    isActive,
    clearGuard,
    setGuard,
  };
}
export {
  NavSurfaceControls,
  NavSurfaceHeader,
  NavSurfaceHeaderButton,
  NavSurfaceShell,
  useSurfaceHeader,
} from "./surface";
export const NavHud = memo(function NavHud() {
  const hud = useNavigationSelector((state) => state.hud);
  const { clearHud } = useNavigationActions();
  return <NavHudView clearHud={clearHud} hud={hud} pathname={usePathname()} />;
});
export function NavHeightSpacer({ className = "" }) {
  const { navHeight } = useNavHeight();
  return (
    <div
      aria-hidden="true"
      className={className}
      style={{
        flexShrink: 0,
        height: navHeight,
      }}
    />
  );
}
function useNavigationLocationKey() {
  const pathname = usePathname();
  const getBrowserLocationKey = useCallback(
    () =>
      getNavigationLocationKey({
        hash: typeof window === "undefined" ? "" : window.location.hash,
        pathname,
        search: typeof window === "undefined" ? "" : window.location.search,
      }),
    [pathname],
  );
  const [locationKey, setLocationKey] = useState(getBrowserLocationKey);
  const syncLocationKey = useCallback(() => {
    const nextLocationKey = getBrowserLocationKey();
    setLocationKey((currentLocationKey) =>
      currentLocationKey === nextLocationKey
        ? currentLocationKey
        : nextLocationKey,
    );
    return nextLocationKey;
  }, [getBrowserLocationKey]);
  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    syncLocationKey();
    window.addEventListener("hashchange", syncLocationKey);
    window.addEventListener("popstate", syncLocationKey);
    return () => {
      window.removeEventListener("hashchange", syncLocationKey);
      window.removeEventListener("popstate", syncLocationKey);
    };
  }, [syncLocationKey]);
  return {
    locationKey,
    syncLocationKey,
  };
}
function useNavigationCore() {
  const pathname = usePathname();
  const { locationKey, syncLocationKey } = useNavigationLocationKey();
  const router = useRouter();
  const {
    clearPreparedRouteReset,
    closeSurface,
    continuity,
    openSurface,
    prepareRouteReset,
  } = useNavigationActions();
  const { startLoading, stopLoading } = useLoadingActions();
  const previousLocationKeyRef = useRef(locationKey);
  const handleTransactionEvent = useCallback(({ transaction, type }) => {
    recordNavigationDiagnostic(NAVIGATION_DIAGNOSTIC_EVENTS.ROUTE_TRANSACTION, {
      from: transaction.from,
      reason: transaction.reason,
      source: transaction.source,
      status: transaction.status,
      to: transaction.to,
      transactionId: transaction.id,
      transactionType: type,
    });
  }, []);
  const handleTransactionTimeout = useCallback(() => {
    clearPreparedRouteReset();
    stopLoading();
  }, [clearPreparedRouteReset, stopLoading]);
  const {
    activeTransaction,
    beginTransaction,
    cancelActiveTransaction,
    cancelTransaction,
    completeTransactionForPath,
    failTransaction,
    isTransactionCurrent,
    lastTransaction,
  } = useNavigationTransactions({
    onTimeout: handleTransactionTimeout,
    onTransactionEvent: handleTransactionEvent,
  });
  const cancelNavigation = useCallback(
    (reason = "guard") => {
      cancelActiveTransaction(reason);
      clearPreparedRouteReset();
      closeSurface({
        cancelled: true,
        reason,
        success: false,
      });
    },
    [cancelActiveTransaction, clearPreparedRouteReset, closeSurface],
  );
  const commitNavigation = useCallback(
    ({
      from,
      href,
      routePolicy,
      source = "navigation",
      transaction = null,
    }) => {
      const activeRouteTransaction =
        transaction ||
        beginTransaction({
          from,
          source,
          to: href,
        });
      if (!isTransactionCurrent(activeRouteTransaction.id)) {
        return false;
      }
      try {
        continuity?.remember?.(from);
        blurActiveElement();
        startLoading({
          showOverlay: false,
        });
        prepareRouteReset(routePolicy);
        recordNavigationDiagnostic(NAVIGATION_DIAGNOSTIC_EVENTS.ROUTE_STARTED, {
          from,
          source,
          to: href,
          transactionId: activeRouteTransaction.id,
        });
        emitNavigationEvent(NAV_EVENTS.NAVIGATE_START, {
          from,
          to: href,
        });
        router.push(href);
        emitNavigationEvent(NAV_EVENTS.NAVIGATE, {
          from,
          item: undefined,
          to: href,
        });
        if (typeof window !== "undefined") {
          const currentUrl = new URL(window.location.href);
          const destinationUrl = new URL(href, window.location.origin);
          const isQueryOrHashOnlyTransition =
            normalizePath(currentUrl.pathname) ===
            normalizePath(destinationUrl.pathname);
          if (isQueryOrHashOnlyTransition) {
            window.requestAnimationFrame(() => {
              const locationKey = getNavigationLocationKey({
                hash: window.location.hash,
                pathname: window.location.pathname,
                search: window.location.search,
              });
              if (
                !isSamePath(locationKey, href) ||
                !completeTransactionForPath(locationKey)
              ) {
                return;
              }
              emitNavigationEvent(NAV_EVENTS.NAVIGATE_END, {
                duration: undefined,
                from,
                to: locationKey,
              });
              previousLocationKeyRef.current = locationKey;
              syncLocationKey();
              stopLoading();
            });
          }
        }
        return true;
      } catch (error) {
        clearPreparedRouteReset();
        failTransaction(activeRouteTransaction.id, error);
        stopLoading();
        console.error("[Navigation] Route transition failed:", error);
        return false;
      }
    },
    [
      beginTransaction,
      clearPreparedRouteReset,
      completeTransactionForPath,
      continuity,
      failTransaction,
      isTransactionCurrent,
      prepareRouteReset,
      router,
      startLoading,
      stopLoading,
      syncLocationKey,
    ],
  );
  const openGuardConfirmation = useCallback(
    ({ href, from, message, routePolicy }) => {
      const confirmNavigation = () => {
        globalEvents.emit(EVENT_TYPES.NAV_GUARD, {
          clear: true,
        });
        commitNavigation({
          from,
          href,
          routePolicy,
          source: "guard-confirmation",
        });
      };
      const cancelNavigation = () => {
        globalEvents.emit(EVENT_TYPES.NAV_GUARD, {
          clear: true,
        });
        closeSurface({
          cancelled: true,
          reason: "guard",
          success: false,
        });
      };
      globalEvents.emit(EVENT_TYPES.NAV_GUARD, {
        to: href,
        from,
        title: "Navigation Blocked",
        message:
          message ||
          "You have unsaved changes. Are you sure you want to leave?",
        icon: "solar:danger-triangle-bold",
        cancelText: "Stay",
        confirmText: "Leave",
        onCancel: cancelNavigation,
        onConfirm: confirmNavigation,
      });
    },
    [closeSurface, commitNavigation],
  );
  const navigate = useCallback(
    async (
      href,
      { force = false, item = null, source = "navigation" } = {},
    ) => {
      const from = locationKey;
      const routePolicy = resolveNavigationRoutePolicy({
        href,
        item,
      });
      if (!routePolicy.canNavigate) {
        recordNavigationDiagnostic(
          NAVIGATION_DIAGNOSTIC_EVENTS.ROUTE_REJECTED,
          {
            from,
            source,
            to: String(href || ""),
          },
        );
        console.error(
          "[Navigation] Refused unsafe or invalid destination:",
          href,
        );
        return false;
      }
      if (isSamePath(href, from)) {
        return false;
      }
      const transaction = beginTransaction({
        from,
        source,
        to: href,
      });
      try {
        if (!force) {
          const guardResult = await checkGuards(href, from);
          if (!isTransactionCurrent(transaction.id)) {
            return false;
          }
          if (guardResult.blocked) {
            cancelTransaction(transaction.id, "guard");
            blurActiveElement();
            openGuardConfirmation({
              href,
              from,
              message: guardResult.message,
              routePolicy,
            });
            return false;
          }
        }
        return commitNavigation({
          from,
          href,
          routePolicy,
          source,
          transaction,
        });
      } catch (error) {
        failTransaction(transaction.id, error);
        stopLoading();
        console.error("[Navigation] Navigation guard failed:", error);
        return false;
      }
    },
    [
      beginTransaction,
      cancelTransaction,
      commitNavigation,
      failTransaction,
      isTransactionCurrent,
      openGuardConfirmation,
      locationKey,
      stopLoading,
    ],
  );
  useEffect(() => {
    if (previousLocationKeyRef.current === locationKey) {
      return;
    }
    emitNavigationEvent(NAV_EVENTS.NAVIGATE_END, {
      duration: undefined,
      from: previousLocationKeyRef.current,
      to: locationKey,
    });
    completeTransactionForPath(locationKey);
    previousLocationKeyRef.current = locationKey;
    stopLoading();
  }, [completeTransactionForPath, locationKey, stopLoading]);
  return {
    activeTransaction,
    cancelNavigation,
    lastTransaction,
    navigate,
    pathname,
  };
}
function isNotFoundItem(item) {
  return (
    item?.isNotFound || item?.path === "not-found" || item?.type === "NOT_FOUND"
  );
}
function flattenNavigationItems(items) {
  return items.map((item) => ({
    ...item,
    activeChild: null,
    children: null,
    hasActiveChild: false,
    isExpanded: false,
    isParent: false,
  }));
}
function filterNavigationItems(items, searchQuery) {
  const normalizedQuery = searchQuery.trim().toLowerCase();
  if (!normalizedQuery) {
    return items;
  }
  return items.filter((item) => {
    return (
      toSearchableText(item.name).toLowerCase().includes(normalizedQuery) ||
      toSearchableText(item.title).toLowerCase().includes(normalizedQuery) ||
      toSearchableText(item.description).toLowerCase().includes(normalizedQuery)
    );
  });
}
function buildNavigationItems({
  rawItems,
  expanded,
  searchQuery,
  isNotFoundPage,
}) {
  const baseItems = isNotFoundPage
    ? rawItems.filter((item) => item.path === "/" || isNotFoundItem(item))
    : rawItems;
  const flattenedItems = flattenNavigationItems(baseItems);
  if (expanded && searchQuery) {
    return filterNavigationItems(flattenedItems, searchQuery);
  }
  return flattenedItems;
}
function findNavigationItemIndex(navigationItems, activeItem, pathname) {
  const normalizedPathname = normalizePath(pathname);
  const selectedDataSourceIndex = navigationItems.findIndex(
    (item) => item.isDataSource && item.isSelected,
  );
  if (selectedDataSourceIndex !== -1) {
    return selectedDataSourceIndex;
  }
  if (activeItem) {
    const matchedActiveIndex = navigationItems.findIndex(
      (item) =>
        (item.path && isSamePath(item.path, activeItem.path)) ||
        (item.name && item.name === activeItem.name),
    );
    if (matchedActiveIndex !== -1) {
      return matchedActiveIndex;
    }
  }
  const matchedIndex = navigationItems.findIndex((item) =>
    isSamePath(item.path, normalizedPathname) ||
    (item.targetPath && isSamePath(item.targetPath, normalizedPathname)),
  );
  return matchedIndex;
}
function resolveActiveIndex({ navigationItems, activeItem, pathname }) {
  return Math.max(
    0,
    findNavigationItemIndex(navigationItems, activeItem, pathname),
  );
}
function resolveBaseActiveItem({
  rawItems,
  navigationItems,
  pathname,
  isNotFoundPage,
}) {
  const normalizedPathname = normalizePath(pathname);
  const selectedDataSource = navigationItems.find(
    (item) => item.isDataSource && item.isSelected,
  );
  if (selectedDataSource) {
    return selectedDataSource;
  }
  if (isNotFoundPage) {
    return rawItems.find((item) => isNotFoundItem(item)) || rawItems[0] || null;
  }
  const matchedNavigationItem = navigationItems.find((item) =>
    isSamePath(item.path, normalizedPathname) ||
    (item.targetPath && isSamePath(item.targetPath, normalizedPathname)),
  );
  if (matchedNavigationItem) {
    return matchedNavigationItem;
  }
  const matchedRawItem = rawItems.find((item) =>
    isSamePath(item.path, normalizedPathname) ||
    (item.targetPath && isSamePath(item.targetPath, normalizedPathname)),
  );
  if (matchedRawItem) {
    return matchedRawItem;
  }
  let prefixMatchedRawItem = null;
  let longestPrefixLength = -1;
  for (const item of rawItems) {
    const candidatePath = normalizePath(item?.path);
    if (
      candidatePath.length > longestPrefixLength &&
      isPathPrefix(candidatePath, normalizedPathname)
    ) {
      prefixMatchedRawItem = item;
      longestPrefixLength = candidatePath.length;
    }
  }
  if (prefixMatchedRawItem) {
    return (
      navigationItems.find(
        (entry) =>
          isSamePath(entry?.path, prefixMatchedRawItem.path) ||
          (entry?.name && entry.name === prefixMatchedRawItem.name),
      ) || prefixMatchedRawItem
    );
  }
  return rawItems[0] || null;
}
function createAttentionCandidate(kind, source, priority) {
  return {
    kind,
    priority,
    source,
  };
}
function normalizeAttentionPriority(value) {
  const priority = Number(value);
  if (!Number.isFinite(priority)) return NAV_HUD_PRIORITY.DEFAULT;
  return Math.min(NAV_ATTENTION_PRIORITY_OFFSET_MAX, Math.max(0, priority));
}
export function resolveNavigationAttention({
  hud = null,
  isPageLoading = false,
  operation = null,
  status = null,
  surface = null,
} = {}) {
  const candidates = [
    surface?.isSurfaceOpen
      ? createAttentionCandidate(
          NAV_ATTENTION_KIND.SURFACE,
          surface,
          NAV_ATTENTION_PRIORITY.SURFACE,
        )
      : null,
    status?.isOverlay
      ? createAttentionCandidate(
          NAV_ATTENTION_KIND.STATUS,
          status,
          NAV_ATTENTION_PRIORITY.STATUS_OVERLAY +
            normalizeAttentionPriority(status.priority),
        )
      : null,
    operation?.status === NAVIGATION_OPERATION_STATUS.PENDING
      ? createAttentionCandidate(
          NAV_ATTENTION_KIND.OPERATION,
          operation,
          NAV_ATTENTION_PRIORITY.OPERATION +
            normalizeAttentionPriority(operation.priority),
        )
      : null,
    hud?.isActive
      ? createAttentionCandidate(
          NAV_ATTENTION_KIND.HUD,
          hud,
          NAV_ATTENTION_PRIORITY.HUD + normalizeAttentionPriority(hud.priority),
        )
      : null,
    isPageLoading
      ? createAttentionCandidate(
          NAV_ATTENTION_KIND.LOADING,
          null,
          NAV_ATTENTION_PRIORITY.LOADING,
        )
      : null,
    status
      ? createAttentionCandidate(
          NAV_ATTENTION_KIND.STATUS,
          status,
          NAV_ATTENTION_PRIORITY.STATUS +
            normalizeAttentionPriority(status.priority),
        )
      : null,
    createAttentionCandidate(
      NAV_ATTENTION_KIND.ROUTE,
      null,
      NAV_ATTENTION_PRIORITY.ROUTE,
    ),
  ].filter(Boolean);
  return candidates.reduce((activeCandidate, candidate) =>
    candidate.priority > activeCandidate.priority ? candidate : activeCandidate,
  );
}
function resolveActiveItem({
  rawItems,
  navigationItems,
  pathname,
  isNotFoundPage,
  surfaceState,
  statusState,
  isVideo,
  toggleBackgroundVideo,
  mediaAction,
  surfaceActions,
  isPageLoading,
  attention,
}) {
  const baseActiveItem = resolveBaseActiveItem({
    rawItems,
    navigationItems,
    pathname,
    isNotFoundPage,
  });
  if (!baseActiveItem) {
    return null;
  }
  if (attention?.kind === NAV_ATTENTION_KIND.SURFACE) {
    return applySurfaceToNavItem(
      baseActiveItem,
      surfaceState.activeSurfaceEntry,
      {
        ...surfaceActions,
        surfacePhase: surfaceState.surfacePhase,
        surfaceStack: surfaceState.surfaceStack,
      },
    );
  }
  if (attention?.kind === NAV_ATTENTION_KIND.STATUS && statusState?.isOverlay) {
    return applyStatusOverlay(baseActiveItem, statusState);
  }
  if (attention?.kind === NAV_ATTENTION_KIND.HUD) {
    return baseActiveItem;
  }
  if (attention?.kind === NAV_ATTENTION_KIND.OPERATION) {
    return baseActiveItem;
  }
  if (attention?.kind === NAV_ATTENTION_KIND.LOADING && isPageLoading) {
    return {
      ...baseActiveItem,
      isLoading: true,
    };
  }
  if (attention?.kind === NAV_ATTENTION_KIND.STATUS && statusState) {
    return applyStatusOverlay(baseActiveItem, statusState);
  }
  const itemWithMediaAction = applyMediaAction(
    baseActiveItem,
    isVideo,
    toggleBackgroundVideo,
    mediaAction,
  );
  const inlineSurface = createInlineSurfaceEntry(itemWithMediaAction?.surface);
  if (inlineSurface) {
    return applySurfaceToNavItem(
      itemWithMediaAction,
      inlineSurface,
      surfaceActions,
    );
  }
  return itemWithMediaAction;
}
function useNavigationDisplay() {
  const pathname = usePathname();
  const loadingState = useLoadingState();
  const isPageLoading = Boolean(loadingState?.isLoading);
  const { rawItems } = useNavigationItems();
  const {
    closeAllSurfaces,
    goBackSurface,
    closeSurface,
    pushStep,
    popStep,
    goToStep,
    getSurfaceFlow,
    handleSurfaceAnimationComplete,
  } = useNavigationActions();
  const {
    expanded,
    searchQuery,
    activeSurfaceId,
    activeSurfaceEntry,
    activeOperation,
    hud,
    isSurfaceOpen,
    surfaceStack,
    surfacePhase,
  } = useNavigationSelector(
    (state) => ({
      activeOperation: state.activeOperation,
      activeSurfaceEntry: state.activeSurfaceEntry,
      activeSurfaceId: state.activeSurfaceId,
      expanded: state.expanded,
      hud: state.hud,
      isSurfaceOpen: state.isSurfaceOpen,
      searchQuery: state.searchQuery,
      surfacePhase: state.surfacePhase,
      surfaceStack: state.surfaceStack,
    }),
    areShallowCollectionsEqual,
  );
  const surfaceState = useMemo(
    () => ({
      activeSurfaceId,
      activeSurfaceEntry,
      isSurfaceOpen,
      surfaceStack,
      surfacePhase,
    }),
    [
      activeSurfaceId,
      activeSurfaceEntry,
      isSurfaceOpen,
      surfaceStack,
      surfacePhase,
    ],
  );
  const statusState = useNavigationStatus();
  const { mediaAction } = useNavRuntimeRegistry();
  const { isVideo } = useBackgroundState();
  const { toggleVideo: toggleBackgroundVideo } = useBackgroundActions();
  const attention = useMemo(
    () =>
      resolveNavigationAttention({
        hud,
        isPageLoading,
        operation: activeOperation,
        status: statusState,
        surface: surfaceState,
      }),
    [activeOperation, hud, isPageLoading, statusState, surfaceState],
  );
  const isNotFoundPage = useMemo(() => {
    return rawItems.some((item) => isNotFoundItem(item));
  }, [rawItems]);
  const navigationItems = useMemo(() => {
    return buildNavigationItems({
      rawItems,
      expanded,
      searchQuery,
      isNotFoundPage,
    });
  }, [rawItems, expanded, searchQuery, isNotFoundPage]);
  const activeItem = useMemo(() => {
    return resolveActiveItem({
      rawItems,
      navigationItems,
      pathname,
      isNotFoundPage,
      surfaceState,
      statusState,
      isVideo,
      toggleBackgroundVideo,
      mediaAction,
      surfaceActions: {
        closeSurface,
        closeAllSurfaces,
        goBackSurface,
        pushStep,
        popStep,
        goToStep,
        getSurfaceFlow,
        handleSurfaceAnimationComplete,
        surfaceStack,
      },
      isPageLoading,
      attention,
    });
  }, [
    rawItems,
    navigationItems,
    pathname,
    isNotFoundPage,
    surfaceState,
    statusState,
    isVideo,
    toggleBackgroundVideo,
    mediaAction,
    closeSurface,
    closeAllSurfaces,
    goBackSurface,
    pushStep,
    popStep,
    goToStep,
    getSurfaceFlow,
    handleSurfaceAnimationComplete,
    surfaceStack,
    isPageLoading,
    attention,
  ]);
  const activeIndex = useMemo(() => {
    return resolveActiveIndex({
      navigationItems,
      activeItem,
      pathname,
    });
  }, [navigationItems, activeItem, pathname]);
  const topology = useMemo(
    () =>
      createNavigationTopology(navigationItems, {
        pathname,
      }),
    [navigationItems, pathname],
  );
  return useMemo(
    () => ({
      navigationItems,
      activeItem,
      activeIndex,
      statusState,
      attention,
      topology,
    }),
    [
      navigationItems,
      activeItem,
      activeIndex,
      statusState,
      attention,
      topology,
    ],
  );
}
function stripChildrenSystemFields(item) {
  if (!item || typeof item !== "object") {
    return item;
  }
  return {
    ...item,
    activeChild: null,
    children: null,
    hasActiveChild: false,
    isChild: false,
    isExpanded: false,
    isParent: false,
    parentName: null,
    parentPath: null,
  };
}
function useNavigationItems() {
  const { getAll } = useNavRegistry();
  const rawItems = useMemo(() => {
    return Object.values(getAll()).map(stripChildrenSystemFields);
  }, [getAll]);
  return {
    rawItems,
  };
}
function shouldKeepAncestorItem(item, activePath) {
  const policy = item?.keepWhenDescendant;
  if (typeof policy === "function") {
    try {
      return Boolean(policy(activePath, item));
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[Navigation] Ancestor visibility policy failed:", error);
      }
      return false;
    }
  }
  return policy === true;
}
function isAncestorPath(item, activePath) {
  const candidatePath = item?.path;
  if (!candidatePath || candidatePath === "/" || candidatePath === activePath) {
    return false;
  }
  return (
    isPathPrefix(candidatePath, activePath) &&
    !shouldKeepAncestorItem(item, activePath)
  );
}
function removeAncestorDuplicates(items = []) {
  if (!Array.isArray(items) || items.length <= 1) {
    return items;
  }
  const activePath = items[0]?.path;
  if (!activePath) {
    return items;
  }
  return items.filter((item, index) => {
    if (index === 0) {
      return true;
    }
    return !isAncestorPath(item, activePath);
  });
}
function replaceActiveItem(items, activeIndex, activeItem) {
  if (activeIndex === -1 || !activeItem) {
    return items;
  }
  const nextItems = [...items];
  nextItems[activeIndex] = activeItem;
  return nextItems;
}
function removeInactiveLoadingItems(items = [], activeItem = null) {
  if (!Array.isArray(items) || items.length === 0) {
    return items;
  }
  return items.filter((item) => {
    if (!item?.isLoading) {
      return true;
    }
    return isSameItem(item, activeItem);
  });
}
function reorderItemsWithActiveFirst(items, activeIndex) {
  if (activeIndex === -1) {
    return items;
  }
  const active = items[activeIndex];
  const rest = [
    ...items.slice(0, activeIndex),
    ...items.slice(activeIndex + 1),
  ];
  rest.sort((a, b) => {
    if (a.path === "/") return 1;
    if (b.path === "/") return -1;
    return 0;
  });
  return [active, ...rest];
}
function useNavigationLayout({ navigationItems, activeItem } = {}) {
  const pathname = usePathname();
  const { displayItems, displayActiveIndex } = useMemo(() => {
    const activeIndex = findNavigationItemIndex(
      navigationItems,
      activeItem,
      pathname,
    );
    const itemsWithActiveItem = replaceActiveItem(
      navigationItems,
      activeIndex,
      activeItem,
    );
    if (activeItem?.isLoading) {
      return {
        displayItems: activeItem ? [activeItem] : [],
        displayActiveIndex: activeItem ? 0 : -1,
      };
    }
    const reorderedItems = reorderItemsWithActiveFirst(
      itemsWithActiveItem,
      activeIndex,
    );
    const filteredItems = removeInactiveLoadingItems(
      reorderedItems,
      activeItem,
    );
    const deduplicatedItems = removeAncestorDuplicates(filteredItems);
    const activeIndexForDisplay = deduplicatedItems.findIndex((item) =>
      isSameItem(item, activeItem),
    );
    return {
      displayItems: deduplicatedItems,
      displayActiveIndex:
        activeIndexForDisplay !== -1
          ? activeIndexForDisplay
          : reorderedItems.length > 0
            ? 0
            : -1,
    };
  }, [pathname, navigationItems, activeItem]);
  return {
    displayItems,
    activeIndex: displayActiveIndex,
    MAX_VISIBLE_STACKED_CARDS,
  };
}
const NavigationActionsContext = createContext(null);
const NavigationRuntimeContext = createContext(null);
const NavigationSelectorContext = createContext(null);
const NavigationStateContext = createContext(null);
export function createNavigationMachineState() {
  return {
    expanded: false,
    ...createSurfaceLifecycleState(),
  };
}
export function navigationStateReducer(state, action) {
  switch (action?.type) {
    case NAVIGATION_EVENTS.COLLAPSE:
      return state.expanded
        ? {
            ...state,
            expanded: false,
          }
        : state;
    case NAVIGATION_EVENTS.EXPAND:
      return state.expanded
        ? state
        : {
            ...state,
            expanded: true,
          };
    case NAVIGATION_EVENTS.SET_EXPANDED: {
      const value =
        typeof action.value === "function"
          ? action.value(state.expanded)
          : action.value;
      return state.expanded === Boolean(value)
        ? state
        : {
            ...state,
            expanded: Boolean(value),
          };
    }
    case NAVIGATION_EVENTS.TOGGLE:
      return {
        ...state,
        expanded: !state.expanded,
      };
    case NAVIGATION_EVENTS.OPEN_SURFACE: {
      const nextState = surfaceLifecycleReducer(state, action);
      return nextState === state
        ? state
        : {
            ...nextState,
            expanded: false,
          };
    }
    default:
      return surfaceLifecycleReducer(state, action);
  }
}
function updateCompactLocks(compactLocks, lockId, isLocked) {
  if (!lockId) return compactLocks;
  const hasLock = Boolean(compactLocks[lockId]);
  if (isLocked)
    return hasLock
      ? compactLocks
      : {
          ...compactLocks,
          [lockId]: true,
        };
  if (!hasLock) return compactLocks;
  const nextLocks = {
    ...compactLocks,
  };
  delete nextLocks[lockId];
  return nextLocks;
}
function hasCompactLocks(compactLocks) {
  return Object.keys(compactLocks).length > 0;
}
export function NavigationProvider({
  breadcrumbConfig = null,
  children,
  scheduler = null,
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [compactLocks, setCompactLocks] = useState({});
  const [operationState, dispatchOperation] = useReducer(
    navigationOperationReducer,
    undefined,
    createNavigationOperationState,
  );
  const [navigationMachine, dispatchNavigation] = useReducer(
    navigationStateReducer,
    undefined,
    createNavigationMachineState,
  );
  const [navHeight, setNavHeightState] = useState(0);
  const navHeightRef = useRef(0);
  const operationIdRef = useRef(0);
  const operationStateRef = useRef(operationState);
  const pendingSurfaceReturnRef = useRef(null);
  const pendingRouteResetPolicyRef = useRef(null);
  const previousSurfaceIdsRef = useRef(new Set());
  const runtimeSchedulerRef = useRef(null);
  if (runtimeSchedulerRef.current === null) {
    runtimeSchedulerRef.current = scheduler || createNavigationScheduler();
  }
  const runtimeScheduler = runtimeSchedulerRef.current;
  const setNavHeight = useCallback((nextHeight) => {
    const numericHeight = Number(nextHeight);
    const height = Number.isFinite(numericHeight)
      ? Math.max(0, numericHeight)
      : 0;
    if (navHeightRef.current === height) return;
    navHeightRef.current = height;
    recordNavigationDiagnostic(NAVIGATION_DIAGNOSTIC_EVENTS.HEIGHT_CHANGED, {
      height,
    });
    setNavHeightState(height);
  }, []);
  const {
    clearCommands: clearContextActions,
    contextCommands: contextActions,
    registerCommand: registerContextAction,
    setCommands: setContextActions,
    unregisterCommand: unregisterContextAction,
  } = useNavCommandRegistry();
  const [selectionModeState, setSelectionModeState] = useState(null);
  const [hudEntries, setHudEntries] = useState({});
  const navigationContinuity = useNavigationContinuity();
  operationStateRef.current = operationState;
  const activeOperation = useMemo(
    () => resolveActiveNavigationOperation(operationState),
    [operationState],
  );
  const setExpanded = useCallback((nextValue) => {
    dispatchNavigation({
      type: NAVIGATION_EVENTS.SET_EXPANDED,
      value: nextValue,
    });
  }, []);
  const collapse = useCallback(
    () =>
      dispatchNavigation({
        type: NAVIGATION_EVENTS.COLLAPSE,
      }),
    [],
  );
  const expand = useCallback(
    () =>
      dispatchNavigation({
        type: NAVIGATION_EVENTS.EXPAND,
      }),
    [],
  );
  const toggle = useCallback(() => {
    dispatchNavigation({
      type: NAVIGATION_EVENTS.TOGGLE,
    });
  }, []);
  const setIsCompact = useCallback((value) => {
    dispatchNavigation({
      type: NAVIGATION_EVENTS.SET_COMPACT,
      value,
    });
  }, []);
  const setCompactLock = useCallback((lockId, isLocked) => {
    if (!lockId) return;
    setCompactLocks((previousLocks) => {
      return updateCompactLocks(previousLocks, lockId, isLocked);
    });
  }, []);
  const setHud = useCallback(
    (descriptor) => {
      const definition = createHudDefinition(descriptor);
      if (!definition) return;
      if (navigationMachine.isCompact) {
        setCompactLock("hud-opening", true);
        runtimeScheduler.schedule(
          () => {
            setHudEntries((previousEntries) =>
              upsertHudEntry(previousEntries, definition),
            );
            setCompactLock("hud-opening", false);
          },
          320,
          {
            label: "navigation:hud",
          },
        );
        return;
      }
      setHudEntries((previousEntries) => {
        return upsertHudEntry(previousEntries, definition);
      });
    },
    [navigationMachine.isCompact, runtimeScheduler, setCompactLock],
  );
  const clearHud = useCallback((targetId) => {
    setHudEntries((previousEntries) => {
      return removeHudEntries(previousEntries, targetId);
    });
  }, []);
  const registryHudEntries = useNavHudRegistry();
  useNavHudRegistryLifecycle({
    clearHud,
    descriptors: registryHudEntries,
    setHud,
  });
  const setSelectionMode = useCallback((config) => {
    setSelectionModeState((currentSelection) => {
      const nextSelection = createSelectionModeState(config);
      return areSelectionModeStatesEqual(currentSelection, nextSelection)
        ? currentSelection
        : nextSelection;
    });
  }, []);
  const clearSelectionMode = useCallback(() => {
    setSelectionModeState((currentSelection) =>
      currentSelection === null ? currentSelection : null,
    );
  }, []);
  const prepareRouteReset = useCallback((routePolicy) => {
    pendingRouteResetPolicyRef.current = routePolicy || null;
  }, []);
  const clearPreparedRouteReset = useCallback(() => {
    pendingRouteResetPolicyRef.current = null;
  }, []);
  const startNavigationOperation = useCallback((input = {}) => {
    const operation = createNavigationOperation({
      ...input,
      id: input.id ?? `navigation-operation-${++operationIdRef.current}`,
    });
    if (!operation) return null;
    dispatchOperation({
      maxEntries: NAVIGATION_OPERATION_MAX_ENTRIES,
      operation,
      type: NAVIGATION_OPERATION_EVENTS.START,
    });
    recordNavigationDiagnostic("operation-started", {
      operationId: operation.id,
    });
    return operation;
  }, []);
  const updateNavigationOperation = useCallback((id, patch = {}) => {
    if (id == null) return false;
    dispatchOperation({
      id,
      patch,
      type: NAVIGATION_OPERATION_EVENTS.UPDATE,
    });
    recordNavigationDiagnostic("operation-updated", {
      operationId: String(id),
    });
    return true;
  }, []);
  const completeNavigationOperation = useCallback((id, result = null) => {
    if (id == null) return false;
    dispatchOperation({
      id,
      result,
      type: NAVIGATION_OPERATION_EVENTS.COMPLETE,
    });
    recordNavigationDiagnostic("operation-completed", {
      operationId: String(id),
    });
    return true;
  }, []);
  const cancelNavigationOperation = useCallback((id, result = null) => {
    if (id == null) return false;
    const operation = operationStateRef.current.entries.find(
      (entry) =>
        entry.id === String(id) &&
        entry.status === NAVIGATION_OPERATION_STATUS.PENDING,
    );
    if (!operation) return false;
    if (typeof operation.onCancel === "function") {
      Promise.resolve(operation.onCancel(result)).catch((error) => {
        console.error("Nav operation cancellation handler failed:", error);
      });
    }
    dispatchOperation({
      id,
      result,
      type: NAVIGATION_OPERATION_EVENTS.CANCEL,
    });
    recordNavigationDiagnostic("operation-cancelled", {
      operationId: String(id),
    });
    return true;
  }, []);
  const clearNavigationOperations = useCallback((id = null) => {
    dispatchOperation({
      id,
      type: NAVIGATION_OPERATION_EVENTS.CLEAR,
    });
  }, []);
  const handleSurfaceFlowSettlement = useCallback(
    ({ flow, result }) => {
      const handshake = flow?.returnHandshake;
      const isCompleted = result?.success === true;
      const isNavigationCancellation = [
        "browser-back",
        "navigation",
        "unmount",
      ].includes(result?.reason);
      if (
        !handshake?.pathname ||
        isNavigationCancellation ||
        (!isCompleted && !handshake.returnOnCancel)
      ) {
        return false;
      }
      const handoff = navigationContinuity.deliverReturn(handshake.pathname, {
        data: result?.data ?? null,
        flowId: flow.flowId,
        status: isCompleted ? "completed" : "cancelled",
      });
      if (!handoff) return false;
      pendingSurfaceReturnRef.current = handshake;
      if (isSamePath(pathname, handshake.pathname)) {
        pendingSurfaceReturnRef.current = null;
        navigationContinuity.restore(handshake.pathname, handshake);
      } else {
        router.push(handshake.pathname);
      }
      return true;
    },
    [navigationContinuity, pathname, router],
  );
  const {
    cancelSurfaceFlow,
    closeAllSurfaces,
    closeSurface,
    completeSurfaceFlow,
    goBackSurface,
    goToStep,
    getSurfaceFlow,
    handleSurfaceAnimationComplete,
    openSurface,
    openSurfaceFlow,
    popStep,
    pushStep,
    restoreSurfaceFlow,
    surfaceState,
    updateSurfaceFlow,
  } = useSurfaceStack({
    isCompact: navigationMachine.isCompact,
    onSurfaceFlowSettled: handleSurfaceFlowSettlement,
    scheduler: runtimeScheduler,
    setCompactLock,
    setExpanded,
    setSearchQuery,
  });
  useEffect(() => {
    const currentSurfaceIds = new Set(
      surfaceState.surfaceStack.map((surface) => surface.id),
    );
    currentSurfaceIds.forEach((surfaceId) => {
      if (!previousSurfaceIdsRef.current.has(surfaceId)) {
        recordNavigationDiagnostic(
          NAVIGATION_DIAGNOSTIC_EVENTS.SURFACE_OPENED,
          {
            surfaceId,
          },
        );
      }
    });
    previousSurfaceIdsRef.current.forEach((surfaceId) => {
      if (!currentSurfaceIds.has(surfaceId)) {
        recordNavigationDiagnostic(
          NAVIGATION_DIAGNOSTIC_EVENTS.SURFACE_CLOSED,
          {
            surfaceId,
          },
        );
      }
    });
    previousSurfaceIdsRef.current = currentSurfaceIds;
  }, [surfaceState.surfaceStack]);
  useEffect(() => {
    const handshake = pendingSurfaceReturnRef.current;
    if (!handshake || !isSamePath(pathname, handshake.pathname)) return;
    pendingSurfaceReturnRef.current = null;
    navigationContinuity.restore(handshake.pathname, handshake);
  }, [navigationContinuity, pathname]);
  const handleRouteChange = useCallback(() => {
    const routePolicy = pendingRouteResetPolicyRef.current;
    pendingRouteResetPolicyRef.current = null;
    if (routePolicy?.dismissSurfaces !== false) {
      closeAllSurfaces({
        success: false,
        cancelled: true,
        reason: "navigation",
      });
    }
    if (routePolicy?.clearTransientState !== false) {
      setSelectionModeState(null);
      setHudEntries({});
    }
  }, [closeAllSurfaces]);
  useNavigationRouteReset(pathname, handleRouteChange);
  const compactLocked = hasCompactLocks(compactLocks);
  const registeredHud = useMemo(
    () => getActiveNavigationHud(hudEntries, selectionModeState),
    [hudEntries, selectionModeState],
  );
  const pendingOperationCount = useMemo(
    () =>
      operationState.entries.filter(
        (operation) => operation.status === NAVIGATION_OPERATION_STATUS.PENDING,
      ).length,
    [operationState.entries],
  );
  const operationHud = useMemo(
    () =>
      createNavigationOperationHud(activeOperation, {
        onCancel: cancelNavigationOperation,
        pendingCount: pendingOperationCount,
      }),
    [activeOperation, cancelNavigationOperation, pendingOperationCount],
  );
  const activeHud = operationHud || registeredHud;
  const activeSelectionMode = selectionModeState;
  const isHudActive = Boolean(activeHud?.isActive);
  useEffect(() => {
    updateNavigationInspectorSnapshot({
      activeOperation,
      compactLocked,
      expanded: navigationMachine.expanded,
      navHeight,
      operations: operationState.entries,
      pathname,
      surfaceStack: surfaceState.surfaceStack,
    });
  }, [
    activeOperation,
    compactLocked,
    navHeight,
    navigationMachine.expanded,
    operationState.entries,
    pathname,
    surfaceState.surfaceStack,
  ]);
  const stateValue = useMemo(
    () => ({
      ...surfaceState,
      activeOperation,
      contextActions,
      hud: activeHud,
      hudEntries: Object.values(hudEntries),
      isHudActive,
      navigationContinuity: navigationContinuity.entries,
      navigationReturnHandoffs: navigationContinuity.returnHandoffs,
      operations: operationState.entries,
      selectionMode: activeSelectionMode,
      searchQuery,
      compactLocked,
      navHeight,
      expanded: navigationMachine.expanded,
      isCompact: navigationMachine.isCompact,
    }),
    [
      surfaceState,
      activeOperation,
      contextActions,
      activeHud,
      hudEntries,
      isHudActive,
      navigationContinuity.entries,
      navigationContinuity.returnHandoffs,
      operationState.entries,
      activeSelectionMode,
      searchQuery,
      compactLocked,
      navHeight,
      navigationMachine.expanded,
      navigationMachine.isCompact,
    ],
  );
  const selectorStoreRef = useRef(null);
  if (selectorStoreRef.current === null) {
    selectorStoreRef.current = createNavigationSelectorStore(stateValue);
  }
  const selectorStore = selectorStoreRef.current;
  useLayoutEffect(() => {
    selectorStore.publish(stateValue);
  }, [selectorStore, stateValue]);
  const operationActions = useMemo(
    () => ({
      cancel: cancelNavigationOperation,
      clear: clearNavigationOperations,
      complete: completeNavigationOperation,
      start: startNavigationOperation,
      update: updateNavigationOperation,
    }),
    [
      cancelNavigationOperation,
      clearNavigationOperations,
      completeNavigationOperation,
      startNavigationOperation,
      updateNavigationOperation,
    ],
  );
  const continuityActions = useMemo(
    () => ({
      clear: navigationContinuity.clear,
      consumeReturn: navigationContinuity.consumeReturn,
      deliverReturn: navigationContinuity.deliverReturn,
      get: navigationContinuity.get,
      getReturns: navigationContinuity.getReturns,
      remember: navigationContinuity.remember,
      remove: navigationContinuity.remove,
      restore: navigationContinuity.restore,
    }),
    [
      navigationContinuity.clear,
      navigationContinuity.consumeReturn,
      navigationContinuity.deliverReturn,
      navigationContinuity.get,
      navigationContinuity.getReturns,
      navigationContinuity.remember,
      navigationContinuity.remove,
      navigationContinuity.restore,
    ],
  );
  const actionsValue = useMemo(
    () => ({
      clearContextActions,
      clearPreparedRouteReset,
      clearHud,
      clearSelectionMode,
      continuity: continuityActions,
      closeAllSurfaces,
      cancelSurfaceFlow,
      closeSurface,
      completeSurfaceFlow,
      goBackSurface,
      goToStep,
      getSurfaceFlow,
      handleSurfaceAnimationComplete,
      openSurface,
      openSurfaceFlow,
      operations: operationActions,
      popStep,
      prepareRouteReset,
      pushStep,
      registerContextAction,
      setCompactLock,
      setContextActions,
      setExpanded,
      setHud,
      setIsCompact,
      setNavHeight,
      setSearchQuery,
      setSelectionMode,
      unregisterContextAction,
      restoreSurfaceFlow,
      updateSurfaceFlow,
      collapse,
      expand,
      toggle,
    }),
    [
      clearContextActions,
      clearPreparedRouteReset,
      clearHud,
      clearSelectionMode,
      continuityActions,
      closeAllSurfaces,
      cancelSurfaceFlow,
      closeSurface,
      completeSurfaceFlow,
      goBackSurface,
      goToStep,
      getSurfaceFlow,
      handleSurfaceAnimationComplete,
      openSurface,
      openSurfaceFlow,
      operationActions,
      popStep,
      prepareRouteReset,
      pushStep,
      registerContextAction,
      setCompactLock,
      setContextActions,
      setExpanded,
      setHud,
      setIsCompact,
      setNavHeight,
      setSearchQuery,
      setSelectionMode,
      unregisterContextAction,
      restoreSurfaceFlow,
      updateSurfaceFlow,
      collapse,
      expand,
      toggle,
    ],
  );
  const surfaceFlowValue = useMemo(
    () => ({
      cancelSurfaceFlow,
      completeSurfaceFlow,
      openSurfaceFlow,
      restoreSurfaceFlow,
      surfaceState,
      updateSurfaceFlow,
    }),
    [
      cancelSurfaceFlow,
      completeSurfaceFlow,
      openSurfaceFlow,
      restoreSurfaceFlow,
      surfaceState,
      updateSurfaceFlow,
    ],
  );
  return createElement(
    NavigationRuntimeContext.Provider,
    {
      value: runtimeScheduler,
    },
    createElement(
      NavigationActionsContext.Provider,
      {
        value: actionsValue,
      },
      createElement(
        NavigationStateContext.Provider,
        {
          value: stateValue,
        },
        createElement(
          NavigationSelectorContext.Provider,
          {
            value: selectorStore,
          },
          createElement(
            SurfaceFlowProvider,
            {
              value: surfaceFlowValue,
            },
            createElement(
              SurfaceExtensionsProvider,
              null,
              createElement(
                BreadcrumbProvider,
                {
                  config: breadcrumbConfig,
                },
                children,
              ),
            ),
          ),
        ),
      ),
    ),
  );
}
export function useNavigationState() {
  return useRequiredContext(
    NavigationStateContext,
    "useNavigationState",
    "NavigationProvider",
  );
}
export function useNavigationSelector(selector, isEqual = Object.is) {
  const store = useRequiredContext(
    NavigationSelectorContext,
    "useNavigationSelector",
    "NavigationProvider",
  );
  const selectorRef = useRef(selector);
  const equalityRef = useRef(isEqual);
  const cacheRef = useRef({
    isEqual: null,
    selected: undefined,
    selector: null,
    snapshot: null,
  });
  selectorRef.current = selector;
  equalityRef.current = isEqual;
  const getSelectedSnapshot = useCallback(() => {
    const snapshot = store.getSnapshot();
    const cache = cacheRef.current;
    const resolvedSelector = selectorRef.current;
    const resolvedIsEqual = equalityRef.current;
    if (
      cache.snapshot === snapshot &&
      cache.selector === resolvedSelector &&
      cache.isEqual === resolvedIsEqual
    ) {
      return cache.selected;
    }
    const selected = resolvedSelector(snapshot);
    if (
      cache.snapshot !== null &&
      cache.isEqual === resolvedIsEqual &&
      resolvedIsEqual(cache.selected, selected)
    ) {
      cache.snapshot = snapshot;
      cache.selector = resolvedSelector;
      return cache.selected;
    }
    cacheRef.current = {
      isEqual: resolvedIsEqual,
      selected,
      selector: resolvedSelector,
      snapshot,
    };
    return selected;
  }, [store]);
  return useSyncExternalStore(
    store.subscribe,
    getSelectedSnapshot,
    getSelectedSnapshot,
  );
}
export function useNavigationRuntimeHealth() {
  const runtimeScheduler = useRequiredContext(
    NavigationRuntimeContext,
    "useNavigationRuntimeHealth",
    "NavigationProvider",
  );
  const diagnostics = useNavigationDiagnostics();
  const schedulerSnapshot = useSyncExternalStore(
    runtimeScheduler.subscribe,
    runtimeScheduler.getSnapshot,
    runtimeScheduler.getSnapshot,
  );
  return useMemo(
    () => ({
      diagnostics,
      scheduler: schedulerSnapshot,
    }),
    [diagnostics, schedulerSnapshot],
  );
}
export function useNavigationActions() {
  return useRequiredContext(
    NavigationActionsContext,
    "useNavigationActions",
    "NavigationProvider",
  );
}
export function useNavigationContext() {
  const actions = useNavigationActions();
  const state = useNavigationState();
  return useMemo(
    () => ({
      ...state,
      ...actions,
    }),
    [state, actions],
  );
}
export function useNavContextActions(actions) {
  const { registerContextAction, unregisterContextAction } =
    useNavigationActions();
  const registeredKeysRef = useRef(new Set());
  useEffect(() => {
    const currentKeys = new Set();
    toArray(actions).forEach((action, index) => {
      if (!action) return;
      const key = action.key || `ctx-action-${index}`;
      currentKeys.add(key);
      registerContextAction({
        key,
        ...action,
      });
    });
    registeredKeysRef.current.forEach((prevKey) => {
      if (!currentKeys.has(prevKey)) {
        unregisterContextAction(prevKey);
      }
    });
    registeredKeysRef.current = currentKeys;
  }, [actions, registerContextAction, unregisterContextAction]);
  useEffect(() => {
    return () => {
      registeredKeysRef.current.forEach((key) => {
        unregisterContextAction(key);
      });
      registeredKeysRef.current.clear();
    };
  }, [unregisterContextAction]);
}
export function useNavHeight() {
  const navHeight = useNavigationSelector((state) => state.navHeight);
  return {
    navHeight,
    padding: {
      paddingBottom: `${navHeight}px`,
    },
  };
}
export function useNavHud(descriptor) {
  const { setHud, clearHud } = useNavigationActions();
  return useNavHudLifecycle({
    clearHud,
    descriptor,
    setHud,
  });
}
export function useNavigationOperations() {
  const { activeOperation, entries } = useNavigationSelector(
    (state) => ({
      activeOperation: state.activeOperation,
      entries: state.operations,
    }),
    areShallowCollectionsEqual,
  );
  const { operations } = useNavigationActions();
  return useMemo(
    () => ({
      active: activeOperation,
      entries,
      ...operations,
    }),
    [activeOperation, entries, operations],
  );
}
export function useNavigationContinuityState() {
  const { entries, returnHandoffs } = useNavigationSelector(
    (state) => ({
      entries: state.navigationContinuity,
      returnHandoffs: state.navigationReturnHandoffs,
    }),
    areShallowCollectionsEqual,
  );
  const { continuity } = useNavigationActions();
  return useMemo(
    () => ({
      entries,
      returnHandoffs,
      ...continuity,
    }),
    [continuity, entries, returnHandoffs],
  );
}
export function useSurfaceReturn() {
  const pathname = usePathname();
  const { continuity } = useNavigationActions();
  const navigationReturnHandoffs = useNavigationSelector(
    (state) => state.navigationReturnHandoffs,
  );
  const entries = useMemo(
    () =>
      navigationReturnHandoffs.filter((handoff) =>
        isSamePath(handoff.path, pathname),
      ),
    [navigationReturnHandoffs, pathname],
  );
  const consume = useCallback(
    (handoffId = null) => continuity.consumeReturn(pathname, handoffId),
    [continuity, pathname],
  );
  return useMemo(
    () => ({
      consume,
      entries,
      peek: () => entries[0] || null,
    }),
    [consume, entries],
  );
}
export function useNavigation() {
  const {
    closeSurface,
    setCompactLock,
    setExpanded: setExpandedState,
    setIsCompact,
    setNavHeight,
    setSearchQuery,
  } = useNavigationActions();
  const { compactLocked, isExpanded, searchQuery } = useNavigationSelector(
    (state) => ({
      compactLocked: state.compactLocked,
      isExpanded: state.expanded,
      searchQuery: state.searchQuery,
    }),
    areShallowCollectionsEqual,
  );
  const runtimeScheduler = useRequiredContext(
    NavigationRuntimeContext,
    "useNavigation",
    "NavigationProvider",
  );
  const [isHovered, setIsHovered] = useState(false);
  const core = useNavigationCore();
  const display = useNavigationDisplay();
  const {
    activeTransaction,
    cancelNavigation,
    lastTransaction,
    navigate: navigateWithGuards,
    pathname,
  } = core;
  const { navigationItems, activeItem, statusState, attention, topology } =
    display;
  const { isPlaying: isVideoPlaying } = useBackgroundState();
  const isHudModeActive =
    attention?.kind === NAV_ATTENTION_KIND.HUD ||
    attention?.kind === NAV_ATTENTION_KIND.OPERATION;
  const isSurfaceActive = Boolean(activeItem?.isSurface);
  const activeItemHasAction = Boolean(activeItem?.action);
  const { compact, exitCompact } = useNavigationCompactController({
    activeItem,
    expanded: isExpanded,
    isHudActive: isHudModeActive,
    pathname,
    searchQuery,
    compactLocked,
    isVideoPlaying,
  });
  useEffect(() => {
    setIsCompact(compact);
  }, [compact, setIsCompact]);
  const clearHoverState = useCallback(() => {
    setIsHovered(false);
  }, []);
  const pendingExpandFrameRef = useRef(null);
  useEffect(() => {
    return () => {
      if (pendingExpandFrameRef.current !== null) {
        runtimeScheduler.cancel(pendingExpandFrameRef.current);
      }
    };
  }, [runtimeScheduler]);
  const setExpanded = useCallback(
    (nextValue) => {
      const resolvedValue =
        typeof nextValue === "function" ? nextValue(isExpanded) : nextValue;
      if (isSurfaceActive && resolvedValue) {
        return;
      }
      if (!resolvedValue && pendingExpandFrameRef.current !== null) {
        runtimeScheduler.cancel(pendingExpandFrameRef.current);
        pendingExpandFrameRef.current = null;
      }
      if (!resolvedValue || !compact || typeof window === "undefined") {
        setExpandedState(resolvedValue);
        return;
      }
      exitCompact();
      if (pendingExpandFrameRef.current !== null) {
        return;
      }
      pendingExpandFrameRef.current = runtimeScheduler.schedule(
        () => {
          pendingExpandFrameRef.current = null;
          setExpandedState(true);
        },
        320,
        {
          label: "navigation:expand",
        },
      );
    },
    [
      compact,
      exitCompact,
      isExpanded,
      isSurfaceActive,
      runtimeScheduler,
      setExpandedState,
    ],
  );
  const wasSurfaceActiveRef = useRef(false);
  useEffect(() => {
    if (isSurfaceActive) {
      wasSurfaceActiveRef.current = true;
      return;
    }
    if (wasSurfaceActiveRef.current) {
      wasSurfaceActiveRef.current = false;
      clearHoverState();
    }
  }, [clearHoverState, isSurfaceActive]);
  useEffect(() => {
    if (!isSurfaceActive || !isExpanded) {
      return;
    }
    setExpandedState(false);
  }, [isExpanded, isSurfaceActive, setExpandedState]);
  const navigate = useCallback(
    async (href, options) => {
      if (!href) {
        return false;
      }
      const didNavigate = await navigateWithGuards(href, options);
      if (!didNavigate) {
        return didNavigate;
      }
      setExpanded(false);
      setSearchQuery("");
      clearHoverState();
      return didNavigate;
    },
    [clearHoverState, navigateWithGuards, setExpanded, setSearchQuery],
  );
  const { displayItems, activeIndex: layoutActiveIndex } = useNavigationLayout({
    navigationItems,
    activeItem,
  });
  useNavigationRouteReset(pathname, () => {
    setExpanded(false);
    setSearchQuery("");
    setIsHovered(false);
  });
  return {
    navigationItems: displayItems,
    activeItem,
    activeIndex: layoutActiveIndex,
    statusState,
    attention,
    topology,
    navigationTransaction: activeTransaction,
    lastNavigationTransaction: lastTransaction,
    navigate,
    pathname,
    cancelNavigation,
    closeSurface,
    expanded: isExpanded,
    setExpanded,
    setNavHeight,
    setSearchQuery,
    setCompactLock,
    exitCompact,
    isHovered,
    setIsHovered,
    searchQuery,
    activeItemHasAction,
    compactLocked,
    compact,
    isHudActive: isHudModeActive,
  };
}
