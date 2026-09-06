import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/infrastructure/supabase/server";
import {
  assertSameOrigin,
  recordAuthEvent,
  requireUser,
} from "@/modules/auth/server";

export async function POST(request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const client = await createServerSupabaseClient();
    const { error } = await client.rpc("revoke_other_auth_sessions", {
      p_current_session_id: user.sessionId,
    });
    if (error) throw error;
    await recordAuthEvent("session.others_revoked");
    return NextResponse.json({ revoked: true });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Sessions could not be revoked" },
      { status: 400 },
    );
  }
}
