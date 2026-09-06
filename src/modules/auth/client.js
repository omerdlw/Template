import { normalizeEmail } from "./config";

function unwrap(result, fallbackMessage) {
  if (result?.error) throw result.error;
  if (!result?.data) throw new Error(fallbackMessage);
  return result.data;
}

export async function requestEmailAuth(
  client,
  { captchaToken, createUser = false, email, emailRedirectTo, metadata = {} },
) {
  const result = await client.auth.signInWithOtp({
    email: normalizeEmail(email),
    options: {
      captchaToken: captchaToken || undefined,
      data: metadata,
      emailRedirectTo,
      shouldCreateUser: createUser,
    },
  });
  if (result.error) throw result.error;
  return { email: normalizeEmail(email), sent: true };
}

export async function verifyEmailOtp(client, { email, token }) {
  return unwrap(
    await client.auth.verifyOtp({
      email: normalizeEmail(email),
      token: String(token),
      type: "email",
    }),
    "OTP verification failed",
  );
}

export async function signInWithOAuth(client, { provider, redirectTo }) {
  return unwrap(
    await client.auth.signInWithOAuth({ provider, options: { redirectTo } }),
    "OAuth sign-in could not be started",
  );
}

export async function signInWithPasskey(client) {
  return unwrap(
    await client.auth.signInWithPasskey(),
    "Passkey sign-in failed",
  );
}

export async function registerPasskey(client) {
  return unwrap(
    await client.auth.registerPasskey(),
    "Passkey registration failed",
  );
}

export async function listPasskeys(client) {
  const data = unwrap(
    await client.auth.passkey.list(),
    "Passkeys could not be loaded",
  );
  return Array.isArray(data) ? data : data?.passkeys || [];
}

export async function renamePasskey(client, { friendlyName, passkeyId }) {
  return unwrap(
    await client.auth.passkey.update({ friendlyName, passkeyId }),
    "Passkey could not be renamed",
  );
}

export async function deletePasskey(client, { passkeyId }) {
  const { error } = await client.auth.passkey.delete({ passkeyId });
  if (error) throw error;
  return { deleted: true };
}

export async function listMfaFactors(client) {
  const data = unwrap(
    await client.auth.mfa.listFactors(),
    "MFA factors could not be loaded",
  );
  return [...(data.totp || []), ...(data.phone || [])];
}

export async function enrollMfa(client, friendlyName = "Authenticator") {
  return unwrap(
    await client.auth.mfa.enroll({ factorType: "totp", friendlyName }),
    "MFA enrollment failed",
  );
}

export async function verifyMfa(client, { code, factorId }) {
  return unwrap(
    await client.auth.mfa.challengeAndVerify({ code: String(code), factorId }),
    "MFA verification failed",
  );
}

export async function unenrollMfa(client, { factorId }) {
  return unwrap(
    await client.auth.mfa.unenroll({ factorId }),
    "MFA factor could not be removed",
  );
}

export async function getAuthenticatorAssurance(client) {
  return unwrap(
    await client.auth.mfa.getAuthenticatorAssuranceLevel(),
    "Authenticator assurance level could not be resolved",
  );
}

export async function requestReauthentication(client) {
  const { error } = await client.auth.reauthenticate();
  if (error) throw error;
  return { sent: true };
}

export async function verifyReauthentication(client, token) {
  return unwrap(
    await client.auth.verifyOtp({
      token: String(token),
      type: "reauthentication",
    }),
    "Reauthentication failed",
  );
}

export async function signOut(client, scope = "local") {
  const { error } = await client.auth.signOut({ scope });
  if (error) throw error;
}

export async function recordClientAuthEvent(event, metadata = {}) {
  const response = await fetch("/api/auth/events", {
    body: JSON.stringify({ event, metadata }),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || "Security event could not be recorded");
  }
}
