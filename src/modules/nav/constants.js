import { cn } from "@/shared/utils";
import { SEMANTIC_SURFACE_CLASSES } from "@/ui/tokens";
export { SEMANTIC_SURFACE_CLASSES } from "@/ui/tokens";
export const NAV_STYLE_SECTIONS = Object.freeze([
  "card",
  "icon",
  "title",
  "description",
]);
export const NAV_EVENTS = Object.freeze({
  DATA_SOURCE_SELECT: "NAV_DATA_SOURCE_SELECT",
  NAVIGATE_START: "NAV_NAVIGATE_START",
  NAVIGATE_END: "NAV_NAVIGATE_END",
  UPDATE_BADGE: "NAV_UPDATE_BADGE",
  UPDATE_ITEM: "NAV_UPDATE_ITEM",
  ITEM_HOVER: "NAV_ITEM_HOVER",
  ITEM_CLICK: "NAV_ITEM_CLICK",
  ITEM_FOCUS: "NAV_ITEM_FOCUS",
  UNREGISTER: "NAV_UNREGISTER",
  NAVIGATE: "NAV_NAVIGATE",
  REGISTER: "NAV_REGISTER",
  COLLAPSE: "NAV_COLLAPSE",
  EXPAND: "NAV_EXPAND",
});
export const EMPTY_SNAPSHOT = Object.freeze({
  scrollableHeight: 0,
  viewportHeight: 0,
  progress: 0,
  scrollY: 0,
});
export const NAV_HUD_RENDER_MODE = Object.freeze({
  COMPONENT: "component",
  NODE: "node",
});
export const NAV_HUD_VARIANT = Object.freeze({
  EXPANDED: "expanded",
  PROGRESS: "progress",
  COMPACT: "compact",
  CUSTOM: "custom",
});
export const NAV_HUD_PRIORITY = Object.freeze({
  TASK_PROGRESS: 30,
  CONTEXTUAL: 10,
  SELECTION: 20,
  CRITICAL: 50,
  DEFAULT: 0,
  MEDIA: 15,
});
export const NAV_ATTENTION_KIND = Object.freeze({
  SURFACE: "surface",
  OPERATION: "operation",
  LOADING: "loading",
  STATUS: "status",
  ROUTE: "route",
  HUD: "hud",
});
export const NAV_ATTENTION_PRIORITY = Object.freeze({
  STATUS_OVERLAY: 300,
  SURFACE: 400,
  OPERATION: 250,
  LOADING: 100,
  STATUS: 75,
  ROUTE: 0,
  HUD: 200,
});
export const NAV_ATTENTION_PRIORITY_OFFSET_MAX = 99;
export const NAV_SURFACE_RENDER_MODE = Object.freeze({
  COMPONENT: "component",
  NODE: "node",
});
export const NAV_SURFACE_FLOW_STATUS = Object.freeze({
  OPEN: "open",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
});
export const NAV_SURFACE_PHASE = Object.freeze({
  IDLE: "idle",
  DISMISSING_ACTION: "dismissing_action",
  SWAPPING_HEADER: "swapping_header",
  EXPANDING_BODY: "expanding_body",
  OPEN: "open",
  COLLAPSING_BODY: "collapsing_body",
  RESTORING_HEADER: "restoring_header",
});

