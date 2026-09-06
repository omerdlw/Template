"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/modules/auth";
import { useNavigationActions } from "@/modules/nav";
import { Button, Icon } from "@/ui/primitives";
import { createSignInSurfaceEntry } from "@/domains/auth/sign-in-surface";
import { followUser, getFollowState, unfollowUser } from "./client/follows";

export function FollowButton({ followingId, initialStatus = null }) {
  const auth = useAuth();
  const { openSurface } = useNavigationActions();
  const [status, setStatus] = useState(initialStatus);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!auth.isAuthenticated || !followingId) return;
    void getFollowState(followingId)
      .then(setStatus)
      .catch(() => null);
  }, [auth.isAuthenticated, followingId]);

  async function toggleFollow() {
    if (!auth.isAuthenticated) {
      void openSurface(
        createSignInSurfaceEntry({ next: window.location.pathname }),
      );
      return;
    }
    setPending(true);
    try {
      setStatus(
        status === "accepted" || status === "pending"
          ? await unfollowUser(followingId)
          : await followUser(followingId),
      );
    } finally {
      setPending(false);
    }
  }

  const isFollowing = status === "accepted";
  const isRequested = status === "pending";
  return (
    <Button
      aria-label={
        isFollowing
          ? "Unfollow"
          : isRequested
            ? "Cancel follow request"
            : "Follow"
      }
      className="w-full rounded-[20px] px-4 py-2.5 text-xs font-semibold uppercase"
      disabled={pending}
      onClick={() => void toggleFollow()}
      type="button"
    >
      <Icon
        icon={
          pending
            ? "svg-spinners:90-ring-with-bg"
            : isFollowing
              ? "solar:check-read-bold"
              : "solar:user-plus-bold"
        }
        size={16}
      />
      {pending
        ? "Updating"
        : isFollowing
          ? "Following"
          : isRequested
            ? "Cancel request"
            : "Follow"}
    </Button>
  );
}
