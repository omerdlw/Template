import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/infrastructure/supabase/server";
import { assertSameOrigin, requireUser } from "@/modules/auth/server";
import {
  checkRateLimit,
  createRateLimitExceededResponse,
  getClientIp,
} from "@/infrastructure/security/rate-limiter";

function failure(error) {
  const status = error?.message === "Authentication required" ? 401 : 400;
  return NextResponse.json(
    { error: error.message || "Notification request failed" },
    { status },
  );
}

export async function GET(request) {
  try {
    const user = await requireUser();
    const url = new URL(request.url);
    const resource = url.searchParams.get("resource");
    const client = await createServerSupabaseClient();

    if (resource === "unread-count") {
      const { count, error } = await client
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("read", false);

      if (error) throw error;
      return NextResponse.json({ data: count ?? 0 });
    }

    const limit = Math.min(
      Math.max(1, Number(url.searchParams.get("limitCount")) || 50),
      100,
    );
    const { data, error } = await client
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return NextResponse.json({ data: data || [] });
  } catch (error) {
    return failure(error);
  }
}

export async function PATCH(request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const clientIp = getClientIp(request);
    const rateLimit = checkRateLimit(`notifications:patch:${user.id || clientIp}`, {
      limit: 60,
      windowMs: 60 * 1000,
    });
    if (!rateLimit.success) {
      return createRateLimitExceededResponse(rateLimit);
    }

    const body = await request.json().catch(() => ({}));
    const client = await createServerSupabaseClient();
    const nowIso = new Date().toISOString();

    if (body.action === "mark-read" && body.notificationId) {
      const { error } = await client
        .from("notifications")
        .update({ read: true, read_at: nowIso })
        .eq("user_id", user.id)
        .eq("id", body.notificationId);

      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    if (body.action === "mark-all-read") {
      const { error } = await client
        .from("notifications")
        .update({ read: true, read_at: nowIso })
        .eq("user_id", user.id)
        .eq("read", false);

      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    throw new Error("Invalid notification patch action");
  } catch (error) {
    return failure(error);
  }
}

export async function DELETE(request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const clientIp = getClientIp(request);
    const rateLimit = checkRateLimit(`notifications:delete:${user.id || clientIp}`, {
      limit: 60,
      windowMs: 60 * 1000,
    });
    if (!rateLimit.success) {
      return createRateLimitExceededResponse(rateLimit);
    }

    const url = new URL(request.url);
    const action = url.searchParams.get("action");
    const notificationId = url.searchParams.get("notificationId");
    const client = await createServerSupabaseClient();

    if (action === "delete" && notificationId) {
      const { error } = await client
        .from("notifications")
        .delete()
        .eq("user_id", user.id)
        .eq("id", notificationId);

      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    if (action === "delete-all") {
      const { error } = await client
        .from("notifications")
        .delete()
        .eq("user_id", user.id);

      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    throw new Error("Invalid notification delete action");
  } catch (error) {
    return failure(error);
  }
}
