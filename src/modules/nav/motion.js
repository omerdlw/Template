const NAV_EASINGS = Object.freeze({
  CINEMATIC: Object.freeze([0.76, 0, 0.24, 1]),
  EMPHASIZED: Object.freeze([0.16, 1, 0.3, 1]),
  SOFT: Object.freeze([0.22, 1, 0.36, 1]),
  EXIT: Object.freeze([0.7, 0, 0.84, 0]),
});
const NAV_TIERS = Object.freeze({
  MICRO: {
    duration: 0.24,
    distance: 4,
    scaleDelta: 0.008,
    ease: NAV_EASINGS.EMPHASIZED,
  },
  FAST: {
    duration: 0.44,
    distance: 9,
    scaleDelta: 0.012,
    ease: NAV_EASINGS.EMPHASIZED,
  },
  STANDARD: {
    duration: 0.66,
    distance: 18,
    scaleDelta: 0.018,
    ease: NAV_EASINGS.SOFT,
  },
  SURFACE: {
    duration: 0.96,
    distance: 28,
    scaleDelta: 0.024,
    ease: NAV_EASINGS.CINEMATIC,
  },
});
const NAV_SPRINGS = Object.freeze({
  PRESS: Object.freeze({
    type: "spring",
    stiffness: 520,
    damping: 30,
    mass: 0.28,
  }),
  BADGE: Object.freeze({
    type: "spring",
    stiffness: 360,
    damping: 20,
    mass: 0.42,
  }),
  DECK: Object.freeze({
    type: "spring",
    stiffness: 180,
    damping: 24,
    mass: 0.8,
  }),
  PEEK: Object.freeze({
    type: "spring",
    stiffness: 150,
    damping: 22,
    mass: 0.85,
  }),
});
const NAV_STAGGER_TIMINGS = Object.freeze({
  EXPAND: 0.068,
  COLLAPSE: 0.052,
  PEEK: 0.078,
  STANDARD: 0.06,
  FAST: 0.042,
});

