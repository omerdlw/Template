"use client";

import { cn, debounce, isObject as isPlainObject } from "@/shared";

export { debounce };

export function resolveSlotClasses(className, classNames = {}) {
  const legacyClasses = isPlainObject(classNames) ? classNames : {};

  if (isPlainObject(className)) {
    return { ...legacyClasses, ...className };
  }

  if (typeof className === "string") {
    return { ...legacyClasses, root: cn(legacyClasses.root, className) };
  }

  return legacyClasses;
}
