"use client";

import { AccountLayout } from "@/domains/account";
import { AccountRegistry } from "./registry";

export function AccountClient({
  account,
  followersCount,
  followingCount,
  initialFollowStatus,
  isFollower,
  isOwner,
}) {
  return (
    <>
      <AccountRegistry
        account={account}
        initialFollowStatus={initialFollowStatus}
        isOwner={isOwner}
      />
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