export const NAV_SURFACE_CHOREOGRAPHY_TIMINGS = Object.freeze({
  ACTION_DISMISS_MS: 260,
  ACTION_DISMISS_SETTLE_MS: 100,
  HEADER_SWAP_MS: 0,
  HEADER_SWAP_SETTLE_MS: 0,
  BODY_ENTER_MS: 840,
  BODY_EXIT_MS: 620,
  BODY_COLLAPSE_SETTLE_MS: 140,
  HEADER_RESTORE_MS: 0,
  RESTORE_SETTLE_MS: 0,
});
const NAV_STAGGER_DELAY = NAV_STAGGER_TIMINGS.STANDARD;
const NAV_TAP_SCALE = 0.98;
const NAV_BUTTON_TRANSITION = NAV_SPRINGS.PRESS;
const NAV_CARD_SPRING = NAV_SPRINGS.DECK;
const NAV_CARD_EXPAND_TRANSITION = Object.freeze({
  type: "tween",
  duration: 0.84,
  ease: NAV_EASINGS.CINEMATIC,
});
const NAV_STACK_TRANSITION = Object.freeze({
  type: "tween",
  duration: NAV_TIERS.STANDARD.duration,
  ease: NAV_EASINGS.SOFT,
});
const NAV_CARD_TRANSITION = Object.freeze({
  type: "tween",
  duration: NAV_TIERS.STANDARD.duration,
  ease: NAV_EASINGS.EMPHASIZED,
});
const NAV_CARD_COLLAPSE_TRANSITION = Object.freeze({
  type: "tween",
  duration: 0.62,
  ease: NAV_EASINGS.EXIT,
});
const NAV_PEEK_SPRING = NAV_SPRINGS.PEEK;
const NAV_SURFACE_TRANSITION = Object.freeze({
  type: "tween",
  duration: NAV_TIERS.SURFACE.duration,
  ease: NAV_EASINGS.CINEMATIC,
});
const NAV_ACTION_DISMISS_TRANSITION = Object.freeze({
  type: "tween",
  duration: 0.26,
  ease: NAV_EASINGS.EXIT,
});
const NAV_HEADER_SWAP_TRANSITION = Object.freeze({
  type: "tween",
  duration: 0.64,
  ease: NAV_EASINGS.CINEMATIC,
});
const NAV_SURFACE_BODY_ENTER_TRANSITION = Object.freeze({
  type: "tween",
  duration: 0.84,
  ease: NAV_EASINGS.CINEMATIC,
});
const NAV_SURFACE_BODY_EXIT_TRANSITION = Object.freeze({
  type: "tween",
  duration: 0.62,
  ease: NAV_EASINGS.CINEMATIC,
});
const NAV_SURFACE_EXTENSIONS_ENTER_TRANSITION = Object.freeze({
  type: "tween",
  duration: 0.54,
  ease: NAV_EASINGS.CINEMATIC,
});
const NAV_SURFACE_EXTENSIONS_EXIT_TRANSITION = Object.freeze({
  type: "tween",
  duration: 0.38,
  ease: NAV_EASINGS.EXIT,
});
const NAV_CARD_HEIGHT_OPEN_TRANSITION = Object.freeze({
  type: "tween",
  duration: 0.84,
  ease: NAV_EASINGS.CINEMATIC,
});
const NAV_CARD_HEIGHT_CLOSE_TRANSITION = Object.freeze({
  type: "tween",
  duration: 0.62,
  ease: NAV_EASINGS.CINEMATIC,
});
const NAV_BACKDROP_TRANSITION = Object.freeze({
  type: "tween",
  duration: 0.66,
  ease: NAV_EASINGS.SOFT,
});
const NAV_FADE_TRANSITION = Object.freeze({
  type: "tween",
  duration: NAV_TIERS.STANDARD.duration,
  ease: NAV_EASINGS.EMPHASIZED,
});
const NAV_TEXT_ENTER_TRANSITION = Object.freeze({
  type: "tween",
  duration: 0.62,
  ease: NAV_EASINGS.EMPHASIZED,
});
const NAV_TEXT_EXIT_TRANSITION = Object.freeze({
  type: "tween",
  duration: 0.38,
  ease: NAV_EASINGS.EXIT,
});
const NAV_ICON_TRANSITION = Object.freeze({
  type: "tween",
  duration: 0.48,
  ease: NAV_EASINGS.SOFT,
});
const NAV_STAGGER_TRANSITION = Object.freeze({
  type: "tween",
  duration: 0.62,
  ease: NAV_EASINGS.EMPHASIZED,
});
const NAV_MICRO_TRANSITION = Object.freeze({
  type: "tween",
  duration: NAV_TIERS.MICRO.duration,
  ease: NAV_TIERS.MICRO.ease,
});
const NAV_BADGE_TRANSITION = NAV_SPRINGS.BADGE;
const NAV_ACTIVE_INDICATOR_TRANSITION = Object.freeze({
  type: "tween",
  duration: 0.48,
  ease: NAV_EASINGS.SOFT,
});
const NAV_RESULTS_TRANSITION = Object.freeze({
  type: "tween",
  duration: 0.79,
  ease: NAV_EASINGS.CINEMATIC,
});
const NAV_RESULTS_EXIT_TRANSITION = Object.freeze({
  type: "tween",
  duration: 0.48,
  ease: NAV_EASINGS.EXIT,
});
const NAV_RESULTS_STAGGER_DELAY = NAV_STAGGER_TIMINGS.STANDARD;
const NAV_PEEK_TRANSITION = Object.freeze({
  type: "tween",
  duration: 0.72,
  ease: NAV_EASINGS.SOFT,
});
const NAV_SURFACE_DRAG_CONSTRAINTS = Object.freeze({
  top: 0,
  bottom: 0,
});
const NAV_SURFACE_DRAG_ELASTIC = Object.freeze({
  top: 0.05,
  bottom: 0.5,
});
const NAV_BREADCRUMBS_TRANSITION = Object.freeze({
  type: "tween",
  duration: 0.57,
  ease: NAV_EASINGS.EMPHASIZED,
});
const NAV_HUD_TRANSITION = Object.freeze({
  type: "tween",
  duration: 0.66,
  ease: NAV_EASINGS.CINEMATIC,
});
const NAV_COMPACT_CONTENT_TRANSITION = Object.freeze({
  type: "tween",
  duration: 0.48,
  ease: NAV_EASINGS.EXIT,
});
const NAV_COMPACT_RESTORE_TRANSITION = Object.freeze({
  type: "tween",
  duration: 0.72,
  ease: NAV_EASINGS.CINEMATIC,
});
const NAV_COMPACT_TITLE_ENTER_TRANSITION = Object.freeze({
  type: "tween",
  duration: 0.52,
  delay: 0.56,
  ease: NAV_EASINGS.EMPHASIZED,
});
const NAV_COMPACT_TITLE_EXIT_TRANSITION = Object.freeze({
  type: "tween",
  duration: 0.28,
  ease: NAV_EASINGS.EXIT,
});
const NAV_SKELETON_PULSE_CLASS = "animate-pulse";
const NAV_SCRUBBER_TOOLTIP_SPRING = Object.freeze({
  damping: 28,
  stiffness: 350,
});
const NAV_MEDIA_VOLUME_FILL_TRANSITION =
  "width 240ms cubic-bezier(0.16, 1, 0.3, 1)";
