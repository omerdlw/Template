"use client";

import { useCallback, useEffect } from "react";

export function useClickOutside(ref, callback) {
  const handlePointer = useCallback(
    (event) => {
      if (ref?.current && !ref.current.contains(event.target))
        callback?.(event);
    },
    [callback, ref],
  );

  useEffect(() => {
    document.addEventListener("pointerdown", handlePointer);
    return () => document.removeEventListener("pointerdown", handlePointer);
  }, [handlePointer]);
}