export const COMPACT_CARD_HORIZONTAL_PADDING = 56;
export const COMPACT_CARD_MIN_WIDTH = 148;
export const COMPACT_CARD_MAX_OFFSET = 72;
export const NAV_VIEWPORT_GAP = 4;
export const VIEWPORT_MARGIN = 24;
export const NAV_CARD_DIMENSIONS = Object.freeze({
  expandedY: -(68 + NAV_VIEWPORT_GAP),
  compactHeight: 38,
  chromeHeight: 20,
  collapsedY: -10,
  extensionShelfY: -44,
  extensionShelfScale: 0.88,
  hudHeight: 52,
  actionGap: 10,
  height: 68,
});
export const NAV_CARD_LAYOUT = Object.freeze({
  collapsed: Object.freeze({
    offsetY: NAV_CARD_DIMENSIONS.collapsedY,
    scale: 0.88,
  }),
  expanded: Object.freeze({
    offsetY: NAV_CARD_DIMENSIONS.expandedY,
    scale: 1,
  }),
  extensionShelfY: NAV_CARD_DIMENSIONS.extensionShelfY,
  extensionShelfScale: NAV_CARD_DIMENSIONS.extensionShelfScale,
  compactHeight: NAV_CARD_DIMENSIONS.compactHeight,
  chromeHeight: NAV_CARD_DIMENSIONS.chromeHeight,
  hudHeight: NAV_CARD_DIMENSIONS.hudHeight,
  actionGap: NAV_CARD_DIMENSIONS.actionGap,
  baseHeight: NAV_CARD_DIMENSIONS.height,
});
export const NAVIGATION_EVENTS = Object.freeze({
  CLOSE_ALL_SURFACES: "CLOSE_ALL_SURFACES",
  SURFACE_MOUNTED: "SURFACE_MOUNTED",
  CLOSE_SURFACE: "CLOSE_SURFACE",
  OPEN_SURFACE: "OPEN_SURFACE",
  SET_EXPANDED: "SET_EXPANDED",
  SET_COMPACT: "SET_COMPACT",
  COLLAPSE: "COLLAPSE",
  EXPAND: "EXPAND",
  TOGGLE: "TOGGLE",
});
export const NAVIGATION_TRANSACTION_EVENTS = Object.freeze({
  START: "START",
  COMPLETE: "COMPLETE",
  CANCEL: "CANCEL",
  FAIL: "FAIL",
  TIME_OUT: "TIME_OUT",
});
export const NAVIGATION_TRANSACTION_STATUS = Object.freeze({
  PENDING: "pending",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  FAILED: "failed",
  TIMED_OUT: "timed-out",
});
export const NAVIGATION_TRANSACTION_REASON = Object.freeze({
  GUARD: "guard",
  SUPERSEDED: "superseded",
  TIME_OUT: "time-out",
});
export const NAVIGATION_TRANSACTION_TIMEOUT_MS = 15_000;
export const NAVIGATION_PREFETCH_INTENT_DELAY_MS = 90;
export const NAVIGATION_CONTINUITY_EVENTS = Object.freeze({
  CLEAR: "CLEAR",
  CONSUME_RETURN: "CONSUME_RETURN",
  DELIVER_RETURN: "DELIVER_RETURN",
  RECORD: "RECORD",
  REMOVE: "REMOVE",
});
export const NAVIGATION_CONTINUITY_MAX_ENTRIES = 32;
export const NAVIGATION_SURFACE_RETURN_MAX_ENTRIES = 16;
export const NAVIGATION_OPERATION_EVENTS = Object.freeze({
  CANCEL: "CANCEL",
  CLEAR: "CLEAR",
  COMPLETE: "COMPLETE",
  START: "START",
  UPDATE: "UPDATE",
});
export const NAVIGATION_OPERATION_STATUS = Object.freeze({
  CANCELLED: "cancelled",
  COMPLETED: "completed",
  PENDING: "pending",
});
export const NAVIGATION_OPERATION_MAX_ENTRIES = 24;
export const NAVIGATION_DIAGNOSTIC_EVENTS = Object.freeze({
  ROUTE_REJECTED: "route-rejected",
  ROUTE_STARTED: "route-started",
  ROUTE_TRANSACTION: "route-transaction",
  SURFACE_CLOSED: "surface-closed",
  SURFACE_OPENED: "surface-opened",
  HEIGHT_CHANGED: "height-changed",
});
export const NAVIGATION_DIAGNOSTIC_MAX_ENTRIES = 60;
export const NAVIGATION_INSPECTOR_MAX_RECENT_EVENTS = 12;
export const NAVIGATION_FOCUSABLE_SELECTOR =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
export const NAVIGATION_FOCUS_RESTORE_BLOCKED_REASONS = Object.freeze([
  "browser-back",
  "navigation",
  "unmount",
]);
export const NAVIGATION_LIFECYCLE = Object.freeze({
  CLOSING: "closing",
  OPENING: "opening",
  IDLE: "idle",
  OPEN: "open",
});
export const SECTION_TITLES = Object.freeze({
  terms: "Terms of Service",
  privacy: "Privacy Policy",
  account: "Account",
  profile: "Account",
  security: "Security",
  settings: "Settings",
});
export const SECTION_ICONS = Object.freeze({
  account: "solar:user-bold",
  profile: "solar:user-bold",
  security: "solar:shield-keyhole-bold",
  settings: "solar:settings-bold",
});
export const PLAYBACK_RATES = Object.freeze([1, 1.25, 1.5, 2]);

