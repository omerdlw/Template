import { NextResponse } from "next/server";

import { normalizeEmail } from "@/modules/auth/contract";
import { assertSameOrigin } from "@/modules/auth/server";
import { createAdminSupabaseClient } from "@/infrastructure/supabase/server";

export async function POST(request) {
  try {
    assertSameOrigin(request);

    const payload = await request.json().catch(() => ({}));
    const email = normalizeEmail(payload.email);
    const admin = createAdminSupabaseClient();
    const { data, error } = await admin
      .from("accounts")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (error) throw error;

    if (data) {
      return NextResponse.json(
        {
          available: false,
          error: "An account with this email already exists. Please sign in.",
        },
        { status: 409 },
      );
    }

    return NextResponse.json({ available: true });
  } catch (error) {
    if (error?.message === "Enter a valid email address") {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Sign-up could not be started" },
      { status: 500 },
    );
  }
}
