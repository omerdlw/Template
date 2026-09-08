import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/infrastructure/supabase/server";
import { getPublicAccount } from "@/modules/account/server";
import { getOptionalUser } from "@/modules/auth/server";
import { AccountLayout } from "@/domains/account";
import { AccountFollowNavSync } from "@/domains/social";

export default async function AccountPage({ params }) {
  const { username } = await params;
  const client = await createServerSupabaseClient();
  const [account, viewer] = await Promise.all([
    getPublicAccount({ client, username }),
    getOptionalUser(),
  ]);

  if (!account) notFound();

  const isOwner = viewer?.id === account.id;

  const followQuery =
    viewer && !isOwner
      ? client
          .from("account_follows")
          .select("status")
          .eq("follower_id", viewer.id)
          .eq("following_id", account.id)
          .maybeSingle()
      : Promise.resolve({ data: null });

  const [followRow, followersResult, followingResult] = await Promise.all([
    followQuery,
    client
      .from("account_follows")
      .select("*", { count: "exact", head: true })
      .eq("following_id", account.id)
      .eq("status", "accepted"),
    client
      .from("account_follows")
      .select("*", { count: "exact", head: true })
      .eq("follower_id", account.id)
      .eq("status", "accepted"),
  ]);

  const initialFollowStatus = followRow?.data?.status || null;
  const isFollower = initialFollowStatus === "accepted";
  const followersCount = followersResult?.count ?? 0;
  const followingCount = followingResult?.count ?? 0;

  return (
    <>
      {!isOwner && (
        <AccountFollowNavSync
          initialStatus={initialFollowStatus}
          targetUserId={account.id}
          targetUsername={account.username}
        />
      )}
      <AccountLayout
        account={account}
        followersCount={followersCount}
        followingCount={followingCount}
        isFollower={isFollower}
        isOwner={isOwner}
      />
    </>
  );
}

