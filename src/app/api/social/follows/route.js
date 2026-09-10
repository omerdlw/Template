import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/infrastructure/supabase/server";
import {
  assertSameOrigin,
  getOptionalUser,
  requireUser,
} from "@/modules/auth/server";
import {
  checkRateLimit,
  createRateLimitExceededResponse,
  getClientIp,
} from "@/infrastructure/security/rate-limiter";

function failure(error) {
  const status = error?.message === "Authentication required" ? 401 : 400;
  return NextResponse.json(
    { error: error.message || "Follow request failed" },
    { status },
  );
}

export async function GET(request) {
  try {
    const user = await getOptionalUser();
    const url = new URL(request.url);
    const resource = url.searchParams.get("resource");
    const followingId = url.searchParams.get("followingId");
    const targetUserId = url.searchParams.get("userId") || user?.id;
    const client = await createServerSupabaseClient();

    if (resource === "inbox-count") {
      if (!user) return NextResponse.json({ count: 0 });
      const { count, error } = await client
        .from("account_follows")
        .select("*", { count: "exact", head: true })
        .eq("following_id", user.id)
        .eq("status", "pending");

      if (error) throw error;
      return NextResponse.json({ count: count ?? 0 });
    }

    if (resource === "requests" || resource === "inbox") {
      if (!user) return NextResponse.json({ data: [] });
      const { data: rows, error } = await client
        .from("account_follows")
        .select("follower_id, created_at")
        .eq("following_id", user.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!rows || rows.length === 0) return NextResponse.json({ data: [] });

      const followerIds = rows.map((r) => r.follower_id);
      const { data: profiles, error: pError } = await client
        .from("accounts")
        .select("id, username, display_name, avatar_url, banner_url")
        .in("id", followerIds);

      if (pError) throw pError;
      const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

      const data = rows.map((r) => {
        const p = profileMap.get(r.follower_id) || {};
        return {
          avatarUrl: p.avatar_url || null,
          bannerUrl: p.banner_url || null,
          createdAt: r.created_at,
          displayName: p.display_name || p.username || "Anonymous User",
          id: r.follower_id,
          username: p.username || null,
        };
      });

      return NextResponse.json({ data });
    }

    async function canViewTargetSocial(targetId, viewerId) {
      if (!targetId || targetId === viewerId) return true;
      const { data: targetAccount } = await client
        .from("accounts")
        .select("is_private")
        .eq("id", targetId)
        .maybeSingle();

      if (!targetAccount || !targetAccount.is_private) return true;
      if (!viewerId) return false;

      const { data: followRel } = await client
        .from("account_follows")
        .select("status")
        .eq("follower_id", viewerId)
        .eq("following_id", targetId)
        .eq("status", "accepted")
        .maybeSingle();

      return Boolean(followRel);
    }

    if (resource === "followers") {
      if (!targetUserId) return NextResponse.json({ data: [] });

      const allowed = await canViewTargetSocial(targetUserId, user?.id);
      if (!allowed) {
        return NextResponse.json(
          { error: "This account is private" },
          { status: 403 },
        );
      }

      const { data: rows, error } = await client
        .from("account_follows")
        .select("follower_id, created_at")
        .eq("following_id", targetUserId)
        .eq("status", "accepted")
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!rows || rows.length === 0) return NextResponse.json({ data: [] });

      const ids = rows.map((r) => r.follower_id);
      const { data: profiles, error: pError } = await client
        .from("accounts")
        .select("id, username, display_name, avatar_url, banner_url")
        .in("id", ids);

      if (pError) throw pError;
      const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

      const data = rows.map((r) => {
        const p = profileMap.get(r.follower_id) || {};
        return {
          avatarUrl: p.avatar_url || null,
          bannerUrl: p.banner_url || null,
          createdAt: r.created_at,
          displayName: p.display_name || p.username || "Anonymous User",
          id: r.follower_id,
          username: p.username || null,
        };
      });

      return NextResponse.json({ data });
    }

    if (resource === "following") {
      if (!targetUserId) return NextResponse.json({ data: [] });

      const allowed = await canViewTargetSocial(targetUserId, user?.id);
      if (!allowed) {
        return NextResponse.json(
          { error: "This account is private" },
          { status: 403 },
        );
      }

      const { data: rows, error } = await client
        .from("account_follows")
        .select("following_id, created_at")
        .eq("follower_id", targetUserId)
        .eq("status", "accepted")
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!rows || rows.length === 0) return NextResponse.json({ data: [] });

      const ids = rows.map((r) => r.following_id);
      const { data: profiles, error: pError } = await client
        .from("accounts")
        .select("id, username, display_name, avatar_url, banner_url")
        .in("id", ids);

      if (pError) throw pError;
      const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

      const data = rows.map((r) => {
        const p = profileMap.get(r.following_id) || {};
        return {
          avatarUrl: p.avatar_url || null,
          bannerUrl: p.banner_url || null,
          createdAt: r.created_at,
          displayName: p.display_name || p.username || "Anonymous User",
          id: r.following_id,
          username: p.username || null,
        };
      });

      return NextResponse.json({ data });
    }

    if (!user || !followingId) return NextResponse.json({ status: null });
    const { data, error } = await client
      .from("account_follows")
      .select("status")
      .eq("follower_id", user.id)
      .eq("following_id", followingId)
      .maybeSingle();

    if (error) throw error;
    return NextResponse.json({ status: data?.status || null });
  } catch (error) {
    return failure(error);
  }
}

