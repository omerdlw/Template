// ── Context-menu motion contract ────────────────────────────────────────────
// The menu view consumes every enter, exit, item, and press token from this
// file so context-menu animation remains consistent.

const CONTEXT_MENU_EASINGS = Object.freeze({
  EMPHASIZED: Object.freeze([0.16, 1, 0.3, 1]),
  SOFT: Object.freeze([0.22, 1, 0.36, 1]),
  EXIT: Object.freeze([0.7, 0, 0.84, 0]),
});

const CONTEXT_MENU_TIERS = Object.freeze({
  MICRO: {
    duration: 0.24,
    distance: 4,
    scaleDelta: 0.008,
    ease: CONTEXT_MENU_EASINGS.EMPHASIZED,
  },
});

function toGpuTransform({ x = 0, y = 0, scale = 1 } = {}) {
  return `translate3d(${x}px, ${y}px, 0) scale(${scale})`;
}

export const CONTEXT_MENU_MICRO_SPRING = Object.freeze({
  type: "spring",
  stiffness: 520,
  damping: 30,
  mass: 0.28,
});
export const CONTEXT_MENU_ITEM_TAP = Object.freeze({
  transform: toGpuTransform({ scale: 0.97 }),
});

export const menuContentVariants = Object.freeze({
  hidden: { opacity: 0, filter: "blur(4px)" },
  visible: {
    opacity: 1,
    filter: "blur(0px)",
    transition: {
      duration: CONTEXT_MENU_TIERS.MICRO.duration,
      ease: CONTEXT_MENU_EASINGS.SOFT,
      delay: 0.04,
    },
  },
  exit: {
    opacity: 0,
    filter: "blur(3px)",
    transition: { duration: 0.18, ease: CONTEXT_MENU_EASINGS.EXIT },
  },
});

export const menuItemVariants = Object.freeze({
  hidden: {
    opacity: 0,
    transform: toGpuTransform({
      y: CONTEXT_MENU_TIERS.MICRO.distance,
      scale: 0.992,
    }),
    filter: "blur(4px)",
  },
  visible: (index = 0) => ({
    opacity: 1,
    transform: toGpuTransform(),
    filter: "blur(0px)",
    transition: {
      duration: CONTEXT_MENU_TIERS.MICRO.duration,
      ease: CONTEXT_MENU_EASINGS.EMPHASIZED,
      delay: 0.04 + Math.min(Math.max(Number(index) || 0, 0) * 0.042, 0.21),
    },
  }),
  exit: {
    opacity: 0,
    transform: toGpuTransform({ y: -3, scale: 0.994 }),
    filter: "blur(3px)",
    transition: { duration: 0.18, ease: CONTEXT_MENU_EASINGS.EXIT },
  },
});

export const menuPopVariants = Object.freeze({
  hidden: {
    opacity: 0,
    transform: toGpuTransform({ scale: 0.96 }),
    transformOrigin: "top left",
    filter: "blur(5px)",
  },
  visible: {
    opacity: 1,
    transform: toGpuTransform(),
    transformOrigin: "top left",
    filter: "blur(0px)",
    transition: {
      duration: CONTEXT_MENU_TIERS.MICRO.duration,
      ease: CONTEXT_MENU_EASINGS.EMPHASIZED,
    },
  },
  exit: {
    opacity: 0,
    transform: toGpuTransform({ scale: 0.98 }),
    transformOrigin: "top left",
    filter: "blur(4px)",
    transition: { duration: 0.18, ease: CONTEXT_MENU_EASINGS.EXIT },
  },
});

export const CONTEXT_MENU_POP_VARIANTS = menuPopVariants;
export const CONTEXT_MENU_CONTENT_VARIANTS = menuContentVariants;
export const CONTEXT_MENU_ITEM_VARIANTS = menuItemVariants;
