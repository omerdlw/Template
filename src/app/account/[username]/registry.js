"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/modules/auth";
import { useNavContextActions, useNavigationActions } from "@/modules/nav";
import { globalEvents } from "@/shared";
import { REGISTRY_SOURCES, useNavRegistration } from "@/modules/registry";
import { createAccountEditSurfaceEntry } from "@/domains/account";
import { createSignInSurfaceEntry } from "@/domains/auth";
import { followUser, getFollowState, unfollowUser } from "@/domains/social";

const DEFAULT_ACCOUNT_ICON = "solar:user-circle-bold";
const FOLLOW_ACTION_KEY = "social.follow";
const FOLLOW_ACTION_ORDER = 10;
const EDIT_ACCOUNT_ACTION_KEY = "account.edit";
const EDIT_ACCOUNT_ACTION_ORDER = 10;

export function AccountRegistry({
  account,
  initialFollowStatus = null,
  isOwner = false,
}) {
  const auth = useAuth();
  const { openSurface } = useNavigationActions();
  const targetUserId = account?.id;
  const targetUsername = account?.username;

  const targetNavConfig = useMemo(() => {
    if (isOwner || !account?.username) return null;
    return {
      description: `@${account.username}`,
      icon: account.avatarUrl || DEFAULT_ACCOUNT_ICON,
      path: `/account/${encodeURIComponent(account.username)}`,
      title: account.displayName || account.username || "Account",
    };
  }, [account?.avatarUrl, account?.displayName, account?.username, isOwner]);

  useNavRegistration(targetNavConfig, {
    priority: 250,
    source: REGISTRY_SOURCES.DYNAMIC,
  });

  const [followStatus, setFollowStatus] = useState(initialFollowStatus);
  const [prevInitialStatus, setPrevInitialStatus] = useState(initialFollowStatus);
  const [pending, setPending] = useState(false);

  if (initialFollowStatus !== prevInitialStatus) {
    setPrevInitialStatus(initialFollowStatus);
    setFollowStatus(initialFollowStatus);
  }

  useEffect(() => {
    if (!auth.isAuthenticated || !targetUserId || isOwner) return;
    void getFollowState(targetUserId)
      .then(setFollowStatus)
      .catch(() => null);
  }, [auth.isAuthenticated, isOwner, targetUserId]);

  useEffect(() => {
    if (isOwner) return;
    return globalEvents.subscribe("social:follow-change", (payload) => {
      if (payload?.followingId === targetUserId) {
        setFollowStatus(payload.status);
      }
    });
  }, [isOwner, targetUserId]);

  const toggleFollow = useCallback(
    async (event) => {
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
          followStatus === "accepted" || followStatus === "pending";
        const nextStatus = isCurrentlyFollowing
          ? await unfollowUser(targetUserId)
          : await followUser(targetUserId);

        setFollowStatus(nextStatus);
        globalEvents.emit("social:follow-change", {
          followingId: targetUserId,
          status: nextStatus,
        });
      } catch (error) {
        console.error("[Social] Failed to update follow status:", error);
      } finally {
        setPending(false);
      }
    },
    [auth.isAuthenticated, followStatus, openSurface, pending, targetUserId],
  );

  const openAccountEdit = useCallback(() => {
    void openSurface(createAccountEditSurfaceEntry("overview"));
  }, [openSurface]);

  const isFollowing = followStatus === "accepted";
  const isRequested = followStatus === "pending";

  const actions = useMemo(() => {
    if (isOwner) {
      return [
        {
          icon: "solar:pen-bold",
          key: EDIT_ACCOUNT_ACTION_KEY,
          onClick: openAccountEdit,
          order: EDIT_ACCOUNT_ACTION_ORDER,
          tooltip: "Edit account",
          visible: auth.isReady && auth.isAuthenticated,
        },
      ];
    }

    if (!targetUserId) return [];

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

    return [
      {
        disabled: pending,
        icon,
        key: FOLLOW_ACTION_KEY,
        onClick: toggleFollow,
        order: FOLLOW_ACTION_ORDER,
        tooltip,
        visible: Boolean(targetUserId),
      },
    ];
  }, [
    auth.isAuthenticated,
    auth.isReady,
    isFollowing,
    isOwner,
    isRequested,
    openAccountEdit,
    pending,
    targetUserId,
    targetUsername,
    toggleFollow,
  ]);

  useNavContextActions(actions);

  return null;
}
