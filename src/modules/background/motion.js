const BACKGROUND_DEFAULT_MOTION = Object.freeze({
  transition: Object.freeze({
    duration: 0.6,
    ease: [0.4, 0, 0.2, 1],
  }),
  initial: Object.freeze({
    opacity: 0,
  }),
  animate: Object.freeze({
    opacity: 1,
  }),
  exit: Object.freeze({
    opacity: 0,
  }),
});

export const BACKGROUND_EXIT_EASE = Object.freeze([0, 0, 0.2, 1]);
export const BACKGROUND_OVERLAY_TRANSITION_PROPERTY = "opacity";
export const BACKGROUND_ANIMATE_PRESENCE_MODE = "sync";
export const BACKGROUND_WILL_CHANGE = "transform, opacity, filter";

export function getBackgroundMotionConfig(pageAnimation) {
  const resolvedAnimation = pageAnimation || {};
  return {
    exitDurationFactor: Number(resolvedAnimation?.exitDurationFactor),
    transition:
      resolvedAnimation?.transition ?? BACKGROUND_DEFAULT_MOTION.transition,
    initial: resolvedAnimation?.initial ?? BACKGROUND_DEFAULT_MOTION.initial,
    animate: resolvedAnimation?.animate ?? BACKGROUND_DEFAULT_MOTION.animate,
    exit: resolvedAnimation?.exit ?? BACKGROUND_DEFAULT_MOTION.exit,
  };
}

export function toCssDuration(seconds) {
  const value = Number(seconds);
  return `${Math.max(0, Number.isFinite(value) ? value : 0.6) * 1000}ms`;
}

export function toCssDelay(seconds) {
  const value = Number(seconds);
  return `${Math.max(0, Number.isFinite(value) ? value : 0) * 1000}ms`;
}

export function toCssEasing(easing) {
  if (Array.isArray(easing)) {
    return `cubic-bezier(${easing.join(", ")})`;
  }
  if (typeof easing === "string" && easing.trim()) {
    return easing;
  }
  return "ease";
}
