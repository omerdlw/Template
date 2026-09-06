import { isValidElement } from "react";

import { REGISTRY_KEYS } from "../registry/contract";

// ── Shared menu model constants ───────────────────────────────────────────────

const CURRENT_PAGE_KEY = REGISTRY_KEYS.CONTEXT_MENU_CURRENT;
const GLOBAL_MENU_KEY = "*";
const MENU_SCREEN_MARGIN = 10;

export const CONTEXT_MENU_LAYOUT = Object.freeze({
  wrapperRadius: 24,
  wrapperPadding: 10,
});

export function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

// ── Registry candidate and context resolution ─────────────────────────────────

function toArray(value) {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined || value === "") return [];
  return [value];
}

function resolveAsBoolean(value, context, defaultValue = true) {
  if (typeof value === "function") {
    try {
      return Boolean(value(context));
    } catch {
      return false;
    }
  }

  if (value === undefined) {
    return defaultValue;
  }

  return Boolean(value);
}

function resolveAsValue(value, context, fallback = undefined) {
  if (typeof value === "function") {
    try {
      const resolved = value(context);
      return resolved === undefined ? fallback : resolved;
    } catch {
      return fallback;
    }
  }

  return value === undefined ? fallback : value;
}

function normalizeMenuCandidates(registryMenus) {
  const entries = Object.entries(registryMenus || {});
  const candidates = [];
  let order = 0;

  entries.forEach(([registryKey, rawConfig]) => {
    if (!isObject(rawConfig)) return;

    const { menus, ...sharedConfig } = rawConfig;
    const sharedClassNames = sharedConfig.classNames || {};
    const hasSharedItems =
      Array.isArray(sharedConfig.items) ||
      typeof sharedConfig.items === "function";

    if (hasSharedItems) {
      candidates.push({ registryKey, config: sharedConfig, order: order++ });
    }

    const nestedMenus = toArray(menus).filter((menu) => isObject(menu));
    nestedMenus.forEach((menu) => {
      candidates.push({
        registryKey,
        config: {
          ...sharedConfig,
          ...menu,
          classNames: {
            ...sharedClassNames,
            ...(menu.classNames || {}),
          },
        },
        order: order++,
      });
    });

    if (!hasSharedItems && nestedMenus.length === 0) {
      candidates.push({ registryKey, config: rawConfig, order: order++ });
    }
  });

  return candidates;
}

function isPathAllowed(config, registryKey, pathname) {
  if (!pathname) return true;

  const explicitPath = config.path;
  if (typeof explicitPath === "string" && explicitPath) {
    return explicitPath === pathname;
  }

  const explicitPaths = toArray(config.paths || config.pathnames).filter(
    (path) => typeof path === "string" && path,
  );
  if (explicitPaths.length > 0) {
    return explicitPaths.includes(pathname);
  }

  const matcher = config.pathMatcher;
  if (typeof matcher === "function") {
    try {
      return Boolean(matcher(pathname));
    } catch {
      return false;
    }
  }

  return (
    registryKey === pathname ||
    registryKey === CURRENT_PAGE_KEY ||
    registryKey === GLOBAL_MENU_KEY
  );
}

function isWhenAllowed(config, event, pathname, targetElement, context) {
  if (typeof config.when === "function") {
    try {
      return Boolean(
        config.when(event, {
          pathname,
          target: targetElement,
          context,
        }),
      );
    } catch {
      return false;
    }
  }

  if (config.when === undefined) return true;
  return Boolean(config.when);
}

function getMatchDepth(sourceElement, matchedElement) {
  let depth = 0;
  let node = sourceElement;

  while (node && node !== matchedElement) {
    node = node.parentElement;
    depth += 1;
  }

  return depth;
}

function getTargetScore(config, targetElement) {
  const selectors = toArray(config.target).filter(
    (selector) => typeof selector === "string" && selector.trim(),
  );

  if (selectors.length === 0) return 0;
  if (!targetElement) return null;

  let minDepth = Infinity;

  selectors.forEach((selector) => {
    let matchedElement = null;
    try {
      matchedElement = targetElement.closest(selector);
    } catch {
      matchedElement = null;
    }

    if (matchedElement) {
      const depth = getMatchDepth(targetElement, matchedElement);
      if (depth < minDepth) {
        minDepth = depth;
      }
    }
  });

  if (minDepth === Infinity) return null;
  return Math.max(0, 100 - minDepth);
}

function getRouteScore(config, registryKey, pathname) {
  if (!pathname) return 0;

  if (
    config.path === pathname ||
    toArray(config.paths || config.pathnames).includes(pathname) ||
    registryKey === pathname
  ) {
    return 100;
  }

  if (registryKey === CURRENT_PAGE_KEY) return 70;
  if (registryKey === GLOBAL_MENU_KEY) return 40;
  return 10;
}

