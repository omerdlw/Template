"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
const INITIAL_STATE = Object.freeze({
  account: null,
  error: null,
  isLoading: false,
  profile: null,
});
const AccountContext = createContext(null);
export function AccountProvider({ children, client, identity }) {
  const [state, setState] = useState(INITIAL_STATE);
  const userId = identity?.isAuthenticated ? identity?.user?.id || null : null;
  const refresh = useCallback(async () => {
    if (!client || !userId) {
      setState(INITIAL_STATE);
      return null;
    }
    setState((current) => ({
      ...current,
      error: null,
      isLoading: true,
    }));
    try {
      const value = await client.getCurrentAccount();
      setState({
        ...value,
        error: null,
        isLoading: false,
      });
      return value;
    } catch (error) {
      setState((current) => ({
        ...current,
        error,
        isLoading: false,
      }));
      throw error;
    }
  }, [client, userId]);
  const update = useCallback(
    async (patch) => {
      if (!client || !userId) throw new Error("Authentication required");
      const value = await client.updateCurrentAccount(patch);
      setState((current) => ({
        ...current,
        ...value,
      }));
      return value;
    },
    [client, userId],
  );
  useEffect(() => {
    if (!identity?.isReady) return;
    void refresh().catch(() => null);
  }, [identity?.isReady, refresh]);
  const value = useMemo(
    () => ({
      ...state,
      client,
      refresh,
      update,
    }),
    [client, refresh, state, update],
  );
  return (
    <AccountContext.Provider value={value}>{children}</AccountContext.Provider>
  );
}
export function useAccount() {
  const context = useContext(AccountContext);
  if (!context)
    throw new Error("useAccount must be used inside AccountProvider");
  return context;
}
