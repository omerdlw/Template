import { isValidElement, memo, useCallback, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";

import {
  NAV_HUD_PRIORITY,
  NAV_HUD_RENDER_MODE,
  NAV_HUD_VARIANT,
  NAVIGATION_OPERATION_STATUS,
} from "./constants";
import {
  areShallowCollectionsEqual,
  isValidComponentType,
  resolveComponentType,
  resolveRenderableContent,
  toArray,
} from "./utils";
import {
  NAV_COMPOSITOR_STYLE,
  NAV_HUD_TRANSITION,
  NAV_SKELETON_PULSE_CLASS,
  navHudVariants,
} from "./motion";
import { cn } from "@/shared/utils";
import { Button, Tooltip } from "@/ui/primitives";
import Iconify from "@/ui/primitives/icon";

// ── HUD descriptor normalization ─────────────────────────────────────────────

function normalizePriority(value) {
  const priority = Number(value);
  return Number.isFinite(priority) ? priority : NAV_HUD_PRIORITY.DEFAULT;
}

function normalizeProgress(value) {
  if (value == null || value === "") return null;
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  return Math.max(0, Math.min(100, num));
}

function normalizeAutoDismiss(value) {
  if (value == null) return null;
  const ms = Number(value);
  return Number.isFinite(ms) && ms > 0 ? ms : null;
}

/**
 * Determines whether a value uses the structured HUD descriptor contract.
 * @param {*} value - Candidate HUD descriptor
 * @returns {boolean} Whether the value is a HUD descriptor
 */
export function isHudDescriptor(value) {
  return (
    value != null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    !isValidElement(value) &&
    ("component" in value ||
      "content" in value ||
      "node" in value ||
      "element" in value ||
      "isActive" in value ||
      "title" in value ||
      "actions" in value ||
      "id" in value)
  );
}

// ── HUD registry and selection ───────────────────────────────────────────────

/**
 * Normalizes component, node, or structured input into a HUD definition.
 * @param {*} input - Component, node, or descriptor
 * @param {object} [config] - Fallback HUD configuration
 * @returns {HudDefinition|null} Normalized HUD definition
 */
export function createHudDefinition(input, config = {}) {
  if (!input) return null;

  const descriptor = isHudDescriptor(input) ? input : null;

  const component = resolveComponentType(descriptor?.component, input);
  const content = resolveRenderableContent(
    descriptor?.content,
    descriptor?.node,
    descriptor?.element,
  );

  if (
    !component &&
    content == null &&
    !isValidElement(input) &&
    !descriptor?.title &&
    !descriptor?.actions
  ) {
    return null;
  }

  const id =
    descriptor?.id ??
    config?.id ??
    (component
      ? component.displayName || component.name || "component-hud"
      : "hud");
  const isActive = descriptor?.isActive ?? config?.isActive ?? true;
  const onCancel =
    typeof descriptor?.onCancel === "function"
      ? descriptor.onCancel
      : typeof config?.onCancel === "function"
        ? config.onCancel
        : null;
  const props =
    component && descriptor?.props && typeof descriptor.props === "object"
      ? descriptor.props
      : {};

  const variant =
    descriptor?.variant ??
    config?.variant ??
    (descriptor?.progress != null
      ? NAV_HUD_VARIANT.PROGRESS
      : NAV_HUD_VARIANT.COMPACT);

  return {
    id,
    renderMode: component
      ? NAV_HUD_RENDER_MODE.COMPONENT
      : NAV_HUD_RENDER_MODE.NODE,
    variant,
    component,
    content: component
      ? null
      : (content ??
        (isValidElement(input) ||
        typeof input === "string" ||
        typeof input === "number"
          ? input
          : null)),
    props,
    isActive: Boolean(isActive),
    icon: descriptor?.icon ?? config?.icon ?? null,
    title: descriptor?.title ?? config?.title ?? null,
    description: descriptor?.description ?? config?.description ?? null,
    badge: descriptor?.badge ?? config?.badge ?? null,
    actions: Array.isArray(descriptor?.actions)
      ? descriptor.actions
      : Array.isArray(config?.actions)
        ? config.actions
        : [],
    progress: normalizeProgress(descriptor?.progress ?? config?.progress),
    isIndeterminate: Boolean(
      descriptor?.isIndeterminate ?? config?.isIndeterminate,
    ),
    dismissOnNavigate:
      descriptor?.dismissOnNavigate ?? config?.dismissOnNavigate ?? true,
    dismissOnEscape:
      descriptor?.dismissOnEscape ?? config?.dismissOnEscape ?? true,
    autoDismissMs: normalizeAutoDismiss(
      descriptor?.autoDismissMs ?? config?.autoDismissMs,
    ),
    onCancel,
    priority: normalizePriority(descriptor?.priority ?? config?.priority),
  };
}

/**
 * Selects the highest-priority active HUD.
 * @param {Array<object>} hudEntries - Registered HUD definitions
 * @returns {object|null} Highest-priority active HUD
 */
export function resolveActiveHud(hudEntries) {
  return toArray(hudEntries).reduce((activeHud, hud) => {
    if (!hud?.isActive) return activeHud;
    if (
      !activeHud ||
      normalizePriority(hud.priority) > normalizePriority(activeHud.priority)
    ) {
      return hud;
    }
    return activeHud;
  }, null);
}

function areActionsEqual(a, b) {
  if (Object.is(a, b)) return true;
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const itemA = a[i];
    const itemB = b[i];
    if (Object.is(itemA, itemB)) continue;
    if (
      !itemA ||
      !itemB ||
      typeof itemA !== "object" ||
      typeof itemB !== "object"
    )
      return false;
    if (
      itemA.key !== itemB.key ||
      itemA.label !== itemB.label ||
      itemA.icon !== itemB.icon ||
      Boolean(itemA.disabled) !== Boolean(itemB.disabled) ||
      Boolean(itemA.isDestructive) !== Boolean(itemB.isDestructive)
    ) {
      return false;
    }
  }
  return true;
}

