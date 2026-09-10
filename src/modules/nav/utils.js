import { isValidElement } from "react";
import {
  clamp,
  cn,
  formatMediaTime,
  isImageIconSource,
  isObject as isObjectLike,
  isValidBannerUrl,
  shallowEqual as areShallowCollectionsEqual,
  toArray,
} from "@/shared/utils";
import {
  NAV_ACTION_STYLES,
  SEMANTIC_SURFACE_CLASSES,
  NAVIGATION_FOCUSABLE_SELECTOR,
  NAVIGATION_FOCUS_RESTORE_BLOCKED_REASONS,
} from "./constants";

export {
  areShallowCollectionsEqual,
  clamp,
  formatMediaTime,
  isImageIconSource,
  isObjectLike,
  isValidBannerUrl,
  toArray,
};

export function toObject(value) {
  return isObjectLike(value) ? value : {};
}

export function isValidComponentType(type) {
  if (typeof type === "function") return true;
  return Boolean(
    type != null &&
    typeof type === "object" &&
    !isValidElement(type) &&
    "$$typeof" in type,
  );
}

export function resolveComponentType(...candidates) {
  return candidates.find(isValidComponentType) ?? null;
}

export function resolveRenderableContent(...candidates) {
  return (
    candidates.find(
      (candidate) => candidate !== null && candidate !== undefined,
    ) ?? null
  );
}

export function collectSearchableText(value, visitedObjects) {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  if (Array.isArray(value)) {
    if (visitedObjects.has(value)) return "";
    visitedObjects.add(value);
    const text = value
      .map((entry) => collectSearchableText(entry, visitedObjects))
      .join(" ");
    visitedObjects.delete(value);
    return text;
  }
  if (isValidElement(value)) {
    if (visitedObjects.has(value)) return "";
    visitedObjects.add(value);
    const text = collectSearchableText(value.props?.children, visitedObjects);
    visitedObjects.delete(value);
    return text;
  }
  if (value && typeof value === "object") {
    if (visitedObjects.has(value)) return "";
    visitedObjects.add(value);
    return Object.values(value)
      .map((entry) => collectSearchableText(entry, visitedObjects))
      .join(" ");
  }
  return "";
}

export function toSearchableText(value) {
  return collectSearchableText(value, new WeakSet());
}

export function normalizePath(value) {
  const normalized = String(value || "").trim();
  if (!normalized) return "";
  if (normalized === "/") return "/";
  return normalized.replace(/\/+$/, "");
}

export function isSamePath(left, right) {
  const normalizedLeft = normalizePath(left);
  const normalizedRight = normalizePath(right);
  return Boolean(
    normalizedLeft && normalizedRight && normalizedLeft === normalizedRight,
  );
}

export function isPathPrefix(candidatePath, pathname) {
  const normalizedCandidate = normalizePath(candidatePath);
  const normalizedPathname = normalizePath(pathname);
  if (!normalizedCandidate || !normalizedPathname) return false;
  if (normalizedCandidate === normalizedPathname) return true;
  if (normalizedCandidate === "/") return normalizedPathname.startsWith("/");
  return normalizedPathname.startsWith(`${normalizedCandidate}/`);
}

export function isInlineActionPathMatch(path, pathname) {
  return (
    isSamePath(path, pathname) || (path !== "/" && isPathPrefix(path, pathname))
  );
}

export function isSafeInternalHref(value) {
  const href = typeof value === "string" ? value.trim() : "";
  return href.startsWith("/") && !href.startsWith("//");
}

export function isSameItem(item, candidate) {
  return (
    (item?.path && item.path === candidate?.path) ||
    (item?.name && item.name === candidate?.name)
  );
}

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

export function blurActiveElement() {
  if (typeof document === "undefined") return;
  const activeElement = document.activeElement;
  if (activeElement && typeof activeElement.blur === "function") {
    activeElement.blur();
  }
}

export function getScrollableHeight() {
  if (typeof document === "undefined") return 0;
  const { body, documentElement } = document;
  return Math.max(
    body ? body.scrollHeight : 0,
    documentElement ? documentElement.scrollHeight : 0,
  );
}

export function getDistanceToBottom(scrollPosition = null) {
  if (typeof window === "undefined") return Number.POSITIVE_INFINITY;
  const scrollableHeight = getScrollableHeight();
  const viewportHeight = window.innerHeight;
  const currentScroll =
    scrollPosition !== null ? scrollPosition : window.scrollY;
  return Math.max(0, scrollableHeight - (currentScroll + viewportHeight));
}

