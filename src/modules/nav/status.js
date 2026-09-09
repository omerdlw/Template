"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import {
  DESTRUCTIVE_ACTION_TONE_CLASS,
  EVENT_TYPES,
  globalEvents,
  SUCCESS_ACTION_TONE_CLASS,
  WARNING_ACTION_TONE_CLASS,
} from "@/shared";
import { useNavRuntimeRegistry } from "@/modules/registry";
import {
  API_ERROR_BATCH_DELAY,
  AUTH_STATUS_CLEAR_DURATION,
  AUTH_STATUS_STORAGE_KEY,
  AUTH_STATUS_TYPES,
  ERROR_STATUS_TYPES,
  NAV_ACTION_STYLES,
  SEMANTIC_SURFACE_CLASSES,
  STATUS_CLEAR_DURATION,
  STATUS_PRIORITY,
  STATUS_TONES,
} from "./constants";
import { getNavActionClass, normalizeLower, normalizeUpper } from "./utils";
export { normalizeLower, normalizeUpper };
import { NAV_FADE_TRANSITION, textCrossfadeVariants } from "./motion";
import { cn } from "@/shared/utils";
import { Spinner } from "@/ui/feedback/spinner";
import { Button, Icon } from "@/ui/primitives";
export function ErrorActions({
  onRetry,
  onRefresh,
  retryLabel = "Retry",
  refreshLabel = "Refresh",
  retryText,
  refreshText,
  className = "",
}) {
  const effectiveRetry = retryLabel || retryText || "Retry";
  const effectiveRefresh = refreshLabel || refreshText || "Refresh";
  return (
    <motion.div
      variants={textCrossfadeVariants}
      initial="hidden"
      animate="visible"
      transition={NAV_FADE_TRANSITION}
      className={cn(NAV_ACTION_STYLES.row, className)}
    >
      <Button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onRefresh?.();
        }}
        className={getNavActionClass({
          variant: NAV_ACTION_STYLES.muted,
          className: "min-w-0 flex-1 justify-center whitespace-nowrap",
        })}
      >
        <span className="truncate">{effectiveRefresh}</span>
      </Button>

      <Button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onRetry?.();
        }}
        className={getNavActionClass({
          variant: DESTRUCTIVE_ACTION_TONE_CLASS,
          className: "min-w-0 flex-1 justify-center whitespace-nowrap",
        })}
      >
        <span className="truncate">{effectiveRetry}</span>
      </Button>
    </motion.div>
  );
}
export const ErrorAction = ErrorActions;
export function GuardActions({
  onCancel,
  onConfirm,
  cancelLabel = "Stay",
  confirmLabel = "Leave",
  cancelText,
  confirmText,
  className = "",
}) {
  const effectiveCancel = cancelLabel || cancelText || "Stay";
  const effectiveConfirm = confirmLabel || confirmText || "Leave";
  return (
    <motion.div
      variants={textCrossfadeVariants}
      initial="hidden"
      animate="visible"
      transition={NAV_FADE_TRANSITION}
      className={cn(NAV_ACTION_STYLES.row, className)}
    >
      <Button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onCancel?.();
        }}
        className={getNavActionClass({
          variant: NAV_ACTION_STYLES.muted,
          className: "min-w-0 flex-1 justify-center whitespace-nowrap",
        })}
      >
        <span className="truncate">{effectiveCancel}</span>
      </Button>

      <Button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onConfirm?.();
        }}
        className={getNavActionClass({
          variant: DESTRUCTIVE_ACTION_TONE_CLASS,
          className: "min-w-0 flex-1 justify-center whitespace-nowrap",
        })}
      >
        <span className="truncate">{effectiveConfirm}</span>
      </Button>
    </motion.div>
  );
}
export const GuardAction = GuardActions;
function readSessionStorage() {
  try {
    if (
      typeof window === "undefined" ||
      typeof window.sessionStorage === "undefined"
    ) {
      return null;
    }
    return window.sessionStorage;
  } catch {
    return null;
  }
}
function isErrorStatus(type) {
  return ERROR_STATUS_TYPES.has(type);
}
function getStatusPriority(type) {
  return STATUS_PRIORITY[type] ?? 0;
}
function resolveStatusPriority(status) {
  if (!status) {
    return 0;
  }
  const explicitPriority = Number(status.priority);
  return Number.isFinite(explicitPriority)
    ? explicitPriority
    : getStatusPriority(status.type);
}
function getStatusTone(type) {
  return STATUS_TONES[type] || "info";
}
export function getStatusTheme(type) {
  const semanticTone =
    SEMANTIC_SURFACE_CLASSES[getStatusTone(type)] ||
    SEMANTIC_SURFACE_CLASSES.info;
  return {
    card: {
      className: semanticTone.surface,
    },
    icon: {
      className: semanticTone.icon,
    },
    title: {
      className: semanticTone.title,
    },
    description: {
      className: semanticTone.description,
      opacity: 1,
    },
  };
}
function isPersistableAuthStatus(status) {
  return (
    Boolean(status) &&
    AUTH_STATUS_TYPES.has(status.type) &&
    (typeof status.icon === "string" || status.icon == null)
  );
}
function clearPersistedAuthStatus() {
  try {
    readSessionStorage()?.removeItem(AUTH_STATUS_STORAGE_KEY);
  } catch {}
}
function persistAuthStatus(status, duration) {
  const storage = readSessionStorage();
  if (!isPersistableAuthStatus(status) || !storage) {
    return;
  }
  try {
    storage.setItem(
      AUTH_STATUS_STORAGE_KEY,
      JSON.stringify({
        description: status.description || "",
        expiresAt: Date.now() + Math.max(0, Number(duration) || 0),
        flow: status.flow || null,
        icon: status.icon || null,
        priority: resolveStatusPriority(status),
        title: status.title || "",
        type: status.type,
      }),
    );
  } catch {}
}
function restorePersistedAuthStatus() {
  const storage = readSessionStorage();
  if (!storage) {
    return null;
  }
  try {
    const rawValue = storage.getItem(AUTH_STATUS_STORAGE_KEY);
    if (!rawValue) {
      return null;
    }
    const payload = JSON.parse(rawValue);
    const type = normalizeUpper(payload?.type);
    const expiresAt = Number(payload?.expiresAt || 0);
    if (
      !AUTH_STATUS_TYPES.has(type) ||
      !Number.isFinite(expiresAt) ||
      expiresAt <= Date.now()
    ) {
      clearPersistedAuthStatus();
      return null;
    }
    return {
      remainingMs: expiresAt - Date.now(),
      status: createOverlayStatus({
        type,
        flow: payload?.flow || null,
        priority: Number.isFinite(Number(payload?.priority))
          ? Number(payload.priority)
          : null,
        title: payload?.title || "Account",
        description: payload?.description || "",
        icon: payload?.icon || null,
        style: getStatusTheme(type),
      }),
    };
  } catch {
    clearPersistedAuthStatus();
    return null;
  }
}
function createOverlayStatus({
  type,
  title,
  description,
  icon,
  style,
  isOverlay = true,
  action = null,
  actions = null,
  flow = null,
  priority = null,
}) {
  return {
    type,
    flow,
    isOverlay,
    priority,
    title,
    description,
    icon,
    style,
    action,
    actions,
    hideScroll: true,
  };
}
export function createErrorStatus({
  type,
  title,
  description,
  icon,
  style,
  onRetry,
  clearStatus,
  action,
  errorAction,
  retryLabel,
  refreshLabel,
  retryText,
  refreshText,
}) {
  const retryHandler =
    typeof onRetry === "function"
      ? () => {
          clearStatus?.();
          onRetry();
        }
      : () => {
          window.location.reload();
        };
  const ActionComponent = action || errorAction || ErrorActions;
  return createOverlayStatus({
    type,
    title,
    description,
    icon,
    style,
    isOverlay: true,
    action: () => (
      <ActionComponent
        onRetry={retryHandler}
        onRefresh={() => window.location.reload()}
        retryLabel={retryLabel}
        refreshLabel={refreshLabel}
        retryText={retryText}
        refreshText={refreshText}
      />
    ),
  });
}
export function createGuardStatus({
  action,
  guardAction,
  title = "Navigation Blocked",
  description = "You have unsaved changes. Are you sure you want to leave?",
  icon = "solar:danger-triangle-bold",
  style,
  onConfirm,
  onCancel,
  cancelLabel,
  confirmLabel,
  cancelText = "Stay",
  confirmText = "Leave",
  clearStatus,
}) {
  const cancelHandler = () => {
    clearStatus?.();
    onCancel?.();
  };
  const confirmHandler = () => {
    clearStatus?.();
    onConfirm?.();
  };
  const effectiveCancel = cancelLabel || cancelText;
  const effectiveConfirm = confirmLabel || confirmText;
  const GuardActionComponent = action || guardAction || GuardActions;
  return createOverlayStatus({
    type: "GUARD",
    priority: STATUS_PRIORITY.GUARD,
    title,
    description,
    icon,
    style: style || getStatusTheme("GUARD"),
    isOverlay: true,
    action: () => (
      <GuardActionComponent
        onCancel={cancelHandler}
        onConfirm={confirmHandler}
        cancelLabel={effectiveCancel}
        confirmLabel={effectiveConfirm}
        cancelText={effectiveCancel}
        confirmText={effectiveConfirm}
      />
    ),
  });
}
function createProgressIcon() {
  return <Spinner size={24} />;
}
function createSuccessIcon() {
  return "material-symbols:check-rounded";
}
function resolveFeedbackIcon({ phase, icon = null }) {
  if (phase === "start") {
    return createProgressIcon();
  }
  if (phase === "success") {
    return createSuccessIcon();
  }
  return icon;
}
function createConnectionStatus(type) {
  if (type === "OFFLINE") {
    return createOverlayStatus({
      type,
      title: "Connection Lost",
      description: "You are currently offline",
      icon: <Icon icon="lucide:wifi-off" size={24} />,
      style: getStatusTheme(type),
    });
  }
  return createOverlayStatus({
    type: "ONLINE",
    title: "Connection Restored",
    description: "You are back online",
    icon: <Icon icon="lucide:wifi" size={24} />,
    style: getStatusTheme("ONLINE"),
    isOverlay: false,
  });
}
function createAuthStatus({
  type,
  user = null,
  titleFallback = "Account",
  description,
}) {
  return createOverlayStatus({
    type,
    title: user?.name || user?.email || titleFallback,
    description,
    icon: createSuccessIcon(),
    style: getStatusTheme(type),
  });
}
function normalizeAuthFeedback(eventData = {}) {
  const phase = normalizeLower(eventData?.phase);
  const flow = normalizeLower(eventData?.flow);
  const statusType = normalizeUpper(
    eventData?.statusType || flow || "AUTH_FEEDBACK",
  );
  return {
    flow,
    phase,
    statusType,
  };
}
function createAuthFeedbackStatus(eventData = {}) {
  const { flow, phase, statusType } = normalizeAuthFeedback(eventData);
  if (!phase) {
    return null;
  }
  return createOverlayStatus({
    type: statusType,
    flow,
    priority: eventData?.priority ?? STATUS_PRIORITY.LOGIN,
    title: eventData?.title || "Account",
    description: eventData?.description || "",
    icon: resolveFeedbackIcon({
      phase,
      icon: eventData?.icon || null,
    }),
    style: eventData?.style || getStatusTheme(eventData?.themeType || "LOGIN"),
    isOverlay: eventData?.isOverlay !== false,
  });
}
function isEquivalentAuthStatus(currentStatus, nextStatus) {
  return (
    Boolean(currentStatus) &&
    AUTH_STATUS_TYPES.has(nextStatus?.type) &&
    currentStatus.type === nextStatus.type &&
    currentStatus.flow === nextStatus.flow &&
    currentStatus.title === nextStatus.title &&
    currentStatus.description === nextStatus.description &&
    currentStatus.isOverlay === nextStatus.isOverlay
  );
}
function subscribeToApiErrorStatusEvents({
  apiErrorQueueRef,
  batchTimerRef,
  clearStatus,
  clearTimer,
  updateStatus,
}) {
  return globalEvents.subscribe(EVENT_TYPES.API_ERROR, (eventData) => {
    const { status: errorStatus, message, isCritical, retry } = eventData || {};
    if (!isCritical) {
      return;
    }
    apiErrorQueueRef.current.push({
      status: errorStatus,
      message,
      retry,
    });
    clearTimer(batchTimerRef);
    batchTimerRef.current = setTimeout(() => {
      const errors = [...apiErrorQueueRef.current];
      apiErrorQueueRef.current = [];
      if (errors.length === 0) {
        return;
      }
      const isBatch = errors.length > 1;
      const title = isBatch
        ? "Multiple API Errors"
        : `API Error (${errors[0].status || "Network"})`;
      const description = isBatch
        ? `${errors.length} requests failed`
        : errors[0].message || "An error occurred during the request";
      updateStatus(
        createErrorStatus({
          type: "API_ERROR",
          title,
          description,
          icon: "solar:danger-triangle-bold",
          onRetry: () => {
            errors.forEach((error) => error.retry?.());
          },
          style: getStatusTheme("API_ERROR"),
          clearStatus,
        }),
      );
    }, API_ERROR_BATCH_DELAY);
  });
}
function subscribeToApplicationErrorStatusEvents({
  clearStatus,
  dispatchOfflineEvent,
  updateStatus,
}) {
  return globalEvents.subscribe(EVENT_TYPES.APP_ERROR, (eventData) => {
    const { message, error, resetError } = eventData || {};
    updateStatus(
      createErrorStatus({
        type: "APP_ERROR",
        title: error?.name || "Application Error",
        description:
          error?.message || message || "An unexpected error occurred",
        icon: "solar:danger-triangle-bold",
        onRetry: resetError
          ? () => {
              resetError();
              if (typeof navigator !== "undefined" && !navigator.onLine) {
                dispatchOfflineEvent();
              }
            }
          : undefined,
        style: getStatusTheme("APP_ERROR"),
        clearStatus,
      }),
    );
  });
}
function subscribeToSignOutStatusEvents({ scheduleStatusClear, updateStatus }) {
  return globalEvents.subscribe(EVENT_TYPES.AUTH_SIGN_OUT, (eventData) => {
    const isAccountDelete = eventData?.reason === "delete-account";
    const user = eventData?.previousSession?.user || null;
    if (!user && !isAccountDelete) {
      return;
    }
    const type = isAccountDelete ? "ACCOUNT_DELETE" : "LOGOUT";
    const nextStatus = createAuthStatus({
      type,
      user,
      description: isAccountDelete ? "Account deleted" : "Signed out",
    });
    updateStatus(nextStatus);
    scheduleStatusClear({
      duration: AUTH_STATUS_CLEAR_DURATION,
      clearWhen: [type],
    });
    if (!isAccountDelete) {
      persistAuthStatus(nextStatus, AUTH_STATUS_CLEAR_DURATION);
    }
  });
}
function subscribeToAccountDeletionStatusEvents({
  clearTimer,
  statusClearTimerRef,
  setStatus,
  updateStatus,
}) {
  const unsubscribeStart = globalEvents.subscribe(
    EVENT_TYPES.AUTH_ACCOUNT_DELETE_START,
    (eventData) => {
      const user = eventData?.user || null;
      clearTimer(statusClearTimerRef);
      updateStatus(
        createOverlayStatus({
          type: "ACCOUNT_DELETE",
          title: user?.name || user?.email || "Account",
          description: "Deleting account. This may take a few seconds",
          icon: createProgressIcon(),
          style: getStatusTheme("ACCOUNT_DELETE"),
        }),
      );
    },
  );
  const unsubscribeEnd = globalEvents.subscribe(
    EVENT_TYPES.AUTH_ACCOUNT_DELETE_END,
    (eventData) => {
      if (eventData?.status !== "failure") {
        return;
      }
      clearTimer(statusClearTimerRef);
      setStatus((currentStatus) =>
        currentStatus?.type === "ACCOUNT_DELETE" ? null : currentStatus,
      );
    },
  );
  return () => {
    unsubscribeStart();
    unsubscribeEnd();
  };
}
function subscribeToSignInStatusEvents({ scheduleStatusClear, updateStatus }) {
  return globalEvents.subscribe(EVENT_TYPES.AUTH_SIGN_IN, (eventData) => {
    const user = eventData?.session?.user;
    if (!user) {
      return;
    }
    const nextStatus = createAuthStatus({
      type: "LOGIN",
      user,
      titleFallback: "User",
      description: "Signed in",
    });
    updateStatus(nextStatus);
    scheduleStatusClear({
      duration: AUTH_STATUS_CLEAR_DURATION,
      clearWhen: ["LOGIN"],
    });
    persistAuthStatus(nextStatus, AUTH_STATUS_CLEAR_DURATION);
  });
}
function subscribeToSignUpStatusEvents({ scheduleStatusClear, updateStatus }) {
  return globalEvents.subscribe(EVENT_TYPES.AUTH_SIGN_UP, (eventData) => {
    const user = eventData?.session?.user;
    if (!user) {
      return;
    }
    const nextStatus = createAuthStatus({
      type: "SIGNUP",
      user,
      description: "Setting up account",
    });
    updateStatus(nextStatus);
    scheduleStatusClear({
      duration: AUTH_STATUS_CLEAR_DURATION,
      clearWhen: ["SIGNUP"],
    });
    persistAuthStatus(nextStatus, AUTH_STATUS_CLEAR_DURATION);
  });
}
function subscribeToAuthFeedbackStatusEvents({
  clearTimer,
  scheduleStatusClear,
  setStatus,
  statusClearTimerRef,
  updateStatus,
}) {
  return globalEvents.subscribe(EVENT_TYPES.AUTH_FEEDBACK, (eventData) => {
    const { flow, phase, statusType } = normalizeAuthFeedback(eventData);
    if (!phase) {
      return;
    }
    if (phase === "clear" || phase === "failure") {
      clearTimer(statusClearTimerRef);
      setStatus((currentStatus) => {
        if (!currentStatus) {
          return currentStatus;
        }
        if (flow && currentStatus.flow === flow) {
          return null;
        }
        return currentStatus.type === statusType ? null : currentStatus;
      });
      return;
    }
    updateStatus(createAuthFeedbackStatus(eventData));
    if (phase === "success") {
      scheduleStatusClear({
        duration:
          Number(eventData?.duration) > 0
            ? Number(eventData.duration)
            : AUTH_STATUS_CLEAR_DURATION,
        clearWhen: [statusType],
      });
      return;
    }
    clearTimer(statusClearTimerRef);
  });
}
function subscribeToNotFoundStatusEvents({
  notFoundAction,
  setStatus,
  updateStatus,
}) {
  return globalEvents.subscribe(EVENT_TYPES.NAV_NOT_FOUND, (eventData) => {
    if (eventData?.clear) {
      setStatus((currentStatus) =>
        currentStatus?.type === "NOT_FOUND" ? null : currentStatus,
      );
      return;
    }
    updateStatus({
      type: "NOT_FOUND",
      path: "not-found",
      isOverlay: true,
      title: eventData?.title || "404",
      description:
        eventData?.description ||
        "The page you are looking for does not exist or is no longer available",
      icon: eventData?.icon || "solar:forbidden-circle-bold",
      style: getStatusTheme("NOT_FOUND"),
      action: notFoundAction
        ? () => {
            const NotFoundAction = notFoundAction;
            return <NotFoundAction />;
          }
        : null,
      hideScroll: true,
    });
  });
}
function subscribeToGuardStatusEvents({
  clearStatus,
  setStatus,
  updateStatus,
}) {
  return globalEvents.subscribe(EVENT_TYPES.NAV_GUARD, (eventData) => {
    if (eventData?.clear) {
      setStatus((currentStatus) =>
        currentStatus?.type === "GUARD" ? null : currentStatus,
      );
      return;
    }
    updateStatus(
      createGuardStatus({
        action: eventData?.action,
        guardAction: eventData?.guardAction,
        title: eventData?.title || "Navigation Blocked",
        description:
          eventData?.message ||
          eventData?.description ||
          "You have unsaved changes. Are you sure you want to leave?",
        icon: eventData?.icon || "solar:danger-triangle-bold",
        style: eventData?.style || getStatusTheme("GUARD"),
        onCancel: eventData?.onCancel,
        onConfirm: eventData?.onConfirm,
        cancelLabel: eventData?.cancelLabel,
        confirmLabel: eventData?.confirmLabel,
        cancelText: eventData?.cancelText || "Stay",
        confirmText: eventData?.confirmText || "Leave",
        clearStatus,
      }),
    );
  });
}
function subscribeToConnectionStatusEvents({ handleOffline, handleOnline }) {
  window.addEventListener("offline", handleOffline);
  window.addEventListener("online", handleOnline);
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    handleOffline();
  }
  return () => {
    window.removeEventListener("offline", handleOffline);
    window.removeEventListener("online", handleOnline);
  };
}
function usePersistedAuthStatusRestoration({
  scheduleStatusClear,
  setStatus,
  skipPersistedStatusCleanupRef,
}) {
  useEffect(() => {
    const persistedStatus = restorePersistedAuthStatus();
    if (!persistedStatus) {
      return;
    }
    skipPersistedStatusCleanupRef.current = true;
    setStatus((currentStatus) => currentStatus || persistedStatus.status);
    scheduleStatusClear({
      duration: persistedStatus.remainingMs,
      clearWhen: [persistedStatus.status.type],
    });
  }, [scheduleStatusClear]);
}
function usePersistedAuthStatusCleanup({
  skipPersistedStatusCleanupRef,
  status,
}) {
  useEffect(() => {
    if (skipPersistedStatusCleanupRef.current) {
      skipPersistedStatusCleanupRef.current = false;
      return;
    }
    if (isPersistableAuthStatus(status)) {
      return;
    }
    clearPersistedAuthStatus();
  }, [status]);
}
function useRouteErrorStatusCleanup({
  dispatchOfflineEvent,
  pathname,
  previousPathRef,
  setStatus,
}) {
  useEffect(() => {
    if (previousPathRef.current === pathname) {
      return;
    }
    previousPathRef.current = pathname;
    setStatus((currentStatus) => {
      if (
        currentStatus &&
        isErrorStatus(currentStatus.type) &&
        currentStatus.type !== "ACCOUNT_DELETE"
      ) {
        if (typeof navigator !== "undefined" && !navigator.onLine) {
          dispatchOfflineEvent();
        }
        return null;
      }
      return currentStatus;
    });
  }, [pathname, dispatchOfflineEvent]);
}
function useNavigationStatusEventSubscriptions({
  apiErrorQueueRef,
  batchTimerRef,
  clearStatus,
  clearTimer,
  clearTransientTimers,
  dispatchOfflineEvent,
  handleOffline,
  handleOnline,
  notFoundAction,
  scheduleStatusClear,
  setStatus,
  statusClearTimerRef,
  updateStatus,
}) {
  useEffect(() => {
    const unsubscribeApiError = subscribeToApiErrorStatusEvents({
      apiErrorQueueRef,
      batchTimerRef,
      clearStatus,
      clearTimer,
      updateStatus,
    });
    const unsubscribeAppError = subscribeToApplicationErrorStatusEvents({
      clearStatus,
      dispatchOfflineEvent,
      updateStatus,
    });
    const unsubscribeSignOut = subscribeToSignOutStatusEvents({
      scheduleStatusClear,
      updateStatus,
    });
    const unsubscribeAccountDeletion = subscribeToAccountDeletionStatusEvents({
      clearTimer,
      statusClearTimerRef,
      setStatus,
      updateStatus,
    });
    const unsubscribeSignIn = subscribeToSignInStatusEvents({
      scheduleStatusClear,
      updateStatus,
    });
    const unsubscribeSignUp = subscribeToSignUpStatusEvents({
      scheduleStatusClear,
      updateStatus,
    });
    const unsubscribeAuthFeedback = subscribeToAuthFeedbackStatusEvents({
      clearTimer,
      scheduleStatusClear,
      setStatus,
      statusClearTimerRef,
      updateStatus,
    });
    const unsubscribeNotFound = subscribeToNotFoundStatusEvents({
      notFoundAction,
      setStatus,
      updateStatus,
    });
    const unsubscribeGuard = subscribeToGuardStatusEvents({
      clearStatus,
      setStatus,
      updateStatus,
    });
    const unsubscribeConnection = subscribeToConnectionStatusEvents({
      handleOffline,
      handleOnline,
    });
    return () => {
      unsubscribeApiError();
      unsubscribeAppError();
      unsubscribeSignOut();
      unsubscribeAccountDeletion();
      unsubscribeSignIn();
      unsubscribeSignUp();
      unsubscribeAuthFeedback();
      unsubscribeNotFound();
      unsubscribeGuard();
      clearTransientTimers();
      unsubscribeConnection();
    };
  }, [
    apiErrorQueueRef,
    batchTimerRef,
    clearStatus,
    clearTimer,
    clearTransientTimers,
    dispatchOfflineEvent,
    handleOffline,
    handleOnline,
    notFoundAction,
    scheduleStatusClear,
    statusClearTimerRef,
    updateStatus,
  ]);
}
function useNavigationStatusTimerCleanup(clearAllTimers) {
  useEffect(() => {
    return () => {
      clearAllTimers();
    };
  }, [clearAllTimers]);
}
export function useNavigationStatus() {
  const pathname = usePathname();
  const { notFoundAction } = useNavRuntimeRegistry();
  const [status, setStatus] = useState(null);
  const previousPathRef = useRef(pathname);
  const apiErrorQueueRef = useRef([]);
  const skipPersistedStatusCleanupRef = useRef(false);
  const batchTimerRef = useRef(null);
  const statusClearTimerRef = useRef(null);
  const onlineResetTimerRef = useRef(null);
  const offlineDispatchTimerRef = useRef(null);
  const clearTimer = useCallback((timerRef) => {
    if (!timerRef.current) {
      return;
    }
    clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);
  const clearTransientTimers = useCallback(() => {
    clearTimer(batchTimerRef);
    clearTimer(onlineResetTimerRef);
    clearTimer(offlineDispatchTimerRef);
  }, [clearTimer]);
  const clearAllTimers = useCallback(() => {
    clearTransientTimers();
    clearTimer(statusClearTimerRef);
  }, [clearTimer, clearTransientTimers]);
  const clearStatus = useCallback(() => {
    clearPersistedAuthStatus();
    setStatus(null);
  }, []);
  const updateStatus = useCallback((nextStatus) => {
    setStatus((currentStatus) => {
      if (!nextStatus) {
        return null;
      }
      if (isEquivalentAuthStatus(currentStatus, nextStatus)) {
        return currentStatus;
      }
      if (!currentStatus) {
        return nextStatus;
      }
      return resolveStatusPriority(nextStatus) >=
        resolveStatusPriority(currentStatus)
        ? nextStatus
        : currentStatus;
    });
  }, []);
  const scheduleStatusClear = useCallback(
    ({ duration = STATUS_CLEAR_DURATION, clearWhen = [] } = {}) => {
      clearTimer(statusClearTimerRef);
      const clearTypes = Array.isArray(clearWhen)
        ? clearWhen.filter(Boolean)
        : [];
      statusClearTimerRef.current = setTimeout(() => {
        statusClearTimerRef.current = null;
        setStatus((currentStatus) => {
          if (!currentStatus) {
            return currentStatus;
          }
          if (
            clearTypes.length === 0 ||
            clearTypes.includes(currentStatus.type)
          ) {
            clearPersistedAuthStatus();
            return null;
          }
          return currentStatus;
        });
      }, duration);
    },
    [clearTimer],
  );
  const dispatchOfflineEvent = useCallback(() => {
    clearTimer(offlineDispatchTimerRef);
    offlineDispatchTimerRef.current = setTimeout(() => {
      offlineDispatchTimerRef.current = null;
      window.dispatchEvent(new Event("offline"));
    }, 0);
  }, [clearTimer]);
  const handleOffline = useCallback(() => {
    updateStatus(createConnectionStatus("OFFLINE"));
  }, [updateStatus]);
  const handleOnline = useCallback(() => {
    setStatus((currentStatus) => {
      if (currentStatus?.type !== "OFFLINE") {
        return null;
      }
      clearTimer(onlineResetTimerRef);
      onlineResetTimerRef.current = setTimeout(() => {
        onlineResetTimerRef.current = null;
        setStatus((nextStatus) =>
          nextStatus?.type === "ONLINE" ? null : nextStatus,
        );
      }, STATUS_CLEAR_DURATION);
      return createConnectionStatus("ONLINE");
    });
  }, [clearTimer]);
  usePersistedAuthStatusRestoration({
    scheduleStatusClear,
    setStatus,
    skipPersistedStatusCleanupRef,
  });
  usePersistedAuthStatusCleanup({
    skipPersistedStatusCleanupRef,
    status,
  });
  useRouteErrorStatusCleanup({
    dispatchOfflineEvent,
    pathname,
    previousPathRef,
    setStatus,
  });
  useNavigationStatusEventSubscriptions({
    apiErrorQueueRef,
    batchTimerRef,
    clearStatus,
    clearTimer,
    clearTransientTimers,
    dispatchOfflineEvent,
    handleOffline,
    handleOnline,
    notFoundAction,
    scheduleStatusClear,
    setStatus,
    statusClearTimerRef,
    updateStatus,
  });
  useNavigationStatusTimerCleanup(clearAllTimers);
  return status;
}
export function applyStatusOverlay(item, statusState) {
  if (!item || !statusState) {
    return item;
  }
  const showStatusActions =
    statusState.type === "APP_ERROR" ||
    statusState.type === "API_ERROR" ||
    statusState.type === "GUARD" ||
    Boolean(statusState.action);
  return {
    ...item,
    ...statusState,
    activeChild: null,
    children: null,
    hasActiveChild: false,
    isExpanded: false,
    isParent: false,
    isStatus: true,
    badge: null,
    iconOverlay: null,
    action: showStatusActions ? statusState.action : null,
    actions: showStatusActions ? statusState.actions : null,
  };
}
