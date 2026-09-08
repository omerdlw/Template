"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useState,
  useSyncExternalStore,
} from "react";
import { isBrowser } from "./utils";

/**
 * Executes a callback when a pointer down event occurs outside the specified element.
 */
export function useClickOutside(ref, callback) {
  const handlePointer = useCallback(
    (event) => {
      if (ref?.current && !ref.current.contains(event.target)) {
        callback?.(event);
      }
    },
    [callback, ref],
  );

  useEffect(() => {
    document.addEventListener("pointerdown", handlePointer);
    return () => document.removeEventListener("pointerdown", handlePointer);
  }, [handlePointer]);
}

/**
 * Resolves to useLayoutEffect on the client and useEffect on the server to prevent SSR warnings.
 */
export const useIsomorphicLayoutEffect = isBrowser ? useLayoutEffect : useEffect;

/**
 * Returns a debounced version of a rapidly changing value.
 */
export function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

const emptySubscribe = () => () => {};

/**
 * Returns true once the component has mounted on the client.
 */
export function useMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}
