import { clamp, toFiniteNumber } from "@/shared";
import {
  CONTROLS_EDGE_INSET,
  CONTROLS_NAV_GAP,
  CONTROL_SIDE_NAMES,
} from "./constants";

export { clamp, toFiniteNumber };

export function hasControls(controls) {
  return Array.isArray(controls) && controls.length > 0;
}

export function resolveControlsPairs(entries, pathname) {
  const rows = new Map();
  const values = Array.isArray(entries)
    ? entries
    : Object.values(entries || {});

  values
    .filter(
      (entry) =>
        entry?.path === pathname &&
        CONTROL_SIDE_NAMES.includes(entry.side) &&
        entry.content !== undefined &&
        entry.content !== null &&
        entry.content !== false,
    )
    .sort((left, right) => {
      const orderDifference =
        toFiniteNumber(left.order) - toFiniteNumber(right.order);
      return orderDifference || String(left.id).localeCompare(String(right.id));
    })
    .forEach((entry) => {
      const order = toFiniteNumber(entry.order);
      const row = rows.get(order) || { left: null, order, right: null };
      const current = row[entry.side];
      const candidate = { content: entry.content, id: entry.id };

      if (
        !current ||
        String(candidate.id).localeCompare(String(current.id)) < 0
      ) {
        row[entry.side] = candidate;
      }

      rows.set(order, row);
    });

  const pairs = Array.from(rows.values())
    .sort((left, right) => left.order - right.order)
    .filter((row) => row.left && row.right);

  return {
    left: pairs.map(({ left }) => left),
    right: pairs.map(({ right }) => right),
  };
}

export function getControlsLayout(
  navRect,
  viewport,
  edgeInset = CONTROLS_EDGE_INSET,
  navGap = CONTROLS_NAV_GAP,
) {
  const viewportWidth = toFiniteNumber(viewport?.width);
  const viewportHeight = toFiniteNumber(viewport?.height);

  if (!navRect || viewportWidth <= 0 || viewportHeight <= 0) {
    return null;
  }

  const inset = Math.max(0, toFiniteNumber(edgeInset));
  const navLeft = clamp(toFiniteNumber(navRect.left), 0, viewportWidth);
  const navRight = clamp(toFiniteNumber(navRect.right), navLeft, viewportWidth);
  const navBottom = clamp(toFiniteNumber(navRect.bottom), 0, viewportHeight);
  const navHeight = Math.max(0, toFiniteNumber(navRect.height));
  const gap = Math.max(0, toFiniteNumber(navGap));

  return {
    bottom: Math.max(0, viewportHeight - navBottom),
    height: navHeight / 2,
    left: {
      maxWidth: Math.max(0, navLeft - inset * 2 - gap),
      right: Math.max(inset, viewportWidth - navLeft + gap),
    },
    right: {
      left: Math.min(viewportWidth - inset, navRight + gap),
      maxWidth: Math.max(0, viewportWidth - navRight - inset * 2 - gap),
    },
  };
}
