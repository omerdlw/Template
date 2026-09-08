"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { useAccount } from "@/modules/account";
import { useAuth } from "@/modules/auth";
import { useNavContextActions, useNavigationActions } from "@/modules/nav";
import { DYNAMIC_SOURCE, useNavRegistration } from "@/modules/registry";
import { globalEvents } from "@/shared";
import { createAccountSocialSurfaceEntry, fetchInboxCount } from "@/domains/social";
import { AccountAction } from "./account-action";
import { createAccountEditSurfaceEntry } from "./edit";

const DEFAULT_ACCOUNT_ICON = "solar:user-circle-bold";
const EDIT_ACCOUNT_ACTION_KEY = "account.edit";
const EDIT_ACCOUNT_ACTION_ORDER = 10;

export function AccountNavSync() {
  const { account: accountFromHook, profile: profileFromHook } = useAccount();
  const account = accountFromHook || profileFromHook;
  const auth = useAuth();
  const pathname = usePathname();
  const { openSurface } = useNavigationActions();
  const username = account?.username ? `@${account.username}` : null;
  const [rawInboxCount, setRawInboxCount] = useState(0);
  const inboxCount =
    auth.isAuthenticated && account?.isPrivate ? rawInboxCount : 0;

  const ownAccountPath = account?.username
    ? `/account/${encodeURIComponent(account.username)}`
    : "/account";
  const isAccountOwnerView =
    pathname === "/account" || pathname === ownAccountPath;

  useEffect(() => {
    if (!auth.isAuthenticated || !account?.isPrivate) return;
    let active = true;
    void fetchInboxCount()
      .then((count) => {
        if (active) setRawInboxCount(count);
      })
      .catch(() => null);
    return () => {
      active = false;
    };
  }, [account?.isPrivate, auth.isAuthenticated]);

  useEffect(() => {
    return globalEvents.subscribe("social:inbox-change", () => {
      if (auth.isAuthenticated && account?.isPrivate) {
        void fetchInboxCount()
          .then(setRawInboxCount)
          .catch(() => null);
      }
    });
  }, [account?.isPrivate, auth.isAuthenticated]);

  const openAccountInbox = useCallback(() => {
    if (!account) return;
    void openSurface(
      createAccountSocialSurfaceEntry({
        canManageRequests: true,
        displayName: account.displayName,
        tab: "inbox",
        userId: account.id,
        username: account.username,
      }),
    );
  }, [account, openSurface]);

  const navConfig = useMemo(
    () => ({
      action:
        isAccountOwnerView && account?.isPrivate && inboxCount > 0 ? (
          <AccountAction
            canManageRequests={true}
            inboxCount={inboxCount}
            isOwner={isAccountOwnerView}
            onOpenInbox={openAccountInbox}
          />
        ) : null,
      description: username || "Account and security",
      icon: account?.avatarUrl || DEFAULT_ACCOUNT_ICON,
      keepWhenDescendant: (activePath) =>
        String(activePath || "").startsWith("/account"),
      path: "/account",
      title: account?.displayName || "Account",
    }),
    [
      account?.avatarUrl,
      account?.displayName,
      account?.isPrivate,
      inboxCount,
      isAccountOwnerView,
      openAccountInbox,
      username,
    ],
  );

  useNavRegistration(navConfig, {
    priority: 200,
    source: DYNAMIC_SOURCE,
  });

  const openAccountEdit = useCallback(() => {
    void openSurface(createAccountEditSurfaceEntry("overview"));
  }, [openSurface]);

  const actions = useMemo(
    () => [
      {
        icon: "solar:pen-bold",
        key: EDIT_ACCOUNT_ACTION_KEY,
        onClick: openAccountEdit,
        order: EDIT_ACCOUNT_ACTION_ORDER,
        tooltip: "Edit account",
        visible: auth.isReady && auth.isAuthenticated && isAccountOwnerView,
      },
    ],
    [auth.isAuthenticated, auth.isReady, isAccountOwnerView, openAccountEdit],
  );
  useNavContextActions(actions);

  return null;
}
