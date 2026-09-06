"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";

import {
  NAVIGATION_CONTINUITY_EVENTS,
  NAVIGATION_CONTINUITY_MAX_ENTRIES,
  NAVIGATION_SURFACE_RETURN_MAX_ENTRIES,
  NAVIGATION_PREFETCH_INTENT_DELAY_MS,
  NAVIGATION_TRANSACTION_EVENTS,
  NAVIGATION_TRANSACTION_REASON,
  NAVIGATION_TRANSACTION_STATUS,
  NAVIGATION_TRANSACTION_TIMEOUT_MS,
} from "./constants";
import { isSafeInternalHref, isSamePath, normalizePath } from "./utils";

// ── Navigation transactions ──────────────────────────────────────────────────

/**
 * Builds a stable client-side navigation identity from all route-addressable parts.
 * @param {{hash?: string, pathname?: string, search?: string}} parts - Browser location parts
 * @returns {string} Path, query string, and hash in browser order
 */
export function getNavigationLocationKey({
  hash = "",
  pathname = "/",
  search = "",
} = {}) {
  const normalizedPathname = String(pathname || "/").trim() || "/";
  const normalizedSearch = String(search || "").trim();
  const normalizedHash = String(hash || "").trim();
  const query = normalizedSearch
    ? normalizedSearch.startsWith("?")
      ? normalizedSearch
      : `?${normalizedSearch}`
    : "";
  const fragment = normalizedHash
    ? normalizedHash.startsWith("#")
      ? normalizedHash
      : `#${normalizedHash}`
    : "";

  return `${normalizedPathname}${query}${fragment}`;
}

/** Creates the initial transaction snapshot for navigation work. */
export function createNavigationTransactionState() {
  return {
    active: null,
    last: null,
  };
}

/**
 * Creates one immutable navigation transaction descriptor.
 * @param {object} options - Navigation source, destination, and identity
 * @returns {object} Pending transaction descriptor
 */
export function createNavigationTransaction({
  from = "",
  id,
  source = "navigation",
  startedAt = Date.now(),
  to = "",
} = {}) {
  return {
    from: String(from || ""),
    id,
    source,
    startedAt,
    status: NAVIGATION_TRANSACTION_STATUS.PENDING,
    to: String(to || ""),
  };
}

function settleNavigationTransaction(transaction, action, status) {
  return {
    ...transaction,
    endedAt: action.endedAt ?? Date.now(),
    error: action.error ?? null,
    reason: action.reason ?? null,
    status,
  };
}

function getTransactionStatusForEvent(eventType) {
  if (eventType === NAVIGATION_TRANSACTION_EVENTS.COMPLETE) {
    return NAVIGATION_TRANSACTION_STATUS.COMPLETED;
  }
  if (eventType === NAVIGATION_TRANSACTION_EVENTS.CANCEL) {
    return NAVIGATION_TRANSACTION_STATUS.CANCELLED;
  }
  if (eventType === NAVIGATION_TRANSACTION_EVENTS.FAIL) {
    return NAVIGATION_TRANSACTION_STATUS.FAILED;
  }
  return NAVIGATION_TRANSACTION_STATUS.TIMED_OUT;
}

/**
 * Reduces one navigation transaction event while rejecting stale completions.
 * @param {{active: object|null, last: object|null}} state - Current transaction snapshot
 * @param {object} action - Transaction event
 * @returns {{active: object|null, last: object|null}} Next transaction snapshot
 */
export function navigationTransactionReducer(state, action) {
  switch (action?.type) {
    case NAVIGATION_TRANSACTION_EVENTS.START: {
      const nextTransaction = action.transaction;
      if (nextTransaction?.id == null) return state;

      const supersededTransaction = state.active
        ? settleNavigationTransaction(
            state.active,
            { reason: NAVIGATION_TRANSACTION_REASON.SUPERSEDED },
            NAVIGATION_TRANSACTION_STATUS.CANCELLED,
          )
        : state.last;

      return {
        active: nextTransaction,
        last: supersededTransaction,
      };
    }
    case NAVIGATION_TRANSACTION_EVENTS.COMPLETE:
    case NAVIGATION_TRANSACTION_EVENTS.CANCEL:
    case NAVIGATION_TRANSACTION_EVENTS.FAIL:
    case NAVIGATION_TRANSACTION_EVENTS.TIME_OUT: {
      if (!state.active || state.active.id !== action.id) return state;

      return {
        active: null,
        last: settleNavigationTransaction(
          state.active,
          action,
          getTransactionStatusForEvent(action.type),
        ),
      };
    }
    default:
      return state;
  }
}

