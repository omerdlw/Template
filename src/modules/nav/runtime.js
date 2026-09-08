"use client";

import { useSyncExternalStore } from "react";
import {
  NAVIGATION_DIAGNOSTIC_MAX_ENTRIES,
  NAVIGATION_INSPECTOR_MAX_RECENT_EVENTS,
  NAVIGATION_OPERATION_MAX_ENTRIES,
  NAVIGATION_OPERATION_EVENTS,
  NAVIGATION_OPERATION_STATUS,
} from "./constants";
import { normalizePath } from "./routing";
function isNavigationDiagnosticsEnabled() {
  return process.env.NODE_ENV !== "production";
}
function createNavigationDiagnosticEntry(
  type,
  details = {},
  timestamp = Date.now(),
) {
  return {
    ...details,
    timestamp,
    type,
  };
}
export function createNavigationDiagnosticStore({
  maxEntries = NAVIGATION_DIAGNOSTIC_MAX_ENTRIES,
  now = Date.now,
} = {}) {
  const safeMaxEntries = Math.max(
    1,
    Number(maxEntries) || NAVIGATION_DIAGNOSTIC_MAX_ENTRIES,
  );
  const listeners = new Set();
  let entries = [];
  const notify = () =>
    listeners.forEach((listener) => {
      try {
        listener();
      } catch (error) {
        if (process.env.NODE_ENV !== "production") {
          console.warn("[Navigation] Diagnostic subscriber failed:", error);
        }
      }
    });
  return {
    clear() {
      if (entries.length === 0) return;
      entries = [];
      notify();
    },
    getSnapshot() {
      return entries;
    },
    record(type, details = {}) {
      const entry = createNavigationDiagnosticEntry(type, details, now());
      entries = [...entries, entry].slice(-safeMaxEntries);
      notify();
      return entry;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
const navigationDiagnosticStore = createNavigationDiagnosticStore();
const EMPTY_NAVIGATION_DIAGNOSTICS = Object.freeze([]);
export function getNavigationDiagnostics() {
  return navigationDiagnosticStore.getSnapshot();
}
export function clearNavigationDiagnostics() {
  navigationDiagnosticStore.clear();
}
export function useNavigationDiagnostics() {
  return useSyncExternalStore(
    navigationDiagnosticStore.subscribe,
    navigationDiagnosticStore.getSnapshot,
    () => EMPTY_NAVIGATION_DIAGNOSTICS,
  );
}
export function recordNavigationDiagnostic(type, details) {
  if (!isNavigationDiagnosticsEnabled()) return;
  navigationDiagnosticStore.record(type, details);
}
let navigationInspectorSnapshot = null;
export function createNavigationInspectorSnapshot(state = {}) {
  const operations = Array.isArray(state.operations) ? state.operations : [];
  const surfaces = Array.isArray(state.surfaceStack) ? state.surfaceStack : [];
  const diagnostics = getNavigationDiagnostics();
  return {
    activeOperationId: state.activeOperation?.id || null,
    compactLocked: Boolean(state.compactLocked),
    diagnosticEvents: diagnostics.slice(
      -NAVIGATION_INSPECTOR_MAX_RECENT_EVENTS,
    ),
    expanded: Boolean(state.expanded),
    navHeight: Number(state.navHeight) || 0,
    operationCount: operations.length,
    pathname: normalizePath(state.pathname || ""),
    surfaceCount: surfaces.length,
    timestamp: Date.now(),
  };
}
export function getNavigationInspectorSnapshot() {
  return navigationInspectorSnapshot;
}
export function updateNavigationInspectorSnapshot(state) {
  if (!isNavigationDiagnosticsEnabled()) return;
  navigationInspectorSnapshot = createNavigationInspectorSnapshot(state);
}
export function createNavigationOperationState() {
  return {
    entries: [],
  };
}
export function createNavigationOperation({
  cancellable = true,
  description = null,
  hud = null,
  id,
  icon = null,
  label = "Working",
  metadata = null,
  onCancel = null,
  priority = 0,
  progress = null,
  startedAt = Date.now(),
} = {}) {
  const normalizedId =
    typeof id === "string" || typeof id === "number" ? String(id) : "";
  if (!normalizedId) return null;
  const numericPriority = Number(priority);
  const numericProgress = Number(progress);
  return {
    cancellable: Boolean(cancellable),
    description:
      typeof description === "string" && description.trim()
        ? description.trim()
        : null,
    hud,
    id: normalizedId,
    icon: icon ?? null,
    label: typeof label === "string" && label.trim() ? label.trim() : "Working",
    metadata:
      metadata && typeof metadata === "object" && !Array.isArray(metadata)
        ? {
            ...metadata,
          }
        : {},
    priority: Number.isFinite(numericPriority) ? numericPriority : 0,
    progress: Number.isFinite(numericProgress)
      ? Math.min(1, Math.max(0, numericProgress))
      : null,
    startedAt: Number.isFinite(Number(startedAt))
      ? Number(startedAt)
      : Date.now(),
    status: NAVIGATION_OPERATION_STATUS.PENDING,
    onCancel: typeof onCancel === "function" ? onCancel : null,
  };
}
function settleNavigationOperation(operation, status, action) {
  return {
    ...operation,
    endedAt: action.endedAt ?? Date.now(),
    result: action.result ?? null,
    status,
  };
}
export function navigationOperationReducer(state, action) {
  const currentState = state || createNavigationOperationState();
  if (action?.type === NAVIGATION_OPERATION_EVENTS.CLEAR) {
    if (action.id == null)
      return currentState.entries.length
        ? createNavigationOperationState()
        : currentState;
    const entries = currentState.entries.filter(
      (entry) => entry.id !== String(action.id),
    );
    return entries.length === currentState.entries.length
      ? currentState
      : {
          entries,
        };
  }
  if (action?.type === NAVIGATION_OPERATION_EVENTS.START) {
    const operation = action.operation;
    if (!operation?.id) return currentState;
    const maxEntries = Math.max(
      1,
      Number(action.maxEntries) || NAVIGATION_OPERATION_MAX_ENTRIES,
    );
    return {
      entries: [
        ...currentState.entries.filter((entry) => entry.id !== operation.id),
        operation,
      ].slice(-maxEntries),
    };
  }
  const id = action?.id == null ? "" : String(action.id);
  const operation = currentState.entries.find((entry) => entry.id === id);
  if (!operation) return currentState;
  if (action.type === NAVIGATION_OPERATION_EVENTS.UPDATE) {
    if (operation.status !== NAVIGATION_OPERATION_STATUS.PENDING)
      return currentState;
    const updatedOperation = createNavigationOperation({
      ...operation,
      ...action.patch,
    });
    if (!updatedOperation) return currentState;
    return {
      entries: currentState.entries.map((entry) =>
        entry.id === id
          ? {
              ...updatedOperation,
              startedAt: operation.startedAt,
            }
          : entry,
      ),
    };
  }
  const status =
    action.type === NAVIGATION_OPERATION_EVENTS.COMPLETE
      ? NAVIGATION_OPERATION_STATUS.COMPLETED
      : action.type === NAVIGATION_OPERATION_EVENTS.CANCEL
        ? NAVIGATION_OPERATION_STATUS.CANCELLED
        : null;
  if (!status || operation.status !== NAVIGATION_OPERATION_STATUS.PENDING)
    return currentState;
  return {
    entries: currentState.entries.map((entry) =>
      entry.id === id
        ? settleNavigationOperation(entry, status, action)
        : entry,
    ),
  };
}
export function resolveActiveNavigationOperation(state) {
  let active = null;
  for (const entry of state?.entries || []) {
    if (entry.status !== NAVIGATION_OPERATION_STATUS.PENDING) continue;
    if (
      !active ||
      entry.priority > active.priority ||
      (entry.priority === active.priority && entry.startedAt < active.startedAt)
    ) {
      active = entry;
    }
  }
  return active;
}
export function createNavigationSelectorStore(initialState = {}) {
  const listeners = new Set();
  let snapshot = initialState;
  return Object.freeze({
    getSnapshot() {
      return snapshot;
    },
    publish(nextState) {
      if (Object.is(snapshot, nextState)) return false;
      snapshot = nextState;
      listeners.forEach((listener) => {
        try {
          listener();
        } catch (error) {
          if (process.env.NODE_ENV !== "production") {
            console.warn("[Navigation] Selector subscriber failed:", error);
          }
        }
      });
      return true;
    },
    subscribe(listener) {
      if (typeof listener !== "function") return () => {};
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  });
}
