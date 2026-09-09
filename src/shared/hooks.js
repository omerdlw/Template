"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useState,
  useSyncExternalStore,
} from "react";
import { isBrowser } from "./utils";

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

export const useIsomorphicLayoutEffect = isBrowser ? useLayoutEffect : useEffect;

export function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

const emptySubscribe = () => () => {};

export function useMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}
