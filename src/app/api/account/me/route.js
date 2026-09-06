import { NextResponse } from "next/server";
import {
  createAdminSupabaseClient,
  createServerSupabaseClient,
} from "@/infrastructure/supabase/server";
import {
  getCurrentAccount,
  updateAccountProfile,
} from "@/modules/account/server";
import {
  assertSameOrigin,
  requireRecentAuthentication,
  requireUser,
} from "@/modules/auth/server";

function failure(error, fallbackStatus = 500) {
  const isAuthenticationFailure = error?.message === "Authentication required";
  const status = isAuthenticationFailure ? 401 : fallbackStatus;

  return NextResponse.json(
    {
      error: isAuthenticationFailure
        ? "Authentication required"
        : "Account request failed",
    },
    { status },
  );
}

export async function GET() {
  try {
    const user = await requireUser();
    const client = await createServerSupabaseClient();
    return NextResponse.json(
      await getCurrentAccount({ client, userId: user.id }),
    );
  } catch (error) {
    return failure(error);
  }
}

export async function PATCH(request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const client = await createServerSupabaseClient();
    const payload = await request.json();
    return NextResponse.json(
      await updateAccountProfile({ client, input: payload, userId: user.id }),
    );
  } catch (error) {
    return failure(error, 400);
  }
}

export async function DELETE(request) {
  try {
    assertSameOrigin(request);
    const payload = await request.json().catch(() => ({}));
    if (payload.confirmation !== "DELETE") {
      return NextResponse.json(
        { error: 'Type "DELETE" to permanently remove the account' },
        { status: 400 },
      );
    }
    const user = await requireRecentAuthentication();
    const admin = createAdminSupabaseClient();
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) throw error;
    return NextResponse.json({ deleted: true });
  } catch (error) {
    return failure(error, 400);
  }
}
