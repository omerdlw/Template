// ── Modal contract and configuration ───────────────────────────────────────
// This file contains the data-only parts of the public modal contract. Keeping
// header resolution here makes the runtime and the view independent from
// feature-specific title rules.

export const MODAL_POSITIONS = Object.freeze({
  CENTER: "center",
  BOTTOM: "bottom",
  RIGHT: "right",
  LEFT: "left",
  TOP: "top",
});

export const MODAL_POSITION_CLASSES = Object.freeze({
  [MODAL_POSITIONS.CENTER]: "items-center justify-center",
  [MODAL_POSITIONS.TOP]: "items-center justify-start",
  [MODAL_POSITIONS.BOTTOM]: "items-center justify-end",
  [MODAL_POSITIONS.LEFT]: "items-start justify-start",
  [MODAL_POSITIONS.RIGHT]: "items-end justify-start",
});

export const MODAL_CHROME = Object.freeze({
  PANEL: "panel",
  BARE: "bare",
});

export const MODAL_BREAKPOINTS = Object.freeze({
  MOBILE_MAX_WIDTH: 639,
});

export function resolveModalHeader(configOrModalType = {}, legacyConfig = {}) {
  const config =
    configOrModalType &&
    typeof configOrModalType === "object" &&
    !Array.isArray(configOrModalType)
      ? configOrModalType
      : legacyConfig;
  const header =
    config?.header && typeof config.header === "object" ? config.header : {};

  return {
    title: header.title ?? config?.title ?? null,
    actions: header.actions ?? config?.actions ?? null,
    showClose: header.showClose ?? config?.showClose,
  };
}
