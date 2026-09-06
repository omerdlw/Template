"use client";

import { useMemo } from "react";
import { useAccount } from "@/modules/account";
import { DYNAMIC_SOURCE, useNavRegistration } from "@/modules/registry";

const DEFAULT_ACCOUNT_ICON = "solar:user-circle-bold";

export function AccountNavSync() {
  const { profile } = useAccount();
  const username = profile?.username ? `@${profile.username}` : null;
  const navConfig = useMemo(
    () => ({
      description: username || "Profile and security",
      icon: profile?.avatarUrl || DEFAULT_ACCOUNT_ICON,
      keepWhenDescendant: (activePath) =>
        String(activePath || "").startsWith("/account"),
      path: "/account",
      title: profile?.displayName || "Account",
    }),
    [profile?.avatarUrl, profile?.displayName, username],
  );

  useNavRegistration(navConfig, {
    priority: 200,
    source: DYNAMIC_SOURCE,
  });

  return null;
}
