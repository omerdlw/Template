// -----------------------------------------------------------------------------
// Report normalization
// -----------------------------------------------------------------------------
// This implementation is independent of React. It collects browser context,
// creates stable fingerprints, and builds the report shape shared by handlers.
const MAX_CONTEXT = 10;
const MAX_FINGERPRINTS = 100;
const DEFAULT_DEDUPE_WINDOW = 60000;

function normalizeSampleRate(value) {
  const sampleRate = Number(value);

  if (!Number.isFinite(sampleRate)) return 1;

  return Math.min(1, Math.max(0, sampleRate));
}

function normalizeDedupeWindow(value) {
  const dedupeWindow = Number(value);

  if (!Number.isFinite(dedupeWindow)) return DEFAULT_DEDUPE_WINDOW;

  return Math.max(0, dedupeWindow);
}

function getBrowserEnvironment(route) {
  const hasWindow = typeof window !== "undefined";
  const hasNavigator = typeof navigator !== "undefined";

  return {
    route: route || (hasWindow ? window.location.pathname : null),
    userAgent: hasNavigator ? navigator.userAgent : null,
    platform: hasNavigator ? navigator.platform : null,
    language: hasNavigator ? navigator.language : null,
    online: hasNavigator ? navigator.onLine : true,
    url: hasWindow ? window.location.href : null,
  };
}

function fingerprint(error, ctx = {}) {
  const stackTop = ctx.componentStack?.split("\n").filter(Boolean)[0] || "";
  const errorMessage =
    error?.message?.slice(0, 100) || String(error || "").slice(0, 100);
  const errorName = error?.name || "UnknownError";
  const route = ctx.route || "";

  return [stackTop, errorMessage, errorName, route].filter(Boolean).join("::");
}

function createReport(error, { context = {}, tags = {} } = {}) {
  return {
    error: {
      message: error?.message || String(error),
      stack: error?.stack || null,
      name: error?.name || "UnknownError",
    },
    fingerprint: fingerprint(error, context),
    timestamp: new Date().toISOString(),
    environment: getBrowserEnvironment(context.route),
    componentStack: context.componentStack || null,
    context,
    tags,
  };
}

// -----------------------------------------------------------------------------
// Reporting pipeline
// -----------------------------------------------------------------------------
// ErrorReporter owns mutable reporting state: handlers, context, tags,
// sampling, deduplication, beforeSend processing, and handler fan-out.
class ErrorReporter {
  constructor(options = {}) {
    this.handlers = [];
    this.context = {};
    this.tags = {};
    this.enabled = options.enabled ?? true;
    this.sampleRate = normalizeSampleRate(options.sampleRate ?? 1);
    this.beforeSend = options.beforeSend || null;
    this.dedupeWindow = normalizeDedupeWindow(
      options.deduplicateWindow ?? DEFAULT_DEDUPE_WINDOW,
    );
    this.seen = new Set();
  }

  addHandler(handler) {
    if (handler?.handle && typeof handler.handle === "function") {
      this.handlers.push(handler);
    }
    return this;
  }

  removeHandler(name) {
    this.handlers = this.handlers.filter((h) => h.name !== name);
    return this;
  }

  setContext(key, value) {
    if (
      Object.hasOwn(this.context, key) ||
      Object.keys(this.context).length < MAX_CONTEXT
    ) {
      this.context[key] = value;
    }
    return this;
  }

  setTag(key, value) {
    this.tags[key] = String(value);
    return this;
  }

  captureError(error, extraContext = {}) {
    if (!this.enabled) return;
    if (Math.random() > this.sampleRate) return;

    this.ensureDefaultHandlers();

    const context = { ...this.context, ...extraContext };

    let report = createReport(error, {
      context,
      tags: { ...this.tags },
    });

    if (this.seen.has(report.fingerprint)) return;

    const dedupeKey = report.fingerprint;

    if (this.seen.size >= MAX_FINGERPRINTS) {
      const first = this.seen.values().next().value;
      if (first) {
        this.seen.delete(first);
      }
    }

    this.seen.add(report.fingerprint);

    setTimeout(() => {
      this.seen.delete(dedupeKey);
    }, this.dedupeWindow);

    if (this.beforeSend) {
      try {
        report = this.beforeSend(report);
        if (!report) return;
      } catch (err) {
        if (process.env.NODE_ENV === "development") {
          console.warn("[ErrorReporter] beforeSend callback failed:", err);
        }
      }
    }

    this.handlers.forEach((h) => {
      try {
        h.handle(report);
      } catch (err) {
        if (process.env.NODE_ENV === "development") {
          console.warn(`[ErrorReporter] Handler "${h.name}" failed:`, err);
        }
      }
    });

    return report;
  }

  ensureDefaultHandlers() {
    if (this.handlers.length || typeof window === "undefined") return;

    this.handlers.push(createConsoleHandler());

    if (window.Sentry) {
      const sentryHandler = createSentryHandler(window.Sentry);

      if (sentryHandler.name === "sentry") {
        this.handlers.push(sentryHandler);
      }
    }
  }

  captureMessage(message, level = "info", context = {}) {
    const error = new Error(message);
    error.name = "Message";
    return this.captureError(error, { ...context, level });
  }
}

let instance = null;

export function getErrorReporter(options = {}) {
  if (!instance) {
    instance = new ErrorReporter(options);
  }
  return instance;
}

// -----------------------------------------------------------------------------
// Reporter adapters
// -----------------------------------------------------------------------------
// Adapters consume the normalized report and isolate destination-specific
// behavior from the capture pipeline.
export function createConsoleHandler({
  level = "error",
  expanded = false,
} = {}) {
  const log = console[level] || console.error;

  return {
    name: "console",

    handle(report) {
      if (expanded) {
        console.group(`🔴 ErrorReporter: ${report.error.name}`);
        console.log(report);
        console.groupEnd();
        return;
      }

      log("[ErrorReporter]", {
        fingerprint: report.fingerprint,
        route: report.environment.route,
        error: report.error.message,
      });
    },
  };
}

export function createSentryHandler(Sentry) {
  if (
    !Sentry ||
    typeof Sentry.captureException !== "function" ||
    typeof Sentry.withScope !== "function"
  ) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[ErrorReporter] Missing or invalid Sentry SDK instance");
    }
    return createConsoleHandler();
  }

  return {
    name: "sentry",

    handle(report) {
      Sentry.withScope((scope) => {
        if (report.fingerprint) {
          scope.setFingerprint([report.fingerprint]);
        }

        if (report.user) {
          scope.setUser(report.user);
        }

        if (report.tags && typeof report.tags === "object") {
          Object.entries(report.tags).forEach(([key, value]) => {
            scope.setTag(key, String(value));
          });
        }

        if (report.environment) {
          scope.setContext("environment", report.environment);
        }

        if (report.context) {
          scope.setContext("custom", report.context);
        }

        if (report.componentStack) {
          scope.setExtra("componentStack", report.componentStack);
        }

        const error = new Error(report.error.message);
        error.name = report.error.name || "Error";
        error.stack = report.error.stack || undefined;

        Sentry.captureException(error);
      });
    },
  };
}
