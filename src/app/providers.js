"use client";

import { useEffect, useRef } from "react";
import { requestJson } from "@/infrastructure/http/client";
import { AccountProvider } from "@/modules/account";
import { AuthProvider, useAuth } from "@/modules/auth";
import { BackgroundOverlay, BackgroundProvider } from "@/modules/background";
import { ContextMenuGlobal, ContextMenuProvider } from "@/modules/context-menu";
import { Controls } from "@/modules/controls";
import { GlobalError, GlobalErrorListener } from "@/modules/error-boundary";
import { LoadingOverlay, LoadingProvider } from "@/modules/loading";
import { ModalProvider } from "@/modules/modal";
import Nav, { NavigationProvider, useNavigation } from "@/modules/nav";
import {
  NotificationContainer,
  NotificationListener,
  NotificationProvider,
} from "@/modules/notification";
import {
  REGISTRY_SOURCES,
  REGISTRY_TYPES,
  RegistryProvider,
} from "@/modules/registry";
import { EVENT_TYPES, globalEvents } from "@/shared";
import { AccountNavSync } from "@/domains/account";
import { AuthNavSync } from "@/domains/auth/auth-nav-sync";
import {
  NotificationsModal,
  NotificationsNavSync,
  SocialRealtimeSync,
} from "@/domains/social";

const accountClient = Object.freeze({
  getCurrentAccount: () =>
    requestJson("/api/account/me", { notifyOnUnauthorized: false }),
  updateCurrentAccount: (patch) =>
    requestJson("/api/account/me", {
      body: JSON.stringify(patch),
      method: "PATCH",
    }),
});

const INITIAL_REGISTRY_ENTRIES = Object.freeze([
  {
    source: REGISTRY_SOURCES.STATIC,
    type: REGISTRY_TYPES.NAV,
    items: {
      "/": {
        description: "Template overview",
        icon: "solar:home-2-bold",
        path: "/",
        title: "Home",
      },
      "/modules": {
        description: "Template module workspace",
        icon: "solar:widget-6-bold",
        path: "/modules",
        title: "Modules",
      },
    },
  },
  {
    source: REGISTRY_SOURCES.STATIC,
    type: REGISTRY_TYPES.MODAL,
    items: {
      NOTIFICATIONS_MODAL: NotificationsModal,
    },
  },
]);

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
      <RegistryProvider initialEntries={INITIAL_REGISTRY_ENTRIES}>
        <AuthProvider>
          <AccountIdentityBridge>
            <NotificationProvider>
              <BackgroundProvider>
                <LoadingProvider>
                  <ModalProvider>
                    <ContextMenuProvider>
                      <NavigationProvider>
                        <AuthNavSync />
                        <AccountNavSync />
                        <NotificationsNavSync />
                        <SocialRealtimeSync />
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