function arePropsEqual(a, b) {
  if (Object.is(a, b)) return true;
  if (!a || !b || typeof a !== "object" || typeof b !== "object") return false;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    if (!Object.hasOwn(b, key)) return false;
    const valA = a[key];
    const valB = b[key];
    if (Object.is(valA, valB)) continue;
    if (key === "actions" && areActionsEqual(valA, valB)) continue;
    if (typeof valA === "function" && typeof valB === "function") continue;
    if (
      typeof valA === "object" &&
      typeof valB === "object" &&
      areShallowCollectionsEqual(valA, valB)
    )
      continue;
    return false;
  }
  return true;
}

/** Compares HUD definitions without treating recreated collections as state changes. */
export function areHudDefinitionsEqual(currentDefinition, nextDefinition) {
  if (Object.is(currentDefinition, nextDefinition)) return true;
  if (!currentDefinition || !nextDefinition) return false;

  const nextKeys = Object.keys(nextDefinition);
  for (const key of nextKeys) {
    const currentVal = currentDefinition[key];
    const nextVal = nextDefinition[key];
    if (Object.is(currentVal, nextVal)) continue;
    if (key === "props" && arePropsEqual(currentVal, nextVal)) continue;
    if (key === "actions" && areActionsEqual(currentVal, nextVal)) continue;
    if (typeof currentVal === "function" && typeof nextVal === "function")
      continue;
    return false;
  }
  return true;
}
/** Adds a normalized HUD definition unless it is structurally unchanged. */
export function upsertHudEntry(hudEntries, definition) {
  if (!definition) return hudEntries;
  const previousDefinition = hudEntries[definition.id];
  if (areHudDefinitionsEqual(previousDefinition, definition)) return hudEntries;
  return { ...hudEntries, [definition.id]: definition };
}

