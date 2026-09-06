"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";

import { REGISTRY_TYPES, useRegistryEntries } from "@/modules/registry";
import { Z_INDEX } from "@/shared";

import {
  CONTROLS_NAV_ELEMENT_ID,
  CONTROLS_RAIL_GAP,
  getControlsLayout,
  hasControls,
  resolveControlsPairs,
} from "./layout";

function getViewport() {
  if (typeof window === "undefined") {
    return { height: 0, width: 0 };
  }

  return { height: window.innerHeight, width: window.innerWidth };
}

function getNavStackElement() {
  if (typeof document === "undefined") return null;
  return document.getElementById(CONTROLS_NAV_ELEMENT_ID);
}

function getNavElement() {
  if (typeof document === "undefined") return null;

  return (
    document.querySelector('[data-controls-anchor="true"]') ??
    getNavStackElement()
  );
}

function getControlsLayoutSnapshot() {
  const navElement = getNavElement();
  if (!navElement) return null;
  const layout = getControlsLayout(
    navElement.getBoundingClientRect(),
    getViewport(),
  );
  const navStackElement = getNavStackElement();

  return layout
    ? {
        ...layout,
        isHidden: navStackElement?.dataset.controlsHidden === "true",
      }
    : null;
}

/**
 * Tracks the rendered Nav card so Controls can remain viewport-fixed without owning Nav layout.
 * @returns {{bottom: number, left: {left: number, width: number}, right: {right: number, width: number}}|null} Current side geometry
 */
export function useControlsLayout() {
  const [layout, setLayout] = useState(null);

  useEffect(() => {
    let observedNavElement = null;
    let resizeObserver = null;

    const updateLayout = () => {
      setLayout(getControlsLayoutSnapshot());
    };
    const observeNavElement = () => {
      const navElement = getNavElement();
      if (navElement && navElement !== observedNavElement) {
        resizeObserver?.disconnect();
        observedNavElement = navElement;
        if (typeof ResizeObserver !== "undefined") {
          resizeObserver = new ResizeObserver(updateLayout);
          resizeObserver.observe(navElement);
        }
      }

      updateLayout();
    };

    const mutationObserver = new MutationObserver(observeNavElement);
    mutationObserver.observe(document.body, {
      attributes: true,
      attributeFilter: ["data-controls-anchor", "data-controls-hidden"],
      childList: true,
      subtree: true,
    });
    observeNavElement();
    window.addEventListener("resize", updateLayout);

    return () => {
      mutationObserver.disconnect();
      resizeObserver?.disconnect();
      window.removeEventListener("resize", updateLayout);
    };
  }, []);

  return layout;
}

function ControlsSide({ controls, geometry, side }) {
  if (!hasControls(controls) || !geometry?.height || !geometry?.maxWidth)
    return null;

  const positionStyle =
    side === "left"
      ? {
          bottom: geometry.bottom,
          maxWidth: geometry.maxWidth,
          right: geometry.right,
        }
      : {
          bottom: geometry.bottom,
          left: geometry.left,
          maxWidth: geometry.maxWidth,
        };

  return (
    <aside
      aria-label={`${side === "left" ? "Left" : "Right"} page controls`}
      className="pointer-events-none fixed hidden w-max max-w-[calc(100vw-8px)] sm:block"
      style={{ ...positionStyle, zIndex: Z_INDEX.NAV }}
    >
      <div
        className={`pointer-events-auto flex w-max max-w-full flex-col-reverse ${
          side === "left" ? "items-end" : "items-start"
        }`}
        style={{
          "--controls-height": `${geometry.height}px`,
          rowGap: `${CONTROLS_RAIL_GAP}px`,
        }}
      >
        {controls.map(({ content, id }, index) => (
          <Fragment key={id || index}>{content}</Fragment>
        ))}
      </div>
    </aside>
  );
}

/**
 * Renders the current page's Registry-backed controls beside the rendered Nav card.
 * @returns {React.ReactElement|null} Fixed desktop control areas
 */
export function Controls() {
  const [portalTarget, setPortalTarget] = useState(null);
  const layout = useControlsLayout();
  const pathname = usePathname();
  const entries = useRegistryEntries(REGISTRY_TYPES.CONTROLS);
  const { left, right } = useMemo(
    () => resolveControlsPairs(entries, pathname),
    [entries, pathname],
  );

  useEffect(() => {
    setPortalTarget(document.body);
  }, []);

  if (!portalTarget || !layout || layout.isHidden || !hasControls(left)) {
    return null;
  }

  return createPortal(
    <>
      <ControlsSide
        controls={left}
        geometry={{
          ...layout.left,
          bottom: layout.bottom,
          height: layout.height,
        }}
        side="left"
      />
      <ControlsSide
        controls={right}
        geometry={{
          ...layout.right,
          bottom: layout.bottom,
          height: layout.height,
        }}
        side="right"
      />
    </>,
    portalTarget,
  );
}

export {
  CONTROLS_EDGE_INSET,
  CONTROLS_NAV_GAP,
  CONTROLS_NAV_ELEMENT_ID,
  CONTROLS_RAIL_GAP,
  getControlsLayout,
  hasControls,
  resolveControlsPairs,
} from "./layout";

export default Controls;