/**
 * Owns one active route transaction, supersedes stale work, and provides a bounded timeout.
 * @param {object} [options] - Timeout and timeout callback configuration
 * @returns {object} Transaction state and lifecycle controls
 */
export function useNavigationTransactions({
  onTransactionEvent = null,
  onTimeout = null,
  timeoutMs = NAVIGATION_TRANSACTION_TIMEOUT_MS,
} = {}) {
  const [state, dispatch] = useReducer(
    navigationTransactionReducer,
    undefined,
    createNavigationTransactionState,
  );
  const activeTransactionRef = useRef(null);
  const nextTransactionIdRef = useRef(0);
  const timeoutRef = useRef(null);
  const onTimeoutRef = useRef(onTimeout);
  const onTransactionEventRef = useRef(onTransactionEvent);

  useEffect(() => {
    onTimeoutRef.current = onTimeout;
  }, [onTimeout]);

  useEffect(() => {
    onTransactionEventRef.current = onTransactionEvent;
  }, [onTransactionEvent]);

  const clearTransactionTimeout = useCallback(() => {
    if (timeoutRef.current === null) return;
    clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
  }, []);

  const settleTransaction = useCallback(
    (id, type, details = {}) => {
      const activeTransaction = activeTransactionRef.current;
      if (!activeTransaction || activeTransaction.id !== id) return false;

      clearTransactionTimeout();
      activeTransactionRef.current = null;
      const event = { ...details, endedAt: Date.now(), id, type };
      const settledTransaction = settleNavigationTransaction(
        activeTransaction,
        event,
        getTransactionStatusForEvent(type),
      );
      dispatch(event);
      onTransactionEventRef.current?.({
        transaction: settledTransaction,
        type,
      });
      return true;
    },
    [clearTransactionTimeout],
  );

  const beginTransaction = useCallback(
    ({ from, source, to } = {}) => {
      const activeTransaction = activeTransactionRef.current;
      if (activeTransaction) {
        settleTransaction(
          activeTransaction.id,
          NAVIGATION_TRANSACTION_EVENTS.CANCEL,
          {
            reason: NAVIGATION_TRANSACTION_REASON.SUPERSEDED,
          },
        );
      }

      const transaction = createNavigationTransaction({
        from,
        id: ++nextTransactionIdRef.current,
        source,
        to,
      });
      activeTransactionRef.current = transaction;
      dispatch({ transaction, type: NAVIGATION_TRANSACTION_EVENTS.START });
      onTransactionEventRef.current?.({
        transaction,
        type: NAVIGATION_TRANSACTION_EVENTS.START,
      });

      const safeTimeout = Number(timeoutMs);
      if (Number.isFinite(safeTimeout) && safeTimeout > 0) {
        timeoutRef.current = setTimeout(() => {
          if (
            !settleTransaction(
              transaction.id,
              NAVIGATION_TRANSACTION_EVENTS.TIME_OUT,
              {
                reason: NAVIGATION_TRANSACTION_REASON.TIME_OUT,
              },
            )
          ) {
            return;
          }

          onTimeoutRef.current?.(transaction);
        }, safeTimeout);
      }

      return transaction;
    },
    [settleTransaction, timeoutMs],
  );

  const completeTransaction = useCallback(
    (id) => settleTransaction(id, NAVIGATION_TRANSACTION_EVENTS.COMPLETE),
    [settleTransaction],
  );
  const cancelTransaction = useCallback(
    (id, reason = null) =>
      settleTransaction(id, NAVIGATION_TRANSACTION_EVENTS.CANCEL, { reason }),
    [settleTransaction],
  );
  const cancelActiveTransaction = useCallback(
    (reason = null) => {
      const activeTransaction = activeTransactionRef.current;
      if (!activeTransaction) return false;
      return cancelTransaction(activeTransaction.id, reason);
    },
    [cancelTransaction],
  );
  const failTransaction = useCallback(
    (id, error) =>
      settleTransaction(id, NAVIGATION_TRANSACTION_EVENTS.FAIL, { error }),
    [settleTransaction],
  );
  const completeTransactionForPath = useCallback(
    (pathname) => {
      const activeTransaction = activeTransactionRef.current;
      if (!activeTransaction || !isSamePath(activeTransaction.to, pathname))
        return false;
      return completeTransaction(activeTransaction.id);
    },
    [completeTransaction],
  );
  const isTransactionCurrent = useCallback(
    (id) => activeTransactionRef.current?.id === id,
    [],
  );

  useEffect(() => {
    return () => {
      clearTransactionTimeout();
      activeTransactionRef.current = null;
    };
  }, [clearTransactionTimeout]);

  return useMemo(
    () => ({
      activeTransaction: state.active,
      beginTransaction,
      cancelActiveTransaction,
      cancelTransaction,
      completeTransaction,
      completeTransactionForPath,
      failTransaction,
      isTransactionCurrent,
      lastTransaction: state.last,
    }),
    [
      state.active,
      state.last,
      beginTransaction,
      cancelActiveTransaction,
      cancelTransaction,
      completeTransaction,
      completeTransactionForPath,
      failTransaction,
      isTransactionCurrent,
    ],
  );
}