/** Removes one HUD entry, or clears all HUD entries when no id is supplied. */
export function removeHudEntries(hudEntries, targetId = null) {
  if (!targetId) return Object.keys(hudEntries).length === 0 ? hudEntries : {};
  if (!hudEntries[targetId]) return hudEntries;
  const nextEntries = { ...hudEntries };
  delete nextEntries[targetId];
  return nextEntries;
}

/** Creates a stable selection-mode definition from public configuration. */
export function createSelectionModeState(config) {
  if (!config) return null;
  return {
    isActive: config.isActive !== false,
    count: Number(config.count) || 0,
    title: config.title || null,
    actions: Array.isArray(config.actions) ? config.actions : [],
    onCancel: typeof config.onCancel === "function" ? config.onCancel : null,
    priority: NAV_HUD_PRIORITY.SELECTION,
  };
}

/** Determines whether two selection-mode definitions represent the same state. */
export function areSelectionModeStatesEqual(currentState, nextState) {
  if (currentState === nextState) return true;
  if (!currentState || !nextState) return false;
  return (
    currentState.isActive === nextState.isActive &&
    currentState.count === nextState.count &&
    currentState.title === nextState.title &&
    currentState.onCancel === nextState.onCancel &&
    currentState.actions.length === nextState.actions.length &&
    currentState.actions.every((action, index) => {
      const nextAction = nextState.actions[index];
      return (
        action.key === nextAction?.key &&
        action.label === nextAction?.label &&
        action.icon === nextAction?.icon &&
        action.disabled === nextAction?.disabled &&
        action.isDestructive === nextAction?.isDestructive &&
        action.onClick === nextAction?.onClick
      );
    })
  );
}

/** Returns the active HUD after including the provider-owned selection state. */
export function getActiveNavigationHud(hudEntries, selectionModeState) {
  return resolveActiveHud([...Object.values(hudEntries), selectionModeState]);
}

/**
 * Projects the active operation-center entry onto the normal HUD contract.
 * @param {object|null} operation - Pending navigation operation
 * @param {object} [options] - Cancellation and aggregation configuration
 * @returns {object|null} Renderable HUD definition, or null when inactive
 */
export function createNavigationOperationHud(
  operation,
  { onCancel = null, pendingCount = 1 } = {},
) {
  if (
    !operation?.id ||
    operation.status !== NAVIGATION_OPERATION_STATUS.PENDING
  )
    return null;

  const progress = operation.progress == null ? null : operation.progress * 100;
  const canCancel =
    operation.cancellable !== false && typeof onCancel === "function";
  return createHudDefinition({
    description: operation.description || null,
    dismissOnEscape: false,
    dismissOnNavigate: false,
    icon: operation.icon || null,
    id: `navigation-operation:${operation.id}`,
    isActive: true,
    isIndeterminate: progress == null,
    onCancel: canCancel ? () => onCancel(operation.id) : null,
    priority: NAV_HUD_PRIORITY.TASK_PROGRESS,
    progress,
    title: operation.label,
    variant: NAV_HUD_VARIANT.PROGRESS,
    ...(pendingCount > 1 ? { badge: pendingCount } : {}),
  });
}

function HudActionButton({ action, expanded = false }) {
  const isDestructive = Boolean(action.isDestructive);
  const button = (
    <motion.div layout="position">
      <Button
        type="button"
        disabled={action.disabled}
        onClick={(event) => {
          event.stopPropagation();
          action.onClick?.(event);
        }}
        className={cn(
          "flex h-8 items-center gap-1.5 rounded-xl text-xs font-medium ring-1 ring-inset",
          expanded ? "px-3" : "px-2.5",
          isDestructive
            ? "bg-red-500/20 text-red-300 ring-red-500/20 hover:bg-red-500/30"
            : expanded
              ? "bg-white/10 text-white ring-white/10 hover:bg-white/15"
              : "bg-white/5 text-white/70 ring-white/5 hover:bg-white/10 hover:text-white",
          action.disabled && "pointer-events-none opacity-40",
        )}
        aria-label={action.label}
      >
        {action.icon && <Iconify icon={action.icon} size={15} />}
        {action.label && <span>{action.label}</span>}
      </Button>
    </motion.div>
  );

  if (expanded) return button;

  return <Tooltip text={action.tooltip || action.label}>{button}</Tooltip>;
}

