"use client";

// Public error-boundary interface. Implementations stay behind focused seams
// so callers keep one stable import path while each file owns one concern.
export {
  createConsoleHandler,
  createSentryHandler,
  getErrorReporter,
} from "./reporter";

export {
  ComponentError,
  ErrorBoundaryCore,
  GlobalError,
  ModuleError,
} from "./boundary";

export { GlobalErrorListener } from "./listener";
