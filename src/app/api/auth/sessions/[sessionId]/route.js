import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/infrastructure/supabase/server";
import {
  assertSameOrigin,
  recordAuthEvent,
  requireUser,
} from "@/modules/auth/server";

export async function DELETE(request, context) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { sessionId } = await context.params;
    if (!sessionId || sessionId === user.sessionId) {
      return NextResponse.json(
        { error: "Use local sign-out for the current session" },
        { status: 400 },
      );
    }

    const client = await createServerSupabaseClient();
    const { error } = await client.rpc("revoke_auth_session", {
      p_session_id: sessionId,
    });
    if (error) throw error;
    await recordAuthEvent("session.revoked", { sessionId });
    return NextResponse.json({ revoked: true });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Session could not be revoked" },
      { status: 400 },
    );
  }
}
