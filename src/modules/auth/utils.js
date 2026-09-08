import { AUTH_ROUTES } from "./constants";

export function normalizeEmail(value) {
  const email = String(value || "")
    .trim()
    .toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Enter a valid email address");
  }
  return email;
}

export function sanitizeNextPath(value, fallback = "/account") {
  const path = String(value || "").trim();
  if (!/^\/(?!\/)[^\\\u0000-\u001f]*$/.test(path)) return fallback;
  return path;
}

export function getAuthCallbackUrl(nextPath = "/account") {
  const browserOrigin =
    typeof window === "undefined"
      ? "http://localhost:3000"
      : window.location.origin;
  const origin = String(
    process.env.NEXT_PUBLIC_SITE_URL || browserOrigin,
  ).replace(/\/$/, "");
  const callback = new URL(AUTH_ROUTES.CALLBACK, origin);
  callback.searchParams.set("next", sanitizeNextPath(nextPath));
  return callback.toString();
}