// ── Route topology and continuity ────────────────────────────────────────────

function getTopologyNodeId(item, index) {
  return item?.id || item?.path || item?.name || `navigation-node-${index}`;
}

function flattenNavigationTopology(
  items,
  parentId = null,
  depth = 0,
  nodes = [],
) {
  if (!Array.isArray(items)) return nodes;

  items.forEach((item) => {
    if (!item || typeof item !== "object") return;

    const id = getTopologyNodeId(item, nodes.length);
    nodes.push({
      depth,
      id,
      parentId,
      path: normalizePath(item.path || ""),
    });
    flattenNavigationTopology(item.children, id, depth + 1, nodes);
  });

  return nodes;
}

function resolveTopologyActiveNode(nodes, pathname) {
  const normalizedPath = normalizePath(pathname || "");
  return nodes.find((node) => isSamePath(node.path, normalizedPath)) || null;
}

function resolveTopologyAncestors(nodes, activeNode) {
  if (!activeNode) return [];

  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const ancestors = [];
  let currentNode = activeNode;

  while (currentNode?.parentId) {
    currentNode = nodesById.get(currentNode.parentId) || null;
    if (currentNode) ancestors.unshift(currentNode);
  }

  return ancestors;
}

/**
 * Builds a normalized route tree that is independent of any router or UI.
 * @param {Array<object>} items - Nested navigation items
 * @param {object} [options] - Active-route configuration
 * @returns {{activeNode: object|null, activePath: string, ancestors: Array<object>, nodes: Array<object>}} Route topology
 */
export function createNavigationTopology(items = [], { pathname = "" } = {}) {
  const nodes = flattenNavigationTopology(items);
  const activePath = normalizePath(pathname || "");
  const activeNode = resolveTopologyActiveNode(nodes, activePath);

  return {
    activeNode,
    activePath,
    ancestors: resolveTopologyAncestors(nodes, activeNode),
    nodes,
  };
}

/**
 * Returns the path chain for a route represented by a navigation topology.
 * @param {object} topology - Topology created by createNavigationTopology
 * @param {string} [pathname] - Target path, defaulting to the active path
 * @returns {Array<object>} Root-to-target topology nodes
 */
export function resolveNavigationTopologyPath(
  topology,
  pathname = topology?.activePath,
) {
  const nodes = Array.isArray(topology?.nodes) ? topology.nodes : [];
  const activeNode = resolveTopologyActiveNode(nodes, pathname);
  return activeNode
    ? [...resolveTopologyAncestors(nodes, activeNode), activeNode]
    : [];
}

function normalizeContinuitySnapshot(snapshot) {
  if (
    snapshot == null ||
    typeof snapshot !== "object" ||
    Array.isArray(snapshot)
  )
    return {};
  return { ...snapshot };
}

/** Creates an empty, bounded continuity history. */
export function createNavigationContinuityState() {
  return { entries: [], returnHandoffs: [] };
}

function normalizeNavigationReturnValue(value) {
  if (value == null || typeof value !== "object") return value ?? null;
  if (Array.isArray(value)) return [...value];
  return { ...value };
}

let navigationReturnHandoffSequence = 0;

