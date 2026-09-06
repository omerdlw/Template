"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { toFiniteNumber } from "@/shared";
import { usePathname } from "next/navigation";

import { useContextMenuRegistry, useNavRegistry } from "../registry";
import {
  extractNodeText,
  isObject,
  resolveContextMenu,
  resolveMenuItems,
} from "./resolver";

// ── Provider state and visibility bridge ───────────────────────────────────────

export const ContextMenuContext = createContext(null);

const INITIAL_POSITION = Object.freeze({ x: 0, y: 0 });
export const CONTEXT_MENU_VISIBILITY_EVENT = "context-menu:visibility";

function emitContextMenuVisibility(isOpen) {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent(CONTEXT_MENU_VISIBILITY_EVENT, {
      detail: { isOpen: Boolean(isOpen) },
    }),
  );
}

function createInitialMenuState() {
  return {
    config: null,
    context: null,
    isOpen: false,
    items: [],
    position: INITIAL_POSITION,
  };
}

function observeAsyncFailure(result, label) {
  if (!result || typeof result.then !== "function") return;

  result.catch((error) => {
    console.error(`[ContextMenu] Error executing ${label} callback:`, error);
  });
}

function resolveNextOpenState(configOrState, x, y) {
  if (
    isObject(configOrState) &&
    (Object.prototype.hasOwnProperty.call(configOrState, "config") ||
      Object.prototype.hasOwnProperty.call(configOrState, "menuConfig"))
  ) {
    const config = configOrState.config || configOrState.menuConfig || null;
    if (!config) return createInitialMenuState();

    const resolvedPosition = isObject(configOrState.position)
      ? {
          x: Math.round(toFiniteNumber(configOrState.position.x, 0)),
          y: Math.round(toFiniteNumber(configOrState.position.y, 0)),
        }
      : { x: 0, y: 0 };

    return {
      config,
      context: configOrState.context || null,
      isOpen: true,
      items: Array.isArray(configOrState.items) ? configOrState.items : [],
      position: resolvedPosition,
    };
  }

  if (!isObject(configOrState)) return createInitialMenuState();

  return {
    config: configOrState,
    context: null,
    isOpen: true,
    items: [],
    position: {
      x: Math.round(toFiniteNumber(x, 0)),
      y: Math.round(toFiniteNumber(y, 0)),
    },
  };
}

export function ContextMenuProvider({ children }) {
  const [menuState, setMenuState] = useState(createInitialMenuState);

  const openMenu = useCallback((configOrState, x, y) => {
    setMenuState(resolveNextOpenState(configOrState, x, y));
  }, []);

  const closeMenu = useCallback(() => {
    setMenuState((currentState) => {
      if (!currentState.isOpen) return currentState;

      if (typeof currentState.config?.onClose === "function") {
        try {
          const result = currentState.config.onClose(currentState.context);
          observeAsyncFailure(result, "onClose");
        } catch (error) {
          console.error(
            "[ContextMenu] Error executing onClose callback:",
            error,
          );
        }
      }

      return createInitialMenuState();
    });
  }, []);

  const value = useMemo(
    () => ({
      menuConfig: menuState.config,
      menuContext: menuState.context,
      menuItems: menuState.items,
      position: menuState.position,
      isOpen: menuState.isOpen,
      openMenu,
      closeMenu,
    }),
    [menuState, openMenu, closeMenu],
  );

  useEffect(() => {
    emitContextMenuVisibility(menuState.isOpen);
  }, [menuState.isOpen]);

  return (
    <ContextMenuContext.Provider value={value}>
      {children}
    </ContextMenuContext.Provider>
  );
}

export function useContextMenu() {
  const context = useContext(ContextMenuContext);
  if (!context)
    throw new Error("useContextMenu must be used within ContextMenuProvider");
  return context;
}

// ── Native context-menu event lifecycle ────────────────────────────────────────

function resolveContextMenuPageMeta(navItem, pathname = "") {
  if (!isObject(navItem)) return null;

  const title = navItem.contextMenuTitle ?? navItem.title ?? null;
  const description =
    navItem.contextMenuDescription ?? navItem.description ?? null;
  const eyebrow = navItem.contextMenuEyebrow ?? navItem.eyebrow ?? null;
  const icon = navItem.contextMenuIcon ?? navItem.icon ?? null;
  const path =
    typeof navItem.path === "string" && navItem.path ? navItem.path : pathname;
  const titleText =
    extractNodeText(title) ||
    (typeof navItem.name === "string" ? navItem.name : "") ||
    "";
  const descriptionText = extractNodeText(description);

  if (!title && !description && !icon && !eyebrow) return null;

  return {
    description,
    descriptionText,
    eyebrow,
    icon,
    path,
    title,
    titleText,
  };
}

function invokeSafely(handler, ...args) {
  if (typeof handler !== "function") return undefined;

  try {
    const result = handler(...args);
    observeAsyncFailure(result, "onOpen");
    return result;
  } catch {
    return undefined;
  }
}

function mergeContextMenuPageMeta(context, pageMeta) {
  if (!pageMeta) return context;
  return { ...(isObject(context) ? context : {}), page: pageMeta };
}

function mergeOpenResult(context, openResult) {
  if (!isObject(openResult)) return context;
  return { ...context, ...openResult };
}

export function useContextMenuListener() {
  const { getAll } = useContextMenuRegistry();
  const { get: getNavItem } = useNavRegistry();
  const { openMenu } = useContextMenu();
  const pathname = usePathname();

  useEffect(() => {
    const handleContextMenu = (event) => {
      const resolvedMenu = resolveContextMenu(getAll(), pathname, event);
      if (!resolvedMenu) return;

      event.preventDefault();
      event.stopPropagation();

      const pageMeta = resolveContextMenuPageMeta(
        getNavItem(pathname),
        pathname,
      );
      let nextContext = mergeContextMenuPageMeta(
        resolvedMenu.context,
        pageMeta,
      );
      const onOpenResult = invokeSafely(
        resolvedMenu.config?.onOpen,
        event,
        nextContext,
      );
      if (onOpenResult === false) return;

      nextContext = mergeOpenResult(nextContext, onOpenResult);
      const nextItems = resolveMenuItems(resolvedMenu.config, nextContext);
      if (!nextItems.length) return;

      openMenu({
        config: resolvedMenu.config,
        context: nextContext,
        items: nextItems,
        position: { x: event.clientX, y: event.clientY },
      });
    };

    document.addEventListener("contextmenu", handleContextMenu, true);
    return () =>
      document.removeEventListener("contextmenu", handleContextMenu, true);
  }, [getAll, getNavItem, openMenu, pathname]);
}
