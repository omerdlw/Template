const DEFAULT_FRAME_MS = 16;
const EMPTY_TASKS = Object.freeze([]);
function getDefaultNow() {
  if (
    typeof performance !== "undefined" &&
    typeof performance.now === "function"
  ) {
    return performance.now();
  }
  return Date.now();
}
function freezeTaskSnapshot(task) {
  return Object.freeze({
    createdAt: task.createdAt,
    dueAt: task.dueAt,
    id: task.id,
    kind: task.kind,
    label: task.label,
  });
}
export function createNavigationScheduler({
  cancelFrame = (frameId) => cancelAnimationFrame(frameId),
  clearTimer = (timerId) => clearTimeout(timerId),
  now = getDefaultNow,
  requestFrame = (callback) => requestAnimationFrame(callback),
  scheduleTimer = (callback, delayMs) => setTimeout(callback, delayMs),
} = {}) {
  const listeners = new Set();
  const tasks = new Map();
  let nextTaskId = 0;
  let snapshot = Object.freeze({
    pendingCount: 0,
    tasks: EMPTY_TASKS,
  });
  const publish = () => {
    snapshot = Object.freeze({
      pendingCount: tasks.size,
      tasks: Object.freeze([...tasks.values()].map(freezeTaskSnapshot)),
    });
    listeners.forEach((listener) => {
      try {
        listener();
      } catch (error) {
        if (process.env.NODE_ENV !== "production") {
          console.warn("[Navigation] Scheduler subscriber failed:", error);
        }
      }
    });
  };
  const schedule = (kind, callback, delayMs, options = {}) => {
    if (typeof callback !== "function") return null;
    const safeDelay = Math.max(0, Number(delayMs) || 0);
    const taskId = ++nextTaskId;
    const createdAt = now();
    const invoke = (timestamp = now()) => {
      if (!tasks.has(taskId)) return;
      tasks.delete(taskId);
      publish();
      callback(timestamp);
    };
    const nativeId =
      kind === "frame"
        ? requestFrame(invoke)
        : scheduleTimer(invoke, safeDelay);
    tasks.set(taskId, {
      cancel: kind === "frame" ? cancelFrame : clearTimer,
      createdAt,
      dueAt: createdAt + (kind === "frame" ? DEFAULT_FRAME_MS : safeDelay),
      id: taskId,
      kind,
      label:
        typeof options.label === "string" && options.label
          ? options.label
          : "navigation-task",
      nativeId,
    });
    publish();
    return taskId;
  };
  const cancel = (taskId) => {
    const task = tasks.get(taskId);
    if (!task) return false;
    tasks.delete(taskId);
    try {
      task.cancel(task.nativeId);
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[Navigation] Scheduler cancellation failed:", error);
      }
    } finally {
      publish();
    }
    return true;
  };
  return Object.freeze({
    cancel,
    cancelAll() {
      const scheduledTasks = [...tasks.values()];
      const taskIds = scheduledTasks.map((task) => task.id);
      tasks.clear();
      scheduledTasks.forEach((task) => {
        try {
          task.cancel(task.nativeId);
        } catch (error) {
          if (process.env.NODE_ENV !== "production") {
            console.warn("[Navigation] Scheduler cancellation failed:", error);
          }
        }
      });
      if (scheduledTasks.length > 0) publish();
      return taskIds;
    },
    getSnapshot() {
      return snapshot;
    },
    now,
    schedule(callback, delayMs = 0, options = {}) {
      return schedule("timer", callback, delayMs, options);
    },
    scheduleFrame(callback, options = {}) {
      return schedule("frame", callback, DEFAULT_FRAME_MS, options);
    },
    subscribe(listener) {
      if (typeof listener !== "function") return () => {};
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  });
}
export function createManualNavigationScheduler({
  frameMs = DEFAULT_FRAME_MS,
  startAt = 0,
} = {}) {
  const rawTasks = new Map();
  let currentTime = Number(startAt) || 0;
  let nextRawTaskId = 0;
  let sequence = 0;
  const scheduleTimer = (callback, delayMs = 0) => {
    const rawTaskId = ++nextRawTaskId;
    rawTasks.set(rawTaskId, {
      callback,
      dueAt: currentTime + Math.max(0, Number(delayMs) || 0),
      sequence: ++sequence,
    });
    return rawTaskId;
  };
  const clearTimer = (rawTaskId) => rawTasks.delete(rawTaskId);
  const requestFrame = (callback) =>
    scheduleTimer(() => callback(currentTime), frameMs);
  const scheduler = createNavigationScheduler({
    cancelFrame: clearTimer,
    clearTimer,
    now: () => currentTime,
    requestFrame,
    scheduleTimer,
  });
  const getNextTask = () =>
    [...rawTasks.entries()].sort(
      ([, left], [, right]) =>
        left.dueAt - right.dueAt || left.sequence - right.sequence,
    )[0] || null;
  const runUntil = (targetTime, maxTasks = 10_000) => {
    let executed = 0;
    while (executed < maxTasks) {
      const nextTask = getNextTask();
      if (!nextTask || nextTask[1].dueAt > targetTime) break;
      const [rawTaskId, task] = nextTask;
      rawTasks.delete(rawTaskId);
      currentTime = task.dueAt;
      task.callback();
      executed += 1;
    }
    if (executed >= maxTasks && rawTasks.size > 0) {
      throw new Error("Navigation scheduler exceeded its task safety limit");
    }
    currentTime = targetTime;
    return executed;
  };
  return Object.freeze({
    ...scheduler,
    advanceBy(durationMs) {
      const duration = Math.max(0, Number(durationMs) || 0);
      return runUntil(currentTime + duration);
    },
    runAll(maxTasks = 10_000) {
      let executed = 0;
      while (rawTasks.size > 0) {
        const nextTask = getNextTask();
        if (!nextTask) break;
        const remaining = Math.max(1, maxTasks - executed);
        executed += runUntil(nextTask[1].dueAt, remaining);
        if (executed >= maxTasks && rawTasks.size > 0) {
          throw new Error(
            "Navigation scheduler exceeded its task safety limit",
          );
        }
      }
      return executed;
    },
  });
}
