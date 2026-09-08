"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { Z_INDEX } from "@/shared";
import Icon from "@/ui/primitives/icon";
import {
  CONTEXT_MENU_ITEM_TAP,
  CONTEXT_MENU_MICRO_SPRING,
  menuContentVariants,
  menuItemVariants,
  menuPopVariants,
} from "./motion";
import {
  isImageIconSource,
  isObject,
  isScrollLockKey,
  joinClassNames,
} from "./utils";
import {
  getContextMenuMetrics,
  positionMenu,
  resolveMenuHeader,
  resolveMenuItems,
} from "./resolver";
import {
  ContextMenuProvider,
  useContextMenu,
  useContextMenuListener,
} from "./provider";
export {
  CONTEXT_MENU_CONTENT_VARIANTS,
  CONTEXT_MENU_ITEM_TAP,
  CONTEXT_MENU_ITEM_VARIANTS,
  CONTEXT_MENU_MICRO_SPRING,
  CONTEXT_MENU_POP_VARIANTS,
  menuContentVariants,
  menuItemVariants,
  menuPopVariants,
} from "./motion";
export { CONTEXT_MENU_LAYOUT } from "./constants";
export { extractNodeText, isObject } from "./utils";
export { resolveContextMenu, resolveMenuItems } from "./resolver";
export {
  ContextMenuProvider,
  useContextMenu,
  useContextMenuListener,
} from "./provider";
function ContextMenuHeaderIcon({ classNames, icon }) {
  const iconClassName = joinClassNames(
    "flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-[14px] ring-1 ring-inset ring-white/10 bg-white/5 bg-cover bg-center bg-no-repeat text-white/70",
    classNames.headerIcon,
  );
  if (isImageIconSource(icon)) {
    return (
      <div
        className={iconClassName}
        style={{
          backgroundImage: `url(${icon})`,
        }}
      />
    );
  }
  return (
    <div className={iconClassName}>
      {typeof icon === "string" ? <Icon icon={icon} size={20} /> : icon}
    </div>
  );
}
function ContextMenuHeader({ classNames, header }) {
  if (!header) return null;
  const containerClassName = joinClassNames(
    "mb-2 flex items-center gap-2.5 border-b border-white/10 px-1 pb-2.5",
    classNames.header,
  );
  const eyebrowClassName = joinClassNames(
    "text-xs font-semibold text-white/50 uppercase",
    classNames.headerEyebrow,
  );
  const titleClassName = joinClassNames(
    "truncate text-sm leading-tight font-semibold text-white",
    classNames.headerTitle,
  );
  const descriptionClassName = joinClassNames(
    "text-xs leading-snug text-white/70",
    classNames.headerDescription,
  );
  return (
    <div className={containerClassName}>
      {header.icon ? (
        <ContextMenuHeaderIcon classNames={classNames} icon={header.icon} />
      ) : null}
      <div className="h-full w-full min-w-0 space-y-0.5">
        {header.eyebrow ? (
          <div className={eyebrowClassName}>{header.eyebrow}</div>
        ) : null}
        {header.title ? (
          <div className={titleClassName}>{header.title}</div>
        ) : null}
        {header.description ? (
          <div className={descriptionClassName}>{header.description}</div>
        ) : null}
      </div>
    </div>
  );
}
function reportAsyncHandlerFailure(result) {
  if (!result || typeof result.then !== "function") return;
  result.catch((error) => {
    console.error("[ContextMenu] Error executing menu item handler:", error);
  });
}
function ContextMenuItem({
  classNames,
  isActive,
  item,
  onHover,
  onSelect,
  setButtonRef,
}) {
  if (item.type === "separator") {
    return (
      <div
        className={joinClassNames(
          "mx-1 my-1.5 h-px bg-white/10",
          classNames.separator,
        )}
        role="separator"
      />
    );
  }
  const itemClassName = joinClassNames(
    "group flex h-10 w-full items-center gap-2.5 rounded-xl px-3 text-left text-sm font-medium text-white/70 transition-all duration-200 ease-in-out hover:bg-white/10 hover:text-white focus-visible:outline-none data-[active=true]:bg-white/10 data-[active=true]:text-white disabled:pointer-events-none disabled:opacity-50",
    classNames.item,
    item.className,
    item.danger &&
      "text-error hover:bg-error/15 hover:text-error data-[active=true]:bg-error/15 data-[active=true]:text-error",
    item.danger && classNames.itemDanger,
  );
  const itemIconClassName = joinClassNames(
    "shrink-0 text-white/50 transition-colors duration-200 ease-in-out group-hover:text-white/70",
    item.danger && "text-error/80 group-hover:text-error",
    classNames.itemIcon,
    item.itemIconClassName,
  );
  return (
    <motion.button
      ref={setButtonRef}
      className={itemClassName}
      data-active={isActive ? "true" : undefined}
      aria-disabled={item.disabled}
      disabled={item.disabled}
      role="menuitem"
      type="button"
      whileTap={CONTEXT_MENU_ITEM_TAP}
      transition={CONTEXT_MENU_MICRO_SPRING}
      onMouseEnter={onHover}
      onClick={(event) => onSelect(item, event)}
    >
      {item.icon ? (
        <Icon icon={item.icon} className={itemIconClassName} size={18} />
      ) : null}
      <span className={joinClassNames("grow truncate", classNames.itemLabel)}>
        {item.label}
      </span>
      {item.shortcut ? (
        <span
          className={joinClassNames(
            "ml-2 shrink-0 rounded-md bg-white/5 px-1.5 py-0.5 text-xs text-white/50 uppercase ring-1 ring-white/10 ring-inset",
            classNames.itemShortcut,
          )}
        >
          {item.shortcut}
        </span>
      ) : null}
    </motion.button>
  );
}
function ContextMenuContent({ config, items, menuContext, position, onClose }) {
  const menuRef = useRef(null);
  const itemRefs = useRef([]);
  const classNames = isObject(config.classNames) ? config.classNames : {};
  const metrics = useMemo(() => getContextMenuMetrics(), []);
  const header = useMemo(
    () => resolveMenuHeader(config, menuContext),
    [config, menuContext],
  );
  const [activeIndex, setActiveIndex] = useState(-1);
  useEffect(() => {
    setActiveIndex(-1);
    itemRefs.current = [];
  }, [items]);
  useLayoutEffect(() => {
    if (menuRef.current) positionMenu(menuRef.current, position);
  }, [header, items, position]);
  useEffect(() => {
    if (activeIndex < 0) {
      menuRef.current?.focus({
        preventScroll: true,
      });
      return;
    }
    itemRefs.current[activeIndex]?.focus({
      preventScroll: true,
    });
  }, [activeIndex]);
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) onClose();
    };
    const handleEscape = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handleClickOutside, true);
    document.addEventListener("keydown", handleEscape, true);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside, true);
      document.removeEventListener("keydown", handleEscape, true);
    };
  }, [onClose]);
  useEffect(() => {
    const preventScroll = (event) => event.preventDefault();
    const preventScrollKeys = (event) => {
      if (!menuRef.current?.contains(event.target) && isScrollLockKey(event)) {
        event.preventDefault();
      }
    };
    const listenerOptions = {
      capture: true,
      passive: false,
    };
    window.addEventListener("wheel", preventScroll, listenerOptions);
    window.addEventListener("touchmove", preventScroll, listenerOptions);
    document.addEventListener("keydown", preventScrollKeys, true);
    return () => {
      window.removeEventListener("wheel", preventScroll, true);
      window.removeEventListener("touchmove", preventScroll, true);
      document.removeEventListener("keydown", preventScrollKeys, true);
    };
  }, []);
  const handleItemSelect = useCallback(
    (item, event) => {
      event?.preventDefault?.();
      event?.stopPropagation?.();
      if (item?.disabled) return;
      const handler = item?.onSelect || item?.onClick;
      if (typeof handler === "function") {
        try {
          reportAsyncHandlerFailure(handler(event, menuContext));
        } catch (error) {
          console.error(
            "[ContextMenu] Error executing menu item handler:",
            error,
          );
        }
      }
      if (item?.closeOnSelect !== false) onClose?.();
    },
    [menuContext, onClose],
  );
  const handleMenuKeyDown = useCallback(
    (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose?.();
        return;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((prev) => {
          const nextIndex = items.findIndex(
            (item, index) =>
              index > prev && item.type === "action" && !item.disabled,
          );
          return nextIndex !== -1
            ? nextIndex
            : items.findIndex(
                (item) => item.type === "action" && !item.disabled,
              );
        });
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((prev) => {
          let lastValidIndex = -1;
          for (let i = items.length - 1; i >= 0; i--) {
            const item = items[i];
            if (item.type === "action" && !item.disabled) {
              if (prev === -1 || i < prev) return i;
              if (lastValidIndex === -1) lastValidIndex = i;
            }
          }
          return lastValidIndex;
        });
        return;
      }
      if (event.key === "Enter" || event.key === " ") {
        if (activeIndex >= 0 && items[activeIndex]) {
          event.preventDefault();
          handleItemSelect(items[activeIndex], event);
        }
      }
    },
    [activeIndex, items, handleItemSelect, onClose],
  );
  return (
    <div>
      <div
        data-context-menu-overlay
        className={joinClassNames("fixed inset-0", classNames.overlay)}
        onMouseDown={onClose}
        style={{
          zIndex: Z_INDEX.DEBUG_OVERLAY - 1,
        }}
      />
      <motion.div
        ref={menuRef}
        data-context-menu-ignore
        variants={menuPopVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className={joinClassNames(
          "max-w-sm min-w-64 overflow-hidden rounded-[24px] bg-black/80 shadow-[0_18px_56px_rgba(0,0,0,0.50)] ring-1 ring-white/10 backdrop-blur-xl ring-inset",
          classNames.content,
        )}
        role="menu"
        tabIndex={-1}
        style={{
          left: position?.x || 0,
          padding: `${metrics.wrapperPadding}px`,
          position: "fixed",
          top: position?.y || 0,
          zIndex: Z_INDEX.DEBUG_OVERLAY,
        }}
        onMouseLeave={() => setActiveIndex(-1)}
        onKeyDown={handleMenuKeyDown}
      >
        <motion.div
          variants={menuContentVariants}
          initial="hidden"
          animate="visible"
        >
          <ContextMenuHeader classNames={classNames} header={header} />
        </motion.div>
        {items.map((item, index) => (
          <motion.div
            key={item.key || `menu-item-${index}`}
            variants={menuItemVariants}
            custom={index}
            initial="hidden"
            animate="visible"
          >
            <ContextMenuItem
              item={item}
              classNames={classNames}
              isActive={index === activeIndex}
              onHover={() => {
                if (item.type === "action" && !item.disabled)
                  setActiveIndex(index);
              }}
              setButtonRef={(node) => {
                itemRefs.current[index] = node;
              }}
              onSelect={handleItemSelect}
            />
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
export function ContextMenuRenderer() {
  const { menuConfig, menuContext, menuItems, position, isOpen, closeMenu } =
    useContextMenu();
  if (typeof document === "undefined") return null;
  const resolvedItems =
    Array.isArray(menuItems) && menuItems.length > 0
      ? menuItems
      : resolveMenuItems(menuConfig, menuContext);
  return createPortal(
    <AnimatePresence>
      {isOpen && menuConfig && resolvedItems.length > 0 ? (
        <ContextMenuContent
          key="context-menu-content"
          config={menuConfig}
          items={resolvedItems}
          menuContext={menuContext}
          position={position}
          onClose={closeMenu}
        />
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
export function ContextMenuGlobal() {
  useContextMenuListener();
  return <ContextMenuRenderer />;
}
