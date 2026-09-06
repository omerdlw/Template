import assert from "node:assert/strict";
import test from "node:test";

import {
  createManualNavigationScheduler,
  createNavigationSelectorStore,
  createSurfaceTransitionState,
  runSurfaceTransition,
  SURFACE_TRANSITION_EFFECTS,
  SURFACE_TRANSITION_EVENTS,
} from "@/modules/nav/experimental";

test("Navigation scheduler runs equal deadlines deterministically and supports cancellation", () => {
  const scheduler = createManualNavigationScheduler({ frameMs: 16 });
  const calls = [];

  scheduler.schedule(() => calls.push("first"), 10, { label: "first" });
  const cancelledId = scheduler.schedule(() => calls.push("cancelled"), 10);
  scheduler.schedule(() => calls.push("second"), 10, { label: "second" });
  scheduler.scheduleFrame(() => calls.push("frame"), { label: "frame" });

  assert.equal(scheduler.cancel(cancelledId), true);
  assert.equal(scheduler.getSnapshot().pendingCount, 3);
  assert.deepEqual(
    scheduler.getSnapshot().tasks.map((task) => task.label),
    ["first", "second", "frame"],
  );

  scheduler.advanceBy(10);
  assert.deepEqual(calls, ["first", "second"]);
  scheduler.runAll();
  assert.deepEqual(calls, ["first", "second", "frame"]);
  assert.equal(scheduler.getSnapshot().pendingCount, 0);
});

test("Surface transition completes the full open and close choreography", () => {
  const scheduler = createManualNavigationScheduler();
  const phases = [];
  const released = [];
  const runner = runSurfaceTransition({
    event: { surfaceId: 1, type: SURFACE_TRANSITION_EVENTS.OPEN },
    onEffect(effect) {
      if (effect.type === SURFACE_TRANSITION_EFFECTS.RELEASE) {
        released.push(...effect.surfaceIds);
      }
    },
    onTransition(state) {
      phases.push(state.phase);
    },
    scheduler,
    state: createSurfaceTransitionState(),
  });

  scheduler.runAll();
  assert.deepEqual(phases, [
    "dismissing_action",
    "swapping_header",
    "expanding_body",
    "open",
  ]);
  assert.equal(runner.getState().surfaceLifecycle, "open");

  runner.dispatch({ surfaceId: 1, type: SURFACE_TRANSITION_EVENTS.CLOSE });
  scheduler.runAll();
  assert.deepEqual(phases.slice(-3), [
    "collapsing_body",
    "restoring_header",
    "idle",
  ]);
  assert.deepEqual(released, [1]);
  assert.deepEqual(runner.getState().surfaceIds, []);
});

test("Surface transition settles an interrupted open before closing", () => {
  const scheduler = createManualNavigationScheduler();
  const released = [];
  const runner = runSurfaceTransition({
    event: { surfaceId: 7, type: SURFACE_TRANSITION_EVENTS.OPEN },
    onEffect(effect) {
      if (effect.type === SURFACE_TRANSITION_EFFECTS.RELEASE) {
        released.push(...effect.surfaceIds);
      }
    },
    scheduler,
    state: createSurfaceTransitionState(),
  });

  runner.dispatch({ surfaceId: 7, type: SURFACE_TRANSITION_EVENTS.CLOSE });
  scheduler.runAll();

  assert.deepEqual(released, [7]);
  assert.deepEqual(runner.getState(), {
    closingSurfaceIds: [],
    isCompact: false,
    phase: "idle",
    surfaceIds: [],
    surfaceLifecycle: "idle",
  });
});

test("Surface transition preserves invariants across randomized races", () => {
  const scheduler = createManualNavigationScheduler();
  const opened = new Set([1]);
  const released = [];
  let nextSurfaceId = 1;
  let seed = 0x5eed1234;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0x100000000;
  };
  const runner = runSurfaceTransition({
    event: { surfaceId: 1, type: SURFACE_TRANSITION_EVENTS.OPEN },
    onEffect(effect) {
      if (effect.type === SURFACE_TRANSITION_EFFECTS.RELEASE) {
        released.push(...effect.surfaceIds);
      }
    },
    scheduler,
    state: createSurfaceTransitionState(),
  });

  for (let index = 0; index < 1_000; index += 1) {
    const state = runner.getState();
    const roll = random();
    let event;
    if (roll < 0.42) {
      nextSurfaceId += 1;
      opened.add(nextSurfaceId);
      event = {
        surfaceId: nextSurfaceId,
        type: SURFACE_TRANSITION_EVENTS.OPEN,
      };
    } else if (roll < 0.78 && state.surfaceIds.length > 0) {
      const targetIndex = Math.floor(random() * state.surfaceIds.length);
      event = {
        surfaceId: state.surfaceIds[targetIndex],
        type: SURFACE_TRANSITION_EVENTS.CLOSE,
      };
    } else if (roll < 0.92) {
      event = { type: SURFACE_TRANSITION_EVENTS.CLOSE_ALL };
    } else {
      event = {
        type: SURFACE_TRANSITION_EVENTS.SET_COMPACT,
        value: random() > 0.5,
      };
    }

    runner.dispatch(event);
    if (random() > 0.5) scheduler.advanceBy(Math.floor(random() * 240));

    const nextState = runner.getState();
    assert.equal(
      new Set(nextState.surfaceIds).size,
      nextState.surfaceIds.length,
    );
    assert.ok(
      nextState.closingSurfaceIds.every((id) =>
        nextState.surfaceIds.includes(id),
      ),
    );
    if (nextState.surfaceLifecycle === "idle") {
      assert.equal(nextState.phase, "idle");
      assert.equal(nextState.surfaceIds.length, 0);
    } else {
      assert.ok(nextState.surfaceIds.length > 0);
    }
  }

  runner.dispatch({ type: SURFACE_TRANSITION_EVENTS.CLOSE_ALL });
  scheduler.runAll();
  assert.equal(runner.getState().surfaceLifecycle, "idle");
  assert.equal(new Set(released).size, released.length);
  assert.deepEqual(new Set(released), opened);
});

test("Navigation selector store only notifies for new snapshots", () => {
  const initialState = { expanded: false };
  const store = createNavigationSelectorStore(initialState);
  let notifications = 0;
  const unsubscribe = store.subscribe(() => {
    notifications += 1;
  });

  assert.equal(store.publish(initialState), false);
  assert.equal(store.publish({ expanded: true }), true);
  assert.equal(store.getSnapshot().expanded, true);
  assert.equal(notifications, 1);

  unsubscribe();
  store.publish({ expanded: false });
  assert.equal(notifications, 1);
});
