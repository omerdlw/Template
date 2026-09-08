import { isValidElement } from "react";
import { isImageIconSource, isObject, toArray } from "@/shared/utils";

export { isImageIconSource, isObject, toArray };

export function joinClassNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

export function isScrollLockKey(event) {
  return (
    event.key === "ArrowDown" ||
    event.key === "ArrowUp" ||
    event.key === "PageDown" ||
    event.key === "PageUp" ||
    event.key === "Home" ||
    event.key === "End" ||
    event.key === " " ||
    event.key === "Spacebar"
  );
}

export function extractNodeText(value) {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  if (Array.isArray(value)) {
    return value
      .map(extractNodeText)
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
  }
  if (isValidElement(value)) return extractNodeText(value.props?.children);
  return "";
}

export function resolveAsBoolean(value, context, defaultValue = true) {
  if (typeof value === "function") {
    try {
      return Boolean(value(context));
    } catch {
      return false;
    }
  }
  if (value === undefined) {
    return defaultValue;
  }
  return Boolean(value);
}

export function resolveAsValue(value, context, fallback = undefined) {
  if (typeof value === "function") {
    try {
      const resolved = value(context);
      return resolved === undefined ? fallback : resolved;
    } catch {
      return fallback;
    }
  }
  return value === undefined ? fallback : value;
}
