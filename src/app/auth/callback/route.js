import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/infrastructure/supabase/server";
import { sanitizeNextPath } from "@/modules/auth/server";

export async function GET(request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const nextPath = sanitizeNextPath(url.searchParams.get("next"));

  if (!code)
    return NextResponse.redirect(new URL("/?reason=missing-code", url));

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error)
    return NextResponse.redirect(new URL("/?reason=callback-failed", url));

  const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  const destination =
    data?.currentLevel !== "aal2" && data?.nextLevel === "aal2"
      ? `/auth/mfa?next=${encodeURIComponent(nextPath)}`
      : nextPath;
  return NextResponse.redirect(new URL(destination, url));
}
