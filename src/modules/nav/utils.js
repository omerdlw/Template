import { isValidElement } from "react";

import {
  COMPACT_CARD_HORIZONTAL_PADDING,
  COMPACT_CARD_MAX_OFFSET,
  COMPACT_CARD_MIN_WIDTH,
  NAV_ACTION_KEYS,
  NAV_STYLE_SECTIONS,
} from "./constants";

/**
 * Converts a nullable value to an array without flattening nested values.
 * @param {*} value - Value to normalize
 * @returns {Array<*>} Normalized array
 */
export function toArray(value) {
  if (value === null || value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

/**
 * Determines whether a value is a non-array object.
 * @param {*} value - Candidate value
 * @returns {boolean} Whether the value is object-like
 */
export function isObjectLike(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Converts a value to a plain object fallback.
 * @param {*} value - Candidate object
 * @returns {object} Value or an empty object
 */
export function toObject(value) {
  return isObjectLike(value) ? value : {};
}

/**
 * Extracts legacy top-level card style properties.
 * @param {object} style - Navigation style object
 * @returns {object} Legacy card properties
 */
export function getLegacyCardStyle(style) {
  const legacyCardStyle = {};

  if (style?.background != null) legacyCardStyle.background = style.background;
  if (style?.borderColor != null)
    legacyCardStyle.borderColor = style.borderColor;

  return legacyCardStyle;
}

/**
 * Merges one visual section across base, state, and hover styles.
 * @param {object} baseStyle - Base style
 * @param {object} stateStyle - Active or inactive state style
 * @param {object} hoverStyle - Hover style
 * @param {string} section - Visual section name
 * @returns {object} Resolved section style
 */
export function mergeStyleSection(baseStyle, stateStyle, hoverStyle, section) {
  return {
    ...toObject(baseStyle?.[section]),
    ...toObject(stateStyle?.[section]),
    ...toObject(hoverStyle?.[section]),
  };
}

/**
 * Resolves base, active/inactive, and hover navigation styles into render-ready sections.
 * @param {object} style - Navigation style definition
 * @param {{isActive?: boolean, isHovered?: boolean}} [state] - Current visual state
 * @returns {{card: object, icon: object, title: object, description: object, scale: *}} Resolved style
 */
export function resolveNavVisualStyle(
  style,
  { isActive = false, isHovered = false } = {},
) {
  const baseStyle = toObject(style);
  const stateStyle = isActive
    ? toObject(baseStyle.active)
    : toObject(baseStyle.inactive);
  const hoverStyle = isHovered ? toObject(baseStyle.hover) : {};

  const sections = NAV_STYLE_SECTIONS.reduce(
    (resolvedSections, section) => {
      resolvedSections[section] = mergeStyleSection(
        baseStyle,
        stateStyle,
        hoverStyle,
        section,
      );
      return resolvedSections;
    },
    {
      card: {},
      icon: {},
      title: {},
      description: {},
    },
  );

  sections.card = {
    ...getLegacyCardStyle(baseStyle),
    ...sections.card,
  };

  return {
    ...sections,
    scale:
      hoverStyle?.card?.scale ?? stateStyle?.card?.scale ?? baseStyle?.scale,
  };
}

/**
 * Restricts a numeric value to an inclusive range.
 * @param {*} value - Candidate numeric value
 * @param {number} min - Inclusive lower bound
 * @param {number} max - Inclusive upper bound
 * @returns {number} Clamped value
 */
export function clamp(value, min, max) {
  const numericValue = Number(value);
  return Math.min(
    Math.max(Number.isFinite(numericValue) ? numericValue : min, min),
    max,
  );
}

/**
 * Estimates a compact navigation card width from its title and available stack width.
 * @param {*} title - Card title
 * @param {*} stackWidth - Available stack width
 * @returns {number} Compact card width
 */
export function estimateCompactCardWidth(title, stackWidth) {
  const titleLength = String(title || "").trim().length;
  const estimatedWidth = titleLength * 10 + COMPACT_CARD_HORIZONTAL_PADDING;
  const numericStackWidth = Number(stackWidth);
  const maxWidth = Number.isFinite(numericStackWidth)
    ? Math.max(
        COMPACT_CARD_MIN_WIDTH,
        numericStackWidth - COMPACT_CARD_MAX_OFFSET,
      )
    : COMPACT_CARD_MIN_WIDTH;

  return clamp(estimatedWidth, COMPACT_CARD_MIN_WIDTH, maxWidth);
}

/**
 * Formats a URL slug as a title-cased label.
 * @param {string} [slug=''] - URL slug
 * @returns {string} Display label
 */
export function formatSlugTitle(slug = "") {
  if (!slug) return "";
  return String(slug)
    .split(/[-_]+/)
    .map((word) =>
      word ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() : "",
    )
    .filter(Boolean)
    .join(" ");
}

/**
 * Formats a media duration as a zero-padded minutes and seconds label.
 * @param {number} [seconds=0] - Media time in seconds
 * @returns {string} Formatted media time
 */
export function formatMediaTime(seconds = 0) {
  if (!Number.isFinite(seconds) || seconds < 0) return "00:00";

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}

/**
 * Normalizes a path for route comparison.
 * @param {*} value - Candidate path
 * @returns {string} Normalized path
 */
export function normalizePath(value) {
  const normalized = String(value || "").trim();
  if (!normalized) return "";
  if (normalized === "/") return "/";
  return normalized.replace(/\/+$/, "");
}

/**
 * Determines whether two paths represent the same normalized route.
 * @param {*} left - First path
 * @param {*} right - Second path
 * @returns {boolean} Whether the paths match
 */
export function isSamePath(left, right) {
  const normalizedLeft = normalizePath(left);
  const normalizedRight = normalizePath(right);
  return Boolean(
    normalizedLeft && normalizedRight && normalizedLeft === normalizedRight,
  );
}

/**
 * Determines whether a route is an exact or segment-safe prefix of a pathname.
 * @param {*} candidatePath - Candidate route
 * @param {*} pathname - Current pathname
 * @returns {boolean} Whether the candidate matches the pathname
 */
export function isPathPrefix(candidatePath, pathname) {
  const normalizedCandidate = normalizePath(candidatePath);
  const normalizedPathname = normalizePath(pathname);

  if (!normalizedCandidate || !normalizedPathname) return false;
  if (normalizedCandidate === normalizedPathname) return true;
  if (normalizedCandidate === "/") return normalizedPathname.startsWith("/");
  return normalizedPathname.startsWith(`${normalizedCandidate}/`);
}

/**
 * Determines whether an inline action applies to the current pathname.
 * @param {*} path - Action route path
 * @param {*} pathname - Current pathname
 * @returns {boolean} Whether the inline action route matches
 */
export function isInlineActionPathMatch(path, pathname) {
  return (
    isSamePath(path, pathname) || (path !== "/" && isPathPrefix(path, pathname))
  );
}

/**
 * Determines whether a route item should render its inline action.
 * @param {{action?: *, isLoading?: boolean, isOverlay?: boolean, path?: string}} item - Navigation item
 * @param {string} pathname - Current pathname
 * @returns {boolean} Whether the inline action should render
 */
export function shouldRenderInlineAction(
  { action, isLoading, isOverlay, path },
  pathname,
) {
  return (
    Boolean(action) &&
    !isLoading &&
    (isOverlay || !path || isInlineActionPathMatch(path, pathname))
  );
}

/**
 * Blurs the document's active element when a browser document is available.
 * @returns {void}
 * @sideeffect Moves browser focus away from the current active element.
 */
export function blurActiveElement() {
  if (typeof document === "undefined") return;
  document.activeElement?.blur?.();
}

/**
 * Calculates the document's scrollable height.
 * @returns {number} Scrollable height, or zero outside the browser
 */
export function getScrollableHeight() {
  if (typeof window === "undefined" || typeof document === "undefined")
    return 0;

  const root = document.documentElement;
  return Math.max((root?.scrollHeight || 0) - window.innerHeight, 0);
}

/**
 * Calculates the remaining vertical distance to the document bottom.
 * @param {number|null} [scrollPosition=null] - Optional scroll position override
 * @returns {number} Remaining distance, or infinity outside the browser
 */
export function getDistanceToBottom(scrollPosition = null) {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return Infinity;
  }

  const root = document.documentElement;
  const maxScrollY = Math.max(
    (root?.scrollHeight || 0) - window.innerHeight,
    0,
  );
  const scrollY = scrollPosition ?? window.scrollY ?? 0;
  return Math.max(maxScrollY - scrollY, 0);
}

/**
 * Returns a high-resolution timestamp where supported.
 * @returns {number} Current timestamp in milliseconds
 */
export function getCurrentTimestamp() {
  if (
    typeof performance !== "undefined" &&
    typeof performance.now === "function"
  ) {
    return performance.now();
  }

  return Date.now();
}

/**
 * Determines whether an event target is an interactive control.
 * @param {*} target - Candidate event target
 * @returns {boolean} Whether the target is interactive
 */
export function isInteractiveTarget(target) {
  return Boolean(
    target?.closest?.(
      'button, a, [role="button"], [role="option"], [role="combobox"]',
    ),
  );
}

/**
 * Determines whether an event target accepts editable text input.
 * @param {*} target - Candidate event target
 * @returns {boolean} Whether the target is editable
 */
export function isEditableNavigationTarget(target) {
  if (!target || typeof target.matches !== "function") return false;

  return target.matches(
    'input, textarea, select, [contenteditable=""], [contenteditable="true"], [role="textbox"]',
  );
}

/**
 * Determines whether a value is a same-origin application path.
 * @param {*} value - Candidate href
 * @returns {boolean} Whether the value is a safe internal href
 */
export function isSafeInternalHref(value) {
  const href = typeof value === "string" ? value.trim() : "";
  return href.startsWith("/") && !href.startsWith("//");
}

/** @param {*} type - Candidate React component type @returns {boolean} Whether the type is supported */
export function isValidComponentType(type) {
  if (typeof type === "function") return true;
  return Boolean(
    type != null &&
    typeof type === "object" &&
    !isValidElement(type) &&
    "$$typeof" in type,
  );
}

/** @param {...*} candidates - Candidate component values @returns {*} First supported component or null */
export function resolveComponentType(...candidates) {
  return candidates.find(isValidComponentType) ?? null;
}

/** @param {...*} candidates - Candidate renderable values @returns {*} First defined value or null */
export function resolveRenderableContent(...candidates) {
  return (
    candidates.find(
      (candidate) => candidate !== null && candidate !== undefined,
    ) ?? null
  );
}

/** @param {object} link - Navigation item @param {number} [index=0] - Fallback index @returns {string} Item key */
export function getItemKey(link, index = 0) {
  const identity = link?.id ?? link?.path ?? link?.name ?? link?.type;
  return `nav-card:${identity == null ? `slot-${index}` : String(identity)}`;
}

/** @param {object} link - Candidate item @param {object} activeItem - Active item @returns {boolean} Whether the item is active */
export function getIsItemActive(link, activeItem) {
  if (!link || !activeItem) return false;
  if (link.path && activeItem.path)
    return isSamePath(link.path, activeItem.path);
  return Boolean(link.name && activeItem.name && link.name === activeItem.name);
}

/** @param {boolean} compact - Compact mode @param {boolean} expanded - Expanded mode @returns {boolean} Whether stack preview is allowed */
export function canPreviewStackOnTopHover(compact, expanded) {
  return !(compact && !expanded);
}

/** @param {object} item - First item @param {object} candidate - Second item @returns {boolean} Whether item identities match */
export function isSameItem(item, candidate) {
  return (
    (item?.path && item.path === candidate?.path) ||
    (item?.name && item.name === candidate?.name)
  );
}

/** @param {*} value - Value to inspect @param {WeakSet<object>} visitedObjects - Cycle guard @returns {string} Searchable text */
export function collectSearchableText(value, visitedObjects) {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  if (Array.isArray(value)) {
    return value
      .map((entry) => collectSearchableText(entry, visitedObjects))
      .join(" ");
  }
  if (isValidElement(value))
    return collectSearchableText(value.props?.children, visitedObjects);
  if (value && typeof value === "object") {
    if (visitedObjects.has(value)) return "";
    visitedObjects.add(value);
    return Object.values(value)
      .map((entry) => collectSearchableText(entry, visitedObjects))
      .join(" ");
  }
  return "";
}

/** @param {*} value - Value to inspect @returns {string} Cycle-safe searchable text */
export function toSearchableText(value) {
  return collectSearchableText(value, new WeakSet());
}

/** @param {object} [style={}] - Style definition @returns {{className: string|undefined, inlineStyle: object}} Separated style values */
export function splitStyle(style = {}) {
  const { className, ...inlineStyle } = style;
  return { className, inlineStyle };
}

/** @param {*} maxLines - Maximum line count @param {object} style - Existing style @returns {object} Line-clamped style */
export function getLineClampStyle(maxLines, style) {
  if (Number(maxLines) <= 1) return style;
  return {
    WebkitBoxOrient: "vertical",
    WebkitLineClamp: maxLines,
    display: "-webkit-box",
    overflow: "hidden",
    ...style,
  };
}

/** @param {*} icon - Candidate icon @returns {boolean} Whether the icon is an image source */
export function isImageIconSource(icon) {
  return (
    typeof icon === "string" &&
    (icon.startsWith("http") ||
      icon.startsWith("/") ||
      icon.startsWith("data:image/"))
  );
}

/** @param {object} style - Existing style @param {string} icon - Image source @returns {object} Image icon style */
export function getImageIconStyle(style, icon) {
  const nextStyle = { ...style };
  delete nextStyle.background;
  delete nextStyle.backgroundImage;
  return { ...nextStyle, backgroundImage: `url(${icon})` };
}

/** @param {{link: object, expanded: boolean, compact: boolean, isHud?: boolean}} options - Item state @returns {string} Measurement key */
export function getItemMeasurementKey({
  link,
  expanded,
  compact,
  isHud = false,
}) {
  const state = isHud
    ? "hud"
    : link.isLoading
      ? "loading"
      : link.isSurface
        ? "surface"
        : "standard";
  return `${link.path || link.name || "item"}:${state}:${expanded ? "expanded" : "collapsed"}:${compact ? "compact" : "full"}`;
}

/** @param {*} pathname - Route pathname @param {*} key - Item key @returns {string} Route-scoped measurement key */
export function getRouteMeasurementKey(pathname, key) {
  return `${pathname || ""}:${key}`;
}

/** @param {object|Array<object>|null} actions - Candidate actions @returns {Array<object>} Normalized actions */
export function normalizeToolbarActions(actions) {
  return toArray(actions).flatMap((action, index) =>
    action ? [{ key: action.key ?? `action-${index}`, ...action }] : [],
  );
}

/** @param {Array<object>} actions - Toolbar actions @returns {Array<object>} Visible actions */
export function getVisibleToolbarActions(actions) {
  return actions.filter((action) => action.visible !== false);
}

/** @param {Array<object>} actions - Toolbar actions @returns {Array<object>} Actions in display order */
export function sortToolbarActionsByOrder(actions) {
  return [...actions].sort(
    (left, right) => (right.order ?? 0) - (left.order ?? 0),
  );
}

/** @param {object} activeItem - Active item @returns {boolean} Whether the item cannot show actions */
export function isActionlessNavItem(activeItem) {
  return Boolean(
    activeItem?.isNotFound ||
    activeItem?.path === "not-found" ||
    activeItem?.isMasked ||
    activeItem?.isSurface,
  );
}

/** @param {object} activeItem - Active item @returns {boolean} Whether the status may show actions */
export function isStatusToolbarActionAllowed(activeItem) {
  return (
    activeItem?.type === "APP_ERROR" ||
    activeItem?.type === "API_ERROR" ||
    activeItem?.type === "GUARD"
  );
}

/** @param {Array<object>} actions - Context actions @param {object} activeItem - Active item @returns {Array<object>} Allowed actions */
export function filterContextToolbarActions(actions, activeItem) {
  return actions.filter((action) => {
    if (action.key === NAV_ACTION_KEYS.LOGOUT && activeItem?.hideLogout)
      return false;
    if (action.key === NAV_ACTION_KEYS.SCROLL_TOP && activeItem?.hideScroll)
      return false;
    return true;
  });
}

/** @param {*} value - Candidate text @returns {string} Trimmed uppercase text */
export function normalizeUpper(value) {
  return String(value || "")
    .trim()
    .toUpperCase();
}

/** @param {*} value - Candidate text @returns {string} Trimmed lowercase text */
export function normalizeLower(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

/** @param {object} left - First collection @param {object} right - Second collection @returns {boolean} Whether collections are shallowly equal */
export function areShallowCollectionsEqual(left, right) {
  if (Object.is(left, right)) return true;
  if (!left || !right || typeof left !== "object" || typeof right !== "object")
    return false;
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  return (
    leftKeys.length === rightKeys.length &&
    leftKeys.every(
      (key) => Object.hasOwn(right, key) && Object.is(left[key], right[key]),
    )
  );
}