export function isInteractiveTarget(target) {
  return Boolean(
    target &&
    target.closest &&
    target.closest(
      'button, a, input, textarea, select, [role="button"], [tabindex]:not([tabindex="-1"])',
    ),
  );
}

export function isEditableNavigationTarget(target) {
  return Boolean(
    target &&
    target.closest &&
    target.closest('input, textarea, select, [contenteditable="true"]'),
  );
}

export function getNavigationFocusableElements(container) {
  if (!container || typeof container.querySelectorAll !== "function") return [];
  return Array.from(
    container.querySelectorAll(NAVIGATION_FOCUSABLE_SELECTOR),
  ).filter((element) => {
    if (!element || element.getAttribute("aria-hidden") === "true")
      return false;
    const style =
      typeof window !== "undefined" ? window.getComputedStyle(element) : null;
    return (
      style?.display !== "none" &&
      style?.visibility !== "hidden" &&
      style?.pointerEvents !== "none"
    );
  });
}

export function focusNavigationElement(element) {
  if (!element || typeof element.focus !== "function") return false;
  try {
    element.focus({ preventScroll: true });
    return document.activeElement === element;
  } catch {
    return false;
  }
}

export function shouldRestoreNavigationFocus(result) {
  return (
    !result ||
    !NAVIGATION_FOCUS_RESTORE_BLOCKED_REASONS.includes(result.blockedReason)
  );
}

export function normalizeUpper(value) {
  return String(value || "")
    .trim()
    .toUpperCase();
}

export function normalizeLower(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

export function splitStyle(style = {}) {
  const { className, ...inlineStyle } = style;
  return {
    className,
    inlineStyle,
  };
}

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

export function getImageIconStyle(style, icon) {
  const nextStyle = {
    ...style,
  };
  delete nextStyle.background;
  delete nextStyle.backgroundImage;
  return {
    ...nextStyle,
    backgroundImage: `url(${icon})`,
  };
}

export function getNavActionClass({
  className = "",
  button = "",
  isActive = false,
  variant = "",
  tone = "",
  base,
  cn: classNamesFn,
} = {}) {
  const resolve = classNamesFn || cn;
  if (button && !className && base === undefined) {
    if (tone) {
      const toneClass =
        NAV_ACTION_STYLES.action[tone] ||
        SEMANTIC_SURFACE_CLASSES[tone]?.surface ||
        NAV_ACTION_STYLES.action.muted;
      return resolve(button, toneClass);
    }
    const stateToken = isActive
      ? NAV_ACTION_STYLES.action.active
      : NAV_ACTION_STYLES.action.muted;
    return resolve(button, stateToken);
  }
  const elementClass = className || button;
  const resolvedBase = base !== undefined ? base : NAV_ACTION_STYLES.base;
  const stateClass =
    variant ||
    (tone &&
      (SEMANTIC_SURFACE_CLASSES[tone]?.surface ||
        NAV_ACTION_STYLES.action[tone])) ||
    (isActive ? NAV_ACTION_STYLES.active : NAV_ACTION_STYLES.muted);
  return resolve(stateClass, resolvedBase, elementClass);
}

export function isHudDescriptor(value) {
  return (
    isObjectLike(value) &&
    !isValidElement(value) &&
    ("component" in value ||
      "content" in value ||
      "node" in value ||
      "element" in value ||
      "isActive" in value ||
      "id" in value)
  );
}

export function isSurfaceDescriptor(value) {
  return (
    value != null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    !isValidElement(value)
  );
}

export function getItemKey(link, index = 0) {
  const identity = link?.id ?? link?.path ?? link?.name ?? link?.type;
  return `nav-card:${identity == null ? `slot-${index}` : String(identity)}`;
}

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

export function getRouteMeasurementKey(pathname, key) {
  return `${pathname || ""}:${key}`;
}

export function resolveNavHeaderKey({
  link,
  description = "",
  showVideoIcon = false,
}) {
  const statusPart = link?.isStatus
    ? `status:${link.statusType || link.type || "status"}`
    : "standard";
  const identityPart = link?.path || link?.name || link?.id || "item";
  const titlePart = link?.title || link?.name || "";
  const descPart = description || "";
  const iconPart = showVideoIcon ? "video" : link?.icon || "no-icon";
  return `${statusPart}:${identityPart}:${iconPart}:${titlePart}:${descPart}`;
}
