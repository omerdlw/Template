"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  BEHAVIOR_CHECK_INTERVAL_MS,
  BEHAVIOR_FOCUS_IDLE_MS,
  BOTTOM_LOCK_ACTIVATION_DISTANCE,
  BOTTOM_LOCK_MIN_SCROLLABLE_HEIGHT,
  BOTTOM_LOCK_RELEASE_DISTANCE,
  COMPACT_ACTIVATION_BUFFER,
  COMPACT_MIN_ACTIVATION_DELTA,
  COMPACT_RELEASE_THRESHOLD,
  COMPACT_SCROLL_THRESHOLD,
  COMPACT_TOGGLE_COOLDOWN_MS,
  HORIZONTAL_GESTURE_DELTA_THRESHOLD,
  HORIZONTAL_GESTURE_DOMINANCE_RATIO,
  HORIZONTAL_GESTURE_SUPPRESSION_MS,
  NAV_COLLAPSE_TO_COMPACT_DELAY_MS,
  NAV_COMPACT_BEHAVIOR,
  OVERSCROLL_THRESHOLD,
  SCROLL_DIRECTION_EPSILON,
} from "./constants";
import {
  blurActiveElement,
  focusNavigationElement,
  getDistanceToBottom,
  getNavigationFocusableElements,
  getScrollableHeight,
  isEditableNavigationTarget,
  isInteractiveTarget,
  shouldRestoreNavigationFocus,
} from "./utils";
export {
  blurActiveElement,
  focusNavigationElement,
  getDistanceToBottom,
  getNavigationFocusableElements,
  getScrollableHeight,
  isEditableNavigationTarget,
  isInteractiveTarget,
  shouldRestoreNavigationFocus,
};
export function canUseBottomLock(scrollableHeight, viewportHeight = null) {
  const resolvedScrollableHeight =
    scrollableHeight !== null && scrollableHeight !== undefined
      ? Number(scrollableHeight) || 0
      : getScrollableHeight();

  const resolvedViewportHeight =
    viewportHeight !== null && viewportHeight !== undefined
      ? Number(viewportHeight) || 0
      : typeof window !== "undefined"
        ? window.innerHeight || 0
        : 0;

  const maxScrollableDistance =
    resolvedViewportHeight > 0
      ? Math.max(0, resolvedScrollableHeight - resolvedViewportHeight)
      : resolvedScrollableHeight;

  return maxScrollableDistance >= BOTTOM_LOCK_MIN_SCROLLABLE_HEIGHT;
}
export function resolveCompactBehavior({
  isInputFocused,
  isPointerIdle,
  isVideoPlaying,
}) {
  return isInputFocused || isVideoPlaying || isPointerIdle
    ? NAV_COMPACT_BEHAVIOR.FOCUSED
    : NAV_COMPACT_BEHAVIOR.BROWSING;
}
export function useNavigationBehavior({ isVideoPlaying = false }) {
  const [behavior, setBehavior] = useState(NAV_COMPACT_BEHAVIOR.BROWSING);
  const lastInteractionRef = useRef(0);
  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined")
      return undefined;
    lastInteractionRef.current = getCurrentTimestamp();
    let activityFrameId = null;
    const updateBehavior = () => {
      const nextBehavior = resolveCompactBehavior({
        isInputFocused: isEditableNavigationTarget(document.activeElement),
        isPointerIdle:
          getCurrentTimestamp() - lastInteractionRef.current >=
          BEHAVIOR_FOCUS_IDLE_MS,
        isVideoPlaying,
      });
      setBehavior((currentBehavior) =>
        currentBehavior === nextBehavior ? currentBehavior : nextBehavior,
      );
    };
    const recordBrowsingActivity = () => {
      lastInteractionRef.current = getCurrentTimestamp();
      if (activityFrameId !== null) return;
      activityFrameId = window.requestAnimationFrame(() => {
        activityFrameId = null;
        updateBehavior();
      });
    };
    const intervalId = window.setInterval(
      updateBehavior,
      BEHAVIOR_CHECK_INTERVAL_MS,
    );
    updateBehavior();
    window.addEventListener("pointermove", recordBrowsingActivity, {
      passive: true,
    });
    window.addEventListener("pointerdown", recordBrowsingActivity, {
      passive: true,
    });
    window.addEventListener("wheel", recordBrowsingActivity, {
      passive: true,
    });
    window.addEventListener("keydown", recordBrowsingActivity);
    document.addEventListener("focusin", updateBehavior);
    document.addEventListener("focusout", updateBehavior);
    return () => {
      window.clearInterval(intervalId);
      if (activityFrameId !== null)
        window.cancelAnimationFrame(activityFrameId);
      window.removeEventListener("pointermove", recordBrowsingActivity);
      window.removeEventListener("pointerdown", recordBrowsingActivity);
      window.removeEventListener("wheel", recordBrowsingActivity);
      window.removeEventListener("keydown", recordBrowsingActivity);
      document.removeEventListener("focusin", updateBehavior);
      document.removeEventListener("focusout", updateBehavior);
    };
  }, [isVideoPlaying]);
  return behavior;
}
export function canUseCompactNav({
  hasActiveItem,
  isActionEngaged,
  isHudActive,
  isLoading,
  isOverlay,
  isStatus,
  isSurface,
  isBehaviorFocused,
  title,
}) {
  return (
    Boolean(hasActiveItem && String(title || "").trim()) &&
    !(
      isOverlay ||
      isSurface ||
      isLoading ||
      isStatus ||
      isActionEngaged ||
      isHudActive ||
      isBehaviorFocused
    )
  );
}
export function resolveCompactState(
  scrollY,
  previousScrollY,
  currentValue,
  downwardTravel,
  compactActivationSuppressed,
) {
  const scrollDelta = scrollY - previousScrollY;
  if (
    scrollY <= COMPACT_RELEASE_THRESHOLD ||
    scrollDelta < -SCROLL_DIRECTION_EPSILON
  )
    return false;
  if (compactActivationSuppressed) return currentValue;
  return scrollY >= COMPACT_SCROLL_THRESHOLD &&
    scrollDelta >= COMPACT_MIN_ACTIVATION_DELTA &&
    downwardTravel >= COMPACT_ACTIVATION_BUFFER
    ? true
    : currentValue;
}

