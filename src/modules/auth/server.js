import "server-only";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/infrastructure/supabase/server";
export { normalizeEmail, sanitizeNextPath } from "./utils";
function toAuthUser(claims) {
  if (!claims?.sub) return null;
  return {
    aal: claims.aal || "aal1",
    claims,
    email: claims.email || null,
    id: claims.sub,
    sessionId: claims.session_id || null,
  };
}
export function assertSameOrigin(request) {
  const requestOrigin = new URL(request.url).origin;
  const originHeader = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  if (originHeader && new URL(originHeader).origin === requestOrigin) return;
  if (!originHeader && fetchSite === "same-origin") return;
  throw new Error("Cross-site request rejected");
}
export async function getOptionalUser() {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) return null;
  const user = toAuthUser(data.claims);
  if (user.sessionId) {
    const { data: revokedSession } = await supabase
      .from("auth_sessions")
      .select("revoked_at")
      .eq("session_id", user.sessionId)
      .maybeSingle();
    if (revokedSession?.revoked_at) return null;
  }
  return user;
}
export async function requireUser({ redirectTo = null } = {}) {
  const user = await getOptionalUser();
  if (user) return user;
  if (redirectTo) redirect(redirectTo);
  throw new Error("Authentication required");
}
export async function requireAal2() {
  const user = await requireUser();
  if (user.aal !== "aal2") throw new Error("AAL2 authentication required");
  return user;
}
export async function requireRecentAuthentication(maxAgeSeconds = 600) {
  const user = await requireUser();
  if (user.aal === "aal2") return user;
  const latestAuthentication = Array.isArray(user.claims?.amr)
    ? Math.max(...user.claims.amr.map((entry) => Number(entry?.timestamp) || 0))
    : 0;
  const age = Math.floor(Date.now() / 1000) - latestAuthentication;
  if (!latestAuthentication || age > maxAgeSeconds) {
    throw new Error("Recent authentication required");
  }
  return user;
}
export async function recordAuthEvent(_event, _metadata = {}) {
  return;
}