/**
 * Creates a one-time result delivery for a route reached after a surface flow settles.
 * @param {object} [input] - Return target, originating flow, and result payload
 * @returns {object|null} Normalized return handoff
 */
export function createNavigationReturnHandoff({
  data = null,
  flowId = null,
  pathname = "",
  status = null,
  timestamp = Date.now(),
} = {}) {
  if (!isSafeInternalHref(pathname)) return null;
  const path = normalizePath(pathname || "");
  if (!path) return null;

  const resolvedTimestamp = Number.isFinite(Number(timestamp))
    ? Number(timestamp)
    : Date.now();
  return {
    data: normalizeNavigationReturnValue(data),
    flowId: typeof flowId === "string" && flowId ? flowId : null,
    id: `${typeof flowId === "string" && flowId ? flowId : "surface-flow"}:${resolvedTimestamp}:${++navigationReturnHandoffSequence}`,
    path,
    status: typeof status === "string" && status ? status : null,
    timestamp: resolvedTimestamp,
  };
}

/**
 * Creates a recoverable route snapshot.
 * @param {object} [options] - Path, scroll position, focus key, and caller snapshot
 * @returns {object|null} Normalized continuity entry
 */
export function createNavigationContinuityEntry({
  focusKey = null,
  pathname = "",
  scrollY = 0,
  snapshot = null,
  updatedAt = Date.now(),
} = {}) {
  const path = normalizePath(pathname || "");
  if (!path) return null;

  const numericScrollY = Number(scrollY);
  return {
    focusKey: typeof focusKey === "string" && focusKey ? focusKey : null,
    path,
    scrollY: Number.isFinite(numericScrollY) ? Math.max(0, numericScrollY) : 0,
    snapshot: normalizeContinuitySnapshot(snapshot),
    updatedAt: Number.isFinite(Number(updatedAt))
      ? Number(updatedAt)
      : Date.now(),
  };
}

/**
 * Records, removes, and clears route continuity without mutating caller state.
 * @param {{entries: Array<object>}} state - Current continuity state
 * @param {object} action - Continuity event
 * @returns {{entries: Array<object>}} Next continuity state
 */
export function navigationContinuityReducer(state, action) {
  const currentState = state || createNavigationContinuityState();
  const returnHandoffs = Array.isArray(currentState.returnHandoffs)
    ? currentState.returnHandoffs
    : [];
  if (action?.type === NAVIGATION_CONTINUITY_EVENTS.CLEAR) {
    return currentState.entries.length || returnHandoffs.length
      ? createNavigationContinuityState()
      : currentState;
  }

  if (action?.type === NAVIGATION_CONTINUITY_EVENTS.DELIVER_RETURN) {
    const handoff = action.handoff;
    if (!handoff?.id || !handoff.path) return currentState;
    const maxEntries = Math.max(
      1,
      Number(action.maxEntries) || NAVIGATION_SURFACE_RETURN_MAX_ENTRIES,
    );
    return {
      ...currentState,
      returnHandoffs: [
        ...returnHandoffs.filter((entry) => entry.id !== handoff.id),
        handoff,
      ].slice(-maxEntries),
    };
  }

  if (action?.type === NAVIGATION_CONTINUITY_EVENTS.CONSUME_RETURN) {
    const handoffId =
      typeof action.handoffId === "string" ? action.handoffId : "";
    if (!handoffId) return currentState;
    const nextReturnHandoffs = returnHandoffs.filter(
      (entry) => entry.id !== handoffId,
    );
    return nextReturnHandoffs.length === returnHandoffs.length
      ? currentState
      : { ...currentState, returnHandoffs: nextReturnHandoffs };
  }

  if (action?.type === NAVIGATION_CONTINUITY_EVENTS.REMOVE) {
    const path = normalizePath(action.path || "");
    const entries = currentState.entries.filter((entry) => entry.path !== path);
    return entries.length === currentState.entries.length
      ? currentState
      : { ...currentState, entries };
  }

  if (
    action?.type !== NAVIGATION_CONTINUITY_EVENTS.RECORD ||
    !action.entry?.path
  ) {
    return currentState;
  }

  const maxEntries = Math.max(
    1,
    Number(action.maxEntries) || NAVIGATION_CONTINUITY_MAX_ENTRIES,
  );
  const entries = [
    ...currentState.entries.filter((entry) => entry.path !== action.entry.path),
    action.entry,
  ].slice(-maxEntries);
  return { ...currentState, entries };
}

