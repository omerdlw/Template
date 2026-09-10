"use client";

import { memo, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";

import { useAuth } from "@/modules/auth";
import {
  NavSurfaceExtension,
  navFadeVariants,
  navListItemVariants,
} from "@/modules/nav";
import { useToast } from "@/modules/notification";
import {
  FOLLOW_STATUSES,
  acceptFollowRequest,
  fetchFollowRequests,
  fetchFollowers,
  fetchFollowing,
  followUser,
  rejectFollowRequest,
  removeFollower,
  unfollowUser,
} from "@/domains/social/client/follows";
import {
  applyAvatarFallback,
  getUserAvatarFallbackUrl,
  getUserAvatarUrl,
  isValidBannerUrl,
} from "@/shared";
import AdaptiveImage from "@/ui/components/adaptive-image";
import { Button, Icon } from "@/ui/primitives";
import { cn } from "@/shared/utils";
import { globalEvents } from "@/shared";

const TABS = Object.freeze({
  FOLLOWERS: "followers",
  FOLLOWING: "following",
  INBOX: "inbox",
});

const BUTTON_BASE_CLASS =
  "inline-flex h-8 items-center gap-1.5 rounded-full ring-1 ring-inset px-3 text-xs font-semibold select-none transition-all duration-150 active:scale-95 disabled:cursor-not-allowed disabled:ring-white/5 disabled:bg-white/5 disabled:text-white/50";

const ACTION_BUTTON_CLASSES = Object.freeze({
  destructive: `${BUTTON_BASE_CLASS} ring-error/20 bg-error/10 text-error hover:bg-error hover:text-black`,
  success: `${BUTTON_BASE_CLASS} ring-success/20 bg-success/10 text-success hover:bg-success hover:text-black`,
  info: `${BUTTON_BASE_CLASS} ring-info/20 bg-info/10 text-info hover:bg-info hover:text-black`,
  muted: `${BUTTON_BASE_CLASS} ring-white/10 bg-white/5 text-white/70 hover:ring-error/20 hover:bg-error/10 hover:text-error`,
  disabledMuted: `${BUTTON_BASE_CLASS} ring-white/10 bg-white/5 text-white/50 cursor-default`,
});

const SURFACE_LIST_VARIANTS = navFadeVariants;
const SURFACE_LIST_ITEM_VARIANTS = navListItemVariants;

function handleListWheel(event) {
  const listViewport = event.currentTarget;
  if (!listViewport || listViewport.scrollHeight <= listViewport.clientHeight) return;

  event.preventDefault();
  event.stopPropagation();

  const maxScrollTop = listViewport.scrollHeight - listViewport.clientHeight;
  listViewport.scrollTop = Math.min(
    maxScrollTop,
    Math.max(0, listViewport.scrollTop + event.deltaY),
  );
}

function createCollectionState(isLoading = true) {
  return { list: [], isLoading, error: null };
}

function normalizeTab(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  if (normalized === "following") return TABS.FOLLOWING;
  if (normalized === "requests" || normalized === TABS.INBOX) return TABS.INBOX;
  return TABS.FOLLOWERS;
}

function hydrateFollowUsers(list) {
  return (Array.isArray(list) ? list : [])
    .map((item) => ({
      id: item.userId || item.id,
      username: item.username || null,
      avatarUrl: item.avatarUrl || item.avatar_url || null,
      bannerUrl: item.bannerUrl || item.banner_url || null,
      displayName: item.displayName || item.display_name || item.username || "Anonymous User",
      status: item.status || FOLLOW_STATUSES.ACCEPTED,
    }))
    .filter((item) => item.id);
}

function resolveCollectionErrorMessage(error, tab) {
  const status = Number(error?.status || 0);
  if (status === 403) {
    return tab === TABS.INBOX
      ? "You are not allowed to view pending follow requests"
      : "This account is private";
  }
  if (status === 401) {
    return "Your session has expired. Please sign in again";
  }
  return tab === TABS.INBOX
    ? "Pending follow requests could not be loaded"
    : `Could not load ${tab}`;
}

function buildFollowingStatusMap(list = [], fallbackStatus = FOLLOW_STATUSES.ACCEPTED) {
  return (Array.isArray(list) ? list : []).reduce((acc, item) => {
    const id = item?.userId || item?.id;
    if (id) acc[id] = item?.status || fallbackStatus;
    return acc;
  }, {});
}

const UserAction = memo(function UserAction({
  tab,
  user,
  authUserId,
  isOwnProfile,
  pendingKind,
  followStatus,
  onAccept,
  onReject,
  onUnfollow,
  onRemoveFollower,
  onFollow,
}) {
  const isPending = Boolean(pendingKind);
  const canShowFollowAction =
    tab !== TABS.INBOX &&
    Boolean(authUserId) &&
    !isOwnProfile &&
    authUserId !== user.id;

  if (tab === TABS.INBOX) {
    return (
      <div className="flex shrink-0 items-center gap-1.5">
        <Button
          type="button"
          onClick={() => onAccept(user.id)}
          disabled={isPending}
          className={ACTION_BUTTON_CLASSES.success}
          aria-label={`Accept follow request from ${user.displayName}`}
        >
          <Icon icon="solar:check-circle-bold" size={12} />
          <span>{pendingKind === "accept" ? "Accepting" : "Accept"}</span>
        </Button>
        <Button
          type="button"
          onClick={() => onReject(user.id)}
          disabled={isPending}
          className={ACTION_BUTTON_CLASSES.destructive}
          aria-label={`Reject follow request from ${user.displayName}`}
        >
          <Icon icon="solar:close-circle-bold" size={12} />
          <span>{pendingKind === "reject" ? "Rejecting" : "Reject"}</span>
        </Button>
      </div>
    );
  }

  if (tab === TABS.FOLLOWING && isOwnProfile) {
    return (
      <Button
        type="button"
        onClick={() => onUnfollow(user.id)}
        disabled={isPending}
        className={ACTION_BUTTON_CLASSES.destructive}
        aria-label={`Unfollow ${user.displayName}`}
      >
        <Icon icon="solar:user-minus-bold" size={12} />
        <span>{pendingKind === "unfollow" ? "Unfollowing" : "Unfollow"}</span>
      </Button>
    );
  }

  if (tab === TABS.FOLLOWERS && isOwnProfile) {
    return (
      <Button
        type="button"
        onClick={() => onRemoveFollower(user.id)}
        disabled={isPending}
        className={ACTION_BUTTON_CLASSES.destructive}
        aria-label={`Remove ${user.displayName} from followers`}
      >
        <Icon icon="solar:user-cross-bold" size={12} />
        <span>{pendingKind === "remove-follower" ? "Removing" : "Remove"}</span>
      </Button>
    );
  }

  if (canShowFollowAction) {
    const isFollowPending = followStatus === FOLLOW_STATUSES.PENDING;
    const isFollowAccepted = followStatus === FOLLOW_STATUSES.ACCEPTED;
    const followLabel = isFollowAccepted ? "Following" : isFollowPending ? "Requested" : "Follow";
    const followIcon = isFollowAccepted
      ? "solar:user-check-bold"
      : isFollowPending
        ? "solar:clock-circle-bold"
        : "solar:user-plus-bold";

    return (
      <Button
        type="button"
        onClick={() => (isFollowAccepted ? onUnfollow(user.id) : onFollow(user.id))}
        disabled={isPending || isFollowPending}
        className={
          isFollowAccepted
            ? ACTION_BUTTON_CLASSES.muted
            : isFollowPending
              ? ACTION_BUTTON_CLASSES.disabledMuted
              : ACTION_BUTTON_CLASSES.info
        }
        aria-label={`${followLabel} ${user.displayName}`}
      >
        <Icon icon={followIcon} size={12} />
        <span>{followLabel}</span>
      </Button>
    );
  }

  return null;
});

const SocialUserRow = memo(function SocialUserRow({ close, user, action, index }) {
  const avatarSrc = getUserAvatarUrl(user);
  const avatarFallbackSrc = getUserAvatarFallbackUrl(user);
  const hasBanner = isValidBannerUrl(user?.bannerUrl);

  return (
    <motion.div
      variants={SURFACE_LIST_ITEM_VARIANTS}
      custom={index}
      initial="hidden"
      animate="visible"
      className="group relative flex h-12 min-h-[48px] w-full items-center gap-3 overflow-hidden rounded-[16px] px-1.5 transition-colors duration-150"
    >
      {hasBanner ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-[inherit] select-none"
        >
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-25 transition-transform duration-500 ease-out group-hover:scale-105"
            style={{
              backgroundImage: `url("${user.bannerUrl}")`,
              maskImage:
                "linear-gradient(to right, transparent 0%, rgba(0,0,0,0.15) 30%, rgba(0,0,0,0.65) 70%, black 100%)",
              WebkitMaskImage:
                "linear-gradient(to right, transparent 0%, rgba(0,0,0,0.15) 30%, rgba(0,0,0,0.65) 70%, black 100%)",
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/30 to-transparent" />
        </div>
      ) : null}

      <Link
        href={`/account/${user.username || user.id}`}
        onClick={close}
        className="relative z-10 flex min-w-0 flex-1 items-center gap-3"
      >
        <div className="relative size-10 shrink-0 overflow-hidden rounded-full bg-black ring-1 ring-white/10 ring-inset">
          <AdaptiveImage
            mode="img"
            src={avatarSrc}
            alt={user.displayName}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={(event) => applyAvatarFallback(event, avatarFallbackSrc)}
            wrapperClassName="h-full w-full"
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-center">
          <span className="truncate text-xs font-semibold text-white leading-tight">
            {user.displayName}
          </span>
          <span className="truncate text-xs font-medium text-white/50 leading-tight">
            @{user.username || "user"}
          </span>
        </div>
      </Link>
      <div className="relative z-10 flex shrink-0 items-center">{action}</div>
    </motion.div>
  );
});

function LoadingList() {
  return (
    <div className="flex w-full flex-col gap-2.5">
      {Array.from({ length: 4 }, (_, index) => (
        <div
          key={index}
          className="group relative flex h-12 min-h-[48px] w-full animate-pulse items-center justify-between gap-3 px-1.5"
        >
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="skeleton-block size-10 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="skeleton-block h-3 w-28 rounded-full" />
              <div className="skeleton-block-soft h-2.5 w-16 rounded-full" />
            </div>
          </div>
          <div className="skeleton-block-soft h-8 w-20 rounded-full ring-1 ring-white/5 ring-inset" />
        </div>
      ))}
    </div>
  );
}

export function createAccountSocialSurfaceEntry(data = {}, config = {}) {
  const tab = normalizeTab(data?.tab || data?.type);
  const account = data?.account || data?.profile || null;
  const username = data?.username || account?.username || "";
  const displayName = String(
    data?.displayName || account?.displayName || account?.display_name || username || "Social",
  ).trim();
  const icon =
    data?.avatarUrl || (account ? getUserAvatarUrl(account) : "solar:users-group-rounded-bold");
  const tabLabel =
    tab === TABS.INBOX ? "Follow Requests" : tab === TABS.FOLLOWING ? "Following" : "Followers";

  return {
    component: AccountSocialSurface,
    icon,
    title: displayName,
    description: tabLabel,
    props: { data },
    expandHorizontal: false,
    ...config,
  };
}

export default function AccountSocialSurface({ close, data }) {
  const auth = useAuth();
  const toast = useToast();
  const authUserId = auth.user?.id || null;
  const userId = String(data?.userId || "").trim() || null;
  const account = data?.account || data?.profile || null;
  const canManageRequests = Boolean(data?.canManageRequests);
  const isAuthSessionReady = Boolean(auth.isReady && auth.isAuthenticated && authUserId);
  const isOwnProfile = Boolean(authUserId) && authUserId === userId;

  const initialTab = useMemo(() => normalizeTab(data?.tab || data?.type), [data?.tab, data?.type]);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [prevInitialTab, setPrevInitialTab] = useState(initialTab);

  if (initialTab !== prevInitialTab) {
    setPrevInitialTab(initialTab);
    setActiveTab(initialTab);
  }

  const [pendingActionByUserId, setPendingActionByUserId] = useState({});
  const [followingStatusMap, setFollowingStatusMap] = useState({});

  const [followersState, setFollowersState] = useState(() => createCollectionState());
  const [followingState, setFollowingState] = useState(() => createCollectionState());
  const [requestsState, setRequestsState] = useState(() =>
    createCollectionState(canManageRequests),
  );

  useEffect(() => {
    let active = true;
    if (!userId) {
      return () => {
        active = false;
      };
    }

    void fetchFollowers(userId)
      .then((list) => {
        if (!active) return;
        setFollowersState({ list: hydrateFollowUsers(list), isLoading: false, error: null });
      })
      .catch((error) => {
        if (!active) return;
        setFollowersState({ list: [], isLoading: false, error });
      });

    return () => {
      active = false;
    };
  }, [userId]);

  useEffect(() => {
    let active = true;
    if (!userId) {
      return () => {
        active = false;
      };
    }

    void fetchFollowing(userId)
      .then((list) => {
        if (!active) return;
        setFollowingState({ list: hydrateFollowUsers(list), isLoading: false, error: null });
      })
      .catch((error) => {
        if (!active) return;
        setFollowingState({ list: [], isLoading: false, error });
      });

    return () => {
      active = false;
    };
  }, [userId]);

  useEffect(() => {
    let active = true;
    if (!canManageRequests || !authUserId || !isAuthSessionReady) {
      return () => {
        active = false;
      };
    }

    void fetchFollowRequests()
      .then((list) => {
        if (!active) return;
        setRequestsState({ list: hydrateFollowUsers(list), isLoading: false, error: null });
      })
      .catch((error) => {
        if (!active) return;
        setRequestsState({ list: [], isLoading: false, error });
      });

    return () => {
      active = false;
    };
  }, [authUserId, canManageRequests, isAuthSessionReady]);

  useEffect(() => {
    let active = true;
    if (!authUserId || !isAuthSessionReady) {
      return () => {
        active = false;
      };
    }

    void fetchFollowing(authUserId)
      .then((list) => {
        if (!active) return;
        setFollowingStatusMap(buildFollowingStatusMap(list, FOLLOW_STATUSES.ACCEPTED));
      })
      .catch(() => {
        if (!active) return;
        setFollowingStatusMap({});
      });

    return () => {
      active = false;
    };
  }, [authUserId, isAuthSessionReady]);

  useEffect(() => {
    let active = true;
    return globalEvents.subscribe("social:follow-change", () => {
      if (userId) {
        void fetchFollowers(userId).then((list) => {
          if (active) setFollowersState({ list: hydrateFollowUsers(list), isLoading: false, error: null });
        }).catch(() => null);

        void fetchFollowing(userId).then((list) => {
          if (active) setFollowingState({ list: hydrateFollowUsers(list), isLoading: false, error: null });
        }).catch(() => null);
      }
      if (authUserId) {
        void fetchFollowing(authUserId).then((list) => {
          if (active) setFollowingStatusMap(buildFollowingStatusMap(list, FOLLOW_STATUSES.ACCEPTED));
        }).catch(() => null);
      }
    });
  }, [authUserId, userId]);

  useEffect(() => {
    let active = true;
    return globalEvents.subscribe("social:inbox-change", () => {
      if (canManageRequests && authUserId) {
        void fetchFollowRequests().then((list) => {
          if (active) setRequestsState({ list: hydrateFollowUsers(list), isLoading: false, error: null });
        }).catch(() => null);
      }
    });
  }, [authUserId, canManageRequests]);

  const runUserAction = useCallback(
    async (targetUserId, actionKey, actionFn, errorMessage, optimisticFn, rollbackFn) => {
      if (!authUserId || pendingActionByUserId[targetUserId]) return;
      setPendingActionByUserId((current) => ({ ...current, [targetUserId]: actionKey }));
      if (typeof optimisticFn === "function") optimisticFn();
      try {
        await actionFn();
      } catch (error) {
        if (typeof rollbackFn === "function") rollbackFn();
        toast.error(error?.message || errorMessage);
      } finally {
        setPendingActionByUserId((current) => {
          if (!current[targetUserId]) return current;
          const next = { ...current };
          delete next[targetUserId];
          return next;
        });
      }
    },
    [authUserId, pendingActionByUserId, toast],
  );

  const handleAccept = useCallback(
    (id) => {
      let previousList = [];
      runUserAction(
        id,
        "accept",
        async () => {
          await acceptFollowRequest(id);
          globalEvents.emit("social:follow-change", { followingId: authUserId, status: "accepted" });
          globalEvents.emit("social:inbox-change");
        },
        "Request could not be accepted",
        () => {
          setRequestsState((current) => {
            previousList = current.list;
            return { ...current, list: current.list.filter((u) => u.id !== id) };
          });
        },
        () => setRequestsState((current) => ({ ...current, list: previousList })),
      );
    },
    [authUserId, runUserAction],
  );

  const handleReject = useCallback(
    (id) => {
      let previousList = [];
      runUserAction(
        id,
        "reject",
        async () => {
          await rejectFollowRequest(id);
          globalEvents.emit("social:inbox-change");
        },
        "Request could not be rejected",
        () => {
          setRequestsState((current) => {
            previousList = current.list;
            return { ...current, list: current.list.filter((u) => u.id !== id) };
          });
        },
        () => setRequestsState((current) => ({ ...current, list: previousList })),
      );
    },
    [runUserAction],
  );

  const handleUnfollow = useCallback(
    (id) => {
      let previousMap = {};
      let previousFollowingList = [];
      runUserAction(
        id,
        "unfollow",
        async () => {
          await unfollowUser(id);
          globalEvents.emit("social:follow-change", { followingId: id, status: null });
        },
        "Could not unfollow this user",
        () => {
          setFollowingStatusMap((current) => {
            previousMap = current;
            const next = { ...current };
            delete next[id];
            return next;
          });
          if (isOwnProfile) {
            setFollowingState((current) => {
              previousFollowingList = current.list;
              return { ...current, list: current.list.filter((u) => u.id !== id) };
            });
          }
        },
        () => {
          setFollowingStatusMap(previousMap);
          if (isOwnProfile) {
            setFollowingState((current) => ({ ...current, list: previousFollowingList }));
          }
        },
      );
    },
    [isOwnProfile, runUserAction],
  );

  const handleRemoveFollower = useCallback(
    (id) => {
      let previousList = [];
      runUserAction(
        id,
        "remove-follower",
        async () => {
          await removeFollower(id);
          globalEvents.emit("social:follow-change", { followingId: authUserId, status: null });
        },
        "Could not remove follower",
        () => {
          setFollowersState((current) => {
            previousList = current.list;
            return { ...current, list: current.list.filter((u) => u.id !== id) };
          });
        },
        () => setFollowersState((current) => ({ ...current, list: previousList })),
      );
    },
    [authUserId, runUserAction],
  );

  const handleFollow = useCallback(
    (id) => {
      let previousMap = {};
      runUserAction(
        id,
        "follow",
        async () => {
          const status = await followUser(id);
          globalEvents.emit("social:follow-change", { followingId: id, status });
        },
        "Could not follow this user",
        () => {
          setFollowingStatusMap((current) => {
            previousMap = current;
            return { ...current, [id]: FOLLOW_STATUSES.ACCEPTED };
          });
        },
        () => setFollowingStatusMap(previousMap),
      );
    },
    [runUserAction],
  );

  const shouldShowInboxTab =
    canManageRequests &&
    (requestsState.isLoading || requestsState.list.length > 0 || Boolean(requestsState.error));

  const tabs = useMemo(() => {
    const list = [
      { key: TABS.FOLLOWING, label: "Following", count: followingState.list.length },
      { key: TABS.FOLLOWERS, label: "Followers", count: followersState.list.length },
    ];
    if (shouldShowInboxTab) {
      list.push({
        key: TABS.INBOX,
        label: "Inbox",
        count: requestsState.list.length,
      });
    }
    return list;
  }, [
    followingState.list.length,
    followersState.list.length,
    shouldShowInboxTab,
    requestsState.list.length,
  ]);

  const tabStateMap = useMemo(
    () => ({
      [TABS.FOLLOWERS]: followersState,
      [TABS.FOLLOWING]: followingState,
      [TABS.INBOX]: requestsState,
    }),
    [followersState, followingState, requestsState],
  );

  const activeDataState = tabStateMap[activeTab] || followersState;
  const { list, isLoading, error: activeError } = activeDataState;
  const activeErrorMessage = activeError
    ? resolveCollectionErrorMessage(activeError, activeTab)
    : null;
  const emptyDescription =
    activeTab === TABS.INBOX ? "No pending follow requests" : `No ${activeTab} yet`;

  const profileDisplayName = String(
    data?.displayName || account?.displayName || account?.display_name || account?.username || "Social",
  ).trim();
  const profileAvatar =
    data?.avatarUrl || (account ? getUserAvatarUrl(account) : "solar:users-group-rounded-bold");



  return (
    <div className="flex w-full flex-col overflow-hidden">
      <NavSurfaceExtension id="account-social-tabs" align="center">
        <div className="flex h-8 shrink-0 items-center gap-1.5 select-none">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <Button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "flex h-full shrink-0 cursor-pointer items-center gap-2 rounded-full px-3.5 text-xs font-semibold transition-all duration-200 select-none",
                  isActive
                    ? "bg-white text-black"
                    : "text-white/70 hover:bg-white/10 hover:text-white",
                )}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined ? (
                  <span
                    className={cn(
                      "text-xs font-bold",
                      isActive ? "text-black/80" : "text-white/50",
                    )}
                  >
                    {tab.count}
                  </span>
                ) : null}
              </Button>
            );
          })}
        </div>
      </NavSurfaceExtension>

      <AnimatePresence mode="wait" initial={false}>
        {isLoading ? (
          <motion.div
            key={`loading-${activeTab}`}
            variants={SURFACE_LIST_VARIANTS}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="w-full"
          >
            <LoadingList />
          </motion.div>
        ) : activeErrorMessage ? (
          <motion.div
            key={`error-${activeTab}`}
            variants={SURFACE_LIST_VARIANTS}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="flex min-h-[10rem] w-full flex-col items-center justify-center gap-2.5 rounded-[20px] bg-white/5 p-6 text-center ring-1 ring-white/10 ring-inset"
          >
            <div className="center size-10 rounded-xl bg-white/5 text-white/50 ring-1 ring-white/10 ring-inset">
              <Icon icon="solar:danger-circle-bold" size={22} />
            </div>
            <div className="flex max-w-sm flex-col gap-1">
              <p className="text-xs font-semibold text-white/70">{activeErrorMessage}</p>
            </div>
          </motion.div>
        ) : list.length === 0 ? (
          <motion.div
            key={`empty-${activeTab}`}
            variants={SURFACE_LIST_VARIANTS}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="flex min-h-[10rem] w-full flex-col items-center justify-center gap-2.5 rounded-[20px] bg-white/5 p-6 text-center ring-1 ring-white/10 ring-inset"
          >
            <div className="center size-10 rounded-xl bg-white/5 text-white/50 ring-1 ring-white/10 ring-inset">
              <Icon icon="solar:users-group-rounded-linear" size={22} />
            </div>
            <div className="flex max-w-sm flex-col gap-1">
              <p className="text-xs font-semibold text-white/70">{emptyDescription}</p>
              <p className="text-xs leading-relaxed text-white/50">
                {activeTab === TABS.INBOX
                  ? "Incoming follow requests will appear here"
                  : `No ${activeTab} yet for this account`}
              </p>
            </div>
          </motion.div>
        ) : (
          <div
            key={`users-container-${activeTab}`}
            data-lenis-prevent
            data-lenis-prevent-wheel
            onWheel={handleListWheel}
            className="max-h-[min(54dvh,24rem)] w-full touch-pan-y scrollbar-none overflow-y-auto overscroll-contain rounded-[20px]"
          >
            <motion.div
              key={`users-list-${activeTab}`}
              variants={SURFACE_LIST_VARIANTS}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="flex min-h-[48px] w-full flex-col justify-center gap-2.5 overflow-visible"
            >
              {list.map((user, index) => (
                <SocialUserRow
                  key={user.id}
                  close={close}
                  user={user}
                  index={index}
                  action={
                    <UserAction
                      tab={activeTab}
                      user={user}
                      authUserId={authUserId}
                      isOwnProfile={isOwnProfile}
                      pendingKind={pendingActionByUserId[user.id] || null}
                      followStatus={followingStatusMap[user.id] || null}
                      onAccept={handleAccept}
                      onReject={handleReject}
                      onUnfollow={handleUnfollow}
                      onRemoveFollower={handleRemoveFollower}
                      onFollow={handleFollow}
                    />
                  }
                />
              ))}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
