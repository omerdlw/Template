"use client";

import { memo, useCallback, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { NAV_SURFACE_PHASE } from "./constants";
import { toArray } from "./utils";
import {
  getNavActionMotionProps,
  NAV_BADGE_TRANSITION,
  navBadgeVariants,
  navCommandBarSwapVariants,
} from "./motion";
import { cn } from "@/shared/utils";
import { Tooltip } from "@/ui/primitives";
import Iconify from "@/ui/primitives/icon";
function createCommandEntries(commands) {
  const entries = {};
  for (const [index, command] of toArray(commands).entries()) {
    if (!command) continue;
    const key = command.key || `context-action-${index}`;
    entries[key] = {
      key,
      ...command,
    };
  }
  return entries;
}
function areCommandEntriesEqual(currentEntries, nextEntries) {
  const currentKeys = Object.keys(currentEntries);
  const nextKeys = Object.keys(nextEntries);
  if (currentKeys.length !== nextKeys.length) return false;
  return nextKeys.every((key) => {
    const currentEntry = currentEntries[key];
    const nextEntry = nextEntries[key];
    if (!currentEntry || !nextEntry) return false;
    const currentEntryKeys = Object.keys(currentEntry);
    const nextEntryKeys = Object.keys(nextEntry);
    return (
      currentEntryKeys.length === nextEntryKeys.length &&
      nextEntryKeys.every((entryKey) =>
        entryKey === "onClick"
          ? typeof currentEntry[entryKey] === typeof nextEntry[entryKey]
          : Object.is(currentEntry[entryKey], nextEntry[entryKey]),
      )
    );
  });
}
export function useNavCommandRegistry() {
  const [commandEntries, setCommandEntries] = useState({});
  const generatedCommandIdRef = useRef(0);
  const registerCommand = useCallback((command) => {
    if (!command) return;
    const key =
      command.key || `context-action-${++generatedCommandIdRef.current}`;
    setCommandEntries((currentEntries) => {
      const existing = currentEntries[key];
      if (existing) {
        const commandKeys = Object.keys(command);
        const existingKeys = Object.keys(existing);
        const isSame =
          commandKeys.length === existingKeys.length &&
          commandKeys.every((k) =>
            k === "onClick"
              ? typeof command[k] === typeof existing[k]
              : Object.is(existing[k], command[k]),
          );
        if (isSame) {
          if (command.onClick) existing.onClick = command.onClick;
          return currentEntries;
        }
      }
      return {
        ...currentEntries,
        [key]: {
          key,
          ...command,
        },
      };
    });
  }, []);
  const unregisterCommand = useCallback((key) => {
    if (!key) return;
    setCommandEntries((currentEntries) => {
      if (!currentEntries[key]) return currentEntries;
      const nextEntries = {
        ...currentEntries,
      };
      delete nextEntries[key];
      return nextEntries;
    });
  }, []);
  const setCommands = useCallback((commands) => {
    if (!commands) {
      setCommandEntries({});
      return;
    }
    const nextEntries = createCommandEntries(commands);
    setCommandEntries((currentEntries) =>
      areCommandEntriesEqual(currentEntries, nextEntries)
        ? currentEntries
        : nextEntries,
    );
  }, []);
  const clearCommands = useCallback(() => {
    setCommandEntries((currentEntries) =>
      Object.keys(currentEntries).length === 0 ? currentEntries : {},
    );
  }, []);
  const contextCommands = useMemo(
    () => Object.values(commandEntries),
    [commandEntries],
  );
  return {
    clearCommands,
    contextCommands,
    registerCommand,
    setCommands,
    unregisterCommand,
  };
}
function useNavCommands({ activeItem, contextCommands = [] } = {}) {
  return useMemo(() => {
    if (isActionlessNavItem(activeItem)) {
      return [];
    }
    const extendedCommands = normalizeToolbarActions(activeItem?.actions);
    const dynamicContextCommands = normalizeToolbarActions(contextCommands);
    if (activeItem?.isStatus) {
      if (!isStatusToolbarActionAllowed(activeItem)) {
        return [];
      }
      return sortToolbarActionsByOrder(
        getVisibleToolbarActions([
          ...extendedCommands,
          ...dynamicContextCommands,
        ]),
      );
    }
    return sortToolbarActionsByOrder(
      getVisibleToolbarActions([
        ...extendedCommands,
        ...dynamicContextCommands,
      ]),
    );
  }, [activeItem, contextCommands]);
}
const NavCommand = memo(function NavCommand({ action }) {
  return (
    <Tooltip
      className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-black shadow-lg shadow-black/60"
      text={action.tooltip}
    >
      <motion.button
        {...getNavActionMotionProps({ disabled: action.disabled })}
        className="center relative size-8 cursor-pointer rounded-xl p-1 text-white/70 hover:bg-white/10 hover:text-white select-none focus:outline-none"
        onClick={(event) => {
          event.stopPropagation();
          action.onClick?.(event);
        }}
        type="button"
        disabled={action.disabled}
        aria-label={action.tooltip}
      >
        <Iconify icon={action.icon} size={16} />
        <AnimatePresence mode="popLayout">
          {action.badge && (
            <motion.span
              layout
              key={action.badge}
              variants={navBadgeVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={NAV_BADGE_TRANSITION}
              className="center bg-info absolute -top-1 -right-1 h-4 min-w-4 rounded-full p-1 text-xs leading-none font-semibold text-black"
            >
              {action.badge}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    </Tooltip>
  );
});
export const NavCommandBar = memo(function NavCommandBar({
  activeItem,
  contextCommands = [],
}) {
  const actions = useNavCommands({
    activeItem,
    contextCommands,
  });
  const pathname = usePathname();
  const currentPath =
    pathname || activeItem?.path || activeItem?.name || activeItem?.id || "root";

  const [isExiting, setIsExiting] = useState(false);
  const [prevActionsCount, setPrevActionsCount] = useState(actions.length);

  if (actions.length !== prevActionsCount) {
    setPrevActionsCount(actions.length);
    if (actions.length === 0 && prevActionsCount > 0) {
      setIsExiting(true);
    }
  }

  const handleExitComplete = useCallback(() => {
    if (actions.length === 0) {
      setIsExiting(false);
    }
  }, [actions.length]);

  if (!actions.length && !isExiting) return null;
  return (
    <div className="mr-1 flex shrink-0 items-center">
      <AnimatePresence mode="popLayout" onExitComplete={handleExitComplete}>
        {actions.map((action, index) => (
          <motion.div
            key={`${currentPath}-${action.key || action.icon || `nav-action-${index}`}`}
            variants={navCommandBarSwapVariants}
            custom={index}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <NavCommand action={action} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
});
export function normalizeToolbarActions(actions) {
  return toArray(actions).flatMap((action, index) =>
    action
      ? [
          {
            key: action.key ?? `action-${index}`,
            ...action,
          },
        ]
      : [],
  );
}
export function getVisibleToolbarActions(actions) {
  return actions.filter((action) => action.visible !== false);
}
export function sortToolbarActionsByOrder(actions) {
  return [...actions].sort(
    (left, right) => (right.order ?? 0) - (left.order ?? 0),
  );
}
export function isActionlessNavItem(activeItem) {
  const isSurfaceActive = Boolean(
    activeItem?.isSurface &&
    activeItem?.surfacePhase !== NAV_SURFACE_PHASE.RESTORING_HEADER,
  );
  return Boolean(
    activeItem?.isNotFound ||
    activeItem?.path === "not-found" ||
    activeItem?.isMasked ||
    isSurfaceActive,
  );
}
export function isStatusToolbarActionAllowed(activeItem) {
  return (
    activeItem?.type === "APP_ERROR" ||
    activeItem?.type === "API_ERROR" ||
    activeItem?.type === "GUARD"
  );
}
