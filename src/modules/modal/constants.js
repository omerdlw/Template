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

export const FALLBACK_MODAL_STATE = Object.freeze({
  position: MODAL_POSITIONS.CENTER,
  responsivePosition: null,
  modalType: null,
  activeModalId: null,
  isOpen: false,
  chrome: MODAL_CHROME.PANEL,
  title: null,
  headerActions: null,
  showClose: true,
  props: {},
  modalStack: [],
});
