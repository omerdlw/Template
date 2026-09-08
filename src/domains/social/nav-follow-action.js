"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/modules/auth";
import { useNavContextActions, useNavigationActions } from "@/modules/nav";
import { createSignInSurfaceEntry } from "@/domains/auth/sign-in-surface";
import { globalEvents } from "@/shared";
import { followUser, getFollowState, unfollowUser } from "./client/follows";

const FOLLOW_ACTION_KEY = "social.follow";
const FOLLOW_ACTION_ORDER = 10;

export function AccountFollowNavSync({
  initialStatus = null,
  targetUserId,
  targetUsername,
}) {
  const auth = useAuth();
  const { openSurface } = useNavigationActions();
  const [status, setStatus] = useState(initialStatus);
  const [prevInitialStatus, setPrevInitialStatus] = useState(initialStatus);
  const [pending, setPending] = useState(false);

  if (initialStatus !== prevInitialStatus) {
    setPrevInitialStatus(initialStatus);
    setStatus(initialStatus);
  }

  useEffect(() => {
    if (!auth.isAuthenticated || !targetUserId) return;
    void getFollowState(targetUserId)
      .then(setStatus)
      .catch(() => null);
  }, [auth.isAuthenticated, targetUserId]);

  useEffect(() => {
    return globalEvents.subscribe("social:follow-change", (payload) => {
      if (payload?.followingId === targetUserId) {
        setStatus(payload.status);
      }
    });
  }, [targetUserId]);

  const toggleFollow = useCallback(async (event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    if (!auth.isAuthenticated) {
      void openSurface(
        createSignInSurfaceEntry({ next: window.location.pathname }),
      );
      return;
    }
    if (pending || !targetUserId) return;

    setPending(true);
    try {
      const isCurrentlyFollowing =
        status === "accepted" || status === "pending";
      const nextStatus = isCurrentlyFollowing
        ? await unfollowUser(targetUserId)
        : await followUser(targetUserId);

      setStatus(nextStatus);
      globalEvents.emit("social:follow-change", {
        followingId: targetUserId,
        status: nextStatus,
      });
    } catch (error) {
      console.error("[Social] Failed to update follow status:", error);
    } finally {
      setPending(false);
    }
  }, [auth.isAuthenticated, openSurface, pending, status, targetUserId]);

  const isFollowing = status === "accepted";
  const isRequested = status === "pending";

  const action = useMemo(() => {
    let icon = "solar:user-plus-bold";
    let tooltip = targetUsername ? `Follow @${targetUsername}` : "Follow";

    if (pending) {
      icon = "svg-spinners:90-ring-with-bg";
      tooltip = "Updating...";
    } else if (isFollowing) {
      icon = "solar:user-cross-bold";
      tooltip = targetUsername ? `Unfollow @${targetUsername}` : "Unfollow";
    } else if (isRequested) {
      icon = "solar:user-cross-bold";
      tooltip = "Cancel follow request";
    }

    return {
      disabled: pending,
      icon,
      key: FOLLOW_ACTION_KEY,
      onClick: toggleFollow,
      order: FOLLOW_ACTION_ORDER,
      tooltip,
      visible: Boolean(targetUserId),
    };
  }, [isFollowing, isRequested, pending, targetUserId, targetUsername, toggleFollow]);

  const actions = useMemo(() => [action], [action]);
  useNavContextActions(actions);

  return null;
}
