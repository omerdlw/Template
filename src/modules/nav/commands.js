"use client";

import { memo, useCallback, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

import {
  filterContextToolbarActions,
  getVisibleToolbarActions,
  isActionlessNavItem,
  isStatusToolbarActionAllowed,
  normalizeToolbarActions,
  sortToolbarActionsByOrder,
  toArray,
} from "./utils";
import {
  getNavActionStaggerTransition,
  NAV_BADGE_TRANSITION,
  navBadgeVariants,
  navCommandBarSwapVariants,
  staggerItemVariants,
} from "./motion";
import { cn } from "@/shared/utils";
import { Button, Tooltip } from "@/ui/primitives";
import Iconify from "@/ui/primitives/icon";

function createCommandEntries(commands) {
  const entries = {};

  for (const [index, command] of toArray(commands).entries()) {
    if (!command) continue;
    const key = command.key || `context-action-${index}`;
    entries[key] = { key, ...command };
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
        Object.is(currentEntry[entryKey], nextEntry[entryKey]),
      )
    );
  });
}

/**
 * Owns route-scoped navigation command registrations.
 * @returns {{
 *   contextCommands: Array<object>,
 *   registerCommand: Function,
 *   unregisterCommand: Function,
 *   setCommands: Function,
 *   clearCommands: Function,
 * }} Command registry state and mutations
 */
export function useNavCommandRegistry() {
  const [commandEntries, setCommandEntries] = useState({});
  const generatedCommandIdRef = useRef(0);

  const registerCommand = useCallback((command) => {
    if (!command) return;
    const key =
      command.key || `context-action-${++generatedCommandIdRef.current}`;
    setCommandEntries((currentEntries) => {
      if (currentEntries[key] === command) return currentEntries;
      return { ...currentEntries, [key]: { key, ...command } };
    });
  }, []);

  const unregisterCommand = useCallback((key) => {
    if (!key) return;
    setCommandEntries((currentEntries) => {
      if (!currentEntries[key]) return currentEntries;
      const nextEntries = { ...currentEntries };
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

// ── Command resolution and rendering ──────────────────────────────────────────

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
      filterContextToolbarActions(
        getVisibleToolbarActions([
          ...extendedCommands,
          ...dynamicContextCommands,
        ]),
        activeItem,
      ),
    );
  }, [activeItem, contextCommands]);
}

const NavCommand = memo(function NavCommand({ action }) {
  return (
    <Tooltip className="px-2" text={action.tooltip}>
      <Button
        className="center relative size-8 cursor-pointer rounded-xl p-1 text-white/70 hover:bg-white/10 hover:text-white"
        onClick={action.onClick}
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
      </Button>
    </Tooltip>
  );
});

/** Renders the current card's resolved navigation commands. */
export const NavCommandBar = memo(function NavCommandBar({
  activeItem,
  contextCommands = [],
}) {
  const actions = useNavCommands({ activeItem, contextCommands });
  const itemScope =
    activeItem?.path || activeItem?.name || activeItem?.id || "root";
  const actionsSignature = useMemo(
    () => actions.map((a) => a.key || a.icon || "").join(":"),
    [actions],
  );

  if (!actions.length) return null;

  return (
    <div className="mr-1 flex shrink-0 items-center">
      <AnimatePresence mode="popLayout" initial={false}>
        {actions.map((action, index) => (
          <motion.div
            layout="position"
            key={`${itemScope}-${actionsSignature}-${action.key || action.icon || `nav-action-${index}`}`}
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
