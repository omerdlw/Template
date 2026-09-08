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
import { CRITICAL_TYPES, TOAST_TYPES, NOTIFICATION_CONFIG } from "./constants";
import { getStorageItem, setStorageItem, removeStorageItem } from "./utils";

export {
  CRITICAL_TYPES,
  TOAST_TYPES,
  NOTIFICATION_CONFIG,
  getStorageItem,
  setStorageItem,
  removeStorageItem,
};
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
      const next = {
        ...prev,
      };
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
