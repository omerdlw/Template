"use client";

import { useCallback, useMemo } from "react";

import { normalizeFeedbackText } from "@/shared";

import { TOAST_TYPES, useNotificationActions } from "./store";
export {
  NOTIFICATION_ACTION_TAP,
  NOTIFICATION_ACTION_TRANSITION,
  NOTIFICATION_CLOSE_TAP,
  NOTIFICATION_CONTENT_VARIANTS,
  NOTIFICATION_DRAG_CONSTRAINTS,
  NOTIFICATION_DRAG_ELASTIC,
  NOTIFICATION_MICRO_SPRING,
  NOTIFICATION_MICRO_TAP_SCALE,
  NOTIFICATION_WHILE_DRAG,
  TOAST_VARIANTS,
  notificationContentVariants,
  toastVariants,
} from "./motion";

// -----------------------------------------------------------------------------
// Toast policy
// -----------------------------------------------------------------------------
const DURATIONS = Object.freeze({
  SHORT: 3000,
  DEFAULT: 4000,
  LONG: 5000,
});

function withDefaultDuration(duration, options = {}) {
  return {
    duration,
    ...(options || {}),
  };
}

const PRODUCTION_OPTIONAL_TOAST_TYPES = new Set([
  TOAST_TYPES.SUCCESS,
  TOAST_TYPES.INFO,
]);

function shouldSuppressToast(type, options = {}) {
  if (process.env.NODE_ENV !== "production") return false;
  if (!PRODUCTION_OPTIONAL_TOAST_TYPES.has(type)) return false;

  return options.allowInProduction !== true;
}

// -----------------------------------------------------------------------------
// Public toast facade
// -----------------------------------------------------------------------------
// useToast turns a small message-oriented interface into a normalized
// notification entry while keeping environment and dedupe policy local.
export function useToast() {
  const { showNotification } = useNotificationActions();

  const createToast = useCallback(
    (type, message, options = {}) => {
      const {
        action,
        actions,
        allowInProduction,
        dedupeKey,
        description,
        duration,
        id: explicitId,
        ...rest
      } = options;
      const normalizedMessage = normalizeFeedbackText(message);

      if (
        !normalizedMessage ||
        shouldSuppressToast(type, { allowInProduction })
      ) {
        return null;
      }

      const finalActions = actions || (action ? [action] : undefined);
      const resolvedId =
        dedupeKey || explicitId || String(normalizedMessage).slice(0, 50);

      return showNotification(type, {
        ...rest,
        id: resolvedId,
        message: normalizedMessage,
        description: normalizeFeedbackText(description),
        duration,
        actions: finalActions,
      });
    },
    [showNotification],
  );

  return useMemo(
    () => ({
      success: (message, options = {}) =>
        createToast(
          TOAST_TYPES.SUCCESS,
          message,
          withDefaultDuration(DURATIONS.SHORT, options),
        ),
      warning: (message, options = {}) =>
        createToast(
          TOAST_TYPES.WARNING,
          message,
          withDefaultDuration(DURATIONS.DEFAULT, options),
        ),
      error: (message, options = {}) =>
        createToast(
          TOAST_TYPES.ERROR,
          message,
          withDefaultDuration(DURATIONS.DEFAULT, options),
        ),
      info: (message, options = {}) =>
        createToast(
          TOAST_TYPES.INFO,
          message,
          withDefaultDuration(DURATIONS.SHORT, options),
        ),
      show: (type, message, options = {}) =>
        createToast(type, message, options),
    }),
    [createToast],
  );
}
