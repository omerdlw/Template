import {
  DESTRUCTIVE_ACTION_TONE_CLASS,
  INFO_ACTION_TONE_CLASS,
  SEMANTIC_SURFACE_CLASSES,
  SUCCESS_ACTION_TONE_CLASS,
  WARNING_ACTION_TONE_CLASS,
} from "@/shared";

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
