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
import { useClickOutside, Z_INDEX } from "@/shared";
import {
  canPreviewStackOnTopHover,
  estimateCompactCardWidth,
  getIsItemActive,
  getItemKey,
  useNavHeightController,
  useNavViewport,
} from "./layout";
import { NavBreadcrumbsCard, useNavBreadcrumbs } from "./breadcrumbs";
import {
  NavSurfaceExtensionsBar,
  useIsSurfaceExtensionsVisible,
} from "./surface";
import { useNavKeyboard } from "./behavior";
import { NavCardItem } from "./cards";
import {
  NAV_BACKDROP_TRANSITION,
  NAV_CARD_HEIGHT_CLOSE_TRANSITION,
  NAV_CARD_HEIGHT_OPEN_TRANSITION,
  NAV_STACK_TRANSITION,
  NAV_SURFACE_CHOREOGRAPHY_TIMINGS,
  getNavStackAnimateProps,
  navBackdropVariants,
} from "./motion";
import {
  NAV_SURFACE_PHASE,
} from "./constants";
import {
  useNavigation,
  useNavigationActions,
  useNavigationSelector,
} from "./provider";
import { useIsFullscreenStateActive } from "@/ui/feedback/fullscreen-state";
export {
  NAV_TAP_SCALE,
  NAV_BUTTON_TRANSITION,
  NAV_CARD_SPRING,
  NAV_CARD_TRANSITION,
  NAV_CARD_EXPAND_TRANSITION,
  NAV_CARD_COLLAPSE_TRANSITION,
  NAV_FADE_TRANSITION,
  NAV_MICRO_TRANSITION,
  NAV_SKELETON_PULSE_CLASS,
  NAV_SCRUBBER_TOOLTIP_SPRING,
  NAV_MEDIA_VOLUME_FILL_TRANSITION,
  NAV_MEDIA_VOLUME_THUMB_POSITION_TRANSITION,
  NAV_RESULTS_TRANSITION,
  NAV_SURFACE_CHOREOGRAPHY_TIMINGS,
  NAV_RESULTS_EXIT_TRANSITION,
  NAV_RESULTS_STAGGER_DELAY,
  NAV_CARD_HEIGHT_OPEN_TRANSITION,
  NAV_CARD_HEIGHT_CLOSE_TRANSITION,
  NAV_COMPOSITOR_STYLE,
  NAV_ACTION_DISMISS_TRANSITION,
  NAV_HEADER_SWAP_TRANSITION,
  NAV_SURFACE_BODY_ENTER_TRANSITION,
  NAV_SURFACE_BODY_EXIT_TRANSITION,
  navActionDismissVariants,
  navHeaderSwapVariants,
  navHeaderRestoreVariants,
  navSurfaceControlsVariants,
  navSurfaceDragTransformTemplate,
  navCommandBarSwapVariants,
  navSurfaceBodyVariants,
  navSurfaceExtensionsVariants,
  NAV_SURFACE_EXTENSIONS_ENTER_TRANSITION,
  NAV_SURFACE_EXTENSIONS_EXIT_TRANSITION,
  navActionVariants,
  navMediaVolumeThumbVariants,
  slideFadeVariants,
  textCrossfadeVariants,
  staggerItemVariants,
  navListItemVariants,
  navFadeVariants,
  navIconVariants,
  navBadgeVariants,
  navBackdropVariants,
  navBreadcrumbsVariants,
  navHudVariants,
  getNavDescriptionVariants,
  getNavActionStaggerTransition,
  getNavMediaVolumeFillTransition,
  getNavMediaVolumeThumbAnimateProps,
  getNavMediaVolumeThumbPositionTransition,
  getNavStackAnimateProps,
  getNavCardDelay,
  getNavItemAnimateValues,
  getNavItemTransition,
  getNavCardContentAnimateProps,
  getNavScrollProgressStyle,
  navSoundwaveBarVariants,
  navScrubberTooltipVariants,
  NAV_SCRUBBER_TOOLTIP_TRANSITION,
  NAV_SURFACE_HEADER_REVEAL_DELAY_MS,
  NAV_SURFACE_TRANSITION,
  NAV_SURFACE_DRAG_CONSTRAINTS,
  NAV_SURFACE_DRAG_ELASTIC,
} from "./motion";
export {
  NAV_ACTION_MOTION_PROPS,
  NAV_ACTION_STYLES,
  NAV_ATTENTION_KIND,
  NAV_ATTENTION_PRIORITY,
  NAV_ATTENTION_PRIORITY_OFFSET_MAX,
  NAV_HUD_PRIORITY,
  NAV_HUD_RENDER_MODE,
  NAV_HUD_VARIANT,
  NAV_COLLAPSE_TO_COMPACT_DELAY_MS,
  NAV_SURFACE_FLOW_STATUS,
  NAV_SURFACE_PHASE,
  NAV_SURFACE_RENDER_MODE,
  NAVIGATION_CONTINUITY_EVENTS,
  NAVIGATION_SURFACE_RETURN_MAX_ENTRIES,
  NAVIGATION_OPERATION_EVENTS,
  NAVIGATION_OPERATION_STATUS,
  NAVIGATION_DIAGNOSTIC_EVENTS,
  NAVIGATION_EVENTS,
  NAVIGATION_LIFECYCLE,
  NAVIGATION_TRANSACTION_STATUS,
  SEMANTIC_SURFACE_CLASSES,
} from "./constants";
export { formatMediaTime } from "./media";
export { getNavActionClass, isValidComponentType } from "./utils";
export { NavMediaControls, NavMediaScrubber, NavSoundwave } from "./media";
export {
  NavCardHeader,
  NavDescription,
  NavIcon,
  NavTitle,
  resolveNavHeaderKey,
} from "./cards";
export {
  BreadcrumbProvider,
  NavBreadcrumbsCard,
  resolveRouteBreadcrumbs,
  useBreadcrumbActions,
  useBreadcrumbOverrides,
  useNavBreadcrumbs,
  useRegisterBreadcrumbOverride,
} from "./breadcrumbs";
export {
  areHudDefinitionsEqual,
  createHudDefinition,
  createNavigationOperationHud,
  isHudDescriptor,
  resolveActiveHud,
  upsertHudEntry,
} from "./hud";
export {
  applySurfaceToNavItem,
  createInlineSurfaceEntry,
  createPendingSurfaceScheduler,
  createSurfaceEntryDefinition,
  createSurfaceFlowDefinition,
  createSurfaceFlowSession,
  createSurfaceReturnHandshake,
  isSurfaceDescriptor,
  NavSurfaceExtension,
  NavSurfaceExtensionsBar,
  normalizeSurfaceExtension,
  resolveActiveStepDefinition,
  resolveSurfaceAction,
  SurfaceExtensionsContext,
  SurfaceExtensionsProvider,
  updateSurfaceFlowSession,
  useIsSurfaceExtensionsVisible,
  useSurfaceExtensions,
  useSurfaceFlow,
  useSurfaceId,
} from "./surface";
export {
  applyStatusOverlay,
  createErrorStatus,
  createGuardStatus,
  ErrorAction,
  ErrorActions,
  getStatusTheme,
  GuardAction,
  GuardActions,
  useNavigationStatus,
} from "./status";
export {
  createNavigationTransaction,
  createNavigationTransactionState,
  createNavigationContinuityEntry,
  createNavigationContinuityState,
  createNavigationReturnHandoff,
  createNavigationTopology,
  getNavigationLocationKey,
  navigationContinuityReducer,
  navigationTransactionReducer,
  resolveNavigationContinuityEntry,
  resolveNavigationReturnHandoffs,
  resolveNavigationRoutePolicy,
  resolveNavigationTopologyPath,
  useNavigationContinuity,
  useNavigationTransactions,
  useRoutePrefetch,
} from "./routing";
export {
  canUseBottomLock,
  focusNavigationElement,
  getNavigationFocusableElements,
  shouldRestoreNavigationFocus,
} from "./behavior";
export {
  NavHeightSpacer,
  NavHud,
  NavSurfaceHeader,
  NavSurfaceHeaderButton,
  NavSurfaceShell,
  NavigationProvider,
  checkGuards,
  clearNavigationGuards,
  createNavigationMachineState,
  getNavigationGuardCount,
  navigationStateReducer,
  registerGuard,
  resolveNavigationAttention,
  useNavContextActions,
  useNavHeight,
  useNavHud,
  useNavigation,
  useNavigationActions,
  useNavigationContext,
  useNavigationContinuityState,
  useNavigationGuard,
  useNavigationOperations,
  useNavigationRuntimeHealth,
  useNavigationSelector,
  useNavigationState,
  useSurfaceReturn,
  useSurfaceHeader,
} from "./provider";
export {
  clearNavigationDiagnostics,
  createNavigationDiagnosticStore,
  createNavigationInspectorSnapshot,
  createNavigationOperation,
  createNavigationOperationState,
  getNavigationDiagnostics,
  getNavigationInspectorSnapshot,
  navigationOperationReducer,
  resolveActiveNavigationOperation,
} from "./runtime";
export default function Nav() {
  const {
    activeItem,
    navigationItems,
    setNavHeight,
    setIsHovered,
    setExpanded,
    activeIndex,
    compact,
    exitCompact,
    isHudActive,
    expanded,
    navigate,
  } = useNavigation();
  const isFullscreenStateActive = useIsFullscreenStateActive();
  const { contextActions, hud } = useNavigationSelector(
    (state) => ({
      contextActions: state.contextActions,
      hud: state.hud,
    }),
    (left, right) =>
      left.contextActions === right.contextActions && left.hud === right.hud,
  );
  const { clearHud } = useNavigationActions();
  const [isStackHovered, setIsStackHovered] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [compactPresentation, setCompactPresentation] = useState(() => ({
    direction: null,
    value: compact,
  }));
  useLayoutEffect(() => {
    setCompactPresentation((previousPresentation) => {
      if (previousPresentation.value === compact) return previousPresentation;
      return {
        direction: compact ? "compressing" : "restoring",
        value: compact,
      };
    });
  }, [compact]);
  const presentedCompact = compactPresentation.value;
  const compactDirection = compactPresentation.direction;
  useEffect(() => {
    if (!compactDirection) return undefined;
    const frameId = window.requestAnimationFrame(() => {
      setCompactPresentation((previousPresentation) =>
        previousPresentation.direction
          ? {
              ...previousPresentation,
              direction: null,
            }
          : previousPresentation,
      );
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [compactDirection]);
  const navRef = useRef(null);
  const { portalTarget, stackWidth } = useNavViewport(activeItem);
  const clearHoverState = useCallback(() => {
    setIsStackHovered(false);
    setIsHovered(false);
  }, [setIsHovered]);
  const isOverlayActive = Boolean(activeItem?.isOverlay);
  const isBackdropVisible =
    !isFullscreenStateActive && (expanded || isOverlayActive);
  const isCompactPreviewActive =
    presentedCompact && !expanded && isStackHovered && !isOverlayActive;
  const isTopItemCompact =
    presentedCompact && !expanded && !isStackHovered && !isOverlayActive;
  const isCompactStack =
    !expanded &&
    presentedCompact &&
    !isCompactPreviewActive &&
    !isOverlayActive;
  const activeTitle = activeItem?.title || activeItem?.name || "";
  const { breadcrumbs } = useNavBreadcrumbs();
  const hasBreadcrumbs = Boolean(breadcrumbs && breadcrumbs.length > 1);
  const isBreadcrumbsCardVisible = Boolean(
    expanded && !isOverlayActive && hasBreadcrumbs,
  );
  const isExtensionsVisible = useIsSurfaceExtensionsVisible(activeItem);
  const compactStackWidth = useMemo(
    () => estimateCompactCardWidth(activeTitle, stackWidth),
    [activeTitle, stackWidth],
  );
  const contentKey = activeItem?.isSurface
    ? `surface:${activeItem.surfaceId ?? activeItem.path ?? "active"}`
    : isHudActive
      ? `hud:${hud?.id || "active"}`
      : `route:${activeItem?.path || activeItem?.name || "default"}`;
  const { containerHeight, handleContentHeightChange } = useNavHeightController(
    {
      compact: isTopItemCompact,
      contentKey,
      isHud: isHudActive,
      setNavHeight,
      surfacePhase: activeItem?.surfacePhase,
    },
  );
  const handleOutsideDismiss = useCallback(() => {
    if (isOverlayActive) return;
    if (isCompactPreviewActive) {
      clearHoverState();
      return;
    }
    setExpanded(false);
  }, [clearHoverState, isCompactPreviewActive, isOverlayActive, setExpanded]);
  useNavKeyboard({
    expanded,
    focusedIndex,
    isOverlayActive,
    navigate,
    navigationItems,
    setExpanded,
    setFocusedIndex,
  });
  useClickOutside(navRef, handleOutsideDismiss);
  useEffect(() => {
    clearHoverState();
    if (expanded) {
      setFocusedIndex(activeIndex);
      return;
    }
    setFocusedIndex(-1);
  }, [activeIndex, clearHoverState, expanded]);
  useEffect(() => {
    if (!isFullscreenStateActive) return;
    setExpanded(false);
    clearHoverState();
  }, [clearHoverState, isFullscreenStateActive, setExpanded]);
  const isNotFound = Boolean(
    activeItem?.isNotFound ||
    activeItem?.path === "not-found" ||
    activeItem?.type === "NOT_FOUND",
  );
  const isStatusActive = Boolean(activeItem?.isStatus || isNotFound);
  const statusStyle =
    isStatusActive && !isNotFound ? activeItem?.style || null : null;
  const visibleNavigationItems = expanded
    ? navigationItems
    : navigationItems.slice(0, isStatusActive ? 1 : presentedCompact ? 1 : 3);
  const renderedNavItems = visibleNavigationItems.map((link, index) => {
    const position = index;
    const isTop = position === 0;
    const isActive = getIsItemActive(link, activeItem);
    const isCompactCard = isTop && isCompactStack;
    const shouldSyncHover = presentedCompact;
    const canTopCardPreview =
      canPreviewStackOnTopHover(presentedCompact, expanded) && !isStatusActive;
    const handleMouseEnter = () => {
      if (expanded) setFocusedIndex(index);
      if (!isTop || !canTopCardPreview) return;
      setIsStackHovered(true);
      if (shouldSyncHover) setIsHovered(true);
    };
    const handleMouseLeave = () => {
      if (expanded) setFocusedIndex(-1);
      if (!isTop || !canTopCardPreview) return;
      setIsStackHovered(false);
      if (shouldSyncHover) setIsHovered(false);
    };
    const handleClick = () => {
      if (link.isOverlay || isStatusActive || link.isStatus) return;
      if (!expanded) {
        if (isTop) {
          clearHoverState();
          setExpanded(true);
        }
        return;
      }
      if (link.path)
        navigate(link.path, {
          item: link,
        });
    };
    return (
      <NavCardItem
        key={getItemKey(link, index)}
        link={link}
        expanded={expanded}
        compact={isCompactCard}
        globalCompact={presentedCompact}
        restoreFromCompact={compactDirection === "restoring"}
        position={position}
        isTop={isTop}
        isActive={isActive}
        isStackHovered={isStackHovered}
        statusStyle={statusStyle}
        isHudActive={isHudActive}
        hud={hud}
        clearHud={clearHud}
        contextCommands={contextActions}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        onContentHeightChange={isTop ? handleContentHeightChange : null}
      />
    );
  });
  const navStackTransition = useMemo(() => {
    if (
      activeItem?.surfacePhase === NAV_SURFACE_PHASE.EXPANDING_BODY ||
      activeItem?.surfacePhase === NAV_SURFACE_PHASE.OPEN
    ) {
      return NAV_CARD_HEIGHT_OPEN_TRANSITION;
    }
    if (
      activeItem?.surfacePhase === NAV_SURFACE_PHASE.COLLAPSING_BODY ||
      activeItem?.surfacePhase === NAV_SURFACE_PHASE.RESTORING_HEADER
    ) {
      return NAV_CARD_HEIGHT_CLOSE_TRANSITION;
    }
    return NAV_STACK_TRANSITION;
  }, [activeItem?.surfacePhase]);
  const navContent = (
    <>
      <AnimatePresence>
        {isBackdropVisible && (
          <motion.div
            key="nav-backdrop"
            variants={navBackdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={NAV_BACKDROP_TRANSITION}
            className="fixed inset-0 cursor-pointer bg-linear-to-t from-black/80 via-black/60 to-transparent backdrop-blur-sm"
            style={{
              zIndex: Z_INDEX.NAV_BACKDROP,
            }}
            onClick={handleOutsideDismiss}
          />
        )}
      </AnimatePresence>
      <motion.div
        id="nav-card-stack"
        ref={navRef}
        className="fixed inset-x-0 bottom-[4px] mx-auto touch-manipulation select-none"
        data-controls-hidden={
          expanded || activeItem?.isSurface ? "true" : "false"
        }
        style={{
          zIndex: Z_INDEX.NAV,
          maxWidth: "100vw",
        }}
        initial={false}
        animate={getNavStackAnimateProps({
          width: isCompactStack ? compactStackWidth : stackWidth,
          height: containerHeight,
          isBreadcrumbsVisible: isBreadcrumbsCardVisible,
          isExtensionsVisible,
          isFullscreen: isFullscreenStateActive,
        })}
        transition={navStackTransition}
      >
        <NavSurfaceExtensionsBar activeItem={activeItem} />
        <AnimatePresence>
          {isBreadcrumbsCardVisible && <NavBreadcrumbsCard />}
        </AnimatePresence>
        <AnimatePresence initial={false}>{renderedNavItems}</AnimatePresence>
      </motion.div>
    </>
  );
  if (!portalTarget) return null;
  return createPortal(navContent, portalTarget);
}
