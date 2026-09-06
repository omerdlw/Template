import { AUTH_ROUTES, sanitizeNextPath } from "./contract";

export * from "./contract";

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
