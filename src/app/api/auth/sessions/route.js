import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/infrastructure/supabase/server";
import { requireUser } from "@/modules/auth/server";

function failure(error) {
  const isAuthenticationFailure = error?.message === "Authentication required";

  return NextResponse.json(
    {
      error: isAuthenticationFailure
        ? "Authentication required"
        : "Sessions could not be loaded",
    },
    { status: isAuthenticationFailure ? 401 : 500 },
  );
}

export async function GET() {
  try {
    const user = await requireUser();
    const client = await createServerSupabaseClient();
    const { data, error } = await client
      .from("auth_sessions")
      .select(
        "session_id,user_agent,ip_address,created_at,last_seen_at,revoked_at",
      )
      .is("revoked_at", null)
      .order("last_seen_at", { ascending: false });
    if (error) throw error;

    return NextResponse.json({
      sessions: (data || []).map((session) => ({
        ...session,
        is_current: session.session_id === user.sessionId,
      })),
    });
  } catch (error) {
    return failure(error);
  }
}
