import { NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/infrastructure/supabase/server";
import { updateAccount } from "@/modules/account/server";
import { assertSameOrigin, requireUser } from "@/modules/auth/server";

export async function POST(request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const payload = await request.json();
    const client = await createServerSupabaseClient();
    const { account } = await updateAccount({
      client,
      userId: user.id,
      input: {
        displayName: payload.displayName,
        username: payload.username,
      },
    });

    return NextResponse.json({ account, profile: account });
  } catch (error) {
    const isAuthenticationFailure =
      error?.message === "Authentication required";
    return NextResponse.json(
      {
        error: isAuthenticationFailure
          ? "Authentication required"
          : error?.message || "Sign-up could not be completed",
      },
      { status: isAuthenticationFailure ? 401 : 400 },
    );
  }
}