const NAV_MEDIA_VOLUME_THUMB_POSITION_TRANSITION =
  "left 240ms cubic-bezier(0.16, 1, 0.3, 1)";
const navMediaVolumeThumbVariants = Object.freeze({
  idle: Object.freeze({
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.5)",
    scale: 1,
  }),
  dragging: Object.freeze({
    boxShadow: "0 0 8px rgba(255, 255, 255, 0.5)",
    scale: 1.25,
  }),
});
const NAV_COMPOSITOR_STYLE = Object.freeze({
  WebkitBackfaceVisibility: "hidden",
  backfaceVisibility: "hidden",
  WebkitFontSmoothing: "antialiased",
});
function toGpuTransform(y = 0, scale = 1) {
  const safeY = Number.parseFloat(y);
  const safeScale = Number.parseFloat(scale);
  return `translate3d(0, ${Number.isFinite(safeY) ? safeY : 0}px, 0) scale(${Number.isFinite(safeScale) ? safeScale : 1})`;
}
const navSurfaceDragTransformTemplate = ({ y, scale }) =>
  toGpuTransform(y, scale);
const navActionVariants = Object.freeze({
  idle: {
    transform: toGpuTransform(0, 1),
  },
  hover: {
    transform: toGpuTransform(0, 1),
  },
  tap: {
    transform: toGpuTransform(0, NAV_TAP_SCALE),
  },
});
function getNavActionMotionProps({
  disabled = false,
  reduceMotion = false,
} = {}) {
  const canMove = !disabled && !reduceMotion;
  return {
    initial: false,
    animate: "idle",
    whileTap: canMove ? "tap" : undefined,
    variants: navActionVariants,
    transition: NAV_BUTTON_TRANSITION,
  };
}
function getNavMediaVolumeFillTransition({ isDragging = false } = {}) {
  return isDragging ? "none" : NAV_MEDIA_VOLUME_FILL_TRANSITION;
}
function getNavMediaVolumeThumbAnimateProps({ isDragging = false } = {}) {
  return isDragging
    ? navMediaVolumeThumbVariants.dragging
    : navMediaVolumeThumbVariants.idle;
}
function getNavMediaVolumeThumbPositionTransition({ isDragging = false } = {}) {
  return isDragging ? "none" : NAV_MEDIA_VOLUME_THUMB_POSITION_TRANSITION;
}
function buildVariants(tierName, { distanceScale = 0 } = {}) {
  const tier = NAV_TIERS[tierName];
  const distance = Math.round(tier.distance * distanceScale);
  const hidden = {
    opacity: 0,
  };
  const visible = {
    opacity: 1,
    transition: {
      duration: tier.duration,
      ease: tier.ease,
    },
  };
  const exit = {
    opacity: 0,
    transition: {
      duration: tier.duration * 0.72,
      ease: NAV_EASINGS.EXIT,
    },
  };
  if (distance) {
    hidden.transform = toGpuTransform(distance, 1 - tier.scaleDelta);
    visible.transform = toGpuTransform(0);
    exit.transform = toGpuTransform(
      Math.round(distance * 0.72),
      1 - tier.scaleDelta * 0.6,
    );
  }
  return Object.freeze({
    hidden,
    visible,
    exit,
  });
}
const slideFadeVariants = buildVariants("SURFACE", {
  distanceScale: 0,
});
const textCrossfadeVariants = buildVariants("STANDARD", {
  distanceScale: 0.42,
});
const staggerItemVariants = buildVariants("FAST", {
  distanceScale: 0.75,
});
const navHeaderSwapVariants = Object.freeze({
  hidden: {
    opacity: 0,
    transform: toGpuTransform(16, 0.98),
  },
  visible: {
    opacity: 1,
    transform: toGpuTransform(0),
    transition: {
      duration: 0.64,
      ease: NAV_EASINGS.CINEMATIC,
    },
  },
  exit: {
    opacity: 0,
    transform: toGpuTransform(-12, 0.97),
    transition: {
      duration: 0.54,
      ease: NAV_EASINGS.CINEMATIC,
    },
  },
});
const navExtensionShelfVariants = Object.freeze({
  hidden: {
    opacity: 0,
    transform: toGpuTransform(6, 0.99),
  },
  visible: {
    opacity: 1,
    transform: toGpuTransform(0, 1),
    transition: {
      duration: 0.44,
      ease: NAV_EASINGS.CINEMATIC,
    },
  },
  exit: {
    opacity: 0,
    transform: toGpuTransform(-6, 0.99),
    transition: {
      duration: 0.32,
      ease: NAV_EASINGS.EXIT,
    },
  },
});
const navHeaderRestoreVariants = Object.freeze({
  hidden: {
    opacity: 0,
    transform: toGpuTransform(-16, 0.98),
  },
  visible: {
    opacity: 1,
    transform: toGpuTransform(0),
    transition: {
      duration: 0.64,
      ease: NAV_EASINGS.CINEMATIC,
    },
  },
  exit: {
    opacity: 0,
    transform: toGpuTransform(14, 0.97),
    transition: {
      duration: 0.54,
      ease: NAV_EASINGS.CINEMATIC,
    },
  },
});
const navSurfaceControlsVariants = Object.freeze({
  hidden: {
    opacity: 0,
    transform: "translate3d(0px, 14px, 0) scale(0.92)",
  },
  visible: (customIndex = 0) => ({
    opacity: 1,
    transform: "translate3d(0px, 0px, 0) scale(1)",
    transition: {
      duration: 0.64,
      delay: (Number(customIndex) || 0) * 0.04,
      ease: NAV_EASINGS.CINEMATIC,
    },
  }),
  exit: {
    opacity: 0,
    transform: "translate3d(0px, 10px, 0) scale(0.95)",
    transition: {
      duration: 0.44,
      ease: NAV_EASINGS.CINEMATIC,
    },
  },
});
const navCommandBarSwapVariants = Object.freeze({
  hidden: {
    opacity: 0,
    transform: "translate3d(12px, 0, 0) scale(0.88)",
  },
  visible: (customIndex = 0) => ({
    opacity: 1,
    transform: "translate3d(0px, 0, 0) scale(1)",
    transition: {
      duration: 0.44,
      delay: (Number(customIndex) || 0) * 0.04 + 0.06,
      ease: NAV_EASINGS.CINEMATIC,
    },
  }),
  exit: (customIndex = 0) => ({
    opacity: 0,
    transform: "translate3d(12px, 0, 0) scale(0.85)",
    transition: {
      duration: 0.32,
      delay: (Number(customIndex) || 0) * 0.02,
      ease: NAV_EASINGS.EXIT,
    },
  }),
});
const navSurfaceBodyVariants = Object.freeze({
  hidden: {
    opacity: 0,
    transform: toGpuTransform(20, 0.98),
  },
  visible: {
    opacity: 1,
    transform: toGpuTransform(0),
    transition: {
      duration: 0.84,
      ease: NAV_EASINGS.CINEMATIC,
    },
  },
  exit: {
    opacity: 0,
    transform: toGpuTransform(16, 0.98),
    transition: {
      duration: 0.62,
      ease: NAV_EASINGS.CINEMATIC,
    },
  },
});
const navSurfaceExtensionsVariants = Object.freeze({
  hidden: {
    opacity: 0,
    transform: toGpuTransform(-18, 0.85),
  },
  visible: {
    opacity: 1,
    transform: toGpuTransform(-28, 0.85),
    transition: {
      duration: 0.54,
      ease: NAV_EASINGS.CINEMATIC,
    },
  },
  exit: {
    opacity: 0,
    transform: toGpuTransform(-18, 0.85),
    transition: {
      duration: 0.38,
      ease: NAV_EASINGS.EXIT,
    },
  },
});
const navActionDismissVariants = Object.freeze({
  hidden: {
    opacity: 0,
    transform: toGpuTransform(10, 0.98),
  },
  visible: {
    opacity: 1,
    transform: toGpuTransform(0),
    transition: {
      duration: 0.26,
      ease: NAV_EASINGS.SOFT,
    },
  },
  exit: {
    opacity: 0,
    transform: toGpuTransform(-8, 0.98),
    transition: {
      duration: 0.26,
      ease: NAV_EASINGS.EXIT,
    },
  },
});
const navListItemVariants = Object.freeze({
  hidden: staggerItemVariants.hidden,
  visible: (index = 0) => ({
    ...staggerItemVariants.visible,
    transition: {
      ...NAV_STAGGER_TRANSITION,
      delay: Math.min(
        Math.max(Number(index) || 0, 0) * NAV_STAGGER_TIMINGS.STANDARD,
        0.42,
      ),
    },
  }),
  exit: {
    ...staggerItemVariants.exit,
    transition: {
      ...NAV_TEXT_EXIT_TRANSITION,
    },
  },
});
const navFadeVariants = Object.freeze({
  hidden: {
    opacity: 0,
    transform: toGpuTransform(12, 0.98),
  },
  visible: {
    opacity: 1,
    transform: toGpuTransform(0),
    transition: NAV_TEXT_ENTER_TRANSITION,
  },
  exit: {
    opacity: 0,
    transform: toGpuTransform(-8, 0.99),
    transition: NAV_TEXT_EXIT_TRANSITION,
  },
});
const navIconVariants = Object.freeze({
  hidden: {
    opacity: 0,
    transform: toGpuTransform(0, 0.88),
  },
  visible: {
    opacity: 1,
    transform: toGpuTransform(0, 1),
    transition: {
      duration: 0.22,
      ease: NAV_EASINGS.SOFT,
    },
  },
  exit: {
    opacity: 0,
    transform: toGpuTransform(0, 0.88),
    transition: {
      duration: 0.16,
      ease: NAV_EASINGS.EXIT,
    },
  },
});
const navBadgeVariants = Object.freeze({
  hidden: {
    opacity: 0,
    transform: toGpuTransform(0, 0.78),
  },
  visible: {
    opacity: 1,
    transform: toGpuTransform(0),
  },
  exit: {
    opacity: 0,
    transform: toGpuTransform(0, 0.82),
  },
});
const navBackdropVariants = Object.freeze({
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
  },
  exit: {
    opacity: 0,
  },
});
const navBreadcrumbsVariants = Object.freeze({
  hidden: {
    opacity: 0,
    transform: toGpuTransform(-10, 0.96),
  },
  visible: {
    opacity: 1,
    transform: toGpuTransform(0),
  },
  exit: {
    opacity: 0,
    transform: toGpuTransform(-6, 0.98),
  },
});
const navHudVariants = Object.freeze({
  hidden: {
    opacity: 0,
    transform: toGpuTransform(14, 0.975),
  },
  visible: {
    opacity: 1,
    transform: toGpuTransform(0),
    transition: NAV_HUD_TRANSITION,
  },
  exit: {
    opacity: 0,
    transform: toGpuTransform(-6, 0.99),
    transition: NAV_TEXT_EXIT_TRANSITION,
  },
});
const navCompactTitleVariants = Object.freeze({
  hidden: {
    opacity: 0,
    transform: toGpuTransform(8, 0.98),
  },
  visible: {
    opacity: 1,
    transform: toGpuTransform(0),
    transition: NAV_COMPACT_TITLE_ENTER_TRANSITION,
  },
  exit: {
    opacity: 0,
    transform: toGpuTransform(-6, 0.99),
    transition: NAV_COMPACT_TITLE_EXIT_TRANSITION,
  },
});
function getNavDescriptionVariants(targetOpacity = 0.7) {
  return {
    hidden: {
      opacity: 0,
      transform: toGpuTransform(8, 0.99),
    },
    visible: {
      opacity: targetOpacity,
      transform: toGpuTransform(0),
      transition: {
        duration: 0.62,
        ease: NAV_EASINGS.EMPHASIZED,
      },
    },
    exit: {
      opacity: 0,
      transform: toGpuTransform(-5, 0.99),
      transition: {
        duration: 0.38,
        ease: NAV_EASINGS.EXIT,
      },
    },
  };
}
function getNavActionStaggerTransition(index = 0) {
  return {
    ...NAV_STAGGER_TRANSITION,
    delay: Math.min(Math.max(Number(index) || 0, 0) * NAV_STAGGER_DELAY, 0.42),
  };
}
function getNavStackAnimateProps({
  width,
  height,
  isBreadcrumbsVisible = false,
  isExtensionsVisible = false,
  isFullscreen = false,
}) {
  const safeWidth = Number(width);
  const safeHeight = Number(height);
  const liftAmount = isBreadcrumbsVisible ? -42 : 0;
  return {
    width: Math.max(0, Math.round(Number.isFinite(safeWidth) ? safeWidth : 0)),
    height: Math.max(
      0,
      Math.round(Number.isFinite(safeHeight) ? safeHeight : 0),
    ),
    transform: toGpuTransform(liftAmount),
    opacity: isFullscreen ? 0 : 1,
    pointerEvents: isFullscreen ? "none" : "auto",
  };
}
function getNavCardDelay({
  expanded = false,
  isStackHovered = false,
  position = 0,
} = {}) {
  const safePosition = Math.max(0, Number(position) || 0);
  if (expanded && safePosition > 0) {
    return Math.min(safePosition * NAV_STAGGER_TIMINGS.EXPAND, 0.42);
  }
  if (isStackHovered && safePosition > 0) {
    return Math.min((safePosition - 1) * NAV_STAGGER_TIMINGS.PEEK, 0.32);
  }
  return 0;
}
function getNavItemAnimateValues({
  motionValues,
  expanded = false,
  isStackHovered = false,
  position = 0,
} = {}) {
  if (!motionValues) return {};
  const safePosition = Math.max(0, Number(position) || 0);
  const isHoveredOffset = !expanded && isStackHovered && safePosition > 0;
  const peekProgress = Math.min(safePosition / 3, 1);
  const peekOffset = NAV_TIERS.MICRO.distance * (0.85 + peekProgress * 0.35);
  const peekScale = NAV_TIERS.MICRO.scaleDelta * (1 - peekProgress * 0.25);
  const y = isHoveredOffset
    ? motionValues.y - safePosition * peekOffset
    : motionValues.y;
  const scale = isHoveredOffset
    ? motionValues.scale * (1 + peekScale)
    : motionValues.scale;
  return {
    transform: toGpuTransform(y, scale),
    opacity: motionValues.opacity,
  };
}
function getNavItemTransition({
  expanded = false,
  isStackHovered = false,
  isRestoringDeck = false,
  position = 0,
  delay = 0,
} = {}) {
  const safePosition = Math.max(0, Number(position) || 0);
  const baseTransition = isRestoringDeck
    ? NAV_COMPACT_RESTORE_TRANSITION
    : !expanded && isStackHovered && safePosition > 0
      ? NAV_PEEK_TRANSITION
      : NAV_CARD_TRANSITION;
  return {
    ...baseTransition,
    delay:
      (Number(delay) || 0) +
      (isRestoringDeck
        ? Math.min(safePosition * NAV_STAGGER_TIMINGS.EXPAND, 0.16)
        : 0),
  };
}
function getNavItemCompactRestoreValues({ motionValues, position = 0 } = {}) {
  if (!motionValues) return {};
  const safePosition = Math.max(0, Number(position) || 0);
  if (safePosition === 0)
    return getNavItemAnimateValues({
      motionValues,
    });
  return {
    opacity: 0,
    transform: toGpuTransform(0, 0.975 - Math.min(safePosition * 0.006, 0.018)),
  };
}
function getNavItemCompactExitValues({ position = 0 } = {}) {
  const safePosition = Math.max(0, Number(position) || 0);
  return {
    opacity: 0,
    transform: toGpuTransform(0, 0.98 - Math.min(safePosition * 0.008, 0.024)),
    transition: {
      ...NAV_CARD_COLLAPSE_TRANSITION,
      delay: Math.min(
        Math.max(2 - safePosition, 0) * NAV_STAGGER_TIMINGS.COLLAPSE,
        0.08,
      ),
    },
  };
}
function getNavCardContentAnimateProps({
  compact = false,
  expanded = false,
  position = 0,
  isExtensionShelf = false,
} = {}) {
  const isHidden = compact || (!expanded && position > 0 && !isExtensionShelf);
  return {
    opacity: isHidden ? 0 : 1,
    transform: toGpuTransform(
      isHidden ? NAV_TIERS.STANDARD.distance * 0.35 : 0,
      isHidden ? 1 - NAV_TIERS.MICRO.scaleDelta : 1,
    ),
  };
}
function getNavCardContentTransition({
  compact = false,
  isRestoringFromCompact = false,
} = {}) {
  if (compact) return NAV_COMPACT_CONTENT_TRANSITION;
  if (!isRestoringFromCompact) return NAV_TEXT_ENTER_TRANSITION;
  return {
    ...NAV_TEXT_ENTER_TRANSITION,
    delay: NAV_COMPACT_TITLE_EXIT_TRANSITION.duration + 0.06,
  };
}
function getNavScrollProgressStyle(progress = 0) {
  const safeProgress = Math.min(Math.max(Number(progress) || 0, 0), 1);
  return {
    width: "100%",
    transformOrigin: "left center",
    transform: `scaleX(${safeProgress})`,
  };
}
const navSoundwaveBarVariants = Object.freeze({
  playing: (index) => ({
    transform: [
      toGpuTransform(0, 0.3),
      toGpuTransform(0, 1),
      toGpuTransform(0, 0.42),
      toGpuTransform(0, 0.92),
      toGpuTransform(0, 0.3),
    ],
    transition: {
      duration: 1.28,
      repeat: Infinity,
      ease: NAV_EASINGS.SOFT,
      delay: Number(index) * 0.18,
    },
  }),
  paused: {
    transform: toGpuTransform(0, 0.3),
    transition: {
      duration: 0.44,
      ease: NAV_EASINGS.EXIT,
    },
  },
});
const navScrubberTooltipVariants = Object.freeze({
  hidden: {
    opacity: 0,
    transform: toGpuTransform(8, 0.94),
  },
  visible: {
    opacity: 1,
    transform: toGpuTransform(0),
  },
  exit: {
    opacity: 0,
    transform: toGpuTransform(6, 0.96),
  },
});
const NAV_SCRUBBER_TOOLTIP_TRANSITION = Object.freeze({
  type: "tween",
  duration: 0.31,
  ease: NAV_EASINGS.EMPHASIZED,
});
const NAV_COMPACT_TO_SURFACE_DELAY_MS = 380;
const NAV_SURFACE_HEADER_REVEAL_DELAY_MS = 220;
const NAV_SURFACE_EXIT_SETTLE_MS = 520;
export {
  NAV_EASINGS,
  NAV_TIERS,
  NAV_SPRINGS,
  NAV_STAGGER_TIMINGS,
  NAV_STAGGER_DELAY,
  NAV_TAP_SCALE,
  NAV_BUTTON_TRANSITION,
  NAV_CARD_SPRING,
  NAV_CARD_EXPAND_TRANSITION,
  NAV_STACK_TRANSITION,
  NAV_CARD_TRANSITION,
  NAV_CARD_COLLAPSE_TRANSITION,
  NAV_PEEK_SPRING,
  NAV_SURFACE_TRANSITION,
  NAV_ACTION_DISMISS_TRANSITION,
  NAV_HEADER_SWAP_TRANSITION,
  NAV_SURFACE_BODY_ENTER_TRANSITION,
  NAV_SURFACE_BODY_EXIT_TRANSITION,
  NAV_CARD_HEIGHT_OPEN_TRANSITION,
  NAV_CARD_HEIGHT_CLOSE_TRANSITION,
  NAV_BACKDROP_TRANSITION,
  NAV_FADE_TRANSITION,
  NAV_TEXT_ENTER_TRANSITION,
  NAV_TEXT_EXIT_TRANSITION,
  NAV_ICON_TRANSITION,
  NAV_STAGGER_TRANSITION,
  NAV_MICRO_TRANSITION,
  NAV_BADGE_TRANSITION,
  NAV_ACTIVE_INDICATOR_TRANSITION,
  NAV_RESULTS_TRANSITION,
  NAV_RESULTS_EXIT_TRANSITION,
  NAV_RESULTS_STAGGER_DELAY,
  NAV_PEEK_TRANSITION,
  NAV_SURFACE_DRAG_CONSTRAINTS,
  NAV_SURFACE_DRAG_ELASTIC,
  NAV_BREADCRUMBS_TRANSITION,
  NAV_HUD_TRANSITION,
  NAV_COMPACT_CONTENT_TRANSITION,
  NAV_COMPACT_RESTORE_TRANSITION,
  NAV_COMPACT_TITLE_ENTER_TRANSITION,
  NAV_COMPACT_TITLE_EXIT_TRANSITION,
  NAV_SKELETON_PULSE_CLASS,
  NAV_SCRUBBER_TOOLTIP_SPRING,
  NAV_MEDIA_VOLUME_FILL_TRANSITION,
  NAV_MEDIA_VOLUME_THUMB_POSITION_TRANSITION,
  NAV_COMPOSITOR_STYLE,
  toGpuTransform,
  navSurfaceDragTransformTemplate,
  navActionVariants,
  navMediaVolumeThumbVariants,
  getNavActionMotionProps,
  getNavMediaVolumeFillTransition,
  getNavMediaVolumeThumbAnimateProps,
  getNavMediaVolumeThumbPositionTransition,
  slideFadeVariants,
  textCrossfadeVariants,
  staggerItemVariants,
  navHeaderSwapVariants,
  navExtensionShelfVariants,
  navHeaderRestoreVariants,
  navSurfaceControlsVariants,
  navCommandBarSwapVariants,
  navSurfaceBodyVariants,
  navSurfaceExtensionsVariants,
  NAV_SURFACE_EXTENSIONS_ENTER_TRANSITION,
  NAV_SURFACE_EXTENSIONS_EXIT_TRANSITION,
  navActionDismissVariants,
  navListItemVariants,
  navFadeVariants,
  navIconVariants,
  navBadgeVariants,
  navBackdropVariants,
  navBreadcrumbsVariants,
  navHudVariants,
  navCompactTitleVariants,
  getNavDescriptionVariants,
  getNavActionStaggerTransition,
  getNavStackAnimateProps,
  getNavCardDelay,
  getNavItemAnimateValues,
  getNavItemTransition,
  getNavItemCompactRestoreValues,
  getNavItemCompactExitValues,
  getNavCardContentAnimateProps,
  getNavCardContentTransition,
  getNavScrollProgressStyle,
  navSoundwaveBarVariants,
  navScrubberTooltipVariants,
  NAV_SCRUBBER_TOOLTIP_TRANSITION,
  NAV_COMPACT_TO_SURFACE_DELAY_MS,
  NAV_SURFACE_HEADER_REVEAL_DELAY_MS,
  NAV_SURFACE_EXIT_SETTLE_MS,
};
