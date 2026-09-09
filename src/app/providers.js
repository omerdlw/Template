"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { requestJson } from "@/infrastructure/http/client";
import { AccountProvider, useAccount } from "@/modules/account";
import { AuthProvider, useAuth } from "@/modules/auth";
import { BackgroundOverlay, BackgroundProvider } from "@/modules/background";
import { ContextMenuGlobal, ContextMenuProvider } from "@/modules/context-menu";
import { Controls } from "@/modules/controls";
import { GlobalError, GlobalErrorListener } from "@/modules/error-boundary";
import { LoadingOverlay, LoadingProvider } from "@/modules/loading";
import { ModalProvider, useModal } from "@/modules/modal";
import Nav, {
  NavigationProvider,
  useNavContextActions,
  useNavigation,
  useNavigationActions,
} from "@/modules/nav";
import {
  NotificationContainer,
  NotificationListener,
  NotificationProvider,
} from "@/modules/notification";
import {
  REGISTRY_SOURCES,
  REGISTRY_TYPES,
  RegistryProvider,
  useNavRegistration,
} from "@/modules/registry";
import { EVENT_TYPES, globalEvents } from "@/shared";
import { AccountAction } from "@/domains/account/account-action";
import { createSignInSurfaceEntry } from "@/domains/auth";
import {
  createAccountSocialSurfaceEntry,
  fetchInboxCount,
  fetchUnreadCount,
  NotificationsModal,
  SocialRealtimeSync,
} from "@/domains/social";

const DEFAULT_ACCOUNT_ICON = "solar:user-circle-bold";
const NOTIFICATIONS_ICON = "solar:bell-bold";
const NOTIFICATIONS_TITLE = "Notifications";
const NOTIFICATIONS_ACTION_KEY = "social.notifications";
const NOTIFICATIONS_ACTION_ORDER = -10;
const SIGN_OUT_ACTION_KEY = "auth.sign-out";
const SIGN_OUT_ACTION_ORDER = 30;

const APP_REGISTRY_ENTRIES = Object.freeze([
  {
    type: REGISTRY_TYPES.NAV,
    items: {
      "/": {
        description: "Template overview",
        icon: "solar:home-2-bold",
        path: "/",
        title: "Home",
      },
      "/account": {
        description: "Manage your account",
        icon: DEFAULT_ACCOUNT_ICON,
        path: "/account",
        title: "Account",
      },
    },
  },
  {
    type: REGISTRY_TYPES.MODAL,
    items: {
      NOTIFICATIONS_MODAL: NotificationsModal,
    },
  },
]);

const accountClient = Object.freeze({
  getCurrentAccount: () =>
    requestJson("/api/account/me", { notifyOnUnauthorized: false }),
  updateCurrentAccount: (patch) =>
    requestJson("/api/account/me", {
      body: JSON.stringify(patch),
      method: "PATCH",
    }),
});

function getCurrentPath() {
  if (typeof window === "undefined") return "/";
  return `${window.location.pathname}${window.location.search}`;
}

function AccountIdentityBridge({ children }) {
  const auth = useAuth();
  return (
    <AccountProvider
      client={accountClient}
      identity={{
        isAuthenticated: auth.isAuthenticated,
        isReady: auth.isReady,
        user: auth.user,
      }}
    >
      {children}
    </AccountProvider>
  );
}

function AuthEventBridge() {
  const auth = useAuth();
  const hasResolvedInitialState = useRef(false);
  const previousUserId = useRef(null);
  const previousSession = useRef(null);

  useEffect(() => {
    if (!auth.isReady) return;

    const userId = auth.user?.id || null;
    const isInitialState = !hasResolvedInitialState.current;
    if (!isInitialState && userId && previousUserId.current !== userId) {
      globalEvents.emit(EVENT_TYPES.AUTH_SIGN_IN, {
        session: auth.session,
        userId,
      });
    } else if (!isInitialState && !userId && previousUserId.current) {
      globalEvents.emit(EVENT_TYPES.AUTH_SIGN_OUT, {
        previousSession: previousSession.current,
        userId: previousUserId.current,
      });
    }

    hasResolvedInitialState.current = true;
    previousUserId.current = userId;
    previousSession.current = auth.session;
    globalEvents.emit(EVENT_TYPES.AUTH_READY, {
      isAuthenticated: auth.isAuthenticated,
      userId,
    });
  }, [auth.isAuthenticated, auth.isReady, auth.session, auth.user?.id]);

  return null;
}

