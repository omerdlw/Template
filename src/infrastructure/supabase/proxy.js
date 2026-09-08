import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { getSupabasePublicConfig } from "@/infrastructure/env";

function getClientAddress(request) {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    null
  );
}

function applySecurityHeaders(response) {
  if (!response?.headers) return response;
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload",
  );
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );
  return response;
}

export async function updateSupabaseSession(request) {
  const config = getSupabasePublicConfig();
  if (!config) return applySecurityHeaders(NextResponse.next({ request }));

  let response = NextResponse.next({ request });
  const supabase = createServerClient(config.url, config.publishableKey, {
    auth: {
      experimental: { passkey: true },
      flowType: "pkce",
    },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, headers = {}) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, options, value }) => {
          response.cookies.set(name, value, options);
        });
        Object.entries(headers).forEach(([key, value]) =>
          response.headers.set(key, value),
        );
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims || null;
  const sessionId = String(claims?.session_id || "").trim();

  if (!claims?.sub || !sessionId) return applySecurityHeaders(response);

  const { data: session } = await supabase
    .from("auth_sessions")
    .select("revoked_at")
    .eq("session_id", sessionId)
    .maybeSingle();

  if (session?.revoked_at) {
    await supabase.auth.signOut({ scope: "local" });
    const signInUrl = request.nextUrl.clone();
    signInUrl.pathname = "/";
    signInUrl.search = "?reason=session-revoked";
    const redirect = NextResponse.redirect(signInUrl);
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return applySecurityHeaders(redirect);
  }

  const { error: touchError } = await supabase.rpc("touch_auth_session", {
    p_ip_address: getClientAddress(request),
    p_session_id: sessionId,
    p_user_agent: request.headers.get("user-agent"),
  });
  if (touchError) {
    console.error("Failed to touch auth session:", touchError);
  }

  return applySecurityHeaders(response);
}
