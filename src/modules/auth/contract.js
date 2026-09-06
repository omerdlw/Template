export const AUTH_ROUTES = Object.freeze({
  CALLBACK: "/auth/callback",
  MFA: "/auth/mfa",
  SIGN_IN: "/auth/sign-in",
});

export const OAUTH_PROVIDERS = Object.freeze(["google", "github", "x"]);

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
