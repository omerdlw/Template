"use client";

import { useEffect, useId, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

import { cn } from "@/shared/utils";

const listeners = new Set();
const activeFullscreenStateIds = new Set();

const ACTIVE_FULLSCREEN_ROOT_SELECTOR =
  '[data-fullscreen-state-root="true"][data-affect-global-state="true"]';

let domObserver = null;
let lastSnapshot = false;

function getDomSnapshot() {
  if (typeof document === "undefined") {
    return activeFullscreenStateIds.size > 0;
  }

  return document.querySelector(ACTIVE_FULLSCREEN_ROOT_SELECTOR) !== null;
}

function emitChange() {
  listeners.forEach((listener) => listener());
}

function emitIfSnapshotChanged() {
  const nextSnapshot = getDomSnapshot();

  if (nextSnapshot === lastSnapshot) {
    return;
  }

  lastSnapshot = nextSnapshot;
  emitChange();
}

function ensureDomObserver() {
  if (typeof document === "undefined" || domObserver || listeners.size === 0) {
    return;
  }

  domObserver = new MutationObserver(() => {
    emitIfSnapshotChanged();
  });

  domObserver.observe(document.documentElement, {
    attributes: true,
    childList: true,
    subtree: true,
    attributeFilter: [
      "data-fullscreen-state",
      "data-fullscreen-state-root",
      "data-affect-global-state",
    ],
  });
}

function releaseDomObserver() {
  if (listeners.size > 0 || !domObserver) {
    return;
  }

  domObserver.disconnect();
  domObserver = null;
}

function subscribe(listener) {
  listeners.add(listener);
  ensureDomObserver();
  emitIfSnapshotChanged();

  return () => {
    listeners.delete(listener);
    releaseDomObserver();
  };
}

function getSnapshot() {
  return getDomSnapshot();
}

function registerFullscreenState(id) {
  activeFullscreenStateIds.add(id);
  emitIfSnapshotChanged();
}

function unregisterFullscreenState(id) {
  activeFullscreenStateIds.delete(id);
  emitIfSnapshotChanged();
}

export function useIsFullscreenStateActive() {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

export function FullscreenState({
  id,
  children,
  className,
  contentClassName,
  lockScroll = true,
  affectGlobalState = true,
}) {
  const generatedId = useId();
  const stateId = id || `fullscreen-state-${generatedId}`;
  const [portalTarget, setPortalTarget] = useState(null);

  useEffect(() => {
    if (typeof document === "undefined") return;
    setPortalTarget(document.body);
  }, []);

  useEffect(() => {
    if (affectGlobalState) {
      registerFullscreenState(stateId);
    }

    if (!lockScroll || typeof document === "undefined") {
      return () => {
        if (affectGlobalState) {
          unregisterFullscreenState(stateId);
        }
      };
    }

    const { body, documentElement } = document;
    const previousBodyOverflow = body.style.overflow;
    const previousHtmlOverflow = documentElement.style.overflow;
    const previousBodyOverscrollBehavior = body.style.overscrollBehavior;
    const previousHtmlOverscrollBehavior =
      documentElement.style.overscrollBehavior;
    const previousFullscreenState = documentElement.dataset.fullscreenState;

    body.style.overflow = "hidden";
    documentElement.style.overflow = "hidden";
    body.style.overscrollBehavior = "none";
    documentElement.style.overscrollBehavior = "none";
    documentElement.dataset.fullscreenState = "true";

    return () => {
      body.style.overflow = previousBodyOverflow;
      documentElement.style.overflow = previousHtmlOverflow;
      body.style.overscrollBehavior = previousBodyOverscrollBehavior;
      documentElement.style.overscrollBehavior = previousHtmlOverscrollBehavior;

      if (previousFullscreenState) {
        documentElement.dataset.fullscreenState = previousFullscreenState;
      } else {
        delete documentElement.dataset.fullscreenState;
      }

      if (affectGlobalState) {
        unregisterFullscreenState(stateId);
      }
    };
  }, [affectGlobalState, lockScroll, stateId]);

  const content = (
    <div
      data-affect-global-state={affectGlobalState ? "true" : "false"}
      data-fullscreen-state-root="true"
      data-fullscreen-state-id={stateId}
      className={cn(
        "fixed inset-0 h-screen w-screen overflow-hidden",
        className,
      )}
    >
      <div className={cn("center h-screen w-screen p-6", contentClassName)}>
        {children}
      </div>
    </div>
  );

  if (!portalTarget) {
    return content;
  }

  return createPortal(content, portalTarget);
}

export default FullscreenState;