/**
 * Renders custom or structured HUD content.
 * @param {object} props - Component properties
 * @returns {React.ReactElement|null} Rendered navigation UI
 */
export const NavHudShell = memo(function NavHudShell({
  children,
  className = "",
  icon = null,
  title = null,
  description = null,
  badge = null,
  progress = null,
  isIndeterminate = false,
  actions = [],
  trailing = null,
  variant = NAV_HUD_VARIANT.COMPACT,
  onCancel = null,
  onClick,
}) {
  const hasStructuredContent = Boolean(
    title ||
    icon ||
    badge ||
    actions.length > 0 ||
    progress != null ||
    isIndeterminate,
  );

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="nav-hud-shell"
        variants={navHudVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        transition={NAV_HUD_TRANSITION}
        className={cn(
          "flex w-full flex-col justify-center gap-2 select-none",
          className,
        )}
        style={NAV_COMPOSITOR_STYLE}
        onClick={(event) => {
          event.stopPropagation();
          onClick?.(event);
        }}
      >
        {children ? (
          children
        ) : hasStructuredContent ? (
          <div className="flex w-full flex-col gap-2">
            <div className="flex w-full items-center justify-between gap-2.5">
              <div className="flex min-w-0 flex-1 items-center gap-2.5">
                {badge != null ? (
                  <div className="flex h-8 items-center gap-1.5 rounded-xl bg-white/10 px-2.5 text-xs font-semibold text-white ring-1 ring-white/10 ring-inset">
                    {badge}
                  </div>
                ) : icon ? (
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-white/5 text-white ring-1 ring-white/10 ring-inset">
                    {typeof icon === "string" ? (
                      <Iconify icon={icon} size={18} />
                    ) : (
                      icon
                    )}
                  </div>
                ) : null}

                <div className="flex min-w-0 flex-1 flex-col justify-center">
                  {title && (
                    <div className="truncate text-sm leading-tight font-semibold text-white">
                      {title}
                    </div>
                  )}
                  {description && (
                    <div className="truncate text-xs leading-tight text-white/50">
                      {description}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1.5">
                {trailing}

                {variant === NAV_HUD_VARIANT.COMPACT &&
                  actions.map((action, index) => {
                    const actionKey = action.key || `hud-action-${index}`;

                    return <HudActionButton key={actionKey} action={action} />;
                  })}

                {typeof onCancel === "function" && (
                  <Button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCancel(e);
                    }}
                    className="flex size-8 items-center justify-center rounded-xl bg-white/5 text-white/50 ring-1 ring-white/5 ring-inset hover:bg-white/10 hover:text-white hover:ring-white/10"
                    aria-label="Dismiss HUD"
                  >
                    <Iconify icon="solar:close-circle-bold" size={16} />
                  </Button>
                )}
              </div>
            </div>

            {(progress != null || isIndeterminate) && (
              <div className="relative h-1 w-full overflow-hidden rounded-full bg-white/10">
                {isIndeterminate ? (
                  <div
                    className={cn(
                      "h-full w-1/3 rounded-full bg-white/70",
                      NAV_SKELETON_PULSE_CLASS,
                    )}
                  />
                ) : (
                  <div
                    className="h-full w-full origin-left rounded-full bg-white/70"
                    style={{
                      transform: `scaleX(${Math.max(0, Math.min(100, progress)) / 100})`,
                    }}
                  />
                )}
              </div>
            )}

            {variant === NAV_HUD_VARIANT.EXPANDED && actions.length > 0 && (
              <div className="flex w-full items-center justify-end gap-1.5 pt-0.5">
                {actions.map((action, index) => {
                  const actionKey =
                    action.key || `hud-expanded-action-${index}`;

                  return (
                    <HudActionButton key={actionKey} action={action} expanded />
                  );
                })}
              </div>
            )}
          </div>
        ) : null}
      </motion.div>
    </AnimatePresence>
  );
});

