"use client";

import { useEffect, useRef } from "react";
import { AccountProvider } from "@/modules/account";
import { AuthProvider, useAuth } from "@/modules/auth";
import { BackgroundOverlay, BackgroundProvider } from "@/modules/background";
import { ContextMenuGlobal, ContextMenuProvider } from "@/modules/context-menu";
import { Controls } from "@/modules/controls";
import { GlobalError, GlobalErrorListener } from "@/modules/error-boundary";
import { LoadingOverlay, LoadingProvider } from "@/modules/loading";
import { ModalProvider } from "@/modules/modal";
import Nav, { NavigationProvider, useNavigation } from "@/modules/nav";
import { PlatformInspector } from "@/modules/platform-inspector";
import {
  NotificationContainer,
  NotificationListener,
  NotificationProvider,
} from "@/modules/notification";
import { RegistryProvider } from "@/modules/registry";
import { EVENT_TYPES, globalEvents } from "@/shared";
import { accountClient } from "./_composition/account-client";
import { PLATFORM_REGISTRY_ENTRIES } from "./_composition/platform-registry";
import { NavDefaultCommandsSync } from "./_composition/nav-default-commands";
import { AccountNavSync } from "@/domains/account/account-nav-sync";

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
  const previousUserId = useRef(null);
  const previousSession = useRef(null);

  useEffect(() => {
    if (!auth.isReady) return;

    const userId = auth.user?.id || null;
    if (userId && previousUserId.current !== userId) {
      globalEvents.emit(EVENT_TYPES.AUTH_SIGN_IN, {
        session: auth.session,
        userId,
      });
    } else if (!userId && previousUserId.current) {
      globalEvents.emit(EVENT_TYPES.AUTH_SIGN_OUT, {
        previousSession: previousSession.current,
        userId: previousUserId.current,
      });
    }

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
      <RegistryProvider initialEntries={PLATFORM_REGISTRY_ENTRIES}>
        <AuthProvider>
          <AccountIdentityBridge>
            <NotificationProvider>
              <BackgroundProvider>
                <LoadingProvider>
                  <ModalProvider>
                    <ContextMenuProvider>
                      <NavigationProvider>
                        <AccountNavSync />
                        <NavDefaultCommandsSync />
                        <AuthEventBridge />
                        <BackgroundOverlay />
                        {children}
                        <RegisteredNavigation />
                        <ContextMenuGlobal />
                        <LoadingOverlay />
                        <NotificationListener />
                        <NotificationContainer />
                        <GlobalErrorListener />
                        <PlatformInspector />
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
