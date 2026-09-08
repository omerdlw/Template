import { NextResponse } from "next/server";

import { assertSameOrigin, normalizeEmail } from "@/modules/auth/server";
import { createAdminSupabaseClient } from "@/infrastructure/supabase/server";
import {
  checkRateLimit,
  createRateLimitExceededResponse,
  getClientIp,
} from "@/infrastructure/security/rate-limiter";

export async function POST(request) {
  try {
    assertSameOrigin(request);

    const clientIp = getClientIp(request);
    const ipRateLimit = checkRateLimit(`auth:sign-up:ip:${clientIp}`, {
      limit: 5,
      windowMs: 60 * 1000,
    });
    if (!ipRateLimit.success) {
      return createRateLimitExceededResponse(
        ipRateLimit,
        "Too many sign-up attempts. Please try again shortly.",
      );
    }

    const payload = await request.json().catch(() => ({}));
    const email = normalizeEmail(payload.email);

    const emailRateLimit = checkRateLimit(`auth:sign-up:email:${email}`, {
      limit: 3,
      windowMs: 60 * 1000,
    });
    if (!emailRateLimit.success) {
      return createRateLimitExceededResponse(
        emailRateLimit,
        "Too many attempts for this email address. Please try again shortly.",
      );
    }

    const admin = createAdminSupabaseClient();
    const { data, error } = await admin
      .from("account_emails")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (error) throw error;

    if (data) {
      return NextResponse.json(
        {
          available: false,
          error: "An account with this email already exists. Please sign in",
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