function AccountRouteNavGuard() {
  const auth = useAuth();
  const { account: accountFromHook, profile: profileFromHook } = useAccount();
  const account = accountFromHook || profileFromHook;
  const pathname = usePathname();
  const router = useRouter();
  const { openSurface } = useNavigationActions();
  const promptedSignInPath = useRef(null);
  const isAccountEntryPath = pathname === "/account";

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

  const username = account?.username ? `@${account.username}` : null;
  const accountNavConfig = useMemo(
    () => ({
      action:
        auth.isAuthenticated &&
        isAccountOwnerView &&
        account?.isPrivate &&
        inboxCount > 0 ? (
          <AccountAction
            canManageRequests={true}
            inboxCount={inboxCount}
            isOwner={isAccountOwnerView}
            onOpenInbox={openAccountInbox}
          />
        ) : null,
      description: (auth.isAuthenticated && username) || "Manage your account",
      icon: (auth.isAuthenticated && account?.avatarUrl) || DEFAULT_ACCOUNT_ICON,
      keepWhenDescendant: (activePath) =>
        Boolean(
          activePath &&
            String(activePath).startsWith("/account") &&
            activePath !== "/account" &&
            activePath !== ownAccountPath,
        ),
      path: "/account",
      targetPath: ownAccountPath,
      title: (auth.isAuthenticated && account?.displayName) || "Account",
    }),
    [
      account?.avatarUrl,
      account?.displayName,
      account?.isPrivate,
      auth.isAuthenticated,
      inboxCount,
      isAccountOwnerView,
      openAccountInbox,
      ownAccountPath,
      username,
    ],
  );

  useNavRegistration(accountNavConfig, {
    priority: 200,
    source: REGISTRY_SOURCES.DYNAMIC,
  });

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
      ).then((result) => {
        if (cancelled) return;
        if (
          !result?.success &&
          typeof window !== "undefined" &&
          window.location.pathname === "/account"
        ) {
          router.replace("/");
        }
        promptedSignInPath.current = null;
      });
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
    router,
  ]);

  return null;
}

function GlobalShellActions() {
  const auth = useAuth();
  const router = useRouter();
  const { openModal, closeModal, isOpen, modalType } = useModal();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!auth.isAuthenticated) return;
    let active = true;
    void fetchUnreadCount()
      .then((count) => {
        if (active) setUnreadCount(count);
      })
      .catch(() => null);

    return () => {
      active = false;
    };
  }, [auth.isAuthenticated]);

  useEffect(() => {
    return globalEvents.subscribe("social:notification-change", () => {
      if (auth.isAuthenticated) {
        void fetchUnreadCount().then(setUnreadCount).catch(() => null);
      }
    });
  }, [auth.isAuthenticated]);

  const handleOpenNotifications = useCallback(
    (event) => {
      event?.preventDefault?.();
      event?.stopPropagation?.();
      if (isOpen && modalType === "NOTIFICATIONS_MODAL") {
        closeModal();
        return;
      }
      openModal("NOTIFICATIONS_MODAL", "left", {
        data: { userId: auth.user?.id ?? null },
        title: "Notifications",
      });
    },
    [auth.user?.id, closeModal, isOpen, modalType, openModal],
  );

  const signOut = useCallback(async () => {
    await auth.signOut("local");
    window.setTimeout(() => router.replace("/"), 450);
  }, [auth, router]);

  const unreadBadge =
    unreadCount > 0 ? (unreadCount > 99 ? "99+" : `${unreadCount}`) : null;

  const globalActions = useMemo(
    () => [
      {
        badge: unreadBadge,
        icon: NOTIFICATIONS_ICON,
        key: NOTIFICATIONS_ACTION_KEY,
        onClick: handleOpenNotifications,
        order: NOTIFICATIONS_ACTION_ORDER,
        tooltip: NOTIFICATIONS_TITLE,
        visible: auth.isReady && auth.isAuthenticated,
      },
      {
        icon: "solar:logout-2-bold",
        key: SIGN_OUT_ACTION_KEY,
        onClick: () => void signOut(),
        order: SIGN_OUT_ACTION_ORDER,
        tooltip: "Exit",
        visible: auth.isReady && auth.isAuthenticated,
      },
    ],
    [
      auth.isAuthenticated,
      auth.isReady,
      handleOpenNotifications,
      signOut,
      unreadBadge,
    ],
  );

  useNavContextActions(globalActions);

  return null;
}

function RegisteredNavigation() {
  const { navigationItems } = useNavigation();
  if (!navigationItems?.length) return null;

  return (
    <>
      <Nav />
      <Controls />
    </>
  );
}

export function Providers({ children }) {
  return (
    <GlobalError>
      <RegistryProvider initialEntries={APP_REGISTRY_ENTRIES}>
        <AuthProvider>
          <AccountIdentityBridge>
            <NotificationProvider>
              <BackgroundProvider>
                <LoadingProvider>
                  <ModalProvider>
                    <ContextMenuProvider>
                      <NavigationProvider>
                        <SocialRealtimeSync />
                        <AccountRouteNavGuard />
                        <GlobalShellActions />
                        <AuthEventBridge />
                        <BackgroundOverlay />
                        {children}
                        <RegisteredNavigation />
                        <ContextMenuGlobal />
                        <LoadingOverlay />
                        <NotificationListener />
                        <NotificationContainer />
                        <GlobalErrorListener />
                      </NavigationProvider>
                    </ContextMenuProvider>
                  </ModalProvider>
                </LoadingProvider>
              </BackgroundProvider>
            </NotificationProvider>
          </AccountIdentityBridge>
        </AuthProvider>
      </RegistryProvider>
    </GlobalError>
  );
}
