"use client";

import {
  isValidElement,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { Z_INDEX } from "@/shared";
import { cn } from "@/shared/utils";
import { Button, Icon } from "@/ui/primitives";
import { ModuleError } from "@/modules/error-boundary";
import { useModalRegistry } from "@/modules/registry";
import {
  MODAL_BREAKPOINTS,
  MODAL_CHROME,
  MODAL_POSITION_CLASSES,
  MODAL_POSITIONS,
} from "./constants";
import {
  MODAL_CONTENT_VARIANTS,
  MODAL_FOOTER_VARIANTS,
  MODAL_HEADER_VARIANTS,
  getModalPositionVariants,
  getModalTransition,
  modalBackdropVariants,
} from "./motion";
import {
  ModalProvider as ModalRuntimeProvider,
  SMOOTH_SCROLL_LOCK_EVENT,
  getFocusableElements,
  getModalLabel,
  getViewportIsMobile,
  isSidePosition,
  isVerticalEdgePosition,
  resolveActivePosition,
  trapFocus,
  useModal,
} from "./provider";
export {
  MODAL_BREAKPOINTS,
  MODAL_CHROME,
  MODAL_POSITION_CLASSES,
  MODAL_POSITIONS,
} from "./constants";
export { resolveModalHeader } from "./utils";
export {
  MODAL_BACKDROP_VARIANTS,
  MODAL_CONTENT_STAGGER,
  MODAL_CONTENT_VARIANTS,
  MODAL_EASINGS,
  MODAL_FOOTER_VARIANTS,
  MODAL_HEADER_VARIANTS,
  MODAL_LIST_ITEM_VARIANTS,
  MODAL_LIST_VARIANTS,
  MODAL_MICRO_SPRING,
  MODAL_MICRO_TAP,
  MODAL_MICRO_TAP_SCALE,
  MODAL_PANEL_SPRING,
  MODAL_POSITION_VARIANTS,
  getModalPositionVariants,
  getModalTransition,
  modalBackdropVariants,
} from "./motion";
function dispatchSmoothScrollLock(locked) {
  window.dispatchEvent(
    new CustomEvent(SMOOTH_SCROLL_LOCK_EVENT, {
      detail: {
        locked,
        source: "modal",
      },
    }),
  );
}
const HEIGHT_CONSTRAINT_PATTERN = /(\s|^)(?:[\w-]+:)*(?:h|max-h)-/;
function hasHeightConstraint(className) {
  return (
    typeof className === "string" && HEIGHT_CONSTRAINT_PATTERN.test(className)
  );
}
function isSideModal(position) {
  return (
    position === MODAL_POSITIONS.LEFT || position === MODAL_POSITIONS.RIGHT
  );
}
function getContainerClassName({ className, position }) {
  const sideModal = isSideModal(position);
  const usesExplicitHeightConstraint = hasHeightConstraint(className);
  return cn(
    "flex min-h-0 flex-col overflow-hidden",
    sideModal
      ? "h-full max-h-full"
      : usesExplicitHeightConstraint
        ? null
        : "max-h-[70dvh]",
    className,
  );
}
function getBodyClassName(bodyClassName) {
  return cn(
    "min-h-0 w-full flex-1 overflow-y-auto overscroll-contain modal-body rounded-[20px]",
    bodyClassName,
  );
}
function resolveHeaderActions(actions, close) {
  if (typeof actions === "function") {
    return actions({
      close,
    });
  }
  return actions || null;
}
function hasSlotContent(value) {
  return !(
    value === null ||
    value === undefined ||
    value === false ||
    value === ""
  );
}
function isHeaderConfig(value) {
  return (
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    !isValidElement(value)
  );
}
function CloseButton({ close, label = "Close modal" }) {
  if (typeof close !== "function") {
    return null;
  }
  return (
    <Button
      type="button"
      aria-label={label}
      onClick={close}
      className="center inline-flex size-8 cursor-pointer rounded-[20px] bg-white/5 text-white/70 ring-1 ring-white/5 ring-inset hover:bg-white hover:text-black hover:ring-transparent focus-visible:ring-2 focus-visible:ring-white/10 focus-visible:outline-none"
    >
      <Icon icon="material-symbols:close-rounded" size={16} />
    </Button>
  );
}
export function Container({
  children,
  className,
  bodyClassName,
  header = {},
  footer,
  close,
  position = null,
}) {
  const isHeaderDisabled = header === false;
  const headerConfig =
    !isHeaderDisabled && isHeaderConfig(header) ? header : {};
  const hasCustomHeaderNode =
    !isHeaderDisabled && !isHeaderConfig(header) && hasSlotContent(header);
  const resolvedPosition = position || headerConfig?.position || null;
  const showClose = headerConfig?.showClose === true;
  const headerActions = resolveHeaderActions(headerConfig?.actions, close);
  const headerLeft = hasCustomHeaderNode
    ? null
    : (headerConfig?.left ??
      (headerConfig?.title ? (
        <h2
          id={headerConfig.titleId}
          className="truncate text-sm font-semibold text-white"
        >
          {headerConfig.title}
        </h2>
      ) : null));
  const headerCenter = hasCustomHeaderNode
    ? header
    : (headerConfig?.center ?? null);
  const headerRight = hasCustomHeaderNode
    ? null
    : (headerConfig?.right ??
      (hasSlotContent(headerActions) || showClose ? (
        <div className="flex items-center justify-end gap-2.5">
          {headerActions}
          {showClose ? <CloseButton close={close} /> : null}
        </div>
      ) : null));
  const headerIsSticky = Boolean(headerConfig?.sticky);
  const shouldRenderHeader =
    !isHeaderDisabled &&
    (hasSlotContent(headerLeft) ||
      hasSlotContent(headerCenter) ||
      hasSlotContent(headerRight));
  const footerConfig = footer && typeof footer === "object" ? footer : {};
  const footerLeft = footerConfig.left ?? null;
  const footerCenter = footerConfig.center ?? null;
  const footerRight = footerConfig.right ?? null;
  const footerIsSticky = Boolean(footerConfig.sticky);
  const shouldRenderFooter =
    footer !== false &&
    (hasSlotContent(footerLeft) ||
      hasSlotContent(footerCenter) ||
      hasSlotContent(footerRight));
  return (
    <div
      className={getContainerClassName({
        className,
        position: resolvedPosition,
      })}
    >
      {shouldRenderHeader ? (
        <motion.div
          variants={MODAL_HEADER_VARIANTS}
          initial="hidden"
          animate="visible"
          className={cn(
            hasSlotContent(headerCenter)
              ? "grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]"
              : "flex justify-between",
            "items-center gap-2.5 px-4 py-3",
            headerIsSticky && "sticky top-0 z-10 bg-black",
          )}
        >
          <div className="min-w-0">{headerLeft}</div>
          {hasSlotContent(headerCenter) && (
            <div className="flex items-center justify-center">
              {headerCenter}
            </div>
          )}
          <div className="min-w-0">{headerRight}</div>
        </motion.div>
      ) : null}

      <motion.div
        variants={MODAL_CONTENT_VARIANTS}
        initial="hidden"
        animate="visible"
        data-lenis-prevent
        data-lenis-prevent-wheel
        className={getBodyClassName(bodyClassName)}
      >
        {children}
      </motion.div>

      {shouldRenderFooter ? (
        <motion.div
          variants={MODAL_FOOTER_VARIANTS}
          initial="hidden"
          animate="visible"
          className={cn(
            hasSlotContent(footerCenter)
              ? "grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]"
              : "flex justify-between",
            "items-center gap-2.5 px-4 py-3",
            footerIsSticky && "sticky bottom-0 bg-black",
          )}
        >
          <div className="min-w-0">{footerLeft}</div>
          {hasSlotContent(footerCenter) && (
            <div className="flex items-center justify-center">
              {footerCenter}
            </div>
          )}
          <div
            className={cn(
              "flex items-center gap-2.5",
              hasSlotContent(footerCenter) ? "w-full justify-end" : null,
            )}
          >
            {footerRight}
          </div>
        </motion.div>
      ) : null}
    </div>
  );
}
export const ModalContainer = Container;
function ModalLayerSwitcher({
  currentEntry,
  previousEntry,
  onSwitchToPrevious,
}) {
  return (
    <div className="center shrink-0 gap-2 border-t border-white/10 bg-white/5 p-2.5">
      <Button
        type="button"
        onClick={onSwitchToPrevious}
        className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-white/5 px-2.5 py-1.5 text-xs font-semibold text-white/70 uppercase ring-1 ring-white/5 ring-inset hover:bg-white hover:text-black"
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          className="shrink-0"
        >
          <path
            d="M7.5 2.5L4 6l3.5 3.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {getModalLabel(previousEntry.modalType)}
      </Button>
      <span className="text-xs text-white/15">/</span>
      <span className="rounded-xl bg-white/10 px-2.5 py-1.5 text-xs font-bold uppercase ring-1 ring-white/10 ring-inset">
        {getModalLabel(currentEntry.modalType)}
      </span>
    </div>
  );
}
function ModalLayer({
  entry,
  stackIndex,
  isTopModal,
  isMobileViewport,
  closeModal,
  registry,
  modalStack,
}) {
  const modalRef = useRef(null);
  const activePosition = useMemo(() => {
    return resolveActivePosition(
      entry.position,
      entry.responsivePosition,
      isMobileViewport,
    );
  }, [entry.position, entry.responsivePosition, isMobileViewport]);
  const SpecificModalComponent = registry.get(entry.modalType);
  const isPanelChrome = entry.chrome !== MODAL_CHROME.BARE;
  const isLeftModal = activePosition === MODAL_POSITIONS.LEFT;
  const isRightModal = activePosition === MODAL_POSITIONS.RIGHT;
  const isSideModal = isSidePosition(activePosition);
  const isTopModalPosition = activePosition === MODAL_POSITIONS.TOP;
  const isBottomModalPosition = activePosition === MODAL_POSITIONS.BOTTOM;
  const isVerticalEdgeModal = isVerticalEdgePosition(activePosition);
  const previousEntry = modalStack[stackIndex - 1] || null;
  const titleId = `modal-title-${entry.id}`;
  const baseZIndex = Z_INDEX.MODAL + stackIndex * 2;
  const modalZIndex = baseZIndex + 1;
  const positionVariants = getModalPositionVariants(activePosition);
  useEffect(() => {
    if (!isTopModal || !modalRef.current) return;
    const previouslyFocusedElement = document.activeElement;
    const initialElements = getFocusableElements(modalRef.current);
    if (initialElements.length > 0) {
      initialElements[0].focus();
    }
    function handleKeyDown(event) {
      if (event.key === "Escape") {
        closeModal(null, entry.id);
        return;
      }
      trapFocus(event, modalRef.current);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (previouslyFocusedElement?.isConnected) {
        previouslyFocusedElement.focus();
      }
    };
  }, [closeModal, entry.id, isTopModal]);
  if (!SpecificModalComponent) {
    return null;
  }
  return (
    <div
      key={entry.id}
      role="dialog"
      aria-modal={isTopModal}
      aria-labelledby={entry.title ? titleId : undefined}
      style={{
        zIndex: baseZIndex,
      }}
      className={cn(
        "pointer-events-none fixed inset-0 flex flex-col",
        MODAL_POSITION_CLASSES[activePosition] ||
          MODAL_POSITION_CLASSES[MODAL_POSITIONS.CENTER],
        activePosition === MODAL_POSITIONS.CENTER &&
          !isMobileViewport &&
          "px-3",
      )}
    >
      <motion.div
        ref={modalRef}
        variants={positionVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        transition={getModalTransition(activePosition)}
        className={cn(
          "relative flex max-w-full flex-col",
          isTopModal
            ? "pointer-events-auto"
            : "pointer-events-none select-none",
          activePosition === MODAL_POSITIONS.CENTER && "w-full sm:w-auto",
          isVerticalEdgeModal && "w-full",
          isSideModal && (isMobileViewport ? "w-full" : "w-auto"),
          isVerticalEdgeModal && "self-stretch",
          isSideModal && isMobileViewport && "self-stretch",
        )}
        style={{
          zIndex: modalZIndex,
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div
          className={cn(
            "modal-panel relative flex flex-col",
            isPanelChrome
              ? "overflow-hidden bg-black/60 shadow-[0_18px_56px_rgba(0,0,0,0.50)] ring-1 ring-white/10 backdrop-blur-xl ring-inset"
              : "overflow-visible bg-transparent ring-1 ring-transparent ring-inset",
            isPanelChrome &&
              (activePosition === MODAL_POSITIONS.CENTER
                ? "rounded-[30px]"
                : activePosition === MODAL_POSITIONS.BOTTOM
                  ? "rounded-t-[30px]"
                  : activePosition === MODAL_POSITIONS.TOP
                    ? "rounded-b-[30px]"
                    : activePosition === MODAL_POSITIONS.LEFT
                      ? isMobileViewport
                        ? "rounded-none"
                        : "rounded-r-[30px]"
                      : activePosition === MODAL_POSITIONS.RIGHT
                        ? isMobileViewport
                          ? "rounded-none"
                          : "rounded-l-[30px]"
                        : "rounded-[30px]"),
            isPanelChrome && isTopModalPosition && "border-t-0",
            isPanelChrome && isBottomModalPosition && "border-b-0",
            isPanelChrome &&
              isVerticalEdgeModal &&
              isMobileViewport &&
              (isTopModalPosition
                ? "w-full rounded-b-[30px] border-t-0 border-r-0 border-l-0"
                : "w-full rounded-t-[30px] border-r-0 border-b-0 border-l-0"),
            isPanelChrome &&
              isSideModal && [
                isMobileViewport
                  ? isLeftModal
                    ? "h-screen max-h-screen w-full self-stretch rounded-none border-0"
                    : "h-screen max-h-screen w-full self-stretch rounded-none border-0"
                  : "h-screen max-h-screen w-full",
                !isMobileViewport &&
                  (isLeftModal ? "border-l-0" : "border-r-0"),
              ],
          )}
        >
          <ModuleError name={entry.modalType}>
            <SpecificModalComponent
              header={{
                title: entry.title,
                titleId,
                position: activePosition,
                actions: entry.headerActions,
                showClose: entry.showClose,
              }}
              close={(result) => closeModal(result, entry.id)}
              data={entry.props}
            />
          </ModuleError>

          {!isTopModal && (
            <div
              onClick={(event) => {
                event.stopPropagation();
                const topModal = modalStack[modalStack.length - 1];
                if (topModal) {
                  closeModal(null, topModal.id);
                }
              }}
              className="pointer-events-auto absolute inset-0 z-50 cursor-pointer bg-white/10 transition-all duration-300 ease-in-out"
              aria-label="Close active top modal"
            />
          )}

          {isTopModal && stackIndex > 0 && previousEntry && (
            <ModalLayerSwitcher
              currentEntry={entry}
              previousEntry={previousEntry}
              onSwitchToPrevious={() => closeModal(null, entry.id)}
            />
          )}
        </div>
      </motion.div>
    </div>
  );
}
export function Modal() {
  const { modalStack = [], isOpen, closeModal } = useModal();
  const registry = useModalRegistry();
  const visibleModalStack = useMemo(
    () => modalStack.filter((entry) => Boolean(registry.get(entry.modalType))),
    [modalStack, registry],
  );
  const topModalEntry = visibleModalStack[visibleModalStack.length - 1] || null;
  const isModalVisible = Boolean(isOpen && topModalEntry);
  const [mounted, setMounted] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(getViewportIsMobile);
  const [isTopExitSettling, setIsTopExitSettling] = useState(false);
  const previousTopModalIdRef = useRef(null);
  const bodyOverflowRef = useRef(null);
  useLayoutEffect(() => {
    const currentTopModalId = topModalEntry?.id || null;
    const previousTopModalId = previousTopModalIdRef.current;
    const previousTopStillMounted = visibleModalStack.some(
      (entry) => entry.id === previousTopModalId,
    );
    if (
      previousTopModalId &&
      previousTopModalId !== currentTopModalId &&
      !previousTopStillMounted
    ) {
      setIsTopExitSettling(true);
    }
    previousTopModalIdRef.current = currentTopModalId;
  }, [topModalEntry?.id, visibleModalStack]);
  useEffect(() => {
    setMounted(true);
  }, []);
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function"
    ) {
      return undefined;
    }
    const mediaQuery = window.matchMedia(
      `(max-width: ${MODAL_BREAKPOINTS.MOBILE_MAX_WIDTH}px)`,
    );
    function handleViewportChange() {
      setIsMobileViewport(mediaQuery.matches);
    }
    handleViewportChange();
    const subscribe =
      typeof mediaQuery.addEventListener === "function"
        ? () => mediaQuery.addEventListener("change", handleViewportChange)
        : () => mediaQuery.addListener?.(handleViewportChange);
    const unsubscribe =
      typeof mediaQuery.removeEventListener === "function"
        ? () => mediaQuery.removeEventListener("change", handleViewportChange)
        : () => mediaQuery.removeListener?.(handleViewportChange);
    subscribe();
    return unsubscribe;
  }, []);
  useEffect(() => {
    if (isModalVisible) {
      if (bodyOverflowRef.current === null) {
        bodyOverflowRef.current = document.body.style.overflow;
      }
      document.body.style.overflow = "hidden";
    } else if (bodyOverflowRef.current !== null) {
      document.body.style.overflow = bodyOverflowRef.current;
      bodyOverflowRef.current = null;
    }
    dispatchSmoothScrollLock(isModalVisible);
  }, [isModalVisible]);
  useEffect(() => {
    return () => {
      if (bodyOverflowRef.current !== null) {
        document.body.style.overflow = bodyOverflowRef.current;
        bodyOverflowRef.current = null;
      }
      dispatchSmoothScrollLock(false);
    };
  }, []);
  if (!mounted) {
    return null;
  }
  return createPortal(
    <>
      <AnimatePresence>
        {isModalVisible && (
          <motion.div
            key="global-modal-backdrop"
            variants={modalBackdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 cursor-pointer bg-black/60 backdrop-blur-sm"
            style={{
              zIndex: Z_INDEX.MODAL,
            }}
            onClick={() => {
              if (!isTopExitSettling) {
                closeModal(null, topModalEntry.id);
              }
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence onExitComplete={() => setIsTopExitSettling(false)}>
        {visibleModalStack.map((entry, index) => (
          <ModalLayer
            key={entry.id}
            entry={entry}
            stackIndex={index}
            isTopModal={
              index === visibleModalStack.length - 1 && !isTopExitSettling
            }
            isMobileViewport={isMobileViewport}
            closeModal={closeModal}
            registry={registry}
            modalStack={visibleModalStack}
          />
        ))}
      </AnimatePresence>
    </>,
    document.body,
  );
}
export default Modal;
export function ModalProvider({ children }) {
  return (
    <ModalRuntimeProvider modalRenderer={Modal}>
      {children}
    </ModalRuntimeProvider>
  );
}
export { useModal, useModalActions, useModalState } from "./provider";