/**
 * Renders and manages the currently active HUD lifecycle.
 * @param {object} props - Component properties
 * @returns {React.ReactElement|null} Rendered navigation UI
 */
export const NavHudView = memo(function NavHudView({
  hud,
  clearHud,
  pathname,
}) {
  const previousPathRef = useRef(pathname);

  const handleCancel = useCallback(() => {
    if (typeof hud?.onCancel === "function") {
      hud.onCancel();
    }
    if (hud?.id) {
      clearHud(hud.id);
    }
  }, [hud, clearHud]);

  useEffect(() => {
    if (previousPathRef.current === pathname) return;
    previousPathRef.current = pathname;
    if (hud?.isActive && hud.dismissOnNavigate && hud.id) clearHud(hud.id);
  }, [pathname, hud?.id, hud?.isActive, hud?.dismissOnNavigate, clearHud]);

  useEffect(() => {
    if (!hud?.isActive || !hud?.dismissOnEscape) return;

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        event.stopPropagation();
        handleCancel();
      }
    }

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => {
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
    };
  }, [hud?.isActive, hud?.dismissOnEscape, handleCancel]);

  useEffect(() => {
    if (!hud?.isActive || !hud?.autoDismissMs) return;

    const timer = setTimeout(() => {
      handleCancel();
    }, hud.autoDismissMs);

    return () => {
      clearTimeout(timer);
    };
  }, [hud?.isActive, hud?.autoDismissMs, handleCancel]);

  if (!hud || !hud.isActive) {
    return null;
  }

  if (
    hud.renderMode === NAV_HUD_RENDER_MODE.COMPONENT &&
    isValidComponentType(hud.component)
  ) {
    const Component = hud.component;
    return (
      <NavHudShell onCancel={handleCancel}>
        <Component {...(hud.props || {})} onCancel={handleCancel} />
      </NavHudShell>
    );
  }

  if (hud.content) {
    return <NavHudShell onCancel={handleCancel}>{hud.content}</NavHudShell>;
  }

  return (
    <NavHudShell
      icon={hud.icon}
      title={hud.title}
      description={hud.description}
      badge={hud.badge}
      progress={hud.progress}
      isIndeterminate={hud.isIndeterminate}
      actions={hud.actions}
      variant={hud.variant}
      onCancel={handleCancel}
    />
  );
});
export function useNavHudLifecycle({ clearHud, descriptor, setHud }) {
  const wasActiveRef = useRef(false);
  const registeredIdRef = useRef(null);
  const previousDefinitionRef = useRef(null);

  useEffect(() => {
    const definition = createHudDefinition(descriptor);

    if (!definition || !definition.isActive) {
      if (wasActiveRef.current) {
        wasActiveRef.current = false;
        clearHud(registeredIdRef.current);
        registeredIdRef.current = null;
        previousDefinitionRef.current = null;
      }
      return;
    }

    if (
      previousDefinitionRef.current &&
      areHudDefinitionsEqual(previousDefinitionRef.current, definition)
    ) {
      return;
    }

    wasActiveRef.current = true;
    registeredIdRef.current = definition.id;
    previousDefinitionRef.current = definition;
    setHud(definition);
  }, [descriptor, setHud, clearHud]);

  useEffect(() => {
    return () => {
      if (wasActiveRef.current) {
        clearHud(registeredIdRef.current);
      }
    };
  }, [clearHud]);
}
