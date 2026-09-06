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
  NAV_COMPACT_BEHAVIOR,
  NAVIGATION_FOCUS_RESTORE_BLOCKED_REASONS,
  NAVIGATION_FOCUSABLE_SELECTOR,
  OVERSCROLL_THRESHOLD,
  SCROLL_DIRECTION_EPSILON,
} from "./constants";
import {
  getCurrentTimestamp,
  getDistanceToBottom,
  getScrollableHeight,
  isEditableNavigationTarget,
  isInteractiveTarget,
} from "./utils";

// ── Interaction state ────────────────────────────────────────────────────────

/** Returns whether scrollable content is tall enough to support bottom locking. */
export function canUseBottomLock(scrollableHeight) {
  return scrollableHeight >= BOTTOM_LOCK_MIN_SCROLLABLE_HEIGHT;
}

/** Resolves whether navigation interaction should suppress compact behavior. */
export function resolveCompactBehavior({
  isInputFocused,
  isPointerIdle,
  isVideoPlaying,
}) {
  return isInputFocused || isVideoPlaying || isPointerIdle
    ? NAV_COMPACT_BEHAVIOR.FOCUSED
    : NAV_COMPACT_BEHAVIOR.BROWSING;
}

/** Tracks focus and idle interaction state for compact-navigation decisions. */
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
    window.addEventListener("wheel", recordBrowsingActivity, { passive: true });
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

/** Determines whether compact mode can activate for the current navigation item. */
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

/** Resolves the next compact value from scroll direction and accumulated travel. */
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

// ── Focus management and keyboard interaction ───────────────────────────────

/**
 * Returns the enabled focusable descendants of a navigation container.
 * @param {HTMLElement|null} container - Navigation container to inspect
 * @returns {HTMLElement[]} Ordered focusable elements
 */
export function getNavigationFocusableElements(container) {
  if (!container?.querySelectorAll) return [];

  return [...container.querySelectorAll(NAVIGATION_FOCUSABLE_SELECTOR)].filter(
    (element) => {
      const isHTMLElement =
        typeof HTMLElement === "undefined" || element instanceof HTMLElement;
      return (
        isHTMLElement &&
        !element.hasAttribute("disabled") &&
        element.getAttribute("aria-hidden") !== "true"
      );
    },
  );
}

/**
 * Focuses one connected navigation element without moving the page.
 * @param {HTMLElement|null} element - Element to focus
 * @returns {boolean} Whether focus was attempted
 */
export function focusNavigationElement(element) {
  if (!element?.isConnected || typeof element.focus !== "function")
    return false;

  try {
    element.focus({ preventScroll: true });
  } catch {
    element.focus();
  }

  return true;
}

/**
 * Determines whether a closing surface should return focus to its trigger.
 * @param {object|null} result - Surface close result
 * @returns {boolean} Whether focus restoration is appropriate
 */
export function shouldRestoreNavigationFocus(result) {
  return !NAVIGATION_FOCUS_RESTORE_BLOCKED_REASONS.includes(result?.reason);
}

/**
 * Keeps keyboard focus inside an active surface and gives Escape to the surface first.
 * @param {object} options - Surface container and dismissal callback
 * @returns {void}
 */
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

/** Handles keyboard navigation for the expanded navigation card stack. */
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
        navigate(focusedItem?.path, { item: focusedItem });
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
  const behavior = useNavigationBehavior({ isVideoPlaying });
  const isBehaviorFocused = behavior === NAV_COMPACT_BEHAVIOR.FOCUSED;

  const exitCompact = useCallback(() => {
    if (!compactRef.current) return false;

    // Compact is a scroll-only presentation. Once the user starts a Nav
    // interaction, leave it behind instead of restoring it after that flow.
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
    const shouldStartBottomLocked =
      canUseBottomLock(initialScrollableHeight) &&
      initialDistanceToBottom <= BOTTOM_LOCK_RELEASE_DISTANCE;

    if (expanded) {
      restoreCompactRef.current = compactRef.current;
      compactRef.current = false;
      bottomLockRef.current = false;
      suppressCompactUntilRef.current = 0;
      lastScrollYRef.current = currentScrollY;
      downwardTravelRef.current = 0;
      setCompact(false);
      return undefined;
    }

    const shouldRestoreCompact =
      restoreCompactRef.current && currentScrollY > COMPACT_RELEASE_THRESHOLD;

    restoreCompactRef.current = false;
    bottomLockRef.current = shouldStartBottomLocked;
    compactRef.current = shouldStartBottomLocked ? true : shouldRestoreCompact;
    lastScrollYRef.current = currentScrollY;
    downwardTravelRef.current = 0;
    setCompact(shouldStartBottomLocked ? true : shouldRestoreCompact);

    const updateCompactState = () => {
      const scrollY = window.scrollY || 0;
      const distanceToBottom = getDistanceToBottom(scrollY);
      const scrollableHeight = getScrollableHeight();
      const canBottomLock = canUseBottomLock(scrollableHeight);
      const shouldActivateBottomLock =
        canBottomLock && distanceToBottom <= BOTTOM_LOCK_ACTIVATION_DISTANCE;
      const shouldKeepBottomLock =
        canBottomLock && distanceToBottom <= BOTTOM_LOCK_RELEASE_DISTANCE;

      if (bottomLockRef.current && !canBottomLock) {
        bottomLockRef.current = false;
        downwardTravelRef.current = 0;

        if (compactRef.current && scrollY < COMPACT_SCROLL_THRESHOLD) {
          compactRef.current = false;
          lastScrollYRef.current = scrollY;
          setCompact(false);
          return;
        }
      }

      if (shouldActivateBottomLock) {
        bottomLockRef.current = true;
      }

      if (bottomLockRef.current && shouldKeepBottomLock) {
        lastScrollYRef.current = scrollY;
        downwardTravelRef.current = 0;
        suppressCompactUntilRef.current = 0;

        if (!compactRef.current) {
          compactRef.current = true;
          lastToggleTimeRef.current = getCurrentTimestamp();
          setCompact(true);
        }

        return;
      }

      if (bottomLockRef.current && !shouldKeepBottomLock) {
        bottomLockRef.current = false;
      }

      if (scrollY < OVERSCROLL_THRESHOLD) {
        lastScrollYRef.current = scrollY;
        return;
      }

      const scrollDelta = scrollY - lastScrollYRef.current;
      const compactActivationSuppressed =
        !compactRef.current &&
        getCurrentTimestamp() < suppressCompactUntilRef.current;

      if (scrollDelta >= COMPACT_MIN_ACTIVATION_DELTA) {
        downwardTravelRef.current += scrollDelta;
      } else if (
        scrollDelta < -SCROLL_DIRECTION_EPSILON ||
        scrollY <= COMPACT_RELEASE_THRESHOLD
      ) {
        downwardTravelRef.current = 0;
      }

      const nextValue = resolveCompactState(
        scrollY,
        lastScrollYRef.current,
        compactRef.current,
        downwardTravelRef.current,
        compactActivationSuppressed,
      );
      lastScrollYRef.current = scrollY;

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

      if (nextValue) {
        downwardTravelRef.current = 0;
      }

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
    window.addEventListener("wheel", handleWheel, { passive: true });

    return () => {
      window.removeEventListener("scroll", scheduleCompactStateUpdate);
      window.removeEventListener("wheel", handleWheel);
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

  return { compact, exitCompact };
}

/** Returns the current scroll-driven compact presentation state. */
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
