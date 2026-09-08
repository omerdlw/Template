"use client";

export {
  deletePasskey,
  enrollMfa,
  getAuthenticatorAssurance,
  listMfaFactors,
  listPasskeys,
  recordClientAuthEvent,
  registerPasskey,
  renamePasskey,
  requestEmailAuth,
  requestReauthentication,
  signInWithOAuth,
  signInWithPasskey,
  signOut,
  unenrollMfa,
  verifyEmailOtp,
  verifyMfa,
  verifyReauthentication,
} from "./client";
export { AUTH_ROUTES, OAUTH_PROVIDERS } from "./constants";
export { getAuthCallbackUrl, normalizeEmail, sanitizeNextPath } from "./utils";
export { AuthProvider, useAuth, useSession, useUser } from "./provider";