/**
 * Finds the last continuity entry for a path.
 * @param {{entries: Array<object>}} state - Continuity state
 * @param {string} pathname - Route path
 * @returns {object|null} Matching continuity entry
 */
export function resolveNavigationContinuityEntry(state, pathname) {
  const path = normalizePath(pathname || "");
  return state?.entries?.find((entry) => entry.path === path) || null;
}

/**
 * Lists unconsumed surface-flow results for one route in delivery order.
 * @param {{returnHandoffs?: Array<object>}} state - Continuity state
 * @param {string} pathname - Return target path
 * @returns {Array<object>} Matching return handoffs
 */
export function resolveNavigationReturnHandoffs(state, pathname) {
  const path = normalizePath(pathname || "");
  if (!path) return [];
  return (state?.returnHandoffs || []).filter(
    (handoff) => handoff.path === path,
  );
}

/**
 * Owns route continuity snapshots and restores browser scroll only on request.
 * @param {object} [options] - Bounded history configuration
 * @returns {object} Continuity state and controls
 */
export function useNavigationContinuity({
  maxEntries = NAVIGATION_CONTINUITY_MAX_ENTRIES,
} = {}) {
  const [state, dispatch] = useReducer(
    navigationContinuityReducer,
    undefined,
    createNavigationContinuityState,
  );
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const remember = useCallback(
    (pathname, options = {}) => {
      const entry = createNavigationContinuityEntry({
        pathname,
        scrollY:
          options.scrollY ??
          (typeof window === "undefined" ? 0 : window.scrollY),
        ...options,
      });
      if (!entry) return null;
      dispatch({
        entry,
        maxEntries,
        type: NAVIGATION_CONTINUITY_EVENTS.RECORD,
      });
      return entry;
    },
    [maxEntries],
  );

  const remove = useCallback((pathname) => {
    dispatch({ path: pathname, type: NAVIGATION_CONTINUITY_EVENTS.REMOVE });
  }, []);
  const clear = useCallback(
    () => dispatch({ type: NAVIGATION_CONTINUITY_EVENTS.CLEAR }),
    [],
  );
  const get = useCallback(
    (pathname) => resolveNavigationContinuityEntry(stateRef.current, pathname),
    [],
  );
  const deliverReturn = useCallback((pathname, input = {}) => {
    const handoff = createNavigationReturnHandoff({ pathname, ...input });
    if (!handoff) return null;
    dispatch({
      handoff,
      maxEntries: NAVIGATION_SURFACE_RETURN_MAX_ENTRIES,
      type: NAVIGATION_CONTINUITY_EVENTS.DELIVER_RETURN,
    });
    return handoff;
  }, []);
  const getReturns = useCallback(
    (pathname) => resolveNavigationReturnHandoffs(stateRef.current, pathname),
    [],
  );
  const consumeReturn = useCallback((pathname, handoffId = null) => {
    const handoffs = resolveNavigationReturnHandoffs(
      stateRef.current,
      pathname,
    );
    const handoff = handoffId
      ? handoffs.find((entry) => entry.id === handoffId) || null
      : handoffs[0] || null;
    if (!handoff) return null;
    dispatch({
      handoffId: handoff.id,
      type: NAVIGATION_CONTINUITY_EVENTS.CONSUME_RETURN,
    });
    return handoff;
  }, []);
  const restore = useCallback(
    (pathname, { focusKey = null, restoreScroll = true } = {}) => {
      const entry = resolveNavigationContinuityEntry(
        stateRef.current,
        pathname,
      );
      if (typeof window === "undefined") return entry;
      const targetFocusKey = focusKey || entry?.focusKey;
      requestAnimationFrame(() => {
        if (restoreScroll && entry) {
          window.scrollTo({ top: entry.scrollY, behavior: "auto" });
        }
        if (!targetFocusKey || typeof document === "undefined") return;
        const target = Array.from(
          document.querySelectorAll("[data-nav-focus-key]"),
        ).find(
          (element) =>
            element.getAttribute("data-nav-focus-key") === targetFocusKey,
        );
        if (!target || typeof target.focus !== "function") return;
        try {
          target.focus({ preventScroll: true });
        } catch {
          target.focus();
        }
      });
      return entry;
    },
    [],
  );

  return useMemo(
    () => ({
      clear,
      consumeReturn,
      deliverReturn,
      entries: state.entries,
      get,
      getReturns,
      remember,
      remove,
      restore,
      returnHandoffs: state.returnHandoffs,
    }),
    [
      clear,
      consumeReturn,
      deliverReturn,
      get,
      getReturns,
      remember,
      remove,
      restore,
      state.entries,
      state.returnHandoffs,
    ],
  );
}

