"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  MODAL_BREAKPOINTS,
  MODAL_CHROME,
  MODAL_POSITIONS,
  FALLBACK_MODAL_STATE,
} from "./constants";
import { resolveModalHeader } from "./utils";

export const FALLBACK_MODAL_ACTIONS = Object.freeze({
  openModal: async () => null,
  closeModal: () => {},
  closeAllModals: () => {},
});
export const ModalActionsContext = createContext(FALLBACK_MODAL_ACTIONS);
export const ModalStateContext = createContext(FALLBACK_MODAL_STATE);
export function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function getResponsivePosition(position, responsivePosition) {
  if (
    !isPlainObject(responsivePosition) ||
    typeof window === "undefined" ||
    typeof window.matchMedia !== "function"
  ) {
    return position;
  }
  return resolveActivePosition(
    position,
    responsivePosition,
    getViewportIsMobile(),
  );
}
export function normalizePositionConfig(positionInput, config = {}) {
  const basePosition =
    typeof positionInput === "string" ? positionInput : MODAL_POSITIONS.CENTER;
  const responsivePosition =
    (isPlainObject(config.responsivePosition) && config.responsivePosition) ||
    (isPlainObject(positionInput) && positionInput) ||
    null;
  return {
    position: getResponsivePosition(basePosition, responsivePosition),
    responsivePosition,
  };
}
export function createModalState(modalStack = []) {
  const activeModal = modalStack[modalStack.length - 1] || null;
  return {
    position: activeModal?.position || MODAL_POSITIONS.CENTER,
    responsivePosition: activeModal?.responsivePosition || null,
    modalType: activeModal?.modalType || null,
    activeModalId: activeModal?.id || null,
    isOpen: modalStack.length > 0,
    chrome: activeModal?.chrome || MODAL_CHROME.PANEL,
    title: activeModal?.title || null,
    headerActions: activeModal?.headerActions || null,
    showClose: activeModal?.showClose ?? true,
    props: activeModal?.props || {},
    modalStack,
  };
}
export function finalizeModalClose(
  modalId,
  result,
  { onCloseMapRef, resolveMapRef, logCloseErrors = false },
) {
  const onClose = onCloseMapRef.current.get(modalId);
  if (typeof onClose === "function") {
    const handleCloseError = (error) => {
      if (logCloseErrors) {
        console.error("[Modal] onClose handler failed:", error);
      }
    };
    try {
      const callbackResult = onClose(result);
      if (callbackResult && typeof callbackResult.then === "function") {
        callbackResult.catch(handleCloseError);
      }
    } catch (error) {
      handleCloseError(error);
    }
  }
  onCloseMapRef.current.delete(modalId);
  const resolve = resolveMapRef.current.get(modalId);
  if (typeof resolve === "function") {
    resolve(result);
  }
  resolveMapRef.current.delete(modalId);
}
export const INITIAL_MODAL_STATE = createModalState([]);
export function ModalProvider({
  children,
  modalRenderer: ModalRenderer = null,
}) {
  const [modalState, setModalState] = useState(INITIAL_MODAL_STATE);
  const modalStackRef = useRef([]);
  const resolveMapRef = useRef(new Map());
  const onCloseMapRef = useRef(new Map());
  const modalIdRef = useRef(0);
  const syncModalStack = useCallback((nextStack) => {
    modalStackRef.current = nextStack;
    setModalState(createModalState(nextStack));
  }, []);
  const openModal = useCallback(
    (modalType, positionInput = MODAL_POSITIONS.CENTER, config = {}) => {
      const currentStack = modalStackRef.current;
      const topModal = currentStack[currentStack.length - 1];
      if (topModal && topModal.modalType === modalType) {
        return Promise.resolve(null);
      }
      const filteredStack = currentStack.filter((entry) => {
        if (entry.modalType === modalType) {
          finalizeModalClose(entry.id, null, {
            onCloseMapRef,
            resolveMapRef,
          });
          return false;
        }
        return true;
      });
      const { position, responsivePosition } = normalizePositionConfig(
        positionInput,
        config,
      );
      const resolvedHeader = resolveModalHeader(config);
      const modalId = ++modalIdRef.current;
      const modalEntry = {
        id: modalId,
        modalType,
        position,
        responsivePosition,
        title: resolvedHeader.title,
        headerActions: resolvedHeader.actions || null,
        showClose: resolvedHeader.showClose ?? true,
        chrome: config.chrome || MODAL_CHROME.PANEL,
        props: config.data ?? config,
      };
      const modalPromise = new Promise((resolve) => {
        resolveMapRef.current.set(modalId, resolve);
        onCloseMapRef.current.set(modalId, config.onClose || null);
      });
      syncModalStack([...filteredStack, modalEntry]);
      return modalPromise;
    },
    [syncModalStack],
  );
  const closeModal = useCallback(
    (result = null, targetModalId = null) => {
      const currentStack = modalStackRef.current;
      if (currentStack.length === 0) return;
      const modalId =
        targetModalId || currentStack[currentStack.length - 1]?.id || null;
      const modalToClose = currentStack.find((entry) => entry.id === modalId);
      if (!modalToClose) return;
      syncModalStack(currentStack.filter((entry) => entry.id !== modalId));
      finalizeModalClose(modalId, result, {
        onCloseMapRef,
        resolveMapRef,
        logCloseErrors: true,
      });
    },
    [syncModalStack],
  );
  const closeAllModals = useCallback(
    (result = null) => {
      const currentStack = modalStackRef.current;
      if (currentStack.length === 0) return;
      syncModalStack([]);
      currentStack.forEach((entry) => {
        finalizeModalClose(entry.id, result, {
          onCloseMapRef,
          resolveMapRef,
        });
      });
    },
    [syncModalStack],
  );
  const actionsValue = useMemo(
    () => ({
      openModal,
      closeModal,
      closeAllModals,
    }),
    [openModal, closeModal, closeAllModals],
  );
  return (
    <ModalActionsContext.Provider value={actionsValue}>
      <ModalStateContext.Provider value={modalState}>
        {ModalRenderer ? <ModalRenderer /> : null}
        {children}
      </ModalStateContext.Provider>
    </ModalActionsContext.Provider>
  );
}
export function useModalActions() {
  return useContext(ModalActionsContext);
}
export function useModalState() {
  return useContext(ModalStateContext);
}
export function useModal() {
  const actions = useModalActions();
  const state = useModalState();
  return useMemo(
    () => ({
      ...actions,
      ...state,
    }),
    [actions, state],
  );
}
const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [contenteditable="true"], [tabindex]:not([tabindex="-1"])';
export const SMOOTH_SCROLL_LOCK_EVENT = "modal:smooth-scroll-lock";
export function resolveActivePosition(
  position,
  responsivePosition,
  isMobileViewport,
) {
  if (!responsivePosition || typeof responsivePosition !== "object") {
    return position;
  }
  if (isMobileViewport && responsivePosition.mobile) {
    return responsivePosition.mobile;
  }
  if (!isMobileViewport && responsivePosition.desktop) {
    return responsivePosition.desktop;
  }
  return position;
}
export function getViewportIsMobile() {
  if (
    typeof window === "undefined" ||
    typeof window.matchMedia !== "function"
  ) {
    return false;
  }
  return window.matchMedia(
    `(max-width: ${MODAL_BREAKPOINTS.MOBILE_MAX_WIDTH}px)`,
  ).matches;
}
export function getFocusableElements(container) {
  if (!container) {
    return [];
  }
  return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR));
}
export function trapFocus(event, container) {
  if (event.key !== "Tab" || !container) {
    return;
  }
  const elements = getFocusableElements(container);
  if (elements.length === 0) {
    return;
  }
  const firstElement = elements[0];
  const lastElement = elements[elements.length - 1];
  if (event.shiftKey) {
    if (document.activeElement === firstElement) {
      event.preventDefault();
      lastElement?.focus();
    }
    return;
  }
  if (document.activeElement === lastElement) {
    event.preventDefault();
    firstElement?.focus();
  }
}
export function getModalLabel(modalType) {
  if (typeof modalType !== "string" || !modalType.trim()) return "Modal";
  return modalType
    .trim()
    .toLowerCase()
    .split(/[_-]+/)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}
export function isSidePosition(position) {
  return (
    position === MODAL_POSITIONS.LEFT || position === MODAL_POSITIONS.RIGHT
  );
}
export function isVerticalEdgePosition(position) {
  return (
    position === MODAL_POSITIONS.TOP || position === MODAL_POSITIONS.BOTTOM
  );
}
