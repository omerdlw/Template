// ── Background model and pure visual calculations ──────────────────────────────

export const DEFAULT_BACKGROUND = Object.freeze({
  overlayOpacity: 0,
  overlayColor: "var(--black)",
  position: "center",
  videoOptions: {
    playbackRate: 1,
    autoplay: true,
    muted: true,
    loop: false,
    corp: 0,
    width: null,
    className: "",
  },
  videoElement: null,
  videoStyle: {},
  videoClassName: "",
  className: "",
  width: null,
  fit: null,
  fadeEdges: null,
  imageStyle: {},
  noiseStyle: {},
  overlay: false,
  image: null,
  video: null,
  isPlaying: false,
  animation: null,
});

export const BG_TO_OBJECT_CLASS_MAP = Object.freeze({
  "bg-contain": "object-contain",
  "bg-cover": "object-cover",
  "bg-fill": "object-fill",
  "bg-none": "object-none",
  "bg-scale-down": "object-scale-down",
  "bg-center": "object-center",
  "bg-top": "object-top",
  "bg-bottom": "object-bottom",
  "bg-left": "object-left",
  "bg-right": "object-right",
  "bg-left-top": "object-left-top",
  "bg-left-bottom": "object-left-bottom",
  "bg-right-top": "object-right-top",
  "bg-right-bottom": "object-right-bottom",
});

export const FIT_TO_OBJECT_CLASS_MAP = Object.freeze({
  contain: "object-contain",
  cover: "object-cover",
  fill: "object-fill",
  none: "object-none",
  "scale-down": "object-scale-down",
});

export function resolveVideoClasses(...inputs) {
  const customClasses = inputs
    .filter(Boolean)
    .flatMap((entry) =>
      typeof entry === "string"
        ? entry.replace(/,/g, " ").trim().split(/\s+/)
        : [],
    )
    .filter(Boolean);

  const mapped = [];
  for (const cls of customClasses) {
    if (BG_TO_OBJECT_CLASS_MAP[cls]) mapped.push(BG_TO_OBJECT_CLASS_MAP[cls]);
  }

  return {
    customClasses: customClasses.join(" "),
    mappedClasses: mapped.join(" "),
  };
}

export function extractWidthClasses(className = "") {
  if (!className || typeof className !== "string") {
    return { widthClasses: "", nonWidthClasses: "" };
  }

  const tokens = className
    .replace(/,/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const widthTokens = [];
  const otherTokens = [];

  for (const token of tokens) {
    if (/^(w-|max-w-|min-w-)/.test(token)) widthTokens.push(token);
    else otherTokens.push(token);
  }

  return {
    widthClasses: widthTokens.join(" "),
    nonWidthClasses: otherTokens.join(" "),
  };
}

export function resolveGradientSettings({
  leftGradient = 0,
  rightGradient = 0,
  fadeEdges = null,
  hasWidth = false,
}) {
  let leftPercent = 0;
  let rightPercent = 0;

  if (leftGradient > 0)
    leftPercent = Math.min(48, Math.max(12, leftGradient * 7.5));
  else if (hasWidth && fadeEdges !== false) leftPercent = 20;

  if (rightGradient > 0)
    rightPercent = Math.min(48, Math.max(12, rightGradient * 7.5));
  else if (hasWidth && fadeEdges !== false) rightPercent = 20;

  if (typeof fadeEdges === "number") {
    leftPercent = fadeEdges;
    rightPercent = fadeEdges;
  } else if (typeof fadeEdges === "string") {
    const parsed = parseFloat(fadeEdges);
    if (!Number.isNaN(parsed)) {
      leftPercent = parsed;
      rightPercent = parsed;
    }
  } else if (typeof fadeEdges === "object" && fadeEdges !== null) {
    if (fadeEdges.left !== undefined)
      leftPercent = parseFloat(fadeEdges.left) || 0;
    if (fadeEdges.right !== undefined)
      rightPercent = parseFloat(fadeEdges.right) || 0;
  } else if (fadeEdges === false) {
    leftPercent = 0;
    rightPercent = 0;
  }

  const leftOpacity = leftGradient > 0 ? Math.min(1, leftGradient * 0.22) : 0;
  const rightOpacity =
    rightGradient > 0 ? Math.min(1, rightGradient * 0.22) : 0;

  return {
    leftPercent,
    rightPercent,
    leftOpacity,
    rightOpacity,
    enabled: leftPercent > 0 || rightPercent > 0,
  };
}

function generateSmoothstepStops(percent, direction = "in") {
  const steps = [
    { t: 0, s: 0 },
    { t: 0.15, s: 0.06 },
    { t: 0.35, s: 0.22 },
    { t: 0.55, s: 0.47 },
    { t: 0.75, s: 0.76 },
    { t: 0.9, s: 0.93 },
    { t: 1.0, s: 1.0 },
  ];

  if (direction === "in") {
    return steps.map(
      ({ t, s }) => `rgba(0,0,0,${s}) ${(t * percent).toFixed(1)}%`,
    );
  }

  return steps.map(
    ({ t, s }) =>
      `rgba(0,0,0,${(1 - s).toFixed(2)}) ${(100 - percent + t * percent).toFixed(1)}%`,
  );
}

export function getEdgeFadeMask({ leftPercent = 0, rightPercent = 0 }) {
  if (leftPercent <= 0 && rightPercent <= 0) return undefined;

  const leftStops =
    leftPercent > 0
      ? generateSmoothstepStops(leftPercent, "in")
      : ["rgba(0,0,0,1) 0%"];
  const rightStops =
    rightPercent > 0
      ? generateSmoothstepStops(rightPercent, "out")
      : ["rgba(0,0,0,1) 100%"];

  return `linear-gradient(to right, ${leftStops.join(", ")}, ${rightStops.join(", ")})`;
}

export function mergeBackgroundState(baseState, patch = {}) {
  const isPatchObject = patch !== null && typeof patch === "object";
  const safePatch = isPatchObject ? patch : {};
  const resolvedPatch = safePatch;

  return {
    ...baseState,
    ...resolvedPatch,
    imageStyle: {
      ...baseState.imageStyle,
      ...(resolvedPatch.imageStyle || {}),
    },
    videoStyle: {
      ...baseState.videoStyle,
      ...(resolvedPatch.videoStyle || {}),
    },
    noiseStyle: {
      ...baseState.noiseStyle,
      ...(resolvedPatch.noiseStyle || {}),
    },
    videoOptions: {
      ...baseState.videoOptions,
      ...(resolvedPatch.videoOptions || {}),
    },
    animation:
      resolvedPatch.animation !== undefined
        ? resolvedPatch.animation
          ? { ...(baseState.animation || {}), ...resolvedPatch.animation }
          : resolvedPatch.animation
        : baseState.animation,
  };
}

// ── Background motion contract ──────────────────────────────────────────────
// Motion policy stays with the background model because this module has one
// consumer surface and no independent animation seam.

const BACKGROUND_DEFAULT_MOTION = Object.freeze({
  transition: Object.freeze({
    duration: 0.6,
    ease: [0.4, 0, 0.2, 1],
  }),
  initial: Object.freeze({ opacity: 0 }),
  animate: Object.freeze({ opacity: 1 }),
  exit: Object.freeze({ opacity: 0 }),
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
