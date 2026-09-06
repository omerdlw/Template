import assert from "node:assert/strict";
import test from "node:test";

import {
  createNavigationMachineState,
  createSurfaceFlowDefinition,
  createSurfaceReturnHandshake,
  NAVIGATION_EVENTS,
  navigationStateReducer,
  resolveNavigationRoutePolicy,
} from "@/modules/nav";

test("Navigation route policy accepts internal routes and blocks unsafe hrefs", () => {
  assert.deepEqual(resolveNavigationRoutePolicy({ href: "/settings" }), {
    canNavigate: true,
    clearTransientState: true,
    dismissSurfaces: true,
    prefetch: true,
  });
  assert.deepEqual(
    resolveNavigationRoutePolicy({ href: "https://example.com" }),
    {
      canNavigate: false,
      clearTransientState: true,
      dismissSurfaces: true,
      prefetch: false,
    },
  );
});

test("Navigation route policy preserves explicit transition overrides", () => {
  assert.deepEqual(
    resolveNavigationRoutePolicy({
      href: "/settings",
      item: {
        navigationPolicy: {
          clearTransientState: false,
          dismissSurfaces: false,
          prefetch: false,
        },
      },
    }),
    {
      canNavigate: true,
      clearTransientState: false,
      dismissSurfaces: false,
      prefetch: false,
    },
  );
});

test("Surface return handshakes normalize defaults and reject external routes", () => {
  assert.deepEqual(
    createSurfaceReturnHandshake({
      focusKey: "  account-email  ",
      pathname: "  /account  ",
      restoreScroll: false,
      returnOnCancel: true,
    }),
    {
      focusKey: "account-email",
      pathname: "/account",
      restoreScroll: false,
      returnOnCancel: true,
    },
  );
  assert.equal(createSurfaceReturnHandshake("https://example.com"), null);
});

test("Surface flow definitions validate identity and retain safe defaults", () => {
  const createSurface = () => null;
  const initialSnapshot = { step: "profile" };
  const definition = createSurfaceFlowDefinition({
    createSurface,
    id: "  account-flow  ",
    initialSnapshot,
    returnTo: "/account",
  });

  assert.deepEqual(definition, {
    createSurface,
    id: "account-flow",
    initialSnapshot,
    restoreFromUrl: true,
    returnHandshake: {
      focusKey: null,
      pathname: "/account",
      restoreScroll: true,
      returnOnCancel: false,
    },
    singleton: true,
  });
  assert.notStrictEqual(definition.initialSnapshot, initialSnapshot);
  assert.equal(createSurfaceFlowDefinition({ id: "missing-factory" }), null);
});

test("Navigation machine transitions are immutable only when state changes", () => {
  const initialState = createNavigationMachineState();
  const unchangedState = navigationStateReducer(initialState, {
    type: NAVIGATION_EVENTS.COLLAPSE,
  });
  const expandedState = navigationStateReducer(initialState, {
    type: NAVIGATION_EVENTS.EXPAND,
  });
  const toggledState = navigationStateReducer(expandedState, {
    type: NAVIGATION_EVENTS.TOGGLE,
  });

  assert.strictEqual(unchangedState, initialState);
  assert.notStrictEqual(expandedState, initialState);
  assert.equal(expandedState.expanded, true);
  assert.equal(toggledState.expanded, false);
  assert.deepEqual(initialState, {
    expanded: false,
    isCompact: false,
    surfaceIds: [],
    surfaceLifecycle: "idle",
  });
});
