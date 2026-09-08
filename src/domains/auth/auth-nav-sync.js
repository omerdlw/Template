"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/modules/auth";
import { useNavContextActions, useNavigationActions } from "@/modules/nav";
import { createSignInSurfaceEntry } from "./sign-in-surface";

const SIGN_OUT_ACTION_KEY = "auth.sign-out";
const SIGN_OUT_ACTION_ORDER = 30;

function getCurrentPath() {
  if (typeof window === "undefined") return "/";
  return `${window.location.pathname}${window.location.search}`;
}

export function AuthNavSync() {
  const auth = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const { openSurface } = useNavigationActions();
  const promptedSignInPath = useRef(null);
  const isAccountEntryPath = pathname === "/account";

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

  const signOut = useCallback(async () => {
    await auth.signOut("local");
    window.setTimeout(() => router.replace("/"), 450);
  }, [auth, router]);

  const actions = useMemo(
    () => [
      {
        icon: "solar:logout-2-bold",
        key: SIGN_OUT_ACTION_KEY,
        onClick: () => void signOut(),
        order: SIGN_OUT_ACTION_ORDER,
        tooltip: "Exit",
        visible: auth.isReady && auth.isAuthenticated,
      },
    ],
    [auth.isAuthenticated, auth.isReady, signOut],
  );

  useNavContextActions(actions);

  return null;
}
