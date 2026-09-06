"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { isSupabaseConfigured } from "@/infrastructure/env";
import { createBrowserSupabaseClient } from "@/infrastructure/supabase/client";
import { getAuthenticatorAssurance, signOut as signOutClient } from "./client";

const INITIAL_STATE = Object.freeze({
  aal: null,
  error: null,
  isAuthenticated: false,
  isConfigured: false,
  isReady: false,
  session: null,
  user: null,
});

const AuthContext = createContext(null);

async function resolveState(client, session = null) {
  const activeSession =
    session || (await client.auth.getSession()).data.session || null;
  let aal = null;

  if (activeSession) {
    aal = await getAuthenticatorAssurance(client).catch(() => null);
  }

  return {
    aal,
    error: null,
    isAuthenticated: Boolean(activeSession?.user),
    isConfigured: true,
    isReady: true,
    session: activeSession,
    user: activeSession?.user || null,
  };
}

export function AuthProvider({ children }) {
  const configured = isSupabaseConfigured();
  const [state, setState] = useState(() => ({
    ...INITIAL_STATE,
    isConfigured: configured,
    isReady: !configured,
  }));
  const client = useMemo(
    () => (configured ? createBrowserSupabaseClient() : null),
    [configured],
  );

  const refresh = useCallback(async () => {
    if (!client) return null;
    const nextState = await resolveState(client);
    setState(nextState);
    return nextState;
  }, [client]);

  const signOut = useCallback(
    async (scope = "local") => {
      if (!client) return;
      await signOutClient(client, scope);
      if (scope !== "others")
        setState({ ...INITIAL_STATE, isConfigured: true, isReady: true });
    },
    [client],
  );

  useEffect(() => {
    if (!client) return undefined;

    let active = true;
    void resolveState(client)
      .then((nextState) => active && setState(nextState))
      .catch(
        (error) =>
          active &&
          setState((current) => ({ ...current, error, isReady: true })),
      );

    const { data } = client.auth.onAuthStateChange((_event, session) => {
      queueMicrotask(() => {
        if (!active) return;
        void resolveState(client, session).then(
          (nextState) => active && setState(nextState),
        );
      });
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [client]);

  const value = useMemo(
    () => ({ ...state, client, refresh, signOut }),
    [client, refresh, signOut, state],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}

export function useUser() {
  return useAuth().user;
}

export function useSession() {
  return useAuth().session;
}