export function useNavigationFocusTrap({
  containerRef,
  enabled = true,
  onDismiss = null,
}) {
  const hasAutoFocusedRef = useRef(false);
  useEffect(() => {
    if (!enabled) {
      hasAutoFocusedRef.current = false;
      return undefined;
    }
    const container = containerRef?.current;
    if (!container) return undefined;
    const focusFrameId = window.requestAnimationFrame(() => {
      if (hasAutoFocusedRef.current) return;
      hasAutoFocusedRef.current = true;
      const preferredTarget = container.querySelector("[data-nav-autofocus]");
      const target =
        preferredTarget instanceof HTMLElement
          ? preferredTarget
          : getNavigationFocusableElements(container)[0] || container;
      focusNavigationElement(target);
    });
    const handleKeyDown = (event) => {
      if (
        event.key === "Escape" &&
        !event.defaultPrevented &&
        typeof onDismiss === "function"
      ) {
        event.preventDefault();
        event.stopPropagation();
        onDismiss();
        return;
      }
      if (event.key !== "Tab") return;
      const focusableElements = getNavigationFocusableElements(container);
      if (focusableElements.length === 0) {
        event.preventDefault();
        focusNavigationElement(container);
        return;
      }
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;
      if (event.shiftKey && activeElement === firstElement) {
        event.preventDefault();
        focusNavigationElement(lastElement);
      } else if (!event.shiftKey && activeElement === lastElement) {
        event.preventDefault();
        focusNavigationElement(firstElement);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrameId);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [containerRef, enabled, onDismiss]);
}
export function useNavKeyboard({
  expanded,
  focusedIndex,
  isOverlayActive,
  navigate,
  navigationItems,
  setExpanded,
  setFocusedIndex,
}) {
  const handleKeyDown = useCallback(
    (event) => {
      if (
        isEditableNavigationTarget(event.target) ||
        isInteractiveTarget(event.target)
      ) {
        return;
      }
      if (isOverlayActive || !expanded) return;
      const { key } = event;
      if (key === "Escape") {
        event.preventDefault();
        setExpanded(false);
        return;
      }
      if (key === "Enter" && focusedIndex !== -1) {
        event.preventDefault();
        const focusedItem = navigationItems[focusedIndex];
        navigate(focusedItem?.path, {
          item: focusedItem,
        });
        return;
      }
      if (navigationItems.length === 0) return;
      if (key === "ArrowDown") {
        event.preventDefault();
        setFocusedIndex((currentIndex) =>
          currentIndex < navigationItems.length - 1 ? currentIndex + 1 : 0,
        );
        return;
      }
      if (key === "ArrowUp") {
        event.preventDefault();
        setFocusedIndex((currentIndex) =>
          currentIndex > 0 ? currentIndex - 1 : navigationItems.length - 1,
        );
      }
    },
    [
      expanded,
      focusedIndex,
      isOverlayActive,
      navigate,
      navigationItems,
      setExpanded,
      setFocusedIndex,
    ],
  );
  useEffect(() => {
    if (!expanded) return undefined;
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [expanded, handleKeyDown]);
}
export function useNavigationCompactController({
  activeItem,
  expanded,
  isHudActive = false,
  pathname,
  searchQuery = "",
  compactLocked = false,
  isVideoPlaying = false,
}) {
  const [compact, setCompact] = useState(false);
  const compactRef = useRef(false);
  const restoreCompactRef = useRef(false);
  const suppressCompactUntilRef = useRef(0);
  const lastScrollYRef = useRef(0);
  const downwardTravelRef = useRef(0);
  const lastToggleTimeRef = useRef(0);
  const bottomLockRef = useRef(false);
  const hasActiveItem = Boolean(activeItem);
  const activeItemPath = activeItem?.path || "";
  const activeItemName = activeItem?.name || "";
  const activeItemTitle = activeItem?.title || activeItem?.name || "";
  const isOverlay = Boolean(activeItem?.isOverlay);
  const isSurface = Boolean(activeItem?.isSurface);
  const isLoading = Boolean(activeItem?.isLoading);
  const isStatus = Boolean(activeItem?.isStatus);
  const isActionEngaged = Boolean(searchQuery?.trim());
  const behavior = useNavigationBehavior({
    isVideoPlaying,
  });
  const isBehaviorFocused = behavior === NAV_COMPACT_BEHAVIOR.FOCUSED;
  const userExitedCompactRef = useRef(false);
  const wasExpandedRef = useRef(false);
  const collapseTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (collapseTimerRef.current !== null) {
        clearTimeout(collapseTimerRef.current);
        collapseTimerRef.current = null;
      }
    };
  }, []);

  const exitCompact = useCallback(() => {
    if (collapseTimerRef.current !== null) {
      clearTimeout(collapseTimerRef.current);
      collapseTimerRef.current = null;
    }
    if (!compactRef.current) return false;
    userExitedCompactRef.current = true;
    restoreCompactRef.current = false;
    compactRef.current = false;
    bottomLockRef.current = false;
    downwardTravelRef.current = 0;
    lastScrollYRef.current =
      typeof window === "undefined" ? 0 : window.scrollY || 0;
    lastToggleTimeRef.current = getCurrentTimestamp();
    setCompact(false);
    return true;
  }, []);
  useEffect(() => {
    const compactAllowed = canUseCompactNav({
      hasActiveItem,
      isActionEngaged,
      isBehaviorFocused,
      isHudActive,
      isLoading,
      isOverlay,
      isStatus,
      isSurface,
      title: activeItemTitle,
    });
    const canPreserveCompactRestore =
      typeof window !== "undefined" && isSurface && restoreCompactRef.current;
    if (!compactAllowed || compactLocked || typeof window === "undefined") {
      if (canPreserveCompactRestore) {
        compactRef.current = false;
        lastScrollYRef.current = window.scrollY || 0;
        downwardTravelRef.current = 0;
        setCompact(false);
        return undefined;
      }
      restoreCompactRef.current = false;
      compactRef.current = false;
      bottomLockRef.current = false;
      lastScrollYRef.current = 0;
      downwardTravelRef.current = 0;
      setCompact(false);
      return undefined;
    }
    const currentScrollY = window.scrollY || 0;
    const initialDistanceToBottom = getDistanceToBottom(currentScrollY);
    const initialScrollableHeight = getScrollableHeight();
    const canInitialBottomLock = canUseBottomLock(initialScrollableHeight);
    const shouldStartBottomLocked =
      canInitialBottomLock &&
      currentScrollY > COMPACT_RELEASE_THRESHOLD &&
      initialDistanceToBottom <= BOTTOM_LOCK_RELEASE_DISTANCE;
    if (expanded) {
      wasExpandedRef.current = true;
      if (collapseTimerRef.current !== null) {
        clearTimeout(collapseTimerRef.current);
        collapseTimerRef.current = null;
      }
      restoreCompactRef.current = compactRef.current;
      compactRef.current = false;
      bottomLockRef.current = false;
      suppressCompactUntilRef.current = 0;
      lastScrollYRef.current = currentScrollY;
      downwardTravelRef.current = 0;
      setCompact(false);
      return undefined;
    }

    const isCollapsingFromExpanded = wasExpandedRef.current;
    wasExpandedRef.current = false;

    if (isCollapsingFromExpanded) {
      userExitedCompactRef.current = false;
      restoreCompactRef.current = false;
      compactRef.current = false;
      bottomLockRef.current = false;
      lastScrollYRef.current = currentScrollY;
      downwardTravelRef.current = 0;
      setCompact(false);

      if (collapseTimerRef.current !== null) {
        clearTimeout(collapseTimerRef.current);
      }
      collapseTimerRef.current = setTimeout(() => {
        collapseTimerRef.current = null;
        if (typeof window === "undefined") return;
        const scrollY = window.scrollY || 0;
        const distanceToBottom = getDistanceToBottom(scrollY);
        const scrollableHeight = getScrollableHeight();
        const canBottomLock = canUseBottomLock(scrollableHeight);
        const shouldLock =
          canBottomLock &&
          scrollY > COMPACT_RELEASE_THRESHOLD &&
          distanceToBottom <= BOTTOM_LOCK_RELEASE_DISTANCE;
        if (shouldLock) {
          bottomLockRef.current = true;
          compactRef.current = true;
          lastToggleTimeRef.current = getCurrentTimestamp();
          setCompact(true);
        }
      }, NAV_COLLAPSE_TO_COMPACT_DELAY_MS);
    } else {
      const shouldRestoreCompact =
        restoreCompactRef.current &&
        canInitialBottomLock &&
        currentScrollY > COMPACT_RELEASE_THRESHOLD &&
        initialDistanceToBottom <= BOTTOM_LOCK_RELEASE_DISTANCE;
      restoreCompactRef.current = false;
      bottomLockRef.current = shouldStartBottomLocked;
      compactRef.current = shouldStartBottomLocked
        ? true
        : shouldRestoreCompact;
      lastScrollYRef.current = currentScrollY;
      downwardTravelRef.current = 0;
      setCompact(shouldStartBottomLocked ? true : shouldRestoreCompact);
    }

    const updateCompactState = () => {
      if (collapseTimerRef.current !== null) {
        return;
      }
      const scrollY = window.scrollY || 0;
      const distanceToBottom = getDistanceToBottom(scrollY);
      const scrollableHeight = getScrollableHeight();
      const canBottomLock = canUseBottomLock(scrollableHeight);

      if (userExitedCompactRef.current) {
        if (distanceToBottom > BOTTOM_LOCK_RELEASE_DISTANCE) {
          userExitedCompactRef.current = false;
        } else {
          return;
        }
      }

      const isAtBottom =
        canBottomLock &&
        scrollY > COMPACT_RELEASE_THRESHOLD &&
        distanceToBottom <= BOTTOM_LOCK_ACTIVATION_DISTANCE;
      const canKeepBottomLock =
        canBottomLock &&
        scrollY > COMPACT_RELEASE_THRESHOLD &&
        distanceToBottom <= BOTTOM_LOCK_RELEASE_DISTANCE;

      if (isAtBottom) {
        bottomLockRef.current = true;
      } else if (!canKeepBottomLock) {
        bottomLockRef.current = false;
      }

      const nextValue = Boolean(bottomLockRef.current && canKeepBottomLock);
      lastScrollYRef.current = scrollY;
      downwardTravelRef.current = 0;

      if (nextValue === compactRef.current) {
        return;
      }
      if (
        getCurrentTimestamp() - lastToggleTimeRef.current <
        COMPACT_TOGGLE_COOLDOWN_MS
      ) {
        return;
      }
      compactRef.current = nextValue;
      lastToggleTimeRef.current = getCurrentTimestamp();
      setCompact(nextValue);
    };
    const handleWheel = (event) => {
      const horizontalDelta = Math.abs(event.deltaX);
      const verticalDelta = Math.abs(event.deltaY);
      if (horizontalDelta < HORIZONTAL_GESTURE_DELTA_THRESHOLD) {
        return;
      }
      if (
        horizontalDelta <=
        verticalDelta * HORIZONTAL_GESTURE_DOMINANCE_RATIO
      ) {
        return;
      }
      suppressCompactUntilRef.current =
        getCurrentTimestamp() + HORIZONTAL_GESTURE_SUPPRESSION_MS;
      downwardTravelRef.current = 0;
    };
    let scrollFrameId = null;
    const scheduleCompactStateUpdate = () => {
      if (scrollFrameId !== null) return;
      scrollFrameId = window.requestAnimationFrame(() => {
        scrollFrameId = null;
        updateCompactState();
      });
    };
    updateCompactState();
    window.addEventListener("scroll", scheduleCompactStateUpdate, {
      passive: true,
    });
    window.addEventListener("wheel", handleWheel, {
      passive: true,
    });
    window.addEventListener("resize", scheduleCompactStateUpdate, {
      passive: true,
    });
    return () => {
      window.removeEventListener("scroll", scheduleCompactStateUpdate);
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("resize", scheduleCompactStateUpdate);
      if (scrollFrameId !== null) window.cancelAnimationFrame(scrollFrameId);
    };
  }, [
    pathname,
    expanded,
    compactLocked,
    hasActiveItem,
    isActionEngaged,
    isBehaviorFocused,
    isHudActive,
    activeItemName,
    activeItemPath,
    activeItemTitle,
    isLoading,
    isOverlay,
    isStatus,
    isSurface,
  ]);
  return {
    compact,
    exitCompact,
  };
}
export function useNavigationCompact(options) {
  return useNavigationCompactController(options).compact;
}
export function useNavigationRouteReset(pathname, onRouteChange) {
  const previousPathRef = useRef(pathname);
  useEffect(() => {
    if (previousPathRef.current === pathname) return;
    previousPathRef.current = pathname;
    onRouteChange?.(pathname);
  }, [onRouteChange, pathname]);
}
export function getCurrentTimestamp() {
  if (
    typeof performance !== "undefined" &&
    typeof performance.now === "function"
  ) {
    return performance.now();
  }
  return Date.now();
}
