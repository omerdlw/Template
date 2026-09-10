import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const isBrowser = typeof window !== "undefined";

export function isImageIconSource(icon) {
  return (
    typeof icon === "string" &&
    (icon.startsWith("http://") ||
      icon.startsWith("https://") ||
      icon.startsWith("/") ||
      icon.startsWith("data:image/"))
  );
}

export function isValidBannerUrl(banner) {
  const value = String(banner || "").trim();
  if (!value) return false;
  return /^(https?:\/\/|\/|data:image\/)/.test(value);
}

export function clamp(value, min, max) {
  const num = Number(value);
  const finite = Number.isFinite(num) ? num : min;
  return Math.min(Math.max(finite, min), max);
}

export function toFiniteNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function randomBetween(min, max) {
  const lower = Math.ceil(min);
  const upper = Math.floor(max);
  return Math.floor(Math.random() * (upper - lower + 1)) + lower;
}

export function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function isEmpty(value) {
  if (value === null || value === undefined) return true;
  if (typeof value === "string" || Array.isArray(value))
    return value.length === 0;
  if (isObject(value)) return Object.keys(value).length === 0;
  return false;
}

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

export function toArray(value) {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined || value === "") return [];
  return [value];
}

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

export function truncate(text, maxLength = 100, suffix = "...") {
  if (typeof text !== "string" || text.length <= maxLength) return text || "";
  return text.slice(0, maxLength).trimEnd() + suffix;
}

export function capitalize(str) {
  if (!str || typeof str !== "string") return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

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

export function getInitial(name, fallback = "A") {
  const text = String(name || "").trim();
  if (!text) return fallback;
  return text.slice(0, 1).toUpperCase();
}

export function formatMediaTime(seconds = 0) {
  const totalSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

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

export function sleep(ms = 0) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

export function safeJsonParse(text, fallback = null) {
  if (typeof text !== "string") return fallback;
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

export function safeJsonStringify(value, fallback = "") {
  try {
    return JSON.stringify(value);
  } catch {
    return fallback;
  }
}

const DEFAULT_USER_AVATAR = "/images/default-avatar.svg";

export function normalizeAvatarUrl(value) {
  const normalized = String(value || "").trim();

  if (!normalized) {
    return "";
  }

  const lowered = normalized.toLowerCase();

  if (
    lowered === "null" ||
    lowered === "undefined" ||
    lowered === "http://" ||
    lowered === "https://"
  ) {
    return "";
  }

  return normalized;
}

export function resolveAvatarUrlCandidate(user = {}) {
  if (typeof user === "string") {
    return normalizeAvatarUrl(user);
  }

  const candidates = [user?.avatarUrl, user?.avatar_url];

  for (const candidate of candidates) {
    const normalized = normalizeAvatarUrl(candidate);

    if (normalized) {
      return normalized;
    }
  }

  return "";
}

export function createInitialAvatarDataUrl(letter = "A") {
  const normalizedLetter = String(letter || "A")
    .trim()
    .slice(0, 1)
    .toUpperCase();

  const svg = `
<svg width="256" height="256" viewBox="0 0 256 256" fill="none" xmlns="http://www.w3.org/2000/svg">
<rect width="256" height="256" fill="#F5F5F4"/>
<text
x="50%"
y="50%"
text-anchor="middle"
dominant-baseline="central"
fill="#111111"
font-family="ui-sans-serif, system-ui, sans-serif"
font-size="104"
font-weight="600"
>
${normalizedLetter}
</text>
</svg>
`;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export function getUserAvatarFallbackUrl(
  user = {},
  fallbackUrl = DEFAULT_USER_AVATAR,
) {
  const fallbackInitial = getInitial(
    user?.displayName ||
      user?.display_name ||
      user?.username ||
      user?.name ||
      "A",
  );

  if (fallbackInitial) {
    return createInitialAvatarDataUrl(fallbackInitial);
  }

  const normalizedFallback = normalizeAvatarUrl(fallbackUrl);
  return normalizedFallback || DEFAULT_USER_AVATAR;
}

export function getUserAvatarUrl(user = {}) {
  const rawAvatarUrl = resolveAvatarUrlCandidate(user);

  if (rawAvatarUrl) {
    return rawAvatarUrl;
  }

  return getUserAvatarFallbackUrl(user);
}

export function applyAvatarFallback(
  event,
  fallbackUrl = DEFAULT_USER_AVATAR,
) {
  const target = event?.currentTarget;

  if (!target || typeof target !== "object") {
    return;
  }

  if (target.dataset?.avatarFallbackApplied === "true") {
    return;
  }

  const normalizedFallback =
    normalizeAvatarUrl(fallbackUrl) || DEFAULT_USER_AVATAR;

  if (target.dataset) {
    target.dataset.avatarFallbackApplied = "true";
  }

  target.src = normalizedFallback;
}
