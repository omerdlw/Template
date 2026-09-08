import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/* ==========================================================================
   1. DOM & Styling
   ========================================================================== */

/**
 * Combines Tailwind CSS class names with clsx and tailwind-merge.
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Indicates whether the code is currently running in a browser environment.
 */
export const isBrowser = typeof window !== "undefined";

/**
 * Checks if a string represents an image source (HTTP URL, absolute path, or data URI).
 */
export function isImageIconSource(icon) {
  return (
    typeof icon === "string" &&
    (icon.startsWith("http://") ||
      icon.startsWith("https://") ||
      icon.startsWith("/") ||
      icon.startsWith("data:image/"))
  );
}

/* ==========================================================================
   2. Math & Numbers
   ========================================================================== */

/**
 * Constrains a number between a minimum and maximum value.
 */
export function clamp(value, min, max) {
  const num = Number(value);
  const finite = Number.isFinite(num) ? num : min;
  return Math.min(Math.max(finite, min), max);
}

/**
 * Safely parses a value to a finite number, returning a fallback if invalid.
 */
export function toFiniteNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * Returns a random integer between min and max (inclusive).
 */
export function randomBetween(min, max) {
  const lower = Math.ceil(min);
  const upper = Math.floor(max);
  return Math.floor(Math.random() * (upper - lower + 1)) + lower;
}

/* ==========================================================================
   3. Types & Objects
   ========================================================================== */

/**
 * Checks if a value is a non-null, non-array object.
 */
export function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/**
 * Checks if a value is empty (null, undefined, empty string, empty array, or empty object).
 */
export function isEmpty(value) {
  if (value === null || value === undefined) return true;
  if (typeof value === "string" || Array.isArray(value))
    return value.length === 0;
  if (isObject(value)) return Object.keys(value).length === 0;
  return false;
}

/**
 * Performs a shallow equality comparison between two values.
 */
export function shallowEqual(a, b) {
  if (Object.is(a, b)) return true;
  if (
    typeof a !== "object" ||
    a === null ||
    typeof b !== "object" ||
    b === null
  ) {
    return false;
  }

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);

  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (
      !Object.prototype.hasOwnProperty.call(b, key) ||
      !Object.is(a[key], b[key])
    ) {
      return false;
    }
  }

  return true;
}

/* ==========================================================================
   4. Collections & Arrays
   ========================================================================== */

/**
 * Normalizes any value into an array. Null/undefined/empty string yields an empty array.
 */
export function toArray(value) {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined || value === "") return [];
  return [value];
}

/**
 * Removes duplicate values from an array, optionally using an identity key selector.
 */
export function dedupe(array, keyFn = null) {
  if (!Array.isArray(array)) return [];
  if (!keyFn) return Array.from(new Set(array));

  const seen = new Set();
  return array.filter((item) => {
    const key = keyFn(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/* ==========================================================================
   5. Strings & Text
   ========================================================================== */

/**
 * Truncates text to a maximum length and appends a suffix if truncated.
 */
export function truncate(text, maxLength = 100, suffix = "...") {
  if (typeof text !== "string" || text.length <= maxLength) return text || "";
  return text.slice(0, maxLength).trimEnd() + suffix;
}

/**
 * Capitalizes the first character of a string.
 */
export function capitalize(str) {
  if (!str || typeof str !== "string") return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Converts a string into a clean, URL-friendly slug (handles Turkish chars and accents).
 */
export function slugify(str) {
  if (!str || typeof str !== "string") return "";
  return str
    .trim()
    .toLowerCase()
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Extracts the uppercase initial letter from a name or username for avatars.
 */
export function getInitial(name, fallback = "A") {
  const text = String(name || "").trim();
  if (!text) return fallback;
  return text.slice(0, 1).toUpperCase();
}

/**
 * Formats a duration in seconds into a "m:ss" time string.
 */
export function formatMediaTime(seconds = 0) {
  const totalSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

/**
 * Cleans trailing ellipsis and periods from feedback/toast text (retained for backward compatibility).
 */
export function normalizeFeedbackText(value) {
  if (typeof value !== "string") return value;

  let normalized = value.replace(/\u2026/g, "...").trim();
  while (normalized.endsWith("...") || normalized.endsWith(".")) {
    normalized = normalized.endsWith("...")
      ? normalized.slice(0, -3).trimEnd()
      : normalized.slice(0, -1).trimEnd();
  }
  return normalized;
}

/* ==========================================================================
   6. Timing & Async
   ========================================================================== */

/**
 * Returns a Promise that resolves after a specified number of milliseconds.
 */
export function sleep(ms = 0) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Returns a debounced version of the provided function.
 */
export function debounce(func, wait = 300) {
  let timeoutId = null;
  function debounced(...args) {
    if (timeoutId !== null) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      timeoutId = null;
      func(...args);
    }, wait);
  }
  debounced.cancel = () => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };
  return debounced;
}

/**
 * Returns a throttled version of the provided function.
 */
export function throttle(func, limit = 300) {
  let lastRan = 0;
  let timerId = null;
  return function throttled(...args) {
    const now = Date.now();
    if (now - lastRan >= limit) {
      lastRan = now;
      func(...args);
    } else if (!timerId) {
      timerId = setTimeout(
        () => {
          lastRan = Date.now();
          timerId = null;
          func(...args);
        },
        limit - (now - lastRan),
      );
    }
  };
}

/* ==========================================================================
   7. Safe JSON
   ========================================================================== */

/**
 * Safely parses a JSON string, returning fallback if parsing fails.
 */
export function safeJsonParse(text, fallback = null) {
  if (typeof text !== "string") return fallback;
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

/**
 * Safely stringifies a value to JSON, returning fallback if serialization fails.
 */
export function safeJsonStringify(value, fallback = "") {
  try {
    return JSON.stringify(value);
  } catch {
    return fallback;
  }
}
