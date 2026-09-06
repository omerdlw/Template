"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  DESTRUCTIVE_ACTION_TONE_CLASS,
  INFO_ACTION_TONE_CLASS,
  SEMANTIC_SURFACE_CLASSES,
  SUCCESS_ACTION_TONE_CLASS,
  WARNING_ACTION_TONE_CLASS,
} from "@/shared";

// -----------------------------------------------------------------------------
// Browser storage
// -----------------------------------------------------------------------------
// Critical notifications survive a refresh. Storage access remains guarded so
// the same module can be evaluated during server rendering and in restricted
// browser environments where localStorage is unavailable.
function canUseBrowserStorage() {
  return typeof window !== "undefined";
}

export function getStorageItem(key, defaultValue = null) {
  if (!canUseBrowserStorage()) return defaultValue;

  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error(`Error reading from localStorage (${key}):`, error);
    return defaultValue;
  }
}

export function setStorageItem(key, value) {
  if (!canUseBrowserStorage()) return false;

  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Error writing to localStorage (${key}):`, error);
    return false;
  }
}

export function removeStorageItem(key) {
  if (!canUseBrowserStorage()) return false;

  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`Error removing from localStorage (${key}):`, error);
    return false;
  }
}

// -----------------------------------------------------------------------------
// Notification contracts
// -----------------------------------------------------------------------------
export const CRITICAL_TYPES = Object.freeze({
  PERMISSION_DENIED: "PERMISSION_DENIED",
  SESSION_EXPIRED: "SESSION_EXPIRED",
  SERVER_ERROR: "SERVER_ERROR",
  OFFLINE: "OFFLINE",
});

export const TOAST_TYPES = Object.freeze({
  WARNING: "WARNING",
  SUCCESS: "SUCCESS",
  ERROR: "ERROR",
  INFO: "INFO",
});

export const NOTIFICATION_CONFIG = Object.freeze({
  [CRITICAL_TYPES.OFFLINE]: Object.freeze({
    tone: "warning",
    icon: "solar:danger-triangle-bold",
    title: "Connection Lost",
    description: "You are currently offline",
    theme: SEMANTIC_SURFACE_CLASSES.warning,
    actionToneClass: WARNING_ACTION_TONE_CLASS,
    dismissible: false,
  }),
  [CRITICAL_TYPES.SESSION_EXPIRED]: Object.freeze({
    tone: "warning",
    icon: "solar:danger-triangle-bold",
    title: "Session Expired",
    theme: SEMANTIC_SURFACE_CLASSES.warning,
    actionToneClass: WARNING_ACTION_TONE_CLASS,
    dismissible: true,
  }),
  [CRITICAL_TYPES.PERMISSION_DENIED]: Object.freeze({
    tone: "error",
    icon: "solar:forbidden-circle-bold",
    title: "Permission Denied",
    theme: SEMANTIC_SURFACE_CLASSES.error,
    actionToneClass: DESTRUCTIVE_ACTION_TONE_CLASS,
    dismissible: true,
  }),
  [CRITICAL_TYPES.SERVER_ERROR]: Object.freeze({
    tone: "error",
    icon: "solar:danger-triangle-bold",
    title: "Server Error",
    theme: SEMANTIC_SURFACE_CLASSES.error,
    actionToneClass: DESTRUCTIVE_ACTION_TONE_CLASS,
    dismissible: true,
  }),
  [TOAST_TYPES.SUCCESS]: Object.freeze({
    tone: "success",
    icon: "material-symbols:check-rounded",
    title: "Success",
    theme: SEMANTIC_SURFACE_CLASSES.success,
    actionToneClass: SUCCESS_ACTION_TONE_CLASS,
    dismissible: true,
  }),
  [TOAST_TYPES.ERROR]: Object.freeze({
    tone: "error",
    icon: "solar:danger-triangle-bold",
    title: "Error",
    theme: SEMANTIC_SURFACE_CLASSES.error,
    actionToneClass: DESTRUCTIVE_ACTION_TONE_CLASS,
    dismissible: true,
  }),
  [TOAST_TYPES.WARNING]: Object.freeze({
    tone: "warning",
    icon: "solar:danger-triangle-bold",
    title: "Warning",
    theme: SEMANTIC_SURFACE_CLASSES.warning,
    actionToneClass: WARNING_ACTION_TONE_CLASS,
    dismissible: true,
  }),
  [TOAST_TYPES.INFO]: Object.freeze({
    tone: "info",
    icon: "solar:info-circle-bold",
    title: "Info",
    theme: SEMANTIC_SURFACE_CLASSES.info,
    actionToneClass: INFO_ACTION_TONE_CLASS,
    dismissible: true,
  }),
});

const FALLBACK_NOTIFICATION_ACTIONS = Object.freeze({
  dismissNotification: () => {},
  showNotification: () => {},
});

const FALLBACK_NOTIFICATION_STATE = Object.freeze({
  notifications: {},
});

const NotificationActionsContext = createContext(FALLBACK_NOTIFICATION_ACTIONS);
const NotificationStateContext = createContext(FALLBACK_NOTIFICATION_STATE);
const STORAGE_KEY = "critical_notifications";
const CRITICAL_SET = new Set(Object.values(CRITICAL_TYPES));

function isObjectRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isValidCritical(notification) {
  if (!notification?.type) return false;
  if (!CRITICAL_SET.has(notification.type)) return false;
  if (notification.message && /HTTP\s*404/i.test(notification.message))
    return false;
  return true;
}

function filterCriticalNotifications(map) {
  return Object.fromEntries(
    Object.entries(map).filter(([, notification]) =>
      isValidCritical(notification),
    ),
  );
}

function readStoredCriticalNotifications() {
  const stored = getStorageItem(STORAGE_KEY);

  if (!stored || !isObjectRecord(stored)) {
    if (stored) removeStorageItem(STORAGE_KEY);
    return {};
  }

  const filtered = filterCriticalNotifications(stored);

  if (Object.keys(filtered).length === 0) {
    removeStorageItem(STORAGE_KEY);
  }

  return filtered;
}

function clearNotificationTimer(id, timers) {
  const timer = timers.get(id);

  if (timer) {
    clearTimeout(timer);
    timers.delete(id);
  }
}

function normalizeDuration(value) {
  const duration = Number(value);
  return Number.isFinite(duration) && duration > 0 ? duration : null;
}

function createNotificationEntry(id, type, data = {}) {
  return {
    ...data,
    id,
    type,
    timestamp: Date.now(),
  };
}

// -----------------------------------------------------------------------------
// Notification store
// -----------------------------------------------------------------------------
// The hydration flag prevents the initial empty server/client snapshot from
// deleting critical notifications before the browser storage read completes.
export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState({});
  const [isHydrated, setIsHydrated] = useState(false);
  const timersRef = useRef(new Map());

  useEffect(() => {
    const storedNotifications = readStoredCriticalNotifications();

    if (Object.keys(storedNotifications).length > 0) {
      setNotifications(storedNotifications);
    }

    setIsHydrated(true);
  }, []);

  useEffect(() => {
    const timers = timersRef.current;

    return () => {
      timers.forEach(clearTimeout);
      timers.clear();
    };
  }, []);

  useEffect(() => {
    if (!isHydrated) return;

    const critical = filterCriticalNotifications(notifications);

    if (Object.keys(critical).length > 0) {
      setStorageItem(STORAGE_KEY, critical);
    } else {
      removeStorageItem(STORAGE_KEY);
    }
  }, [isHydrated, notifications]);

  const dismissNotification = useCallback((id) => {
    clearNotificationTimer(id, timersRef.current);

    setNotifications((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const showNotification = useCallback(
    (type, data = {}) => {
      const { id: explicitId, ...notificationData } =
        data && typeof data === "object" ? data : {};
      const id = explicitId || type;

      clearNotificationTimer(id, timersRef.current);

      setNotifications((prev) => ({
        ...prev,
        [id]: createNotificationEntry(id, type, notificationData),
      }));

      const duration = normalizeDuration(notificationData.duration);

      if (duration) {
        const timer = setTimeout(() => {
          dismissNotification(id);
        }, duration);

        timersRef.current.set(id, timer);
      }
    },
    [dismissNotification],
  );

  const actions = useMemo(
    () => ({
      dismissNotification,
      showNotification,
    }),
    [dismissNotification, showNotification],
  );

  const state = useMemo(
    () => ({
      notifications,
    }),
    [notifications],
  );

  return (
    <NotificationActionsContext.Provider value={actions}>
      <NotificationStateContext.Provider value={state}>
        {children}
      </NotificationStateContext.Provider>
    </NotificationActionsContext.Provider>
  );
};

export function useNotificationActions() {
  return useContext(NotificationActionsContext);
}

export function useNotificationState() {
  return useContext(NotificationStateContext);
}
