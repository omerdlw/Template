"use client";

import { useEffect, useRef, useState } from "react";
import BackdropHero from "@/ui/components/backdrop-hero";
import AdaptiveImage from "@/ui/components/adaptive-image";
import { Button, Icon } from "@/ui/primitives";
import {
  applyAvatarFallback,
  getInitial,
  getUserAvatarFallbackUrl,
  globalEvents,
} from "@/shared";
import { useNavigationActions } from "@/modules/nav";
import { createAccountSocialSurfaceEntry } from "@/domains/social";
import { createAccountBioSurfaceEntry } from "./account-bio-surface";

function formatJoinDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
  }).format(date);
}

function resolveAccountBackdropUrl(profile) {
  const banner = String(profile?.bannerUrl || "").trim();
  if (!banner) return null;
  if (/^(https?:\/\/|\/)/.test(banner)) return banner;
  return null;
}

export function AccountBackdropHero({ image }) {
  return (
    <BackdropHero
      image={image}
      position="center 25%"
      className="lg:h-[clamp(28rem,40vw,34rem)] xl:h-[clamp(30rem,42vw,36rem)]"
    />
  );
}

function AccountHeroBio({ account, onOpenBio }) {
  const textRef = useRef(null);
  const bio = account?.bio || "";
  const [hasTextOverflow, setHasTextOverflow] = useState(false);

  useEffect(() => {
    const element = textRef.current;
    if (!element || !bio) return;

    const checkOverflow = () => {
      setHasTextOverflow(element.scrollWidth > element.clientWidth);
    };

    const frameId = requestAnimationFrame(checkOverflow);

    const resizeObserver = new ResizeObserver(checkOverflow);
    resizeObserver.observe(element);

    return () => {
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
    };
  }, [bio]);

  if (!bio) return null;

  const isOverflowing = bio.includes("\n") || hasTextOverflow;

  return (
    <div className="mt-3 flex items-center gap-1.5 text-xs text-white/70 sm:mt-3.5 sm:text-sm">
      <p
        ref={textRef}
        className={`min-w-0 truncate ${
          isOverflowing
            ? "cursor-pointer select-none transition-all hover:text-white/90"
            : ""
        }`}
        onClick={isOverflowing ? onOpenBio : undefined}
      >
        {bio}
      </p>
      {isOverflowing ? (
        <button
          className="shrink-0 cursor-pointer font-medium text-white underline underline-offset-2 transition-all hover:text-white/80"
          onClick={onOpenBio}
          type="button"
        >
          read more
        </button>
      ) : null}
    </div>
  );
}

