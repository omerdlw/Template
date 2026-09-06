"use client";

function normalizeCapabilityId(value) {
  return typeof value === "string" ? value.trim() : "";
}

/** Lifecycle manager for optional Registry-owned platform capabilities. */
export function createCapabilityRegistry({ onError } = {}) {
  const entries = new Map();
  const listeners = new Set();
  const notify = () => listeners.forEach((listener) => listener());
  const report = (error, id) => onError?.(error, id);

  const unregister = (id) => {
    const entry = entries.get(id);
    if (!entry) return false;
    if (entry.status === "active") stop(id);
    entries.delete(id);
    notify();
    return true;
  };

  const register = (definition) => {
    const id = normalizeCapabilityId(definition?.id);
    if (!id || typeof definition.activate !== "function") return null;
    if (entries.has(id)) unregister(id);
    entries.set(id, {
      definition: Object.freeze({
        ...definition,
        dependencies: Array.isArray(definition.dependencies)
          ? definition.dependencies.map(normalizeCapabilityId).filter(Boolean)
          : [],
      }),
      status: "registered",
      teardown: null,
    });
    notify();
    let disposed = false;
    const handle = () => handle.dispose();
    handle.dispose = () => {
      if (disposed) return false;
      disposed = true;
      return unregister(id);
    };
    Object.defineProperties(handle, {
      active: { enumerable: true, get: () => !disposed && entries.has(id) },
      id: { enumerable: true, value: id },
    });
    return handle;
  };

  function start(id, stack = new Set()) {
    const entry = entries.get(id);
    if (!entry) throw new Error(`Unknown capability: ${id}`);
    if (entry.status === "active") return entry;
    if (stack.has(id)) throw new Error(`Capability dependency cycle: ${id}`);
    stack.add(id);
    try {
      entry.definition.dependencies.forEach((dependency) =>
        start(dependency, stack),
      );
      const result = entry.definition.activate({
        get: (dependency) => entries.get(dependency)?.definition,
        require: (dependency) => start(dependency),
      });
      entry.teardown =
        typeof result === "function"
          ? result
          : typeof result?.dispose === "function"
            ? result.dispose
            : null;
      entry.status = "active";
      notify();
      return entry;
    } catch (error) {
      entry.status = "failed";
      entry.error = error;
      report(error, id);
      notify();
      throw error;
    } finally {
      stack.delete(id);
    }
  }

  function stop(id) {
    const entry = entries.get(id);
    if (!entry || entry.status !== "active") return false;
    try {
      entry.teardown?.();
    } catch (error) {
      report(error, id);
    }
    entry.teardown = null;
    entry.status = "registered";
    notify();
    return true;
  }

  return {
    get(id) {
      const entry = entries.get(id);
      return entry
        ? Object.freeze({ ...entry, definition: entry.definition })
        : null;
    },
    has: (id) => entries.has(id),
    list: () =>
      Object.freeze(
        [...entries].map(([id, entry]) =>
          Object.freeze({
            dependencies: entry.definition.dependencies,
            error: entry.error,
            id,
            status: entry.status,
            version: entry.definition.version || null,
          }),
        ),
      ),
    register,
    start,
    startAll: () => [...entries.keys()].map((id) => start(id)),
    stop,
    subscribe(listener) {
      if (typeof listener !== "function") return () => {};
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    unregister,
  };
}

function normalizeCommandId(value) {
  return typeof value === "string" ? value.trim() : "";
}

function sortCommands(a, b) {
  return (b.priority || 0) - (a.priority || 0) || a.sequence - b.sequence;
}

/** Framework-free command seam for Registry-driven shortcuts and menus. */
export function createCommandRegistry({ context = {}, onError } = {}) {
  const commands = new Map();
  const listeners = new Set();
  let sequence = 0;
  const notify = () => listeners.forEach((listener) => listener());

  const register = (definition) => {
    const id = normalizeCommandId(definition?.id);
    if (!id || typeof definition.execute !== "function") return null;
    const token = `${id}:${++sequence}`;
    const entry = Object.freeze({
      ...definition,
      id,
      priority: Number(definition.priority) || 0,
      sequence,
      token,
    });
    const entries = commands.get(id) || new Map();
    entries.set(token, entry);
    commands.set(id, entries);
    notify();
    const dispose = () => {
      if (!entries.delete(token)) return false;
      if (entries.size === 0) commands.delete(id);
      notify();
      return true;
    };
    return Object.assign(dispose, { id, token });
  };

  const resolve = (id, input = context) =>
    [...(commands.get(id) || new Map()).values()]
      .filter((entry) => {
        if (typeof entry.when !== "function") return entry.when !== false;
        return entry.when(input);
      })
      .sort(sortCommands)[0] || null;

  return {
    execute: async (id, input = context) => {
      const entry = resolve(id, input);
      if (!entry) return { handled: false, id };
      try {
        const value = await entry.execute(input);
        return { entry, handled: value !== false, id, value };
      } catch (error) {
        onError?.(error, entry);
        return { entry, error, handled: false, id };
      }
    },
    get: (id, input = context) => resolve(id, input),
    list: () =>
      Object.freeze(
        [...commands.values()]
          .flatMap((entries) => [...entries.values()])
          .sort(sortCommands),
      ),
    register,
    subscribe(listener) {
      if (typeof listener !== "function") return () => {};
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

function normalizeResourceKey(key) {
  return typeof key === "string" ? key.trim() : JSON.stringify(key);
}

/** Dedupeable async resource lifecycle kept inside the Registry boundary. */
export function createResourceRegistry({ clock = Date.now, onError } = {}) {
  const entries = new Map();
  const listeners = new Map();
  const notify = (key) => listeners.get(key)?.forEach((listener) => listener());
  const setEntry = (key, entry) => {
    entries.set(key, Object.freeze(entry));
    notify(key);
  };

  const load = (rawKey, loader, options = {}) => {
    const key = normalizeResourceKey(rawKey);
    if (typeof loader !== "function") {
      return Promise.reject(new TypeError(`Resource loader required: ${key}`));
    }
    const current = entries.get(key);
    const staleTimeMs = Number(options.staleTimeMs) || 0;
    if (current?.status === "pending" && current.promise)
      return current.promise;
    if (current?.status === "success" && current.expiresAt > clock()) {
      return Promise.resolve(current.value);
    }

    const controller =
      typeof AbortController !== "undefined" ? new AbortController() : null;
    const promise = Promise.resolve()
      .then(() => loader({ key, signal: controller?.signal }))
      .then((value) => {
        setEntry(key, {
          expiresAt: clock() + staleTimeMs,
          status: "success",
          value,
        });
        return value;
      })
      .catch((error) => {
        setEntry(key, { error, expiresAt: 0, status: "error" });
        onError?.(error, key);
        throw error;
      });
    setEntry(key, { controller, expiresAt: 0, promise, status: "pending" });
    return promise;
  };

  return {
    clear(rawKey) {
      const key = normalizeResourceKey(rawKey);
      const entry = entries.get(key);
      entry?.controller?.abort();
      if (!entries.delete(key)) return false;
      notify(key);
      return true;
    },
    get: (rawKey) => entries.get(normalizeResourceKey(rawKey))?.value,
    invalidate(rawKey) {
      const key = normalizeResourceKey(rawKey);
      const entry = entries.get(key);
      if (!entry) return false;
      entry.controller?.abort();
      setEntry(key, { expiresAt: 0, status: "idle" });
      return true;
    },
    load,
    peek: (rawKey) => entries.get(normalizeResourceKey(rawKey)) || null,
    subscribe(rawKey, listener) {
      const key = normalizeResourceKey(rawKey);
      if (typeof listener !== "function") return () => {};
      const keyListeners = listeners.get(key) || new Set();
      keyListeners.add(listener);
      listeners.set(key, keyListeners);
      return () => {
        keyListeners.delete(listener);
        if (keyListeners.size === 0) listeners.delete(key);
      };
    },
  };
}

function normalizePolicyName(value) {
  return typeof value === "string" ? value.trim() : "";
}

/** Local Registry policy only; server authorization remains authoritative. */
export function createPolicyEngine({ context = {}, rules = {} } = {}) {
  const policies = new Map(Object.entries(rules));
  const listeners = new Set();
  let currentContext = context;
  const notify = () => listeners.forEach((listener) => listener());

  const define = (name, rule) => {
    const id = normalizePolicyName(name);
    if (!id || (typeof rule !== "function" && typeof rule !== "boolean")) {
      return () => false;
    }
    policies.set(id, rule);
    notify();
    return () => {
      const deleted = policies.delete(id);
      if (deleted) notify();
      return deleted;
    };
  };

  const evaluate = (name, input = {}) => {
    const id = normalizePolicyName(name);
    const rule = policies.get(id);
    if (rule === undefined) {
      return { allowed: false, policy: id, reason: "unknown-policy" };
    }
    try {
      const allowed =
        typeof rule === "function"
          ? Boolean(rule({ ...currentContext, ...input }))
          : rule;
      return { allowed, policy: id, reason: allowed ? "allowed" : "denied" };
    } catch (error) {
      return { allowed: false, error, policy: id, reason: "evaluation-error" };
    }
  };

  return {
    define,
    evaluate,
    isAllowed: (name, input) => evaluate(name, input).allowed,
    list: () => Object.freeze([...policies.keys()]),
    setContext(nextContext) {
      currentContext =
        nextContext && typeof nextContext === "object" ? nextContext : {};
      notify();
    },
    subscribe(listener) {
      if (typeof listener !== "function") return () => {};
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

function resolveStorage(storage) {
  if (storage) return storage;
  try {
    return typeof globalThis !== "undefined" ? globalThis.localStorage : null;
  } catch {
    return null;
  }
}

const defaultSerialize = (value) => JSON.stringify(value);
const defaultDeserialize = (value) => JSON.parse(value);

/** Versioned, browser-safe persistence for Registry UI/preferences state. */
export function createPersistentStore({
  channel,
  deserialize = defaultDeserialize,
  initialValue = null,
  key,
  serialize = defaultSerialize,
  storage: providedStorage,
  throttleMs = 0,
  version = 1,
} = {}) {
  if (typeof key !== "string" || key.trim().length === 0) {
    throw new TypeError("Persistent store key is required");
  }
  const storage = resolveStorage(providedStorage);
  const listeners = new Set();
  let value = initialValue;
  let timer = null;
  let closed = false;
  let ownsChannel = false;
  const broadcast =
    channel ||
    (typeof BroadcastChannel !== "undefined"
      ? ((ownsChannel = true), new BroadcastChannel(`registry:${key}`))
      : null);
  const notify = () => listeners.forEach((listener) => listener(value));
  const envelope = (nextValue) => ({ value: nextValue, version });
  const apply = (nextValue, persist = true) => {
    value = nextValue;
    notify();
    if (!persist || closed) return nextValue;
    const write = () => {
      timer = null;
      storage?.setItem(key, serialize(envelope(value)));
      broadcast?.postMessage({ key, value: envelope(value) });
    };
    if (throttleMs > 0) {
      clearTimeout(timer);
      timer = setTimeout(write, throttleMs);
    } else write();
    return nextValue;
  };
  const onMessage = (event) => {
    const message = event?.data || event;
    if (message?.key !== key || message.value?.version !== version) return;
    value = message.value.value;
    notify();
  };
  broadcast?.addEventListener?.("message", onMessage);

  return {
    clear() {
      if (closed) return;
      clearTimeout(timer);
      timer = null;
      storage?.removeItem(key);
      value = initialValue;
      notify();
    },
    destroy() {
      if (closed) return;
      closed = true;
      clearTimeout(timer);
      broadcast?.removeEventListener?.("message", onMessage);
      if (ownsChannel) broadcast?.close?.();
      listeners.clear();
    },
    get: () => value,
    load() {
      try {
        const serialized = storage?.getItem(key);
        if (!serialized) return value;
        const parsed = deserialize(serialized);
        if (parsed?.version !== version) return value;
        value = parsed.value;
        notify();
      } catch {
        // Optional client storage must never break rendering.
      }
      return value;
    },
    set(nextValue) {
      apply(nextValue);
      return nextValue;
    },
    subscribe(listener) {
      if (typeof listener !== "function") return () => {};
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    update(updater) {
      return apply(typeof updater === "function" ? updater(value) : updater);
    },
  };
}