function buildMenuContext(config, event, pathname, targetElement) {
  const context = {
    currentTarget: event?.currentTarget ?? null,
    event,
    pathname: pathname || "",
    point: {
      x: Number(event?.clientX) || 0,
      y: Number(event?.clientY) || 0,
    },
    target: targetElement,
  };

  if (config.payload !== undefined) {
    context.payload = config.payload;
  }

  if (typeof config.resolvePayload === "function") {
    try {
      const resolvedPayload = config.resolvePayload(event, context);
      if (resolvedPayload !== undefined) {
        context.payload = resolvedPayload;
      }
    } catch {}
  }

  if (typeof config.resolveContext === "function") {
    try {
      const extraContext = config.resolveContext(event, context);
      if (isObject(extraContext)) {
        return { ...context, ...extraContext };
      }
    } catch {
      return context;
    }
  }

  return context;
}

function normalizeMenuItem(item, index, context) {
  if (!item || item === false) return null;

  if (item === "separator") {
    return { key: `separator-${index}`, type: "separator" };
  }

  if (!isObject(item)) return null;

  if (item.type === "separator") {
    return {
      ...item,
      key: item.key || `separator-${index}`,
      type: "separator",
    };
  }

  const hidden = resolveAsBoolean(item.hidden, context, false);
  const visible = resolveAsBoolean(item.visible, context, true);
  if (hidden || !visible) return null;

  const labelValue = resolveAsValue(item.label, context, "");
  const label =
    typeof labelValue === "string" || typeof labelValue === "number"
      ? String(labelValue)
      : "";
  if (!label.trim()) return null;

  const iconValue = resolveAsValue(item.icon, context, null);
  const shortcutValue = resolveAsValue(item.shortcut, context, null);
  const classNameValue = resolveAsValue(item.className, context, "");
  const itemIconClassNameValue = resolveAsValue(
    item.itemIconClassName,
    context,
    "",
  );
  const handler =
    typeof item.onSelect === "function"
      ? item.onSelect
      : typeof item.onClick === "function"
        ? item.onClick
        : null;

  return {
    ...item,
    closeOnSelect: item.closeOnSelect !== false,
    danger: resolveAsBoolean(item.danger, context, false),
    disabled: resolveAsBoolean(item.disabled, context, false),
    icon: typeof iconValue === "string" ? iconValue : null,
    itemIconClassName:
      typeof itemIconClassNameValue === "string" ? itemIconClassNameValue : "",
    key: item.key || `item-${index}`,
    label,
    onClick: handler,
    onSelect: handler,
    shortcut: typeof shortcutValue === "string" ? shortcutValue : null,
    className: typeof classNameValue === "string" ? classNameValue : "",
    type: "action",
  };
}

// ── Public item model ──────────────────────────────────────────────────────────

function compactSeparators(items) {
  const compacted = [];

  items.forEach((item) => {
    if (!item) return;
    const previous = compacted[compacted.length - 1];
    if (
      item.type === "separator" &&
      (!previous || previous.type === "separator")
    )
      return;
    compacted.push(item);
  });

  while (
    compacted.length &&
    compacted[compacted.length - 1]?.type === "separator"
  ) {
    compacted.pop();
  }

  return compacted;
}

export function resolveMenuItems(config, context) {
  const rawItems =
    typeof config?.items === "function"
      ? resolveAsValue(config.items, context, [])
      : config?.items;
  const items = toArray(rawItems)
    .map((item, index) => normalizeMenuItem(item, index, context))
    .filter(Boolean);

  return compactSeparators(items);
}

function resolveEventTarget(event) {
  if (!event) return null;
  const isHtmlElement =
    typeof Element !== "undefined" && event?.target instanceof Element;
  const isSvgElement =
    typeof SVGElement !== "undefined" && event?.target instanceof SVGElement;
  const initialTarget = isHtmlElement || isSvgElement ? event.target : null;

  if (
    typeof document === "undefined" ||
    !Number.isFinite(event.clientX) ||
    !Number.isFinite(event.clientY)
  ) {
    return initialTarget;
  }

  if (
    !initialTarget ||
    initialTarget.closest?.("[data-context-menu-ignore]") ||
    initialTarget.closest?.("[data-context-menu-overlay]") ||
    initialTarget.closest?.('[role="menu"]') ||
    initialTarget.classList?.contains("context-menu-overlay")
  ) {
    try {
      const elements = document.elementsFromPoint(event.clientX, event.clientY);
      for (const el of elements) {
        if (
          el.closest?.("[data-context-menu-ignore]") ||
          el.closest?.("[data-context-menu-overlay]") ||
          el.closest?.('[role="menu"]') ||
          el.classList?.contains("context-menu-overlay")
        ) {
          continue;
        }
        return el;
      }
    } catch {
      return initialTarget;
    }
  }

  return initialTarget;
}

