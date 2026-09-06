import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/infrastructure/supabase/server";
import { assertSameOrigin, requireUser } from "@/modules/auth/server";

function failure(error) {
  const status = error?.message === "Authentication required" ? 401 : 400;
  return NextResponse.json(
    { error: error.message || "Follow request failed" },
    { status },
  );
}

export async function GET(request) {
  try {
    const user = await requireUser();
    const followingId = new URL(request.url).searchParams.get("followingId");
    if (!followingId) return NextResponse.json({ status: null });
    const client = await createServerSupabaseClient();
    const { data, error } = await client
      .from("profile_follows")
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

async function resolveFollow(request, method) {
  assertSameOrigin(request);
  const user = await requireUser();
  const payload = await request.json();
  const followingId = String(payload?.followingId || "");
  if (!followingId || followingId === user.id)
    throw new Error("Invalid follow target");
  const client = await createServerSupabaseClient();
  const { data: targetRows, error: targetError } = await client.rpc(
    "get_profile_follow_target",
    { p_user_id: followingId },
  );
  if (targetError) throw targetError;
  const target = targetRows?.[0];
  if (!target) throw new Error("Profile not found");
  if (method === "DELETE") {
    const { error } = await client
      .from("profile_follows")
      .delete()
      .eq("follower_id", user.id)
      .eq("following_id", followingId);
    if (error) throw error;
    return { status: null };
  }
  const status = target.is_private ? "pending" : "accepted";
  const { error } = await client
    .from("profile_follows")
    .upsert(
      { follower_id: user.id, following_id: followingId, status },
      { onConflict: "follower_id,following_id" },
    );
  if (error) throw error;
  return { status };
}

export async function POST(request) {
  try {
    return NextResponse.json(await resolveFollow(request, "POST"));
  } catch (error) {
    return failure(error);
  }
}

export async function DELETE(request) {
  try {
    return NextResponse.json(await resolveFollow(request, "DELETE"));
  } catch (error) {
    return failure(error);
  }
}
