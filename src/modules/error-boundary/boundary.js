"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { EVENT_TYPES, globalEvents } from "@/shared";
import { Button } from "@/ui/primitives";

import { getErrorReporter } from "./reporter";

// -----------------------------------------------------------------------------
// Boundary context helpers
// -----------------------------------------------------------------------------
// Browser-only reads remain guarded so this client entry can be evaluated
// without assuming that window or navigator already exists.
function isDevelopment() {
  return process.env.NODE_ENV === "development";
}

function getRuntimePath() {
  return typeof window !== "undefined" ? window.location.pathname : null;
}

function getUserAgent() {
  return typeof navigator !== "undefined" ? navigator.userAgent : null;
}

function createErrorContext({ errorInfo, name, title, variant }) {
  return {
    componentStack: errorInfo?.componentStack || null,
    route: getRuntimePath(),
    userAgent: getUserAgent(),
    timestamp: new Date().toISOString(),
    name: name || title || "ErrorBoundary",
    variant: variant || "default",
    source: "ErrorBoundary",
  };
}

// -----------------------------------------------------------------------------
// React boundary implementation
// -----------------------------------------------------------------------------
// ErrorBoundaryCore centralizes state transitions, reset behavior, fallback
// rendering, event emission, callbacks, and reporter integration.
export class ErrorBoundaryCore extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      lastResetKey: props.resetKey,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  static getDerivedStateFromProps(props, state) {
    if (props.resetKey !== state.lastResetKey) {
      return {
        lastResetKey: props.resetKey,
        hasError: false,
        error: null,
        errorInfo: null,
      };
    }

    return null;
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });

    const { message, name, onError, silent, title, variant } = this.props;
    const context = createErrorContext({ errorInfo, name, title, variant });

    try {
      onError?.(error, errorInfo, context);
    } catch (callbackError) {
      if (isDevelopment()) {
        console.warn("[ErrorBoundary] onError callback failed:", callbackError);
      }
    }

    if (!silent) {
      globalEvents.emit(EVENT_TYPES.APP_ERROR, {
        message: message || error?.message || "An unexpected error occurred",
        error,
        errorInfo,
        resetError: this.resetError,
      });
    }

    const reporter = getErrorReporter();

    try {
      reporter.captureError(error, context);
    } catch (reportingError) {
      if (isDevelopment()) {
        console.warn("[ErrorBoundary] Error reporting failed:", reportingError);
      }
    }

    if (isDevelopment()) {
      console.error("[ErrorBoundary]", error, context);
    }
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });

    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      const { fallback } = this.props;

      if (fallback) {
        if (typeof fallback === "function") {
          return fallback({
            resetError: this.resetError,
            error: this.state.error,
          });
        }

        return fallback;
      }

      return (
        <div className="bg-error/5 ring-error/10 flex min-h-[300px] w-full flex-col items-center justify-center p-6 text-center ring-1 ring-inset">
          <div className="bg-error/10 text-error mb-4 flex size-12 items-center justify-center text-xl font-bold">
            !
          </div>
          <h3 className="text-foreground mb-1 text-lg font-semibold">
            {this.props.title || "An error occurred"}
          </h3>
          <p className="text-muted-foreground mb-4 max-w-md text-sm">
            {this.props.message ||
              this.state.error?.message ||
              "Something went wrong while loading this component"}
          </p>
          <Button
            type="button"
            onClick={this.resetError}
            className="bg-error hover:bg-error/90 px-4 py-2 text-xs font-medium text-black transition-all duration-300 ease-in-out"
          >
            Try Again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

// -----------------------------------------------------------------------------
// Public boundary presets
// -----------------------------------------------------------------------------
// These wrappers keep application, module, and inline usage intention-revealing
// while sharing the same implementation and recovery behavior.
const GLOBAL_ERROR_TITLE = "Application Error";
const GLOBAL_ERROR_MESSAGE = "Something went wrong. Please try again";
const MODULE_ERROR_TITLE = "Module Error";
const MODULE_ERROR_MESSAGE = "This module encountered an unexpected error";
const COMPONENT_ERROR_MESSAGE = "Component failed to load";

export function GlobalError({ children, onReset, fallback }) {
  const pathname = usePathname();

  return (
    <ErrorBoundaryCore
      title={GLOBAL_ERROR_TITLE}
      message={GLOBAL_ERROR_MESSAGE}
      resetKey={pathname}
      variant="full"
      fallback={fallback}
      onReset={onReset}
    >
      {children}
    </ErrorBoundaryCore>
  );
}

export function ModuleError({ children, name, onReset, fallback }) {
  return (
    <ErrorBoundaryCore
      title={name ? `${name} Error` : MODULE_ERROR_TITLE}
      message={MODULE_ERROR_MESSAGE}
      variant="module"
      fallback={fallback}
      onReset={onReset}
    >
      {children}
    </ErrorBoundaryCore>
  );
}

export function ComponentError({ children, message, onReset, fallback }) {
  return (
    <ErrorBoundaryCore
      message={message || COMPONENT_ERROR_MESSAGE}
      variant="inline"
      fallback={fallback}
      onReset={onReset}
    >
      {children}
    </ErrorBoundaryCore>
  );
}
