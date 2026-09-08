import {
  cloneElement,
  createContext,
  createElement,
  forwardRef,
  isValidElement,
  memo,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useTransform,
} from "motion/react";
import {
  NAVIGATION_EVENTS,
  NAVIGATION_LIFECYCLE,
  NAV_SURFACE_FLOW_STATUS,
  NAV_SURFACE_PHASE,
  NAV_SURFACE_RENDER_MODE,
} from "./constants";
import {
  focusNavigationElement,
  shouldRestoreNavigationFocus,
  useNavigationFocusTrap,
} from "./behavior";
import {
  isImageIconSource,
  isSurfaceDescriptor,
  isValidComponentType,
  resolveComponentType,
  resolveRenderableContent,
} from "./utils";
export { isSurfaceDescriptor };
import { isSafeInternalHref } from "./routing";
import {
  NAV_COMPACT_TO_SURFACE_DELAY_MS,
  NAV_COMPOSITOR_STYLE,
  NAV_HEADER_SWAP_TRANSITION,
  NAV_SURFACE_BODY_ENTER_TRANSITION,
  NAV_SURFACE_BODY_EXIT_TRANSITION,
  NAV_SURFACE_EXTENSIONS_ENTER_TRANSITION,
  NAV_SURFACE_DRAG_CONSTRAINTS,
  NAV_SURFACE_DRAG_ELASTIC,
  NAV_SURFACE_EXIT_SETTLE_MS,
  navHeaderSwapVariants,
  navSurfaceDragTransformTemplate,
  navSurfaceControlsVariants,
  navSurfaceBodyVariants,
  navSurfaceExtensionsVariants,
  slideFadeVariants,
  NAV_SURFACE_CHOREOGRAPHY_TIMINGS,
} from "./motion";
import { createNavigationScheduler } from "./scheduler";
import { cn } from "@/shared/utils";
import { Button } from "@/ui/primitives";
import Iconify from "@/ui/primitives/icon";
let generatedExtensionId = 0;
export function normalizeSurfaceExtension(input) {
  if (!input) return null;
  if (isValidElement(input)) {
    return {
      align: "left",
      className: "",
      component: null,
      content: input,
      id: `ext-${++generatedExtensionId}`,
      order: 0,
      props: {},
      unstyled: false,
    };
  }
  if (typeof input !== "object") return null;
  const component = isValidComponentType(input.component)
    ? input.component
    : null;
  const content =
    isValidElement(input.content) ||
    typeof input.content === "string" ||
    typeof input.content === "number"
      ? input.content
      : null;
  if (!component && content == null) return null;
  const align =
    input.align === "right" || input.align === "end"
      ? "right"
      : input.align === "center"
        ? "center"
        : "left";
  return {
    align,
    className: typeof input.className === "string" ? input.className : "",
    component,
    content,
    id: String(input.id || input.key || `ext-${++generatedExtensionId}`),
    order: Number.isFinite(Number(input.order)) ? Number(input.order) : 0,
    props: input.props && typeof input.props === "object" ? input.props : {},
    unstyled: Boolean(input.unstyled),
  };
}
function normalizeSurfaceFlowSnapshot(value) {
  if (value == null) return null;
  if (typeof value !== "object" || Array.isArray(value)) return null;
  return {
    ...value,
  };
}
export function createSurfaceReturnHandshake(input) {
  const source =
    typeof input === "string"
      ? {
          pathname: input,
        }
      : input;
  const pathname =
    typeof source?.pathname === "string" ? source.pathname.trim() : "";
  if (!isSafeInternalHref(pathname)) return null;
  return {
    focusKey:
      typeof source.focusKey === "string" && source.focusKey.trim()
        ? source.focusKey.trim()
        : null,
    pathname,
    restoreScroll: source.restoreScroll !== false,
    returnOnCancel: source.returnOnCancel === true,
  };
}
function resolveSurfaceFlowReturnHandshake(definition, input) {
  const inputHandshake =
    input?.returnHandshake ??
    (input?.returnTo
      ? {
          focusKey: input.returnFocusKey,
          pathname: input.returnTo,
          restoreScroll: input.restoreReturnScroll,
          returnOnCancel: input.returnOnCancel,
        }
      : null);
  const baseHandshake = definition?.returnHandshake;
  if (!baseHandshake && !inputHandshake) return null;
  return createSurfaceReturnHandshake({
    ...baseHandshake,
    ...inputHandshake,
  });
}
export function createSurfaceFlowDefinition(input) {
  const id = typeof input?.id === "string" ? input.id.trim() : "";
  if (!id || typeof input?.createSurface !== "function") return null;
  return {
    createSurface: input.createSurface,
    id,
    initialSnapshot: normalizeSurfaceFlowSnapshot(input.initialSnapshot),
    returnHandshake: createSurfaceReturnHandshake(
      input.returnHandshake ?? input.returnTo,
    ),
    restoreFromUrl: input.restoreFromUrl !== false,
    singleton: input.singleton !== false,
  };
}
export function createSurfaceFlowSession(
  definition,
  { input = null, snapshot } = {},
) {
  if (!definition?.id) return null;
  const nextSnapshot =
    snapshot === undefined
      ? definition.initialSnapshot
      : normalizeSurfaceFlowSnapshot(snapshot);
  return {
    flowId: definition.id,
    input,
    returnHandshake: resolveSurfaceFlowReturnHandshake(definition, input),
    snapshot: nextSnapshot,
    status: NAV_SURFACE_FLOW_STATUS.OPEN,
  };
}
export function updateSurfaceFlowSession(session, snapshot) {
  if (!session?.flowId) return null;
  return {
    ...session,
    snapshot: normalizeSurfaceFlowSnapshot(snapshot),
  };
}
const SurfaceFlowContext = createContext(null);
export function SurfaceFlowProvider({ children, value }) {
  return (
    <SurfaceFlowContext.Provider value={value}>
      {children}
    </SurfaceFlowContext.Provider>
  );
}
export function useSurfaceFlow(input) {
  const context = useContext(SurfaceFlowContext);
  const definition = useMemo(() => createSurfaceFlowDefinition(input), [input]);
  const restoredFlowIdsRef = useRef(new Set());
  const flowId = definition?.id ?? null;
  const activeFlow = useMemo(() => {
    if (!flowId) return null;
    return (
      context?.surfaceState?.surfaceStack
        ?.map((surface) => surface.flow)
        .find((flow) => flow?.flowId === flowId) ?? null
    );
  }, [context?.surfaceState?.surfaceStack, flowId]);
  useEffect(() => {
    if (
      !definition ||
      !context?.restoreSurfaceFlow ||
      restoredFlowIdsRef.current.has(definition.id)
    ) {
      return;
    }
    restoredFlowIdsRef.current.add(definition.id);
    void context.restoreSurfaceFlow(definition);
  }, [context, definition]);
  const open = useCallback(
    (flowInput = null) => {
      if (!definition || !context?.openSurfaceFlow) {
        return Promise.resolve({
          success: false,
          error: createSurfaceError(
            "NAV_SURFACE_FLOW_UNAVAILABLE",
            "Nav surface flow is unavailable",
          ),
        });
      }
      return context.openSurfaceFlow(definition, flowInput);
    },
    [context, definition],
  );
  return useMemo(
    () => ({
      activeFlow,
      cancel: (result = null) => context?.cancelSurfaceFlow?.(flowId, result),
      complete: (result = null) =>
        context?.completeSurfaceFlow?.(flowId, result),
      flowId,
      isOpen: activeFlow?.status === NAV_SURFACE_FLOW_STATUS.OPEN,
      open,
      snapshot: activeFlow?.snapshot ?? definition?.initialSnapshot ?? null,
      update: (snapshot) => context?.updateSurfaceFlow?.(flowId, snapshot),
    }),
    [activeFlow, context, definition?.initialSnapshot, flowId, open],
  );
}
function normalizeSurfaceDefinition(
  input,
  config = {},
  { allowPrimitiveContent = false, defaultShowAction = false } = {},
) {
  const descriptor =
    isSurfaceDescriptor(input) &&
    (isValidComponentType(input.component) ||
      "content" in input ||
      "node" in input ||
      "element" in input ||
      (Array.isArray(input.steps) && input.steps.length > 0))
      ? input
      : null;
  const configuredSteps = descriptor?.steps ?? config?.steps;
  const steps =
    Array.isArray(configuredSteps) && configuredSteps.length > 0
      ? configuredSteps
      : null;
  const firstStep = steps?.[0] ?? null;
  const component = resolveComponentType(
    descriptor?.component,
    descriptor ? null : input,
    firstStep?.component,
    firstStep,
  );
  const explicitContent = resolveRenderableContent(
    descriptor?.content,
    descriptor?.node,
    descriptor?.element,
    firstStep?.content,
    firstStep?.node,
    firstStep?.element,
  );
  const fallbackContent =
    !descriptor &&
    !component &&
    (isValidElement(input) || (allowPrimitiveContent && input != null))
      ? input
      : null;
  const content = explicitContent ?? fallbackContent;
  if (!component && content == null && !steps) return null;
  const directComponentInput = !descriptor && isValidComponentType(input);
  return {
    renderMode: component
      ? NAV_SURFACE_RENDER_MODE.COMPONENT
      : NAV_SURFACE_RENDER_MODE.NODE,
    component,
    content: component ? null : (content ?? input),
    props: component
      ? descriptor?.props && typeof descriptor.props === "object"
        ? descriptor.props
        : directComponentInput
          ? config
          : {}
      : {},
    action: descriptor?.action ?? config?.action ?? null,
    showAction:
      descriptor?.showAction ?? config?.showAction ?? defaultShowAction,
    dismissible: descriptor?.dismissible ?? config?.dismissible ?? true,
    onClose: descriptor?.onClose ?? config?.onClose ?? null,
    icon:
      descriptor?.icon ??
      descriptor?.header?.icon ??
      config?.icon ??
      config?.header?.icon ??
      null,
    title:
      descriptor?.title ??
      descriptor?.header?.title ??
      config?.title ??
      config?.header?.title ??
      null,
    description:
      descriptor?.description ??
      descriptor?.header?.description ??
      config?.description ??
      config?.header?.description ??
      null,
    descriptionMaxLines:
      descriptor?.descriptionMaxLines ?? config?.descriptionMaxLines ?? 2,
    trailing: descriptor?.trailing ?? config?.trailing ?? null,
    headerAction: descriptor?.headerAction ?? config?.headerAction ?? null,
    closeLabel: descriptor?.closeLabel ?? config?.closeLabel ?? null,
    expandHorizontal:
      descriptor?.expandHorizontal ?? config?.expandHorizontal ?? false,
    width: descriptor?.width ?? config?.width ?? null,
    allowSwipeDismiss:
      descriptor?.allowSwipeDismiss ?? config?.allowSwipeDismiss ?? true,
    steps,
    currentStepIndex:
      descriptor?.currentStepIndex ?? config?.currentStepIndex ?? 0,
    syncWithUrl: descriptor?.syncWithUrl ?? config?.syncWithUrl ?? false,
    urlKey: descriptor?.urlKey ?? config?.urlKey ?? null,
    badge: descriptor?.badge ?? config?.badge ?? null,
    extensions: Array.isArray(descriptor?.extensions ?? config?.extensions)
      ? (descriptor?.extensions ?? config?.extensions)
          .map(normalizeSurfaceExtension)
          .filter(Boolean)
      : (descriptor?.extensions ?? config?.extensions)
        ? [
            normalizeSurfaceExtension(
              descriptor?.extensions ?? config?.extensions,
            ),
          ].filter(Boolean)
        : [],
  };
}
export function createSurfaceEntryDefinition(input, config = {}) {
  return normalizeSurfaceDefinition(input, config);
}
export function createInlineSurfaceEntry(surface) {
  return normalizeSurfaceDefinition(
    surface,
    {},
    {
      allowPrimitiveContent: true,
      defaultShowAction: null,
    },
  );
}
export function resolveSurfaceAction(item, surfaceEntry) {
  if (surfaceEntry?.action != null) return surfaceEntry.action;
  if (surfaceEntry?.showAction === true) return item.action ?? null;
  if (surfaceEntry?.showAction === false) return null;
  return item.action ?? null;
}
export function resolveActiveStepDefinition(surfaceEntry) {
  if (!surfaceEntry) return null;
  const steps = surfaceEntry.steps;
  if (!Array.isArray(steps) || steps.length === 0) return surfaceEntry;
  const requestedIndex = Number(surfaceEntry.currentStepIndex);
  const currentIndex = Math.max(
    0,
    Math.min(
      Number.isInteger(requestedIndex) ? requestedIndex : 0,
      steps.length - 1,
    ),
  );
  const step = steps[currentIndex];
  if (!step) return surfaceEntry;
  const stepComponent = resolveComponentType(
    step?.component,
    step,
    surfaceEntry.component,
  );
  const stepContent = resolveRenderableContent(
    step?.content,
    step?.node,
    step?.element,
    surfaceEntry.content,
  );
  return {
    ...surfaceEntry,
    component: stepComponent,
    content: stepContent,
    props: {
      ...(surfaceEntry.props || {}),
      ...(step.props && typeof step.props === "object" ? step.props : {}),
    },
    icon: step.icon ?? step.header?.icon ?? surfaceEntry.icon,
    title: step.title ?? step.header?.title ?? surfaceEntry.title,
    description:
      step.description ?? step.header?.description ?? surfaceEntry.description,
    descriptionMaxLines:
      step.descriptionMaxLines ?? surfaceEntry.descriptionMaxLines ?? 2,
    trailing: step.trailing ?? surfaceEntry.trailing,
    headerAction: step.headerAction ?? surfaceEntry.headerAction,
    action: step.action ?? surfaceEntry.action,
    showAction: step.showAction ?? surfaceEntry.showAction,
    closeLabel: step.closeLabel ?? surfaceEntry.closeLabel,
    stepIndex: currentIndex,
    totalSteps: steps.length,
    canGoBack: currentIndex > 0,
    isFirstStep: currentIndex === 0,
    isLastStep: currentIndex === steps.length - 1,
    extensions: step.extensions
      ? Array.isArray(step.extensions)
        ? step.extensions.map(normalizeSurfaceExtension).filter(Boolean)
        : [normalizeSurfaceExtension(step.extensions)].filter(Boolean)
      : surfaceEntry.extensions || [],
  };
}
export function applySurfaceToNavItem(
  item,
  rawSurfaceEntry,
  {
    closeSurface,
    closeAllSurfaces,
    goBackSurface,
    pushStep,
    popStep,
    goToStep,
    handleSurfaceAnimationComplete,
    getSurfaceFlow,
    surfaceStack = [],
    surfacePhase = NAV_SURFACE_PHASE.OPEN,
  } = {},
) {
  const createSurfacePresentation = (entry, stack) => {
    const surfaceEntry = resolveActiveStepDefinition(entry);
    const surfaceComponent = surfaceEntry?.component ?? null;
    const surfaceContent = surfaceEntry?.content ?? null;
    if (!surfaceComponent && surfaceContent == null) return null;
    const surfaceId = surfaceEntry.id ?? null;
    const canGoBack = Boolean(surfaceEntry.canGoBack) || stack.length > 1;
    const surfaceFlow =
      typeof getSurfaceFlow === "function"
        ? getSurfaceFlow(surfaceEntry.flow?.flowId)
        : null;
    return {
      allowSwipeDismiss: surfaceEntry.allowSwipeDismiss !== false,
      badge: surfaceEntry.badge ?? null,
      canGoBack,
      closeAllSurfaces:
        typeof closeAllSurfaces === "function" ? closeAllSurfaces : null,
      closeSurface:
        typeof closeSurface === "function"
          ? (result = null) => closeSurface(result, surfaceId)
          : (result = null) => {
              surfaceEntry?.onClose?.(result);
            },
      dismissible: surfaceEntry.dismissible !== false,
      expandHorizontal: surfaceEntry.expandHorizontal ?? false,
      goToStep:
        typeof goToStep === "function"
          ? (index) => goToStep(index, surfaceId)
          : null,
      isFirstStep: surfaceEntry.isFirstStep ?? true,
      isLastStep: surfaceEntry.isLastStep ?? true,
      onAnimationComplete: handleSurfaceAnimationComplete,
      onBack: canGoBack
        ? () => {
            if (typeof goBackSurface === "function") {
              goBackSurface();
            } else if (typeof popStep === "function") {
              popStep(surfaceId);
            } else if (typeof closeSurface === "function") {
              closeSurface(null, surfaceId);
            }
          }
        : null,
      popStep: typeof popStep === "function" ? () => popStep(surfaceId) : null,
      pushStep:
        typeof pushStep === "function"
          ? (step) => pushStep(step, surfaceId)
          : null,
      stepIndex: surfaceEntry.stepIndex ?? 0,
      surfaceCloseLabel: surfaceEntry.closeLabel ?? null,
      surfaceComponent,
      surfaceContent,
      surfaceDescription: surfaceEntry.description ?? null,
      surfaceDescriptionMaxLines: surfaceEntry.descriptionMaxLines ?? 2,
      surfaceHeaderAction: surfaceEntry.headerAction ?? null,
      surfaceIcon: surfaceEntry.icon ?? null,
      surfaceId,
      surfaceProps: surfaceFlow
        ? {
            ...(surfaceEntry.props || {}),
            surfaceFlow,
          }
        : surfaceEntry.props || {},
      surfacePhase,
      surfaceTitle: surfaceEntry.title ?? null,
      surfaceTrailing: surfaceEntry.trailing ?? null,
      surfaceExtensions: surfaceEntry.extensions || [],
      extensions: surfaceEntry.extensions || [],
      totalSteps: surfaceEntry.totalSteps ?? 1,
      width: surfaceEntry.width ?? null,
    };
  };
  const stackEntries = surfaceStack.length ? surfaceStack : [rawSurfaceEntry];
  const surfaceStackEntries = stackEntries
    .map((entry, index) =>
      createSurfacePresentation(entry, stackEntries.slice(0, index + 1)),
    )
    .filter(Boolean);
  const surfaceEntry =
    surfaceStackEntries[surfaceStackEntries.length - 1] || null;
  if (!item || !surfaceEntry) {
    return item;
  }
  return {
    ...item,
    isSurface: true,
    isOverlay: true,
    surfacePhase,
    ...surfaceEntry,
    actions: null,
    action: resolveSurfaceAction(
      item,
      resolveActiveStepDefinition(rawSurfaceEntry),
    ),
    surfaceStackEntries,
    surfaceExtensions:
      surfaceEntry.surfaceExtensions || surfaceEntry.extensions || [],
    extensions: surfaceEntry.extensions || [],
  };
}
export function createPendingSurfaceScheduler({
  clearTimer = clearTimeout,
  scheduler = null,
  scheduleTimer = setTimeout,
} = {}) {
  const timers = new Map();
  const cancelTimer = scheduler?.cancel || clearTimer;
  const schedule = scheduler?.schedule
    ? (callback, delayMs) =>
        scheduler.schedule(callback, delayMs, {
          label: "surface:compact-open",
        })
    : scheduleTimer;
  const cancel = (surfaceId) => {
    if (!timers.has(surfaceId)) return false;
    cancelTimer(timers.get(surfaceId));
    timers.delete(surfaceId);
    return true;
  };
  return {
    cancel,
    cancelAll() {
      const surfaceIds = [...timers.keys()];
      surfaceIds.forEach(cancel);
      return surfaceIds;
    },
    getLatestId() {
      const surfaceIds = [...timers.keys()];
      return surfaceIds[surfaceIds.length - 1] || null;
    },
    schedule(surfaceId, callback, delayMs) {
      cancel(surfaceId);
      const timerId = schedule(() => {
        timers.delete(surfaceId);
        callback();
      }, delayMs);
      timers.set(surfaceId, timerId);
    },
    get size() {
      return timers.size;
    },
  };
}
export const SURFACE_TRANSITION_EVENTS = Object.freeze({
  ADVANCE: "surface-transition:advance",
  CLOSE: "surface-transition:close",
  CLOSE_ALL: "surface-transition:close-all",
  OPEN: "surface-transition:open",
  SET_COMPACT: "surface-transition:set-compact",
});
export const SURFACE_TRANSITION_EFFECTS = Object.freeze({
  MOUNT: "surface-transition:mount",
  RELEASE: "surface-transition:release",
  SCHEDULE: "surface-transition:schedule",
});
const EMPTY_SURFACE_TRANSITION_EFFECTS = Object.freeze([]);
function freezeSurfaceTransitionState(state) {
  return Object.freeze({
    closingSurfaceIds: Object.freeze([...state.closingSurfaceIds]),
    isCompact: Boolean(state.isCompact),
    phase: state.phase,
    surfaceIds: Object.freeze([...state.surfaceIds]),
    surfaceLifecycle: state.surfaceLifecycle,
  });
}
function createTransitionResult(
  state,
  effects = EMPTY_SURFACE_TRANSITION_EFFECTS,
) {
  return Object.freeze({
    state,
    effects: Object.freeze([...effects]),
  });
}
function createScheduledTransition(delayMs, label) {
  return Object.freeze({
    delayMs: Math.max(0, Number(delayMs) || 0),
    event: Object.freeze({
      type: SURFACE_TRANSITION_EVENTS.ADVANCE,
    }),
    label,
    type: SURFACE_TRANSITION_EFFECTS.SCHEDULE,
  });
}
function createReleaseEffect(surfaceIds) {
  return Object.freeze({
    surfaceIds: Object.freeze([...surfaceIds]),
    type: SURFACE_TRANSITION_EFFECTS.RELEASE,
  });
}
export function createSurfaceTransitionState(input = {}) {
  const surfaceIds = [
    ...new Set(Array.isArray(input.surfaceIds) ? input.surfaceIds : []),
  ].filter((surfaceId) => surfaceId != null);
  const closingSurfaceIds = [
    ...new Set(
      Array.isArray(input.closingSurfaceIds) ? input.closingSurfaceIds : [],
    ),
  ].filter((surfaceId) => surfaceIds.includes(surfaceId));
  const phase = Object.values(NAV_SURFACE_PHASE).includes(input.phase)
    ? input.phase
    : surfaceIds.length > 0
      ? NAV_SURFACE_PHASE.OPEN
      : NAV_SURFACE_PHASE.IDLE;
  const surfaceLifecycle = Object.values(NAVIGATION_LIFECYCLE).includes(
    input.surfaceLifecycle,
  )
    ? input.surfaceLifecycle
    : phase === NAV_SURFACE_PHASE.IDLE
      ? NAVIGATION_LIFECYCLE.IDLE
      : phase === NAV_SURFACE_PHASE.OPEN
        ? NAVIGATION_LIFECYCLE.OPEN
        : closingSurfaceIds.length > 0
          ? NAVIGATION_LIFECYCLE.CLOSING
          : NAVIGATION_LIFECYCLE.OPENING;
  return freezeSurfaceTransitionState({
    closingSurfaceIds,
    isCompact: input.isCompact,
    phase,
    surfaceIds,
    surfaceLifecycle,
  });
}
export function transitionSurface(currentState, event = {}) {
  const state = createSurfaceTransitionState(currentState);
  switch (event.type) {
    case SURFACE_TRANSITION_EVENTS.SET_COMPACT: {
      const isCompact = Boolean(event.value);
      return state.isCompact === isCompact
        ? createTransitionResult(state)
        : createTransitionResult(
            freezeSurfaceTransitionState({
              ...state,
              isCompact,
            }),
          );
    }
    case SURFACE_TRANSITION_EVENTS.OPEN: {
      const surfaceId = event.surfaceId;
      if (surfaceId == null || state.surfaceIds.includes(surfaceId)) {
        return createTransitionResult(state);
      }
      const isStacked = state.surfaceIds.length > 0;
      const phase = isStacked
        ? NAV_SURFACE_PHASE.OPEN
        : event.skipActionDismiss
          ? NAV_SURFACE_PHASE.EXPANDING_BODY
          : NAV_SURFACE_PHASE.DISMISSING_ACTION;
      const nextState = freezeSurfaceTransitionState({
        ...state,
        closingSurfaceIds: [],
        phase,
        surfaceIds: [...state.surfaceIds, surfaceId],
        surfaceLifecycle: isStacked
          ? NAVIGATION_LIFECYCLE.OPEN
          : NAVIGATION_LIFECYCLE.OPENING,
      });
      const effects = isStacked
        ? [
            Object.freeze({
              surfaceId,
              type: SURFACE_TRANSITION_EFFECTS.MOUNT,
            }),
          ]
        : event.skipActionDismiss
          ? [
              Object.freeze({
                surfaceId,
                type: SURFACE_TRANSITION_EFFECTS.MOUNT,
              }),
              createScheduledTransition(
                NAV_SURFACE_CHOREOGRAPHY_TIMINGS.BODY_ENTER_MS,
                "surface:open-body",
              ),
            ]
          : [
              createScheduledTransition(
                NAV_SURFACE_CHOREOGRAPHY_TIMINGS.ACTION_DISMISS_MS +
                  NAV_SURFACE_CHOREOGRAPHY_TIMINGS.ACTION_DISMISS_SETTLE_MS,
                "surface:dismiss-action",
              ),
            ];
      return createTransitionResult(nextState, effects);
    }
    case SURFACE_TRANSITION_EVENTS.CLOSE: {
      if (!state.surfaceIds.includes(event.surfaceId)) {
        return createTransitionResult(state);
      }
      const remainingSurfaceIds = state.surfaceIds.filter(
        (surfaceId) => surfaceId !== event.surfaceId,
      );
      if (remainingSurfaceIds.length > 0) {
        return createTransitionResult(
          freezeSurfaceTransitionState({
            ...state,
            closingSurfaceIds: [],
            phase: NAV_SURFACE_PHASE.OPEN,
            surfaceIds: remainingSurfaceIds,
            surfaceLifecycle: NAVIGATION_LIFECYCLE.OPEN,
          }),
          [createReleaseEffect([event.surfaceId])],
        );
      }
      return createTransitionResult(
        freezeSurfaceTransitionState({
          ...state,
          closingSurfaceIds: [event.surfaceId],
          phase: NAV_SURFACE_PHASE.COLLAPSING_BODY,
          surfaceLifecycle: NAVIGATION_LIFECYCLE.CLOSING,
        }),
        [
          createScheduledTransition(
            NAV_SURFACE_CHOREOGRAPHY_TIMINGS.BODY_EXIT_MS +
              NAV_SURFACE_CHOREOGRAPHY_TIMINGS.BODY_COLLAPSE_SETTLE_MS,
            "surface:collapse-body",
          ),
        ],
      );
    }
    case SURFACE_TRANSITION_EVENTS.CLOSE_ALL:
      return state.surfaceIds.length === 0
        ? createTransitionResult(state)
        : createTransitionResult(
            freezeSurfaceTransitionState({
              ...state,
              closingSurfaceIds: state.surfaceIds,
              phase: NAV_SURFACE_PHASE.COLLAPSING_BODY,
              surfaceLifecycle: NAVIGATION_LIFECYCLE.CLOSING,
            }),
            [
              createScheduledTransition(
                NAV_SURFACE_CHOREOGRAPHY_TIMINGS.BODY_EXIT_MS +
                  NAV_SURFACE_CHOREOGRAPHY_TIMINGS.BODY_COLLAPSE_SETTLE_MS,
                "surface:collapse-all",
              ),
            ],
          );
    case SURFACE_TRANSITION_EVENTS.ADVANCE:
      if (state.phase === NAV_SURFACE_PHASE.DISMISSING_ACTION) {
        return createTransitionResult(
          freezeSurfaceTransitionState({
            ...state,
            phase: NAV_SURFACE_PHASE.SWAPPING_HEADER,
          }),
          [
            createScheduledTransition(
              NAV_SURFACE_CHOREOGRAPHY_TIMINGS.HEADER_SWAP_MS +
                NAV_SURFACE_CHOREOGRAPHY_TIMINGS.HEADER_SWAP_SETTLE_MS,
              "surface:swap-header",
            ),
          ],
        );
      }
      if (state.phase === NAV_SURFACE_PHASE.SWAPPING_HEADER) {
        const activeSurfaceId = state.surfaceIds.at(-1);
        return createTransitionResult(
          freezeSurfaceTransitionState({
            ...state,
            phase: NAV_SURFACE_PHASE.EXPANDING_BODY,
          }),
          [
            Object.freeze({
              surfaceId: activeSurfaceId,
              type: SURFACE_TRANSITION_EFFECTS.MOUNT,
            }),
            createScheduledTransition(
              NAV_SURFACE_CHOREOGRAPHY_TIMINGS.BODY_ENTER_MS,
              "surface:expand-body",
            ),
          ],
        );
      }
      if (state.phase === NAV_SURFACE_PHASE.EXPANDING_BODY) {
        return createTransitionResult(
          freezeSurfaceTransitionState({
            ...state,
            phase: NAV_SURFACE_PHASE.OPEN,
            surfaceLifecycle: NAVIGATION_LIFECYCLE.OPEN,
          }),
        );
      }
      if (state.phase === NAV_SURFACE_PHASE.COLLAPSING_BODY) {
        return createTransitionResult(
          freezeSurfaceTransitionState({
            ...state,
            phase: NAV_SURFACE_PHASE.RESTORING_HEADER,
          }),
          [
            createScheduledTransition(
              NAV_SURFACE_CHOREOGRAPHY_TIMINGS.HEADER_RESTORE_MS +
                NAV_SURFACE_CHOREOGRAPHY_TIMINGS.RESTORE_SETTLE_MS,
              "surface:restore-header",
            ),
          ],
        );
      }
      if (state.phase === NAV_SURFACE_PHASE.RESTORING_HEADER) {
        const releasedSurfaceIds = state.closingSurfaceIds;
        const surfaceIds = state.surfaceIds.filter(
          (surfaceId) => !releasedSurfaceIds.includes(surfaceId),
        );
        return createTransitionResult(
          freezeSurfaceTransitionState({
            ...state,
            closingSurfaceIds: [],
            phase:
              surfaceIds.length > 0
                ? NAV_SURFACE_PHASE.OPEN
                : NAV_SURFACE_PHASE.IDLE,
            surfaceIds,
            surfaceLifecycle:
              surfaceIds.length > 0
                ? NAVIGATION_LIFECYCLE.OPEN
                : NAVIGATION_LIFECYCLE.IDLE,
          }),
          releasedSurfaceIds.length > 0
            ? [createReleaseEffect(releasedSurfaceIds)]
            : EMPTY_SURFACE_TRANSITION_EFFECTS,
        );
      }
      return createTransitionResult(state);
    default:
      return createTransitionResult(state);
  }
}
export function runSurfaceTransition({
  event,
  onEffect = () => {},
  onTransition = () => {},
  scheduler = createNavigationScheduler(),
  state,
} = {}) {
  let currentState = createSurfaceTransitionState(state);
  let pendingEvent = null;
  let pendingTaskId = null;
  let stopped = false;
  const cancelPending = () => {
    if (pendingTaskId !== null) scheduler.cancel(pendingTaskId);
    pendingEvent = null;
    pendingTaskId = null;
  };
  const apply = (nextEvent, synchronous = false) => {
    if (stopped || !nextEvent) return currentState;
    const result = transitionSurface(currentState, nextEvent);
    currentState = result.state;
    onTransition(currentState, nextEvent);
    result.effects.forEach((effect) => {
      if (effect.type !== SURFACE_TRANSITION_EFFECTS.SCHEDULE) {
        onEffect(effect, currentState);
        return;
      }
      pendingEvent = effect.event;
      if (synchronous) return;
      pendingTaskId = scheduler.schedule(
        () => {
          const scheduledEvent = pendingEvent;
          pendingEvent = null;
          pendingTaskId = null;
          apply(scheduledEvent);
        },
        effect.delayMs,
        {
          label: effect.label,
        },
      );
    });
    return currentState;
  };
  const finish = () => {
    if (stopped) return currentState;
    let advances = 0;
    while (pendingEvent && advances < 16) {
      const nextEvent = pendingEvent;
      if (pendingTaskId !== null) scheduler.cancel(pendingTaskId);
      pendingEvent = null;
      pendingTaskId = null;
      apply(nextEvent, true);
      advances += 1;
    }
    if (pendingEvent) {
      throw new Error("Surface transition exceeded its advance safety limit");
    }
    return currentState;
  };
  apply(event);
  return Object.freeze({
    cancel() {
      if (stopped) return false;
      stopped = true;
      cancelPending();
      return true;
    },
    dispatch(nextEvent) {
      finish();
      return apply(nextEvent);
    },
    finish,
    getState() {
      return currentState;
    },
  });
}
export function createSurfaceLifecycleState() {
  return {
    isCompact: false,
    surfaceIds: [],
    surfaceLifecycle: NAVIGATION_LIFECYCLE.IDLE,
  };
}
export function surfaceLifecycleReducer(state, action) {
  switch (action?.type) {
    case NAVIGATION_EVENTS.SET_COMPACT:
      return state.isCompact === Boolean(action.value)
        ? state
        : {
            ...state,
            isCompact: Boolean(action.value),
          };
    case NAVIGATION_EVENTS.OPEN_SURFACE:
      if (
        action.surfaceId == null ||
        state.surfaceIds.includes(action.surfaceId)
      )
        return state;
      return {
        ...state,
        surfaceIds: [...state.surfaceIds, action.surfaceId],
        surfaceLifecycle: NAVIGATION_LIFECYCLE.OPENING,
      };
    case NAVIGATION_EVENTS.SURFACE_MOUNTED:
      return state.surfaceLifecycle === NAVIGATION_LIFECYCLE.OPENING
        ? {
            ...state,
            surfaceLifecycle: NAVIGATION_LIFECYCLE.OPEN,
          }
        : state;
    case NAVIGATION_EVENTS.CLOSE_SURFACE: {
      const surfaceIds = state.surfaceIds.filter(
        (id) => id !== action.surfaceId,
      );
      if (surfaceIds.length === state.surfaceIds.length) return state;
      return {
        ...state,
        surfaceIds,
        surfaceLifecycle: surfaceIds.length
          ? NAVIGATION_LIFECYCLE.OPEN
          : NAVIGATION_LIFECYCLE.CLOSING,
      };
    }
    case NAVIGATION_EVENTS.CLOSE_ALL_SURFACES:
      return state.surfaceIds.length
        ? {
            ...state,
            surfaceIds: [],
            surfaceLifecycle: NAVIGATION_LIFECYCLE.CLOSING,
          }
        : state;
    default:
      return state;
  }
}
function resolveSurfaceEntry(entry, payloadMap) {
  if (!entry) return null;
  return {
    ...(payloadMap?.get(entry.payloadId) || {}),
    ...entry,
  };
}
function createSurfaceState(surfaceStack = [], payloadMap = null) {
  const resolvedSurfaceStack = surfaceStack
    .map((entry) => resolveSurfaceEntry(entry, payloadMap))
    .filter(Boolean);
  const activeSurface = resolvedSurfaceStack[resolvedSurfaceStack.length - 1];
  return {
    activeSurfaceId: activeSurface?.id || null,
    isSurfaceOpen: resolvedSurfaceStack.length > 0,
    activeSurfaceEntry: activeSurface || null,
    surfaceStack: resolvedSurfaceStack,
  };
}
function createSurfaceError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}
function getSurfaceUrlValue(surfaceEntry) {
  return typeof surfaceEntry?.syncWithUrl === "string"
    ? surfaceEntry.syncWithUrl
    : surfaceEntry?.urlKey || "open";
}
function createSurfaceHistoryState(surfaceEntry) {
  const value = getSurfaceUrlValue(surfaceEntry);
  const flow = surfaceEntry?.flow;
  return {
    value,
    ...(flow
      ? {
          flow: {
            id: flow.flowId,
            snapshot: flow.snapshot,
          },
        }
      : {}),
  };
}
function toSurfaceFlowState(session) {
  if (!session?.flowId) return null;
  return {
    flowId: session.flowId,
    returnHandshake: session.returnHandshake,
    snapshot: session.snapshot,
    status: session.status,
  };
}
function getRestorableSurfaceFlowSnapshot(definition) {
  if (
    typeof window === "undefined" ||
    !definition?.restoreFromUrl ||
    !definition?.id
  ) {
    return undefined;
  }
  const navSurface = window.history.state?.navSurface;
  const flow = navSurface?.flow;
  const currentSurfaceValue = new URL(window.location.href).searchParams.get(
    "surface",
  );
  if (
    !flow ||
    flow.id !== definition.id ||
    !navSurface.value ||
    currentSurfaceValue !== navSurface.value
  ) {
    return undefined;
  }
  return normalizeSurfaceFlowSnapshot(flow.snapshot);
}
function syncSurfaceUrl(surfaceEntry, isOpening, urlState = null) {
  if (
    typeof window === "undefined" ||
    (!surfaceEntry?.syncWithUrl && !surfaceEntry?.urlKey)
  )
    return;
  try {
    const url = new URL(window.location.href);
    if (isOpening) {
      const value = getSurfaceUrlValue(surfaceEntry);
      if (urlState) urlState.previousValue = url.searchParams.get("surface");
      url.searchParams.set("surface", value);
      window.history.pushState(
        {
          ...window.history.state,
          navSurface: createSurfaceHistoryState(surfaceEntry),
        },
        "",
        url.toString(),
      );
      return;
    }
    if (urlState?.value && url.searchParams.get("surface") !== urlState.value)
      return;
    if (urlState?.previousValue)
      url.searchParams.set("surface", urlState.previousValue);
    else url.searchParams.delete("surface");
    const state = {
      ...window.history.state,
    };
    if (state.navSurface?.value === urlState?.value) delete state.navSurface;
    window.history.replaceState(state, "", url.toString());
  } catch (error) {
    if (process.env.NODE_ENV !== "production")
      console.warn("[Navigation] Surface URL synchronization failed:", error);
  }
}
function syncSurfaceFlowUrlState(surfaceEntry, urlState = null) {
  if (
    typeof window === "undefined" ||
    (!surfaceEntry?.syncWithUrl && !surfaceEntry?.urlKey)
  ) {
    return;
  }
  try {
    const url = new URL(window.location.href);
    const value = getSurfaceUrlValue(surfaceEntry);
    if (url.searchParams.get("surface") !== value || urlState?.value !== value)
      return;
    window.history.replaceState(
      {
        ...window.history.state,
        navSurface: createSurfaceHistoryState(surfaceEntry),
      },
      "",
      url.toString(),
    );
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[Navigation] Surface flow URL synchronization failed:",
        error,
      );
    }
  }
}
function getTargetSurfaceId(surfaceStack, targetSurfaceId = null) {
  return targetSurfaceId || surfaceStack[surfaceStack.length - 1]?.id || null;
}
function findSurfaceEntry(surfaceStack, surfaceId) {
  return surfaceStack.find((entry) => entry.id === surfaceId) || null;
}
function updateSurfaceStackEntry(surfaceStack, surfaceId, updateEntry) {
  return surfaceStack.map((entry) =>
    entry.id === surfaceId ? updateEntry(entry) : entry,
  );
}
function createSurfaceRuntimeEntry(surfaceId, definition, flowSession = null) {
  const {
    onClose,
    component,
    content,
    props,
    action,
    showAction,
    steps,
    trailing,
    headerAction,
    title,
    description,
    icon,
    closeLabel,
    ...surfaceMetadata
  } = definition;
  const payloadId = `surface-payload-${surfaceId}`;
  return {
    payload: {
      component,
      content,
      props,
      action,
      showAction,
      steps,
      trailing,
      headerAction,
      title,
      description,
      icon,
      closeLabel,
      onClose,
    },
    surfaceEntry: {
      id: surfaceId,
      payloadId,
      ...(flowSession
        ? {
            flow: toSurfaceFlowState(flowSession),
          }
        : {}),
      ...surfaceMetadata,
    },
  };
}
function releaseSurfaceResources({
  result,
  surfaceEntryMap,
  surfaceId,
  surfaceOnCloseMap,
  surfacePayloadMap,
  surfaceFlowSessionMap,
  surfaceFlowToSurfaceIdMap,
  surfacePromiseMap,
  surfaceResolveMap,
  surfaceUrlStateMap,
}) {
  const targetEntry = surfaceEntryMap.get(surfaceId);
  if (targetEntry) {
    syncSurfaceUrl(targetEntry, false, surfaceUrlStateMap.get(surfaceId));
    surfacePayloadMap.delete(targetEntry.payloadId);
  }
  surfaceEntryMap.delete(surfaceId);
  surfaceUrlStateMap.delete(surfaceId);
  const flowSession = surfaceFlowSessionMap.get(surfaceId);
  if (
    flowSession &&
    surfaceFlowToSurfaceIdMap.get(flowSession.flowId) === surfaceId
  ) {
    surfaceFlowToSurfaceIdMap.delete(flowSession.flowId);
  }
  surfaceFlowSessionMap.delete(surfaceId);
  surfacePromiseMap.delete(surfaceId);
  const onClose = surfaceOnCloseMap.get(surfaceId);
  if (typeof onClose === "function") {
    try {
      onClose(result);
    } catch (error) {
      console.error("Nav surface onClose handler failed:", error);
    }
  }
  surfaceOnCloseMap.delete(surfaceId);
  const resolve = surfaceResolveMap.get(surfaceId);
  if (typeof resolve === "function") resolve(result);
  surfaceResolveMap.delete(surfaceId);
  return flowSession || null;
}
const initialSurfaceState = createSurfaceState(
  [],
  null,
  NAV_SURFACE_PHASE.IDLE,
);
export function useSurfaceStack({
  isCompact = false,
  onSurfaceFlowSettled = null,
  scheduler = null,
  setCompactLock,
  setExpanded,
  setSearchQuery,
}) {
  const [surfaceState, setSurfaceState] = useState(initialSurfaceState);
  const [surfaceLifecycleState, setSurfaceLifecycleState] = useState(
    createSurfaceLifecycleState,
  );
  const [surfacePhase, setSurfacePhase] = useState(NAV_SURFACE_PHASE.IDLE);
  const surfaceStackRef = useRef([]);
  const surfacePayloadMapRef = useRef(new Map());
  const surfaceEntryMapRef = useRef(new Map());
  const surfaceFlowSessionMapRef = useRef(new Map());
  const surfaceFlowToSurfaceIdMapRef = useRef(new Map());
  const surfacePromiseMapRef = useRef(new Map());
  const surfaceResolveMapRef = useRef(new Map());
  const surfaceOnCloseMapRef = useRef(new Map());
  const surfaceUrlStateMapRef = useRef(new Map());
  const surfaceFocusOriginMapRef = useRef(new Map());
  const surfaceIdRef = useRef(0);
  const isCompactRef = useRef(Boolean(isCompact));
  isCompactRef.current = Boolean(isCompact);
  const wasCompactRef = useRef(false);
  const runtimeSchedulerRef = useRef(null);
  const compactUnlockTimerRef = useRef(null);
  const pendingSurfaceSchedulerRef = useRef(null);
  const focusRestoreFrameRef = useRef(null);
  const surfacePhaseRef = useRef(NAV_SURFACE_PHASE.IDLE);
  const transitionRunnerRef = useRef(null);
  const onSurfaceFlowSettledRef = useRef(onSurfaceFlowSettled);
  onSurfaceFlowSettledRef.current = onSurfaceFlowSettled;
  if (runtimeSchedulerRef.current === null) {
    runtimeSchedulerRef.current = scheduler || createNavigationScheduler();
  }
  if (pendingSurfaceSchedulerRef.current === null) {
    pendingSurfaceSchedulerRef.current = createPendingSurfaceScheduler({
      scheduler: runtimeSchedulerRef.current,
    });
  }
  const runtimeScheduler = runtimeSchedulerRef.current;
  const clearChoreographyTimers = useCallback(() => {
    transitionRunnerRef.current?.cancel();
    transitionRunnerRef.current = null;
  }, []);
  const finishSurfaceTransition = useCallback(() => {
    transitionRunnerRef.current?.finish();
    transitionRunnerRef.current = null;
  }, []);
  const setIsCompact = useCallback((compactVal) => {
    isCompactRef.current = compactVal;
    setSurfaceLifecycleState((currentState) =>
      surfaceLifecycleReducer(currentState, {
        type: NAVIGATION_EVENTS.SET_COMPACT,
        value: compactVal,
      }),
    );
  }, []);
  const updatePhase = useCallback((nextPhase) => {
    surfacePhaseRef.current = nextPhase;
    setSurfacePhase(nextPhase);
    setSurfaceState((prevState) => ({
      ...prevState,
      surfacePhase: nextPhase,
    }));
  }, []);
  const syncSurfaceStack = useCallback((nextStack, nextPhase = null) => {
    surfaceStackRef.current = nextStack;
    const effectivePhase =
      nextPhase ??
      (nextStack.length > 0 ? NAV_SURFACE_PHASE.OPEN : NAV_SURFACE_PHASE.IDLE);
    surfacePhaseRef.current = effectivePhase;
    setSurfacePhase(effectivePhase);
    setSurfaceState(
      createSurfaceState(
        nextStack,
        surfacePayloadMapRef.current,
        effectivePhase,
      ),
    );
  }, []);
  const restoreSurfaceFocus = useCallback(
    (surfaceId, result, nextStack = []) => {
      const focusOrigin = surfaceFocusOriginMapRef.current.get(surfaceId);
      surfaceFocusOriginMapRef.current.delete(surfaceId);
      if (
        !focusOrigin ||
        nextStack.length > 0 ||
        !shouldRestoreNavigationFocus(result)
      )
        return;
      if (focusRestoreFrameRef.current !== null) {
        runtimeScheduler.cancel(focusRestoreFrameRef.current);
      }
      focusRestoreFrameRef.current = runtimeScheduler.scheduleFrame(
        () => {
          focusRestoreFrameRef.current = null;
          if (surfaceStackRef.current.length > 0) return;
          focusNavigationElement(focusOrigin);
        },
        {
          label: "surface:restore-focus",
        },
      );
    },
    [runtimeScheduler],
  );
  const finalizeSurfaceClose = useCallback(
    (surfaceId, result, nextStack = []) => {
      const flowSession = releaseSurfaceResources({
        result,
        surfaceEntryMap: surfaceEntryMapRef.current,
        surfaceId,
        surfaceOnCloseMap: surfaceOnCloseMapRef.current,
        surfacePayloadMap: surfacePayloadMapRef.current,
        surfaceFlowSessionMap: surfaceFlowSessionMapRef.current,
        surfaceFlowToSurfaceIdMap: surfaceFlowToSurfaceIdMapRef.current,
        surfacePromiseMap: surfacePromiseMapRef.current,
        surfaceResolveMap: surfaceResolveMapRef.current,
        surfaceUrlStateMap: surfaceUrlStateMapRef.current,
      });
      const isReturnHandshakeHandled = Boolean(
        flowSession &&
        onSurfaceFlowSettledRef.current?.({
          flow: flowSession,
          result,
        }),
      );
      if (!isReturnHandshakeHandled)
        restoreSurfaceFocus(surfaceId, result, nextStack);
    },
    [restoreSurfaceFocus],
  );
  const unlockCompactAfterSurfaceClose = useCallback(() => {
    if (!wasCompactRef.current) {
      return;
    }
    if (compactUnlockTimerRef.current !== null) {
      runtimeScheduler.cancel(compactUnlockTimerRef.current);
    }
    compactUnlockTimerRef.current = runtimeScheduler.schedule(
      () => {
        compactUnlockTimerRef.current = null;
        wasCompactRef.current = false;
        setCompactLock("surface-opening", false);
      },
      NAV_SURFACE_EXIT_SETTLE_MS,
      {
        label: "surface:compact-unlock",
      },
    );
  }, [runtimeScheduler, setCompactLock]);
  const handleSurfaceAnimationComplete = useCallback(
    (definition) => {
      if (definition !== "exit" || !wasCompactRef.current) return;
      if (compactUnlockTimerRef.current !== null) {
        runtimeScheduler.cancel(compactUnlockTimerRef.current);
        compactUnlockTimerRef.current = null;
      }
      wasCompactRef.current = false;
      setCompactLock("surface-opening", false);
    },
    [runtimeScheduler, setCompactLock],
  );
  const runSurfaceChoreography = useCallback(
    (event, { initialSurfaceIds = null, result = null } = {}) => {
      const transitionState = createSurfaceTransitionState({
        isCompact: isCompactRef.current,
        phase: surfacePhaseRef.current,
        surfaceIds:
          initialSurfaceIds ||
          surfaceStackRef.current.map((surfaceEntry) => surfaceEntry.id),
      });
      const runner = runSurfaceTransition({
        event,
        scheduler: runtimeScheduler,
        state: transitionState,
        onTransition(nextState) {
          const activeSurfaceIds = new Set(nextState.surfaceIds);
          const nextStack = surfaceStackRef.current.filter((surfaceEntry) =>
            activeSurfaceIds.has(surfaceEntry.id),
          );
          surfaceStackRef.current = nextStack;
          surfacePhaseRef.current = nextState.phase;
          setSurfacePhase(nextState.phase);
          setSurfaceState(
            createSurfaceState(
              nextStack,
              surfacePayloadMapRef.current,
              nextState.phase,
            ),
          );
          setSurfaceLifecycleState({
            isCompact: isCompactRef.current,
            surfaceIds: [...nextState.surfaceIds],
            surfaceLifecycle: nextState.surfaceLifecycle,
          });
        },
        onEffect(effect) {
          if (effect.type !== SURFACE_TRANSITION_EFFECTS.RELEASE) return;
          const nextStack = surfaceStackRef.current;
          effect.surfaceIds.forEach((surfaceId) => {
            finalizeSurfaceClose(surfaceId, result, nextStack);
          });
          if (
            nextStack.length === 0 &&
            pendingSurfaceSchedulerRef.current.size === 0
          ) {
            unlockCompactAfterSurfaceClose();
          }
        },
      });
      transitionRunnerRef.current = runner;
      return runner;
    },
    [finalizeSurfaceClose, runtimeScheduler, unlockCompactAfterSurfaceClose],
  );
  const pushStep = useCallback(
    (stepInput, targetSurfaceId = null) => {
      const currentStack = surfaceStackRef.current;
      const activeSurfaceId = getTargetSurfaceId(currentStack, targetSurfaceId);
      if (!activeSurfaceId) return;
      const nextStack = updateSurfaceStackEntry(
        currentStack,
        activeSurfaceId,
        (entry) => {
          const resolvedEntry = resolveSurfaceEntry(
            entry,
            surfacePayloadMapRef.current,
          );
          const initialStep = {
            component: resolvedEntry.component,
            content: resolvedEntry.content,
            props: resolvedEntry.props,
            title: resolvedEntry.title,
            description: resolvedEntry.description,
            icon: resolvedEntry.icon,
            trailing: resolvedEntry.trailing,
            headerAction: resolvedEntry.headerAction,
            action: resolvedEntry.action,
            showAction: resolvedEntry.showAction,
            closeLabel: resolvedEntry.closeLabel,
          };
          const currentSteps =
            Array.isArray(resolvedEntry.steps) && resolvedEntry.steps.length > 0
              ? [...resolvedEntry.steps]
              : [initialStep];
          const nextSteps = [...currentSteps, stepInput];
          const nextIndex = nextSteps.length - 1;
          surfacePayloadMapRef.current.set(entry.payloadId, {
            ...surfacePayloadMapRef.current.get(entry.payloadId),
            steps: nextSteps,
          });
          return {
            ...entry,
            currentStepIndex: nextIndex,
          };
        },
      );
      syncSurfaceStack(nextStack, NAV_SURFACE_PHASE.OPEN);
    },
    [syncSurfaceStack],
  );
  const popStep = useCallback(
    (targetSurfaceId = null) => {
      const currentStack = surfaceStackRef.current;
      const activeSurfaceId = getTargetSurfaceId(currentStack, targetSurfaceId);
      if (!activeSurfaceId) return;
      const targetEntry = findSurfaceEntry(currentStack, activeSurfaceId);
      const resolvedTargetEntry = resolveSurfaceEntry(
        targetEntry,
        surfacePayloadMapRef.current,
      );
      if (
        !resolvedTargetEntry?.steps ||
        (resolvedTargetEntry.currentStepIndex || 0) <= 0
      ) {
        return;
      }
      const nextStack = updateSurfaceStackEntry(
        currentStack,
        activeSurfaceId,
        (entry) => {
          return {
            ...entry,
            currentStepIndex: (entry.currentStepIndex || 0) - 1,
          };
        },
      );
      syncSurfaceStack(nextStack, NAV_SURFACE_PHASE.OPEN);
    },
    [syncSurfaceStack],
  );
  const goToStep = useCallback(
    (index, targetSurfaceId = null) => {
      const currentStack = surfaceStackRef.current;
      const activeSurfaceId = getTargetSurfaceId(currentStack, targetSurfaceId);
      if (!activeSurfaceId) return;
      const targetEntry = findSurfaceEntry(currentStack, activeSurfaceId);
      const resolvedTargetEntry = resolveSurfaceEntry(
        targetEntry,
        surfacePayloadMapRef.current,
      );
      const stepIndex = Number(index);
      if (
        !resolvedTargetEntry?.steps ||
        !Number.isInteger(stepIndex) ||
        stepIndex < 0 ||
        stepIndex >= resolvedTargetEntry.steps.length
      ) {
        return;
      }
      const nextStack = updateSurfaceStackEntry(
        currentStack,
        activeSurfaceId,
        (entry) => {
          return {
            ...entry,
            currentStepIndex: stepIndex,
          };
        },
      );
      syncSurfaceStack(nextStack, NAV_SURFACE_PHASE.OPEN);
    },
    [syncSurfaceStack],
  );
  const closeSurface = useCallback(
    (result = null, targetSurfaceId = null) => {
      finishSurfaceTransition();
      const currentStack = surfaceStackRef.current;
      const pendingScheduler = pendingSurfaceSchedulerRef.current;
      const pendingSurfaceId = pendingScheduler.getLatestId();
      const activeSurfaceId = currentStack[currentStack.length - 1]?.id || null;
      const latestSurfaceId =
        pendingSurfaceId &&
        (!activeSurfaceId || pendingSurfaceId > activeSurfaceId)
          ? pendingSurfaceId
          : activeSurfaceId;
      const surfaceId = targetSurfaceId || latestSurfaceId;
      if (!surfaceId) {
        return;
      }
      if (pendingScheduler.cancel(surfaceId)) {
        finalizeSurfaceClose(surfaceId, result, currentStack);
        if (currentStack.length === 0 && pendingScheduler.size === 0) {
          unlockCompactAfterSurfaceClose();
        }
        return;
      }
      const surfaceToClose = findSurfaceEntry(currentStack, surfaceId);
      if (!surfaceToClose) {
        return;
      }
      runSurfaceChoreography(
        {
          surfaceId,
          type: SURFACE_TRANSITION_EVENTS.CLOSE,
        },
        {
          result,
        },
      );
    },
    [
      finalizeSurfaceClose,
      finishSurfaceTransition,
      runSurfaceChoreography,
      unlockCompactAfterSurfaceClose,
    ],
  );
  const goBackSurface = useCallback(() => {
    const currentStack = surfaceStackRef.current;
    const activeEntry = currentStack[currentStack.length - 1];
    if (!activeEntry) return;
    if ((activeEntry.currentStepIndex || 0) > 0) {
      popStep(activeEntry.id);
      return;
    }
    if (currentStack.length > 1) {
      closeSurface(null, activeEntry.id);
    }
  }, [closeSurface, popStep]);
  const closeAllSurfaces = useCallback(
    (result = null) => {
      finishSurfaceTransition();
      const currentStack = [...surfaceStackRef.current];
      const pendingSurfaceIds = pendingSurfaceSchedulerRef.current.cancelAll();
      if (currentStack.length === 0 && pendingSurfaceIds.length === 0) {
        return;
      }
      pendingSurfaceIds.forEach((surfaceId) => {
        finalizeSurfaceClose(surfaceId, result);
      });
      if (currentStack.length === 0) {
        unlockCompactAfterSurfaceClose();
        return;
      }
      runSurfaceChoreography(
        {
          type: SURFACE_TRANSITION_EVENTS.CLOSE_ALL,
        },
        {
          result,
        },
      );
    },
    [
      finalizeSurfaceClose,
      finishSurfaceTransition,
      runSurfaceChoreography,
      unlockCompactAfterSurfaceClose,
    ],
  );
  const openSurface = useCallback(
    (input, config = {}) => {
      const {
        flowSession: providedFlowSession,
        preserveUrl = false,
        ...surfaceConfig
      } = config;
      const definition = createSurfaceEntryDefinition(input, surfaceConfig);
      if (!definition) {
        const error = createSurfaceError(
          "NAV_SURFACE_INVALID_COMPONENT",
          "Nav surface input is invalid",
        );
        console.error(error);
        return Promise.resolve({
          success: false,
          error,
        });
      }
      const surfaceId = ++surfaceIdRef.current;
      const flowSession = providedFlowSession
        ? {
            ...providedFlowSession,
            surfaceId,
          }
        : null;
      const { payload, surfaceEntry } = createSurfaceRuntimeEntry(
        surfaceId,
        definition,
        flowSession,
      );
      surfacePayloadMapRef.current.set(surfaceEntry.payloadId, payload);
      surfaceEntryMapRef.current.set(surfaceId, surfaceEntry);
      if (flowSession) {
        surfaceFlowSessionMapRef.current.set(surfaceId, flowSession);
        surfaceFlowToSurfaceIdMapRef.current.set(flowSession.flowId, surfaceId);
      }
      if (typeof document !== "undefined" && document.activeElement) {
        surfaceFocusOriginMapRef.current.set(surfaceId, document.activeElement);
      }
      setExpanded(false);
      setSearchQuery("");
      const runOpen = () => {
        finishSurfaceTransition();
        const previousSurfaceIds = surfaceStackRef.current.map(
          (entry) => entry.id,
        );
        const urlState = {
          value: getSurfaceUrlValue(surfaceEntry),
          previousValue: null,
        };
        surfaceUrlStateMapRef.current.set(surfaceId, urlState);
        if (!preserveUrl) {
          syncSurfaceUrl(surfaceEntry, true, urlState);
        }
        surfaceStackRef.current = [...surfaceStackRef.current, surfaceEntry];
        runSurfaceChoreography(
          {
            skipActionDismiss: surfaceEntry.skipActionDismiss,
            surfaceId,
            type: SURFACE_TRANSITION_EVENTS.OPEN,
          },
          {
            initialSurfaceIds: previousSurfaceIds,
          },
        );
      };
      const resultPromise = new Promise((resolve) => {
        surfaceResolveMapRef.current.set(surfaceId, resolve);
        surfaceOnCloseMapRef.current.set(surfaceId, payload.onClose || null);
      });
      surfacePromiseMapRef.current.set(surfaceId, resultPromise);
      if (isCompactRef.current) {
        if (compactUnlockTimerRef.current !== null) {
          runtimeScheduler.cancel(compactUnlockTimerRef.current);
          compactUnlockTimerRef.current = null;
        }
        wasCompactRef.current = true;
        setCompactLock("surface-opening", true);
        pendingSurfaceSchedulerRef.current.schedule(
          surfaceId,
          runOpen,
          NAV_COMPACT_TO_SURFACE_DELAY_MS,
        );
      } else {
        runOpen();
      }
      return resultPromise;
    },
    [
      finishSurfaceTransition,
      runSurfaceChoreography,
      runtimeScheduler,
      setCompactLock,
      setExpanded,
      setSearchQuery,
    ],
  );
  const updateSurfaceFlow = useCallback(
    (flowId, snapshot) => {
      const surfaceId = surfaceFlowToSurfaceIdMapRef.current.get(flowId);
      if (!surfaceId) return false;
      const session = surfaceFlowSessionMapRef.current.get(surfaceId);
      const surfaceEntry = surfaceEntryMapRef.current.get(surfaceId);
      if (!session || !surfaceEntry) return false;
      const nextSession = updateSurfaceFlowSession(session, snapshot);
      if (!nextSession) return false;
      const nextSurfaceEntry = {
        ...surfaceEntry,
        flow: toSurfaceFlowState(nextSession),
      };
      surfaceFlowSessionMapRef.current.set(surfaceId, nextSession);
      surfaceEntryMapRef.current.set(surfaceId, nextSurfaceEntry);
      syncSurfaceFlowUrlState(
        nextSurfaceEntry,
        surfaceUrlStateMapRef.current.get(surfaceId),
      );
      syncSurfaceStack(
        updateSurfaceStackEntry(
          surfaceStackRef.current,
          surfaceId,
          () => nextSurfaceEntry,
        ),
      );
      return true;
    },
    [syncSurfaceStack],
  );
  const completeSurfaceFlow = useCallback(
    (flowId, data = null) => {
      const surfaceId = surfaceFlowToSurfaceIdMapRef.current.get(flowId);
      if (!surfaceId) return false;
      const session = surfaceFlowSessionMapRef.current.get(surfaceId);
      if (session) {
        surfaceFlowSessionMapRef.current.set(surfaceId, {
          ...session,
          status: NAV_SURFACE_FLOW_STATUS.COMPLETED,
        });
      }
      closeSurface(
        {
          data,
          success: true,
        },
        surfaceId,
      );
      return true;
    },
    [closeSurface],
  );
  const cancelSurfaceFlow = useCallback(
    (flowId, data = null) => {
      const surfaceId = surfaceFlowToSurfaceIdMapRef.current.get(flowId);
      if (!surfaceId) return false;
      const session = surfaceFlowSessionMapRef.current.get(surfaceId);
      if (session) {
        surfaceFlowSessionMapRef.current.set(surfaceId, {
          ...session,
          status: NAV_SURFACE_FLOW_STATUS.CANCELLED,
        });
      }
      closeSurface(
        {
          cancelled: true,
          data,
          reason: "flow-cancelled",
          success: false,
        },
        surfaceId,
      );
      return true;
    },
    [closeSurface],
  );
  const getSurfaceFlow = useCallback(
    (flowId) => {
      const surfaceId = surfaceFlowToSurfaceIdMapRef.current.get(flowId);
      const session = surfaceId
        ? surfaceFlowSessionMapRef.current.get(surfaceId)
        : null;
      if (!session) return null;
      return {
        cancel: (data = null) => cancelSurfaceFlow(flowId, data),
        complete: (data = null) => completeSurfaceFlow(flowId, data),
        flowId,
        isOpen: session.status === NAV_SURFACE_FLOW_STATUS.OPEN,
        snapshot: session.snapshot,
        status: session.status,
        update: (snapshot) => updateSurfaceFlow(flowId, snapshot),
      };
    },
    [cancelSurfaceFlow, completeSurfaceFlow, updateSurfaceFlow],
  );
  const openSurfaceFlow = useCallback(
    (input, flowInput = null, { preserveUrl = false, snapshot } = {}) => {
      const definition = createSurfaceFlowDefinition(input);
      if (!definition) {
        const error = createSurfaceError(
          "NAV_SURFACE_FLOW_INVALID_DEFINITION",
          "Nav surface flow definition is invalid",
        );
        console.error(error);
        return Promise.resolve({
          success: false,
          error,
        });
      }
      const existingSurfaceId = surfaceFlowToSurfaceIdMapRef.current.get(
        definition.id,
      );
      if (definition.singleton && existingSurfaceId) {
        return (
          surfacePromiseMapRef.current.get(existingSurfaceId) ??
          Promise.resolve({
            success: false,
            error: createSurfaceError(
              "NAV_SURFACE_FLOW_ORPHANED",
              "Nav surface flow is orphaned",
            ),
          })
        );
      }
      const flowSession = createSurfaceFlowSession(definition, {
        input: flowInput,
        snapshot,
      });
      let surfaceInput;
      try {
        surfaceInput = definition.createSurface({
          flowId: definition.id,
          input: flowInput,
          snapshot: flowSession.snapshot,
        });
      } catch (error) {
        console.error("Nav surface flow factory failed:", error);
        return Promise.resolve({
          success: false,
          error,
        });
      }
      return openSurface(surfaceInput, {
        flowSession,
        preserveUrl,
      });
    },
    [openSurface],
  );
  const restoreSurfaceFlow = useCallback(
    (input) => {
      const definition = createSurfaceFlowDefinition(input);
      const snapshot = getRestorableSurfaceFlowSnapshot(definition);
      if (!definition || snapshot === undefined) return Promise.resolve(null);
      return openSurfaceFlow(definition, null, {
        preserveUrl: true,
        snapshot,
      });
    },
    [openSurfaceFlow],
  );
  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const handlePopState = () => {
      const activeEntry =
        surfaceStackRef.current[surfaceStackRef.current.length - 1];
      if (!activeEntry?.syncWithUrl && !activeEntry?.urlKey) return;
      const expectedValue = getSurfaceUrlValue(activeEntry);
      if (
        new URL(window.location.href).searchParams.get("surface") ===
        expectedValue
      )
        return;
      closeAllSurfaces({
        success: false,
        cancelled: true,
        reason: "browser-back",
      });
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [closeAllSurfaces]);
  useEffect(() => {
    const pendingScheduler = pendingSurfaceSchedulerRef.current;
    const resolveMap = surfaceResolveMapRef.current;
    const payloadMap = surfacePayloadMapRef.current;
    const entryMap = surfaceEntryMapRef.current;
    const flowSessionMap = surfaceFlowSessionMapRef.current;
    const flowToSurfaceIdMap = surfaceFlowToSurfaceIdMapRef.current;
    const promiseMap = surfacePromiseMapRef.current;
    const onCloseMap = surfaceOnCloseMapRef.current;
    const urlStateMap = surfaceUrlStateMapRef.current;
    return () => {
      if (compactUnlockTimerRef.current !== null) {
        runtimeScheduler.cancel(compactUnlockTimerRef.current);
        compactUnlockTimerRef.current = null;
      }
      clearChoreographyTimers();
      if (focusRestoreFrameRef.current !== null) {
        runtimeScheduler.cancel(focusRestoreFrameRef.current);
        focusRestoreFrameRef.current = null;
      }
      const surfaceIds = [
        ...surfaceStackRef.current.map((entry) => entry.id),
        ...pendingScheduler.cancelAll(),
      ];
      const result = {
        cancelled: true,
        reason: "unmount",
        success: false,
      };
      surfaceIds.forEach((surfaceId) => {
        releaseSurfaceResources({
          result,
          surfaceEntryMap: entryMap,
          surfaceId,
          surfaceOnCloseMap: onCloseMap,
          surfacePayloadMap: payloadMap,
          surfaceFlowSessionMap: flowSessionMap,
          surfaceFlowToSurfaceIdMap: flowToSurfaceIdMap,
          surfacePromiseMap: promiseMap,
          surfaceResolveMap: resolveMap,
          surfaceUrlStateMap: urlStateMap,
        });
      });
      surfaceStackRef.current = [];
      surfaceFocusOriginMapRef.current.clear();
      payloadMap.clear();
      entryMap.clear();
      flowSessionMap.clear();
      flowToSurfaceIdMap.clear();
      promiseMap.clear();
    };
  }, [clearChoreographyTimers, runtimeScheduler]);
  return {
    closeAllSurfaces,
    closeSurface,
    goBackSurface,
    goToStep,
    handleSurfaceAnimationComplete,
    isCompact: surfaceLifecycleState.isCompact,
    cancelSurfaceFlow,
    completeSurfaceFlow,
    getSurfaceFlow,
    openSurface,
    openSurfaceFlow,
    popStep,
    pushStep,
    setIsCompact,
    restoreSurfaceFlow,
    surfacePhase,
    surfaceState: {
      ...surfaceState,
      surfacePhase,
      surfaceLifecycle: surfaceLifecycleState.surfaceLifecycle,
    },
    updateSurfaceFlow,
  };
}
const SurfaceHeaderContext = createContext(null);
export const SurfaceExtensionsContext = createContext(null);
export const SurfaceIdContext = createContext(null);
export function useSurfaceId() {
  return useContext(SurfaceIdContext);
}
export function useSurfaceHeader() {
  return useContext(SurfaceHeaderContext);
}
class SurfaceExtensionsStore {
  constructor() {
    this.extensionsBySurface = new Map();
    this.cachedListBySurface = new Map();
    this.listeners = new Set();
    this.version = 0;
  }
  subscribe = (listener) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  notify = () => {
    this.version++;
    this.cachedListBySurface.clear();
    for (const listener of this.listeners) {
      listener();
    }
  };
  getExtensionsForSurface = (surfaceId) => {
    const sId = surfaceId != null ? String(surfaceId) : "global";
    if (this.cachedListBySurface.has(sId)) {
      return this.cachedListBySurface.get(sId);
    }
    const globalExts = this.extensionsBySurface.get("global");
    const surfaceExts = this.extensionsBySurface.get(sId);
    if (!globalExts && !surfaceExts) {
      const empty = [];
      this.cachedListBySurface.set(sId, empty);
      return empty;
    }
    const merged = new Map();
    if (globalExts) {
      for (const [id, ext] of globalExts) {
        merged.set(id, ext);
      }
    }
    if (surfaceExts) {
      for (const [id, ext] of surfaceExts) {
        merged.set(id, ext);
      }
    }
    const result = Array.from(merged.values()).sort(
      (a, b) => a.order - b.order,
    );
    this.cachedListBySurface.set(sId, result);
    return result;
  };
  setExtension = (surfaceId, extension) => {
    if (!extension) return;
    const normalized = normalizeSurfaceExtension(extension);
    if (!normalized) return;
    const sId = surfaceId != null ? String(surfaceId) : "global";
    let surfaceMap = this.extensionsBySurface.get(sId);
    if (!surfaceMap) {
      surfaceMap = new Map();
      this.extensionsBySurface.set(sId, surfaceMap);
    }
    const prev = surfaceMap.get(normalized.id);
    if (
      prev &&
      prev.content === normalized.content &&
      prev.align === normalized.align &&
      prev.order === normalized.order &&
      prev.className === normalized.className &&
      prev.unstyled === normalized.unstyled &&
      prev.component === normalized.component &&
      prev.props === normalized.props
    ) {
      return;
    }
    surfaceMap.set(normalized.id, normalized);
    this.notify();
  };
  removeExtension = (surfaceId, extensionId) => {
    if (!extensionId) return;
    const sId = surfaceId != null ? String(surfaceId) : "global";
    const surfaceMap = this.extensionsBySurface.get(sId);
    if (!surfaceMap || !surfaceMap.has(extensionId)) return;
    surfaceMap.delete(extensionId);
    if (surfaceMap.size === 0) {
      this.extensionsBySurface.delete(sId);
    }
    this.notify();
  };
  clearSurface = (surfaceId) => {
    const sId = surfaceId != null ? String(surfaceId) : "global";
    if (!this.extensionsBySurface.has(sId)) return;
    this.extensionsBySurface.delete(sId);
    this.notify();
  };
}
export function SurfaceExtensionsProvider({ children }) {
  const storeRef = useRef(null);
  if (!storeRef.current) {
    storeRef.current = new SurfaceExtensionsStore();
  }
  return (
    <SurfaceExtensionsContext.Provider value={storeRef.current}>
      {children}
    </SurfaceExtensionsContext.Provider>
  );
}
export function useSurfaceExtensions(input) {
  const store = useContext(SurfaceExtensionsContext);
  const surfaceId = useSurfaceId();
  useEffect(() => {
    if (input == null || !store) return undefined;
    const list = Array.isArray(input) ? input : [input];
    list.forEach((item) => store.setExtension(surfaceId, item));
    return () => {
      store.clearSurface(surfaceId);
    };
  }, [store, surfaceId, input]);
  return store;
}
export function NavSurfaceExtension({
  align = "left",
  children,
  className = "",
  id,
  order = 0,
  unstyled = false,
}) {
  const store = useContext(SurfaceExtensionsContext);
  const surfaceId = useSurfaceId();
  const generatedIdRef = useRef(null);
  if (generatedIdRef.current === null) {
    generatedIdRef.current =
      id || `nav-surface-ext-${Math.random().toString(36).slice(2, 9)}`;
  }
  const effectiveId = id || generatedIdRef.current;
  useEffect(() => {
    if (!store) return;
    store.setExtension(surfaceId, {
      align,
      className,
      content: children,
      id: effectiveId,
      order,
      unstyled,
    });
  });
  useEffect(() => {
    return () => {
      if (store) {
        store.removeExtension(surfaceId, effectiveId);
      }
    };
  }, [store, surfaceId, effectiveId]);
  return null;
}
function ExtensionPill({ ext, fill = false }) {
  const Component = ext.component;
  const content = Component ? (
    isValidComponentType(Component) ? (
      <Component {...ext.props} />
    ) : null
  ) : (
    ext.content
  );
  if (ext.unstyled) {
    return (
      <div
        className={cn(
          "pointer-events-auto",
          fill && "w-full min-w-0 flex-1",
          ext.className,
        )}
        onClick={(event) => event.stopPropagation()}
      >
        {content}
      </div>
    );
  }
  return (
    <div
      className={cn(
        "pointer-events-auto flex h-10 max-w-full items-center gap-1 rounded-full bg-black/60 p-1 shadow-lg ring-1 ring-white/10 backdrop-blur-xl select-none ring-inset",
        fill && "w-full min-w-0 flex-1",
        ext.className,
      )}
      onClick={(event) => event.stopPropagation()}
    >
      {content}
    </div>
  );
}
export function useIsSurfaceExtensionsVisible(activeItem) {
  const store = useContext(SurfaceExtensionsContext);
  const surfaceId = activeItem?.surfaceId || "global";
  const isSurface = Boolean(activeItem?.isSurface);
  const phase = activeItem?.surfacePhase;
  const isBodyVisible =
    phase === NAV_SURFACE_PHASE.EXPANDING_BODY ||
    phase === NAV_SURFACE_PHASE.OPEN;
  const subscribe = useCallback(
    (onStoreChange) => {
      if (!store) return () => {};
      return store.subscribe(onStoreChange);
    },
    [store],
  );
  const getSnapshot = useCallback(() => {
    if (!store) return 0;
    return store.getExtensionsForSurface(surfaceId).length;
  }, [store, surfaceId]);
  const dynamicCount = useSyncExternalStore(subscribe, getSnapshot, () => 0);
  const descriptorCount = useMemo(() => {
    const raw = activeItem?.surfaceExtensions || activeItem?.extensions || [];
    return Array.isArray(raw) ? raw.length : 0;
  }, [activeItem?.surfaceExtensions, activeItem?.extensions]);
  return Boolean(
    isSurface && isBodyVisible && (dynamicCount > 0 || descriptorCount > 0),
  );
}
export const NavSurfaceExtensionsBar = memo(function NavSurfaceExtensionsBar({
  activeItem,
}) {
  const isSurface = Boolean(activeItem?.isSurface);
  const phase = activeItem?.surfacePhase;
  const isBodyVisible =
    phase === NAV_SURFACE_PHASE.EXPANDING_BODY ||
    phase === NAV_SURFACE_PHASE.OPEN;
  const store = useContext(SurfaceExtensionsContext);
  const surfaceId = activeItem?.surfaceId || "global";
  const subscribe = useCallback(
    (onStoreChange) => {
      if (!store) return () => {};
      return store.subscribe(onStoreChange);
    },
    [store],
  );
  const getSnapshot = useCallback(() => {
    if (!store) return [];
    return store.getExtensionsForSurface(surfaceId);
  }, [store, surfaceId]);
  const dynamicExtensions = useSyncExternalStore(
    subscribe,
    getSnapshot,
    () => [],
  );
  const descriptorExtensions = useMemo(() => {
    const raw = activeItem?.surfaceExtensions || activeItem?.extensions || [];
    return Array.isArray(raw)
      ? raw.map(normalizeSurfaceExtension).filter(Boolean)
      : [];
  }, [activeItem?.surfaceExtensions, activeItem?.extensions]);
  const allExtensions = useMemo(() => {
    const map = new Map();
    descriptorExtensions.forEach((ext) => map.set(ext.id, ext));
    dynamicExtensions.forEach((ext) => map.set(ext.id, ext));
    return Array.from(map.values()).sort((a, b) => a.order - b.order);
  }, [descriptorExtensions, dynamicExtensions]);
  const hasExtensions = allExtensions.length > 0;
  const shouldRender = isSurface && isBodyVisible && hasExtensions;
  const leftExtensions = useMemo(
    () => allExtensions.filter((e) => e.align === "left"),
    [allExtensions],
  );
  const centerExtensions = useMemo(
    () => allExtensions.filter((e) => e.align === "center"),
    [allExtensions],
  );
  const rightExtensions = useMemo(
    () => allExtensions.filter((e) => e.align === "right"),
    [allExtensions],
  );
  const hasCenter = centerExtensions.length > 0;
  return (
    <AnimatePresence>
      {shouldRender && (
        <motion.div
          key={`nav-surface-extensions-${surfaceId}`}
          variants={navSurfaceExtensionsVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={NAV_SURFACE_EXTENSIONS_ENTER_TRANSITION}
          style={NAV_COMPOSITOR_STYLE}
          className="pointer-events-none absolute inset-x-0 bottom-[calc(100%+4px)] z-20 flex w-full items-center justify-between gap-1 select-none"
          onClick={(event) => event.stopPropagation()}
        >
          {}
          <div className="pointer-events-auto flex min-w-0 flex-1 items-center justify-start gap-1">
            {leftExtensions.map((ext) => (
              <ExtensionPill
                key={ext.id}
                ext={ext}
                fill={!hasCenter && leftExtensions.length === 1}
              />
            ))}
          </div>

          {}
          {hasCenter && (
            <div className="pointer-events-auto flex shrink-0 items-center justify-center gap-1">
              {centerExtensions.map((ext) => (
                <ExtensionPill key={ext.id} ext={ext} />
              ))}
            </div>
          )}

          {}
          <div
            className={cn(
              "pointer-events-auto flex items-center justify-end gap-1",
              hasCenter ? "min-w-0 flex-1" : "shrink-0",
            )}
          >
            {rightExtensions.map((ext) => (
              <ExtensionPill key={ext.id} ext={ext} />
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});
export function NavSurfaceHeaderButton({
  children,
  className = "",
  disabled = false,
  onClick,
  ariaLabel,
}) {
  return (
    <Button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onClick?.(event);
      }}
      disabled={disabled}
      aria-label={ariaLabel}
      className={cn(
        "center relative h-8 shrink-0 cursor-pointer gap-1 rounded-xl bg-white/5 px-2.5 text-xs font-bold whitespace-nowrap text-white/70 uppercase ring-1 ring-white/5 ring-inset hover:z-10 hover:bg-white hover:text-black hover:ring-transparent focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-white/10 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
    >
      {children}
    </Button>
  );
}
export function NavSurfaceHeader({
  icon = null,
  title = "",
  description = "",
  trailing = null,
  headerAction = null,
  onClose = null,
  onBack = null,
  stepIndex = 0,
  totalSteps = 1,
  badge = null,
  closeLabel = "Close surface",
  backLabel = "Previous step",
  descriptionMaxLines = 2,
  descriptionId = undefined,
  className = "",
  titleId = undefined,
}) {
  const hasHeaderAction = Boolean(headerAction);
  const hasClose = typeof onClose === "function";
  const hasBack = typeof onBack === "function";
  const controlCount = [hasHeaderAction, hasBack, hasClose].filter(
    Boolean,
  ).length;
  const renderedHeaderAction = useMemo(() => {
    if (!hasHeaderAction) return null;
    if (isValidElement(headerAction)) {
      return cloneElement(headerAction, {
        className: cn(
          headerAction.props?.className,
          hasClose ? "rounded-l-[20px] rounded-r-none" : "rounded-[20px]",
        ),
      });
    }
    return headerAction;
  }, [hasClose, hasHeaderAction, headerAction]);
  const stepIndicatorText =
    totalSteps > 1 ? `Step ${stepIndex + 1} of ${totalSteps}` : null;
  const surfaceHeaderKey = useMemo(() => {
    const iconPart =
      typeof icon === "string" ? icon : icon ? "icon-node" : "no-icon";
    return `${iconPart}:${title}:${description}:${stepIndex}:${badge || ""}`;
  }, [badge, description, icon, stepIndex, title]);
  return (
    <div
      className={cn(
        "relative flex w-full min-w-0 items-start justify-between gap-2.5",
        className,
      )}
    >
      <div className="relative min-w-0 flex-1 overflow-hidden">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={surfaceHeaderKey}
            variants={navHeaderSwapVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={NAV_HEADER_SWAP_TRANSITION}
            className="flex w-full min-w-0 items-center gap-2.5 overflow-hidden"
            style={{
              ...NAV_COMPOSITOR_STYLE,
            }}
          >
            {icon ? (
              <div className="relative size-12 shrink-0">
                {isImageIconSource(icon) ? (
                  <div
                    className="size-12 shrink-0 rounded-[20px] bg-cover bg-center bg-no-repeat"
                    style={{
                      backgroundImage: `url(${icon})`,
                    }}
                  />
                ) : (
                  <div className="center size-12 rounded-[20px] bg-white/5 text-white">
                    {typeof icon === "string" ? (
                      <Iconify icon={icon} size={24} />
                    ) : (
                      icon
                    )}
                  </div>
                )}
              </div>
            ) : null}

            <div className="flex min-w-0 flex-1 items-center justify-between gap-2.5 overflow-hidden">
              <div className="flex min-w-0 flex-1 flex-col justify-center -space-y-0.5">
                <div className="flex items-center gap-1.5 overflow-hidden">
                  <h3
                    id={titleId}
                    className="truncate text-base font-bold text-white"
                  >
                    {title}
                  </h3>
                  {badge ? (
                    <span className="center rounded-full bg-white/10 px-2 py-0.5 text-xs font-semibold text-white">
                      {badge}
                    </span>
                  ) : stepIndicatorText ? (
                    <span className="text-xs font-semibold text-white/50">
                      • {stepIndicatorText}
                    </span>
                  ) : null}
                </div>
                {description ? (
                  <p
                    id={descriptionId}
                    className="text-sm leading-snug text-white/70"
                    style={{
                      display: "-webkit-box",
                      WebkitBoxOrient: "vertical",
                      WebkitLineClamp: descriptionMaxLines,
                      overflow: "hidden",
                    }}
                  >
                    {description}
                  </p>
                ) : null}
              </div>
              {trailing ? <div className="shrink-0">{trailing}</div> : null}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {controlCount ? (
        <motion.div
          key="nav-surface-header-controls"
          variants={navSurfaceControlsVariants}
          custom={0}
          initial="hidden"
          animate="visible"
          exit="exit"
          className={cn(
            "flex shrink-0 items-center self-start",
            controlCount > 1 ? "gap-[1px]" : "gap-1",
          )}
        >
          {renderedHeaderAction ? (
            <motion.div
              key="surface-header-action"
              variants={navSurfaceControlsVariants}
              custom={0}
            >
              {renderedHeaderAction}
            </motion.div>
          ) : null}
          {hasBack ? (
            <motion.div
              key="surface-header-back"
              variants={navSurfaceControlsVariants}
              custom={1}
            >
              <Button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onBack();
                }}
                className={cn(
                  "center relative size-8 shrink-0 cursor-pointer bg-white/5 text-white/70 ring-1 ring-white/5 ring-inset hover:z-10 hover:bg-white hover:text-black hover:ring-transparent focus-visible:z-10",
                  hasClose
                    ? "rounded-l-[20px] rounded-r-none"
                    : "rounded-[20px]",
                  hasHeaderAction ? "rounded-l-none" : "",
                )}
                aria-label={backLabel}
              >
                <Iconify icon="solar:alt-arrow-left-bold" size={16} />
              </Button>
            </motion.div>
          ) : null}
          {hasClose ? (
            <motion.div
              key="surface-header-close"
              variants={navSurfaceControlsVariants}
              custom={2}
            >
              <Button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onClose();
                }}
                className={cn(
                  "center relative size-8 shrink-0 cursor-pointer bg-white/5 text-white/70 ring-1 ring-white/5 ring-inset hover:z-10 hover:bg-white hover:text-black hover:ring-transparent focus-visible:z-10",
                  controlCount > 1
                    ? "rounded-l-none rounded-r-[20px]"
                    : "rounded-[20px]",
                )}
                aria-label={closeLabel}
              >
                <Iconify icon="material-symbols:close-rounded" size={16} />
              </Button>
            </motion.div>
          ) : null}
        </motion.div>
      ) : null}
    </div>
  );
}
export const NavSurfaceShell = forwardRef(function NavSurfaceShell(
  {
    icon = null,
    title = "",
    description = "",
    trailing = null,
    headerAction = null,
    onClose = null,
    onBack = null,
    stepIndex = 0,
    totalSteps = 1,
    badge = null,
    allowSwipeDismiss = true,
    closeLabel = "Close surface",
    backLabel = "Previous step",
    descriptionMaxLines = 2,
    className = "",
    contentClassName = "",
    children,
    onAnimationComplete = null,
    isActive = true,
    surfaceId = null,
    surfacePhase = NAV_SURFACE_PHASE.OPEN,
  },
  ref,
) {
  const surfaceElementRef = useRef(null);
  const [headerState, setHeaderState] = useState({
    icon,
    title,
    description,
    trailing,
    headerAction,
    onBack,
    stepIndex,
    totalSteps,
    badge,
  });
  useEffect(() => {
    setHeaderState((previousState) => ({
      ...previousState,
      icon,
      title,
      description,
      trailing,
      headerAction,
      onBack,
      stepIndex,
      totalSteps,
      badge,
    }));
  }, [
    badge,
    description,
    headerAction,
    icon,
    onBack,
    stepIndex,
    title,
    totalSteps,
    trailing,
  ]);
  const setSurfaceElementRef = useCallback(
    (node) => {
      surfaceElementRef.current = node;
      if (typeof ref === "function") {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    },
    [ref],
  );
  const isFullyOpen = surfacePhase === NAV_SURFACE_PHASE.OPEN;
  const patchHeader = useCallback((patch) => {
    setHeaderState((previousState) => ({
      ...previousState,
      ...(typeof patch === "function" ? patch(previousState) : patch),
    }));
  }, []);
  const titleId =
    surfaceId == null ? undefined : `nav-surface-title-${surfaceId}`;
  const descriptionId =
    surfaceId == null || !headerState.description
      ? undefined
      : `nav-surface-description-${surfaceId}`;
  const dragY = useMotionValue(0);
  const dragOpacity = useTransform(dragY, [0, 180], [1, 0.75]);
  const dragScale = useTransform(dragY, [0, 180], [1, 0.96]);
  useNavigationFocusTrap({
    containerRef: surfaceElementRef,
    enabled: isActive && isFullyOpen,
    onDismiss: typeof onClose === "function" ? onClose : null,
  });
  const handleDragEnd = (_event, info) => {
    if (
      !isActive ||
      !allowSwipeDismiss ||
      typeof onClose !== "function" ||
      !isFullyOpen
    )
      return;
    if (info.offset.y > 65 || info.velocity.y > 400) {
      onClose();
    }
  };
  const isBodyVisible =
    surfacePhase === NAV_SURFACE_PHASE.EXPANDING_BODY ||
    surfacePhase === NAV_SURFACE_PHASE.OPEN;
  const isHeaderVisible =
    surfacePhase !== NAV_SURFACE_PHASE.DISMISSING_ACTION &&
    surfacePhase !== NAV_SURFACE_PHASE.IDLE;
  const resolvedSurfaceId = surfaceId || "active";
  return (
    <SurfaceIdContext.Provider value={resolvedSurfaceId}>
      <SurfaceHeaderContext.Provider value={patchHeader}>
        <motion.section
          ref={setSurfaceElementRef}
          role="dialog"
          aria-modal="true"
          aria-describedby={descriptionId}
          aria-hidden={isActive ? undefined : true}
          aria-labelledby={titleId}
          inert={isActive ? undefined : true}
          tabIndex={-1}
          className={cn(
            "relative flex flex-col gap-2.5 overflow-visible",
            !isActive && "hidden",
            className,
          )}
          style={{
            ...NAV_COMPOSITOR_STYLE,
            y: dragY,
            opacity: dragOpacity,
            scale: dragScale,
          }}
          transformTemplate={navSurfaceDragTransformTemplate}
          drag={
            isActive &&
            allowSwipeDismiss &&
            typeof onClose === "function" &&
            isFullyOpen
              ? "y"
              : false
          }
          dragConstraints={NAV_SURFACE_DRAG_CONSTRAINTS}
          dragElastic={NAV_SURFACE_DRAG_ELASTIC}
          onDragEnd={handleDragEnd}
          onAnimationComplete={onAnimationComplete}
        >
          <div className="w-full">
            <NavSurfaceHeader
              descriptionMaxLines={descriptionMaxLines}
              descriptionId={descriptionId}
              description={headerState.description}
              trailing={headerState.trailing}
              headerAction={headerState.headerAction}
              title={headerState.title}
              titleId={titleId}
              icon={headerState.icon}
              onBack={headerState.onBack || onBack}
              stepIndex={headerState.stepIndex ?? stepIndex}
              totalSteps={headerState.totalSteps ?? totalSteps}
              badge={headerState.badge ?? badge}
              closeLabel={closeLabel}
              backLabel={backLabel}
              onClose={onClose}
            />
          </div>

          <AnimatePresence mode="wait" initial={false}>
            {isBodyVisible && (
              <motion.div
                key="surface-body-motion"
                variants={navSurfaceBodyVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                transition={
                  surfacePhase === NAV_SURFACE_PHASE.COLLAPSING_BODY
                    ? NAV_SURFACE_BODY_EXIT_TRANSITION
                    : NAV_SURFACE_BODY_ENTER_TRANSITION
                }
                style={{
                  ...NAV_COMPOSITOR_STYLE,
                }}
                className={cn("w-full overflow-visible", contentClassName)}
              >
                {children}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.section>
      </SurfaceHeaderContext.Provider>
    </SurfaceIdContext.Provider>
  );
});
