import assert from "node:assert/strict";
import test from "node:test";

import {
  createRegistryStore,
  REGISTRY_KEYS,
  REGISTRY_SOURCES,
  REGISTRY_TYPES,
} from "@/modules/registry";

test("Registry resolves priority and restores the previous owner on disposal", () => {
  const store = createRegistryStore();
  const staticHandle = store.register(
    REGISTRY_TYPES.BACKGROUND,
    REGISTRY_KEYS.BACKGROUND,
    { image: "/static.jpg" },
    REGISTRY_SOURCES.STATIC,
  );
  const dynamicHandle = store.register(
    REGISTRY_TYPES.BACKGROUND,
    REGISTRY_KEYS.BACKGROUND,
    { image: "/dynamic.jpg" },
    REGISTRY_SOURCES.DYNAMIC,
  );

  assert.deepEqual(
    store.getSnapshot(REGISTRY_TYPES.BACKGROUND, REGISTRY_KEYS.BACKGROUND),
    { image: "/dynamic.jpg" },
  );
  assert.equal(dynamicHandle.dispose(), true);
  assert.deepEqual(
    store.getSnapshot(REGISTRY_TYPES.BACKGROUND, REGISTRY_KEYS.BACKGROUND),
    { image: "/static.jpg" },
  );
  assert.equal(staticHandle.active, true);
});

test("A stale Registry handle cannot dispose a newer registration", () => {
  const store = createRegistryStore();
  const options = {
    instanceId: "page-owner",
    source: REGISTRY_SOURCES.DYNAMIC,
  };
  const staleHandle = store.register(
    REGISTRY_TYPES.BACKGROUND,
    REGISTRY_KEYS.BACKGROUND,
    { image: "/first.jpg" },
    options,
  );
  const currentHandle = store.register(
    REGISTRY_TYPES.BACKGROUND,
    REGISTRY_KEYS.BACKGROUND,
    { image: "/second.jpg" },
    options,
  );

  assert.equal(staleHandle.status, "superseded");
  staleHandle.dispose();
  assert.equal(currentHandle.status, "active");
  assert.deepEqual(
    store.getSnapshot(REGISTRY_TYPES.BACKGROUND, REGISTRY_KEYS.BACKGROUND),
    { image: "/second.jpg" },
  );
});

test("Registry batches notify affected subscribers once and cache snapshots", () => {
  const store = createRegistryStore();
  let keyNotifications = 0;
  let typeNotifications = 0;
  const unsubscribeKey = store.subscribe(
    REGISTRY_TYPES.CONTROLS,
    "primary",
    () => {
      keyNotifications += 1;
    },
  );
  const unsubscribeType = store.subscribe(REGISTRY_TYPES.CONTROLS, null, () => {
    typeNotifications += 1;
  });

  const operationCount = store.batch((registry) => {
    registry.register(REGISTRY_TYPES.CONTROLS, "primary", {
      label: "Primary",
    });
    registry.register(REGISTRY_TYPES.CONTROLS, "secondary", {
      label: "Secondary",
    });
  });

  const firstSnapshot = store.getSnapshot(REGISTRY_TYPES.CONTROLS, "primary");
  const secondSnapshot = store.getSnapshot(REGISTRY_TYPES.CONTROLS, "primary");

  assert.equal(operationCount, 2);
  assert.equal(keyNotifications, 1);
  assert.equal(typeNotifications, 1);
  assert.strictEqual(firstSnapshot, secondSnapshot);
  assert.equal(
    Object.isFrozen(store.getEntriesSnapshot(REGISTRY_TYPES.CONTROLS)),
    true,
  );

  unsubscribeKey();
  unsubscribeType();
});
