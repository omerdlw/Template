"use client";

import { useCallback, useMemo } from "react";
import { normalizeFeedbackText } from "@/shared";
import { TOAST_TYPES } from "./constants";
import { useNotificationActions } from "./provider";
const DURATIONS = Object.freeze({
  SHORT: 3000,
  DEFAULT: 4000,
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
        shouldSuppressToast(type, {
          allowInProduction,
        })
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