export function resolveContextMenu(registryMenus, pathname, event) {
  const candidates = normalizeMenuCandidates(registryMenus);
  const targetElement = resolveEventTarget(event);
  let winner = null;

  candidates.forEach((candidate) => {
    const { config, registryKey, order } = candidate;
    if (!isObject(config)) return;
    if (!isPathAllowed(config, registryKey, pathname)) return;

    const context = buildMenuContext(config, event, pathname, targetElement);
    if (!resolveAsBoolean(config.enabled, context, true)) return;
    if (!isWhenAllowed(config, event, pathname, targetElement, context)) return;

    const items = resolveMenuItems(config, context);
    if (items.length === 0) return;

    const targetScore = getTargetScore(config, targetElement);
    if (targetScore === null) return;

    const routeScore = getRouteScore(config, registryKey, pathname);
    const priority = Number.isFinite(Number(config.priority))
      ? Number(config.priority)
      : 0;
    const score = priority * 10000 + routeScore * 100 + targetScore;

    if (
      !winner ||
      score > winner.score ||
      (score === winner.score && order < winner.order)
    ) {
      winner = { config, context, items, score, order };
    }
  });

  return winner;
}

// ── Presentation helpers ───────────────────────────────────────────────────────

export function joinClassNames(...values) {
  return values.filter(Boolean).join(" ");
}

export function getContextMenuMetrics() {
  const { wrapperRadius, wrapperPadding } = CONTEXT_MENU_LAYOUT;
  return {
    headerIconRadius: 14,
    itemRadius: 12,
    wrapperPadding,
    wrapperRadius,
  };
}

export function isImageIconSource(icon) {
  return (
    typeof icon === "string" &&
    (icon.startsWith("http") ||
      icon.startsWith("/") ||
      icon.startsWith("data:image/"))
  );
}

export function extractNodeText(value) {
  if (value === null || value === undefined || typeof value === "boolean")
    return "";
  if (typeof value === "string" || typeof value === "number")
    return String(value).trim();

  if (Array.isArray(value)) {
    return value
      .map((item) => extractNodeText(item))
      .filter(Boolean)
      .join(" ")
      .trim();
  }

  if (isValidElement(value)) return extractNodeText(value.props?.children);
  return "";
}

function resolveHeaderValue(value, context, fallback = null) {
  if (typeof value !== "function")
    return value === undefined ? fallback : value;

  try {
    const resolved = value(context);
    return resolved === undefined ? fallback : resolved;
  } catch {
    return fallback;
  }
}

export function resolveMenuHeader(config, menuContext) {
  if (config?.header === false || config?.showPageHeader === false) return null;

  const resolvedHeader = resolveHeaderValue(config?.header, menuContext, null);
  const headerSource = isObject(resolvedHeader)
    ? resolvedHeader
    : isObject(menuContext?.page)
      ? menuContext.page
      : null;
  if (!headerSource) return null;

  const title = resolveHeaderValue(headerSource.title, menuContext, null);
  const description = resolveHeaderValue(
    headerSource.description,
    menuContext,
    null,
  );
  const icon = resolveHeaderValue(headerSource.icon, menuContext, null);
  const eyebrow = resolveHeaderValue(headerSource.eyebrow, menuContext, null);
  if (!title && !description && !icon && !eyebrow) return null;

  return {
    description,
    descriptionText: extractNodeText(description),
    eyebrow,
    icon,
    title,
    titleText: extractNodeText(title),
  };
}

export function positionMenu(menuElement, position) {
  if (!menuElement) return;

  const rect = menuElement.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  let x = Number(position?.x) || 0;
  let y = Number(position?.y) || 0;

  if (x + rect.width > viewportWidth - MENU_SCREEN_MARGIN) {
    x = viewportWidth - rect.width - MENU_SCREEN_MARGIN;
  }
  if (y + rect.height > viewportHeight - MENU_SCREEN_MARGIN) {
    y = viewportHeight - rect.height - MENU_SCREEN_MARGIN;
  }

  menuElement.style.left = `${Math.round(Math.max(MENU_SCREEN_MARGIN, x))}px`;
  menuElement.style.top = `${Math.round(Math.max(MENU_SCREEN_MARGIN, y))}px`;
}

export function isScrollLockKey(event) {
  return (
    event.key === "ArrowDown" ||
    event.key === "ArrowUp" ||
    event.key === "PageDown" ||
    event.key === "PageUp" ||
    event.key === "Home" ||
    event.key === "End" ||
    event.key === " " ||
    event.key === "Spacebar"
  );
}