export const NAV_ACTION_STYLES = Object.freeze({
  base: "center w-full rounded-[20px] gap-2.5 ring-1 ring-inset px-4 py-2.5 text-xs font-semibold uppercase cursor-pointer",
  muted: "ring-white/5 bg-white/5 hover:bg-white/10 text-white/70",
  active: "ring-white/10 bg-white/10 hover:bg-white/15 text-white",
  action: Object.freeze({
    muted:
      "ring-1 ring-inset ring-white/5 bg-white/5 text-white/70 hover:text-white hover:bg-white/10",
    active:
      "ring-1 ring-inset ring-white/10 bg-white/10 hover:bg-white/15 text-white",
  }),
  row: "flex w-full gap-2.5",
  icon: 16,
});

export const NAV_ACTION_MOTION_PROPS = Object.freeze({
  whileTap: {
    scale: 0.98,
  },
});

export const STATUS_PRIORITY = Object.freeze({
  GUARD: 120,
  ACCOUNT_DELETE: 115,
  APP_ERROR: 100,
  API_ERROR: 95,
  NOT_FOUND: 97,
  OFFLINE: 90,
  LOGOUT: 110,
  SIGNUP: 110,
  LOGIN: 110,
  ONLINE: 10,
});
export const ERROR_STATUS_TYPES = new Set([
  "GUARD",
  "ACCOUNT_DELETE",
  "APP_ERROR",
  "API_ERROR",
  "NOT_FOUND",
]);
export const STATUS_TONES = Object.freeze({
  GUARD: "error",
  ACCOUNT_DELETE: "error",
  API_ERROR: "error",
  APP_ERROR: "error",
  NOT_FOUND: "error",
  OFFLINE: "warning",
  LOGOUT: "warning",
  ONLINE: "success",
  SIGNUP: "success",
  LOGIN: "success",
});
export const AUTH_STATUS_TYPES = new Set(["LOGIN", "LOGOUT", "SIGNUP"]);
export const AUTH_STATUS_STORAGE_KEY = "nav_auth_status";
export const AUTH_STATUS_CLEAR_DURATION = 3000;
export const STATUS_CLEAR_DURATION = 4500;
export const API_ERROR_BATCH_DELAY = 300;
export const NAV_SPACER_BOTTOM_LOCK_DISTANCE = 40;
export const NAV_HEIGHT_BUFFER = 16;
export const HEIGHT_EPSILON = 0.5;
export const HORIZONTAL_GESTURE_DOMINANCE_RATIO = 1.15;
export const HORIZONTAL_GESTURE_SUPPRESSION_MS = 260;
export const HORIZONTAL_GESTURE_DELTA_THRESHOLD = 8;
export const BOTTOM_LOCK_ACTIVATION_DISTANCE = 2;
export const COMPACT_MIN_ACTIVATION_DELTA = 4.5;
export const BOTTOM_LOCK_RELEASE_DISTANCE = 40;
export const COMPACT_TOGGLE_COOLDOWN_MS = 300;
export const NAV_COLLAPSE_TO_COMPACT_DELAY_MS = 700;
export const BEHAVIOR_CHECK_INTERVAL_MS = 350;
export const COMPACT_SCROLL_THRESHOLD = 148;
export const COMPACT_RELEASE_THRESHOLD = 36;
export const COMPACT_ACTIVATION_BUFFER = 88;
export const SCROLL_DIRECTION_EPSILON = 0.5;
export const BEHAVIOR_FOCUS_IDLE_MS = 1400;
export const OVERSCROLL_THRESHOLD = -1;
export const BOTTOM_LOCK_MIN_SCROLLABLE_HEIGHT =
  COMPACT_SCROLL_THRESHOLD + BOTTOM_LOCK_RELEASE_DISTANCE;
export const NAV_COMPACT_BEHAVIOR = Object.freeze({
  BROWSING: "browsing",
  FOCUSED: "focused",
});
export const MAX_VISIBLE_STACKED_CARDS = 3;
