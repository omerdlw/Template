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
  const { data: sessionData, error } =
    await supabase.auth.exchangeCodeForSession(code);
  if (error)
    return NextResponse.redirect(new URL("/?reason=callback-failed", url));

  const { data: mfaData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (
    mfaData?.currentLevel !== "aal2" &&
    mfaData?.nextLevel === "aal2"
  ) {
    return NextResponse.redirect(
      new URL(`/auth/mfa?next=${encodeURIComponent(nextPath)}`, url),
    );
  }

  // Check if the user has completed their account setup (has a username)
  const userId = sessionData?.user?.id;
  if (userId) {
    const { data: accountRow } = await supabase
      .from("accounts")
      .select("username")
      .eq("id", userId)
      .maybeSingle();

    if (!accountRow?.username) {
      // New OAuth user — redirect to account setup
      const setupUrl = new URL("/", url);
      setupUrl.searchParams.set("setup", "account");
      setupUrl.searchParams.set("next", nextPath);
      return NextResponse.redirect(setupUrl);
    }
  }

  return NextResponse.redirect(new URL(nextPath, url));
}