export function AccountHero({
  account: accountProp,
  followersCount: initialFollowersCount = 0,
  followingCount: initialFollowingCount = 0,
  profile,
}) {
  const account = accountProp || profile;
  const displayName = account?.displayName || account?.username || "Account";
  const backdropUrl = resolveAccountBackdropUrl(account);
  const joinDate = formatJoinDate(account?.createdAt) || "—";
  const { openSurface } = useNavigationActions();
  const [followerDelta, setFollowerDelta] = useState(0);
  const [prevInitialFollowers, setPrevInitialFollowers] =
    useState(initialFollowersCount);

  if (initialFollowersCount !== prevInitialFollowers) {
    setPrevInitialFollowers(initialFollowersCount);
    setFollowerDelta(0);
  }

  const followers = Math.max(0, initialFollowersCount + followerDelta);
  const following = initialFollowingCount;

  const handleOpenSocial = (tab) => {
    if (!account?.id) return;
    void openSurface(
      createAccountSocialSurfaceEntry({
        account,
        displayName,
        tab,
        userId: account.id,
        username: account.username,
      }),
    );
  };

  const handleOpenBio = () => {
    if (!account?.bio) return;
    void openSurface(
      createAccountBioSurfaceEntry({
        account,
        bio: account.bio,
        displayName,
        username: account.username,
      }),
    );
  };

  useEffect(() => {
    return globalEvents.subscribe("social:follow-change", (payload) => {
      if (payload?.followingId === account?.id) {
        setFollowerDelta((prev) =>
          payload.status === "accepted" ? prev + 1 : prev - 1,
        );
      }
    });
  }, [account?.id]);

  return (
    <>
      {backdropUrl ? <AccountBackdropHero image={backdropUrl} /> : null}
      <section
        className={`relative z-10 w-full ${
          backdropUrl
            ? "-mt-20 pb-6 sm:-mt-28 sm:pb-8 lg:-mt-36 lg:pb-10"
            : "py-14 sm:py-20 lg:py-24"
        }`}
      >
        <div className="relative z-10 flex min-w-0 items-center gap-4 sm:gap-6 lg:gap-8">
          <div
            className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-black/60 text-4xl font-semibold text-white shadow-2xl ring-2 ring-white/10 select-none sm:size-28 sm:text-5xl lg:size-32"
            role="img"
            aria-label={`${displayName} avatar`}
          >
            {account?.avatarUrl ? (
              <AdaptiveImage
                alt=""
                className="size-full object-cover"
                onError={(event) =>
                  applyAvatarFallback(
                    event,
                    getUserAvatarFallbackUrl(account),
                  )
                }
                src={account.avatarUrl}
              />
            ) : (
              getInitial(displayName || account?.username)
            )}
          </div>

          <div className="flex min-w-0 flex-1 flex-col justify-center">
            <h1 className="font-zuume max-w-full text-4xl leading-none font-bold text-white uppercase [overflow-wrap:anywhere] sm:text-6xl lg:text-7xl">
              {displayName}
            </h1>

            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/50 sm:mt-2 sm:text-base">
              <Button
                className="inline-flex cursor-pointer items-center gap-1.5 transition-all hover:text-white"
                onClick={() => handleOpenSocial("following")}
                type="button"
              >
                <span className="font-semibold text-white">{following}</span>
                <span>Following</span>
              </Button>
              <span className="text-white/50">•</span>
              <Button
                className="inline-flex cursor-pointer items-center gap-1.5 transition-all hover:text-white"
                onClick={() => handleOpenSocial("followers")}
                type="button"
              >
                <span className="font-semibold text-white">{followers}</span>
                <span>Followers</span>
              </Button>
              <span className="text-white/50">•</span>
              <span>Joined {joinDate}</span>
              {account?.isPrivate ? (
                <>
                  <span className="text-white/50">•</span>
                  <span>Private</span>
                </>
              ) : null}
            </div>

            <AccountHeroBio account={account} onOpenBio={handleOpenBio} />
          </div>
        </div>
      </section>
    </>
  );
}

export function AccountLayout({
  account,
  followersCount = 0,
  followingCount = 0,
  isFollower: initialIsFollower = false,
  isOwner = false,
  profile,
}) {
  const accountData = account || profile;
  const [isFollower, setIsFollower] = useState(initialIsFollower);
  const [prevInitialIsFollower, setPrevInitialIsFollower] =
    useState(initialIsFollower);

  if (initialIsFollower !== prevInitialIsFollower) {
    setPrevInitialIsFollower(initialIsFollower);
    setIsFollower(initialIsFollower);
  }

  useEffect(() => {
    if (!accountData?.id) return;
    return globalEvents.subscribe("social:follow-change", (payload) => {
      if (payload?.followingId === accountData.id) {
        setIsFollower(payload.status === "accepted");
      }
    });
  }, [accountData?.id]);

  const isPrivateLocked = accountData?.isPrivate && !isOwner && !isFollower;

  return (
    <main className="min-h-screen">
      <div className="relative z-10 w-full [overflow-anchor:none]">
        <div className="mx-auto flex w-full max-w-6xl flex-col px-4 sm:px-6 lg:px-8">
          <AccountHero
            account={accountData}
            followersCount={followersCount}
            followingCount={followingCount}
          />
        </div>
        <div className="w-full border-b border-white/10" />
        <div className="mx-auto flex w-full max-w-6xl flex-col px-4 pb-16 sm:px-6 lg:px-8">
          {isPrivateLocked ? (
            <div className="flex min-h-[14rem] w-full flex-col items-center justify-center gap-3 py-12 text-center">
              <div className="center size-12 rounded-2xl bg-white/5 text-white/50 ring-1 ring-white/10 ring-inset">
                <Icon icon="solar:lock-bold" size={24} />
              </div>
              <div className="flex max-w-sm flex-col gap-1">
                <h3 className="text-sm font-semibold text-white">
                  This account is private
                </h3>
                <p className="text-xs text-white/50">
                  Follow this account to see their activity.
                </p>
              </div>
            </div>
          ) : (
            <section className="w-full pt-6 sm:pt-8">DATA SECTION</section>
          )}
        </div>
      </div>
    </main>
  );
}

export const AccountProfileLayout = AccountLayout;