export async function PATCH(request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const clientIp = getClientIp(request);
    const rateLimit = checkRateLimit(`social:follows:patch:${user.id || clientIp}`, {
      limit: 60,
      windowMs: 60 * 1000,
    });
    if (!rateLimit.success) {
      return createRateLimitExceededResponse(rateLimit);
    }

    const body = await request.json().catch(() => ({}));
    const requesterId = String(body?.requesterId || "");
    if (!requesterId) throw new Error("Requester ID is required");

    const client = await createServerSupabaseClient();

    if (body.action === "accept") {
      const { error } = await client
        .from("account_follows")
        .update({ status: "accepted" })
        .eq("following_id", user.id)
        .eq("follower_id", requesterId);

      if (error) throw error;
      return NextResponse.json({ status: "accepted", success: true });
    }

    if (body.action === "reject") {
      const { error } = await client
        .from("account_follows")
        .delete()
        .eq("following_id", user.id)
        .eq("follower_id", requesterId);

      if (error) throw error;
      return NextResponse.json({ status: null, success: true });
    }

    throw new Error("Invalid follow patch action");
  } catch (error) {
    return failure(error);
  }
}

async function resolveFollow(request, method) {
  assertSameOrigin(request);
  const user = await requireUser();
  const clientIp = getClientIp(request);
  const rateLimit = checkRateLimit(`social:follows:mutate:${user.id || clientIp}`, {
    limit: 45,
    windowMs: 60 * 1000,
  });
  if (!rateLimit.success) {
    return createRateLimitExceededResponse(rateLimit);
  }

  const payload = await request.json().catch(() => ({}));
  const client = await createServerSupabaseClient();

  if (method === "DELETE") {
    const isRemoveFollower =
      payload?.action === "remove-follower" || Boolean(payload?.followerId);

    if (isRemoveFollower) {
      const followerId = String(
        payload?.followerId || payload?.targetUserId || payload?.followingId || "",
      );
      if (!followerId || followerId === user.id) {
        throw new Error("Invalid follow target");
      }

      const { error } = await client
        .from("account_follows")
        .delete()
        .eq("following_id", user.id)
        .eq("follower_id", followerId);

      if (error) throw error;
      return { status: null, success: true };
    }

    const followingId = String(
      payload?.followingId || payload?.targetUserId || payload?.userId || "",
    );
    if (!followingId || followingId === user.id) {
      throw new Error("Invalid follow target");
    }

    const { error } = await client
      .from("account_follows")
      .delete()
      .eq("follower_id", user.id)
      .eq("following_id", followingId);

    if (error) throw error;
    return { status: null, success: true };
  }

  const followingId = String(
    payload?.followingId || payload?.targetUserId || "",
  );
  if (!followingId || followingId === user.id) {
    throw new Error("Invalid follow target");
  }

  const { data: targetRows, error: targetError } = await client.rpc(
    "get_account_follow_target",
    { p_user_id: followingId },
  );
  if (targetError) throw targetError;
  const target = targetRows?.[0];
  if (!target) throw new Error("Account not found");

  const status = target.is_private ? "pending" : "accepted";
  const { error } = await client
    .from("account_follows")
    .upsert(
      { follower_id: user.id, following_id: followingId, status },
      { onConflict: "follower_id,following_id" },
    );
  if (error) throw error;
  return { status };
}

export async function POST(request) {
  try {
    const result = await resolveFollow(request, "POST");
    if (result instanceof NextResponse) return result;
    return NextResponse.json(result);
  } catch (error) {
    return failure(error);
  }
}

export async function DELETE(request) {
  try {
    const result = await resolveFollow(request, "DELETE");
    if (result instanceof NextResponse) return result;
    return NextResponse.json(result);
  } catch (error) {
    return failure(error);
  }
}
