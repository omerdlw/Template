import { normalizeEmail } from "./utils";
function unwrap(result, fallbackMessage) {
  if (result?.error) throw result.error;
  if (!result?.data) throw new Error(fallbackMessage);
  return result.data;
}
export async function requestEmailAuth(
  client,
  { captchaToken, createUser = false, email, emailRedirectTo, metadata = {} },
) {
  const normalizedEmail = normalizeEmail(email);
  const data =
    metadata && Object.keys(metadata).length > 0 ? metadata : undefined;
  const options = {
    captchaToken: captchaToken || undefined,
    emailRedirectTo,
    shouldCreateUser: createUser,
  };
  if (data) options.data = data;
  const result = await client.auth.signInWithOtp({
    email: normalizedEmail,
    options,
  });
  if (result.error) throw result.error;
  return {
    email: normalizedEmail,
    sent: true,
  };
}
export async function verifyEmailOtp(
  client,
  { email, token, type = "email" },
) {
  const normalizedEmail = normalizeEmail(email);
  const normalizedToken = String(token);

  const primaryResult = await client.auth.verifyOtp({
    email: normalizedEmail,
    token: normalizedToken,
    type,
  });

  if (!primaryResult.error) {
    return unwrap(primaryResult, "OTP verification failed");
  }

  const fallbackType = type === "signup" ? "email" : "signup";
  const fallbackResult = await client.auth.verifyOtp({
    email: normalizedEmail,
    token: normalizedToken,
    type: fallbackType,
  });

  return unwrap(
    fallbackResult.error ? primaryResult : fallbackResult,
    "OTP verification failed",
  );
}
export async function signInWithOAuth(client, { provider, redirectTo }) {
  return unwrap(
    await client.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
      },
    }),
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
    await client.auth.passkey.update({
      friendlyName,
      passkeyId,
    }),
    "Passkey could not be renamed",
  );
}
export async function deletePasskey(client, { passkeyId }) {
  const { error } = await client.auth.passkey.delete({
    passkeyId,
  });
  if (error) throw error;
  return {
    deleted: true,
  };
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
    await client.auth.mfa.enroll({
      factorType: "totp",
      friendlyName,
    }),
    "MFA enrollment failed",
  );
}
export async function verifyMfa(client, { code, factorId }) {
  return unwrap(
    await client.auth.mfa.challengeAndVerify({
      code: String(code),
      factorId,
    }),
    "MFA verification failed",
  );
}
export async function unenrollMfa(client, { factorId }) {
  return unwrap(
    await client.auth.mfa.unenroll({
      factorId,
    }),
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
  return {
    sent: true,
  };
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
  const { error } = await client.auth.signOut({
    scope,
  });
  if (error) throw error;
}
export async function recordClientAuthEvent(event, metadata = {}) {
  const response = await fetch("/api/auth/events", {
    body: JSON.stringify({
      event,
      metadata,
    }),
    headers: {
      "content-type": "application/json",
    },
    method: "POST",
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || "Security event could not be recorded");
  }
}
