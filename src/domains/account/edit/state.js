"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "@/modules/account";
import { listMfaFactors, listPasskeys, useAuth } from "@/modules/auth";
import { useNavigationActions } from "@/modules/nav";
import { requestJson } from "@/infrastructure/http/client";

function toForm(account) {
  return {
    avatarUrl: account?.avatarUrl || "",
    bannerUrl: account?.bannerUrl || "",
    bio: account?.bio || "",
    displayName: account?.displayName || "",
    isPrivate: Boolean(account?.isPrivate),
    username: account?.username || "",
  };
}

export function useAccountEditState() {
  const accountState = useAccount();
  const auth = useAuth();
  const { closeSurface, openSurface } = useNavigationActions();
  const router = useRouter();
  const currentAccount = accountState.account || accountState.profile;
  const [form, setForm] = useState(() => toForm(currentAccount));
  const [sessions, setSessions] = useState([]);
  const [passkeys, setPasskeys] = useState([]);
  const [factors, setFactors] = useState([]);
  const [securityLoading, setSecurityLoading] = useState(false);

  useEffect(() => {
    if (!currentAccount) return;
    const nextForm = toForm(currentAccount);
    queueMicrotask(() => setForm(nextForm));
  }, [currentAccount]);

  const handleChange = useCallback(
    (key, value) => setForm((current) => ({ ...current, [key]: value })),
    [],
  );

  const reloadSecurity = useCallback(async () => {
    if (!auth.client || !auth.isAuthenticated) return;
    await Promise.resolve();
    setSecurityLoading(true);
    try {
      const [sessionResponse, nextPasskeys, nextFactors] = await Promise.all([
        requestJson("/api/auth/sessions", { notifyOnUnauthorized: false }),
        listPasskeys(auth.client).catch(() => []),
        listMfaFactors(auth.client).catch(() => []),
      ]);
      setSessions(sessionResponse.sessions || []);
      setPasskeys(nextPasskeys);
      setFactors(nextFactors);
    } finally {
      setSecurityLoading(false);
    }
  }, [auth.client, auth.isAuthenticated]);

  useEffect(() => {
    Promise.resolve()
      .then(() => reloadSecurity())
      .catch(() => null);
  }, [reloadSecurity]);

  const handleAccountSubmit = useCallback(
    async (event) => {
      event?.preventDefault();
      const value = await accountState.update(form);
      await accountState.refresh();
      const username =
        value?.account?.username || value?.profile?.username || form.username;
      if (username) router.replace(`/account/${encodeURIComponent(username)}`);
    },
    [accountState, form, router],
  );

  const revokeSession = useCallback(
    async (sessionId) => {
      await requestJson(`/api/auth/sessions/${encodeURIComponent(sessionId)}`, {
        method: "DELETE",
      });
      await reloadSecurity();
    },
    [reloadSecurity],
  );

  const revokeOthers = useCallback(async () => {
    await requestJson("/api/auth/sessions/others", { method: "POST" });
    await reloadSecurity();
  }, [reloadSecurity]);

  const deleteAccount = useCallback(
    async (confirmation) => {
      await requestJson("/api/account/me", {
        body: JSON.stringify({ confirmation }),
        method: "DELETE",
      });
      await auth.signOut("local");
      closeSurface?.();
      router.replace("/?reason=account-deleted");
    },
    [auth, closeSurface, router],
  );

  const sharedAccountProps = useMemo(
    () => ({
      form,
      formId: "account-edit-form",
      handleAccountSubmit,
      handleChange,
    }),
    [form, handleAccountSubmit, handleChange],
  );

  const sharedSecurityProps = useMemo(
    () => ({
      account: accountState.account,
      auth,
      deleteAccount,
      factors,
      passkeys,
      reloadSecurity,
      revokeOthers,
      revokeSession,
      sessions,
      user: auth.user,
    }),
    [
      accountState.account,
      auth,
      deleteAccount,
      factors,
      passkeys,
      reloadSecurity,
      revokeOthers,
      revokeSession,
      sessions,
    ],
  );

  return {
    account: accountState.account,
    factors,
    form,
    handleAccountSubmit,
    handleChange,
    openSurface,
    passkeys,
    securityLoading,
    sessions,
    sharedAccountProps,
    sharedProfileProps: sharedAccountProps,
    sharedSecurityProps,
  };
}