// ── Route policy and prefetch intent ──────────────────────────────────────────

function getRoutePolicyOverrides(item) {
  const policy = item?.navigationPolicy;
  return policy && typeof policy === "object" ? policy : {};
}

function resolvePolicyBoolean(value, fallback) {
  return typeof value === "boolean" ? value : fallback;
}

/**
 * Resolves route-specific navigation decisions with optional item-level overrides.
 * @param {object} options - Destination href and optional route item
 * @returns {{canNavigate: boolean, clearTransientState: boolean, dismissSurfaces: boolean, prefetch: boolean}} Route policy
 */
export function resolveNavigationRoutePolicy({ href, item = null } = {}) {
  const overrides = getRoutePolicyOverrides(item);
  const canNavigate = isSafeInternalHref(href);
  const canPrefetch =
    canNavigate &&
    !item?.isLoading &&
    !item?.isOverlay &&
    !item?.isSurface &&
    !item?.prefetchDisabled;

  return {
    canNavigate,
    clearTransientState: resolvePolicyBoolean(
      overrides.clearTransientState,
      true,
    ),
    dismissSurfaces: resolvePolicyBoolean(overrides.dismissSurfaces, true),
    prefetch:
      resolvePolicyBoolean(overrides.prefetch, canPrefetch) && canPrefetch,
  };
}

/**
 * Schedules intentional route prefetches while deduplicating cached destinations.
 * @param {object} router - Next.js router instance
 * @param {object} [options] - Prefetch intent timing configuration
 * @returns {{cancelRoutePrefetch: Function, prefetchRoute: Function}} Prefetch controls
 */
export function useRoutePrefetch(
  router,
  { intentDelayMs = NAVIGATION_PREFETCH_INTENT_DELAY_MS } = {},
) {
  const routeStatesRef = useRef(new Map());

  const cancelRoutePrefetch = useCallback((href) => {
    const routeState = routeStatesRef.current.get(href);
    if (routeState?.timeoutId == null) return false;

    clearTimeout(routeState.timeoutId);
    routeStatesRef.current.delete(href);
    return true;
  }, []);

  const prefetchRoute = useCallback(
    (href, { immediate = false } = {}) => {
      if (!isSafeInternalHref(href) || typeof router?.prefetch !== "function")
        return false;

      const routeState = routeStatesRef.current.get(href);
      if (routeState?.isPrefetched || routeState?.timeoutId != null)
        return false;

      const startPrefetch = () => {
        const currentState = routeStatesRef.current.get(href);
        if (!currentState) return;

        currentState.timeoutId = null;
        currentState.isPrefetched = true;

        try {
          router.prefetch(href, {
            onInvalidate: () => {
              const invalidatedState = routeStatesRef.current.get(href);
              if (!invalidatedState) return;
              invalidatedState.isPrefetched = false;
              if (invalidatedState.timeoutId == null)
                routeStatesRef.current.delete(href);
            },
          });
        } catch (error) {
          routeStatesRef.current.delete(href);
          if (process.env.NODE_ENV !== "production") {
            console.warn("[Navigation] Route prefetch failed:", error);
          }
        }
      };

      const delay = immediate ? 0 : Math.max(0, Number(intentDelayMs) || 0);
      const nextState = { isPrefetched: false, timeoutId: null };
      routeStatesRef.current.set(href, nextState);

      if (delay === 0) {
        startPrefetch();
      } else {
        nextState.timeoutId = setTimeout(startPrefetch, delay);
      }

      return true;
    },
    [intentDelayMs, router],
  );

  useEffect(() => {
    const routeStates = routeStatesRef.current;

    return () => {
      routeStates.forEach((routeState) => {
        if (routeState.timeoutId != null) clearTimeout(routeState.timeoutId);
      });
      routeStates.clear();
    };
  }, []);

  return useMemo(
    () => ({ cancelRoutePrefetch, prefetchRoute }),
    [cancelRoutePrefetch, prefetchRoute],
  );
}
