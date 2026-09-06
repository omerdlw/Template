"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAccount } from "@/modules/account";
import { useAuth } from "@/modules/auth";
import {
  NAV_ACTION_KEYS,
  NAV_ACTION_ORDER,
  useNavContextActions,
  useNavigationActions,
} from "@/modules/nav";
import { NotificationsSurface } from "@/domains/social/notifications-surface";
import { createAccountEditSurfaceEntry } from "@/domains/account/account-edit-surface";
import { createSignInSurfaceEntry } from "@/domains/auth/sign-in-surface";

function getCurrentPath() {
  if (typeof window === "undefined") return "/";
  return `${window.location.pathname}${window.location.search}`;
}

export function NavDefaultCommandsSync() {
  const auth = useAuth();
  const { profile } = useAccount();
  const pathname = usePathname();
  const router = useRouter();
  const { openSurface } = useNavigationActions();
  const promptedSignInPath = useRef(null);
  const openNotifications = useCallback(() => {
    void openSurface({
      component: NotificationsSurface,
      description: "Follow, activity and account updates",
      icon: "solar:bell-bold",
      title: "Notifications",
      width: 400,
    });
  }, [openSurface]);
  const openAccountEdit = useCallback(() => {
    void openSurface(createAccountEditSurfaceEntry("overview"));
  }, [openSurface]);
  const logout = useCallback(async () => {
    await auth.signOut("local");
    window.setTimeout(() => router.replace("/"), 450);
  }, [auth, router]);
  const ownAccountPath = profile?.username
    ? `/account/${encodeURIComponent(profile.username)}`
    : "/account";
  const isAccountEntryPath = pathname === "/account";
  const isAccountOwnerView =
    pathname === "/account" || pathname === ownAccountPath;

  useEffect(() => {
    if (auth.isAuthenticated || !isAccountEntryPath) {
      promptedSignInPath.current = null;
      return;
    }

    if (!auth.isReady || promptedSignInPath.current === pathname) return;

    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled || promptedSignInPath.current === pathname) return;

      promptedSignInPath.current = pathname;
      void openSurface(
        createSignInSurfaceEntry({
          next: getCurrentPath(),
        }),
      );
    });

    return () => {
      cancelled = true;
    };
  }, [
    auth.isAuthenticated,
    auth.isReady,
    isAccountEntryPath,
    openSurface,
    pathname,
  ]);

  const commands = useMemo(
    () => [
      {
        icon: "solar:pen-bold",
        key: NAV_ACTION_KEYS.EDIT_ACCOUNT,
        onClick: openAccountEdit,
        order: NAV_ACTION_ORDER.EDIT_ACCOUNT,
        tooltip: "Edit account",
        visible: auth.isReady && auth.isAuthenticated && isAccountOwnerView,
      },
      {
        icon: "solar:bell-bold",
        key: NAV_ACTION_KEYS.NOTIFICATIONS,
        onClick: openNotifications,
        order: NAV_ACTION_ORDER.NOTIFICATIONS,
        tooltip: "Notifications",
        visible: auth.isReady && auth.isAuthenticated,
      },
      {
        icon: "solar:logout-2-bold",
        key: NAV_ACTION_KEYS.LOGOUT,
        onClick: () => void logout(),
        order: NAV_ACTION_ORDER.LOGOUT,
        tooltip: "Exit",
        visible: auth.isReady && auth.isAuthenticated,
      },
    ],
    [
      auth.isAuthenticated,
      auth.isReady,
      isAccountOwnerView,
      logout,
      openAccountEdit,
      openNotifications,
    ],
  );
  useNavContextActions(commands);
  return null;
}
