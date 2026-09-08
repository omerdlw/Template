"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLoadingValue } from "@/modules/registry";
const DEFAULT_LOADING_STATE = Object.freeze({
  isLoading: false,
  skeleton: null,
  minDuration: 0,
  showOverlay: true,
});
export function normalizeLoadingOptions(options = {}) {
  const minDuration = Number(options?.minDuration);
  return {
    minDuration:
      Number.isFinite(minDuration) && minDuration > 0 ? minDuration : 0,
    showOverlay: options?.showOverlay !== false,
    skeleton: options?.skeleton ?? null,
  };
}
const LoadingActionsContext = createContext(null);
const LoadingStateContext = createContext(null);
export function LoadingProvider({ children }) {
  const [loadingState, setLoadingState] = useState(DEFAULT_LOADING_STATE);
  const startTimeRef = useRef(null);
  const minDurationRef = useRef(0);
  const stopTimerRef = useRef(null);
  const registryLoading = useLoadingValue();
  const clearStopTimer = useCallback(() => {
    if (!stopTimerRef.current) return;
    clearTimeout(stopTimerRef.current);
    stopTimerRef.current = null;
  }, []);
  const resetState = useCallback(() => {
    clearStopTimer();
    minDurationRef.current = 0;
    startTimeRef.current = null;
    setLoadingState(DEFAULT_LOADING_STATE);
  }, [clearStopTimer]);
  const startLoading = useCallback(
    (options = {}) => {
      clearStopTimer();
      const nextState = normalizeLoadingOptions(options);
      startTimeRef.current = Date.now();
      minDurationRef.current = nextState.minDuration;
      setLoadingState({
        ...nextState,
        isLoading: true,
      });
    },
    [clearStopTimer],
  );
  const stopLoading = useCallback(() => {
    const startTime = startTimeRef.current;
    const activeMinDuration = minDurationRef.current;
    if (startTime === null || activeMinDuration === 0) {
      resetState();
      return;
    }
    const elapsed = Date.now() - startTime;
    const remaining = activeMinDuration - elapsed;
    if (remaining <= 0) {
      resetState();
      return;
    }
    clearStopTimer();
    stopTimerRef.current = setTimeout(resetState, remaining);
  }, [clearStopTimer, resetState]);
  const setLoading = useCallback(
    (value) => {
      if (value) startLoading();
      else stopLoading();
    },
    [startLoading, stopLoading],
  );
  const setSkeleton = useCallback((nextSkeleton) => {
    setLoadingState((currentState) => {
      const skeleton =
        typeof nextSkeleton === "function"
          ? nextSkeleton(currentState.skeleton)
          : nextSkeleton;
      return currentState.skeleton === skeleton
        ? currentState
        : {
            ...currentState,
            skeleton,
          };
    });
  }, []);
  useEffect(() => {
    return () => clearStopTimer();
  }, [clearStopTimer]);
  useEffect(() => {
    if (!registryLoading) {
      resetState();
      return;
    }
    if (registryLoading.isLoading) startLoading(registryLoading);
    else stopLoading();
  }, [registryLoading, resetState, startLoading, stopLoading]);
  const stateValue = useMemo(
    () => ({
      ...loadingState,
      isPageLoading: loadingState.isLoading,
    }),
    [loadingState],
  );
  const actionsValue = useMemo(
    () => ({
      startLoading,
      stopLoading,
      setIsLoading: setLoading,
      setLoading,
      setSkeleton,
    }),
    [setLoading, setSkeleton, startLoading, stopLoading],
  );
  return (
    <LoadingActionsContext.Provider value={actionsValue}>
      <LoadingStateContext.Provider value={stateValue}>
        {children}
      </LoadingStateContext.Provider>
    </LoadingActionsContext.Provider>
  );
}
export function useLoadingState() {
  const context = useContext(LoadingStateContext);
  if (!context)
    throw new Error("useLoadingState must be within LoadingProvider");
  return context;
}
export function useLoadingActions() {
  const context = useContext(LoadingActionsContext);
  if (!context)
    throw new Error("useLoadingActions must be within LoadingProvider");
  return context;
}
