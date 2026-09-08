const NOTIFICATION_EASINGS = Object.freeze({
  EMPHASIZED: Object.freeze([0.16, 1, 0.3, 1]),
  SOFT: Object.freeze([0.22, 1, 0.36, 1]),
  EXIT: Object.freeze([0.7, 0, 0.84, 0]),
});
const NOTIFICATION_TIERS = Object.freeze({
  MICRO: {
    duration: 0.24,
    distance: 4,
    scaleDelta: 0.008,
    ease: NOTIFICATION_EASINGS.EMPHASIZED,
  },
  FAST: {
    duration: 0.44,
    distance: 9,
    scaleDelta: 0.012,
    ease: NOTIFICATION_EASINGS.EMPHASIZED,
  },
  STANDARD: {
    duration: 0.66,
    distance: 18,
    scaleDelta: 0.018,
    ease: NOTIFICATION_EASINGS.SOFT,
  },
});
function toGpuTransform({ x = 0, y = 0, scale = 1 } = {}) {
  return `translate3d(${x}px, ${y}px, 0) scale(${scale})`;
}
export const NOTIFICATION_MICRO_SPRING = Object.freeze({
  type: "spring",
  stiffness: 520,
  damping: 30,
  mass: 0.28,
});
export const NOTIFICATION_MICRO_TAP_SCALE = 0.97;
export const NOTIFICATION_DRAG_CONSTRAINTS = Object.freeze({
  left: 0,
  right: 240,
});
export const NOTIFICATION_DRAG_ELASTIC = Object.freeze({
  left: 0.05,
  right: 0.7,
});
export const NOTIFICATION_WHILE_DRAG = Object.freeze({
  scale: 0.98,
});
export const NOTIFICATION_CLOSE_TAP = Object.freeze({
  transform: toGpuTransform({
    scale: NOTIFICATION_MICRO_TAP_SCALE,
  }),
});
export const NOTIFICATION_ACTION_TAP = Object.freeze({
  transform: toGpuTransform({
    scale: NOTIFICATION_MICRO_TAP_SCALE,
  }),
});
export const NOTIFICATION_ACTION_TRANSITION = NOTIFICATION_MICRO_SPRING;
export const notificationContentVariants = Object.freeze({
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      duration: NOTIFICATION_TIERS.FAST.duration,
      ease: NOTIFICATION_EASINGS.SOFT,
      delay: 0.06,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.38,
      ease: NOTIFICATION_EASINGS.EXIT,
    },
  },
});
export const toastVariants = Object.freeze({
  hidden: {
    opacity: 0,
    transform: toGpuTransform({
      x: NOTIFICATION_TIERS.STANDARD.distance,
      scale: 1 - NOTIFICATION_TIERS.STANDARD.scaleDelta,
    }),
  },
  visible: {
    opacity: 1,
    transform: toGpuTransform(),
    transition: {
      duration: NOTIFICATION_TIERS.FAST.duration,
      ease: NOTIFICATION_EASINGS.EMPHASIZED,
    },
  },
  exit: {
    opacity: 0,
    transform: toGpuTransform({
      x: 28,
      scale: 0.976,
    }),
    transition: {
      duration: 0.38,
      ease: NOTIFICATION_EASINGS.EXIT,
    },
  },
});
export const TOAST_VARIANTS = toastVariants;
export const NOTIFICATION_CONTENT_VARIANTS = notificationContentVariants;
