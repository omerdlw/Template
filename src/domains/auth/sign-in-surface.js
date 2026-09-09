"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import {
  getAuthCallbackUrl,
  getAuthenticatorAssurance,
  requestEmailAuth,
  sanitizeNextPath,
  signInWithOAuth,
  signInWithPasskey,
  useAuth,
} from "@/modules/auth";
import {
  NAV_FADE_TRANSITION,
  NavSurfaceAction,
  NavSurfaceHeaderButton,
  textCrossfadeVariants,
  useNavigationActions,
} from "@/modules/nav";
import { useToast } from "@/modules/notification";
import { Button, Icon, Input } from "@/ui/primitives";
import { AUTH_INPUT_CLASS, OAuthProviderList } from "./auth-form-primitives";
import { createSignUpSurfaceEntry } from "./sign-up-surface";
import { createVerificationSurfaceEntry } from "./verification-surface";

export function createSignInSurfaceEntry(data = {}, config = {}) {
  return {
    component: SignInSurface,
    title: "Sign In",
    props: { data },
    ...config,
  };
}

function getCurrentPath(pathname, searchParams) {
  const query = searchParams?.toString();
  return `${pathname || "/"}${query ? `?${query}` : ""}`;
}

export function SignInSurface({ close, data = {} }) {
  const auth = useAuth();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { openSurface } = useNavigationActions();
  const toast = useToast();
  const [email, setEmail] = useState(() =>
    String(data.email || data.identifier || "").trim(),
  );
  const [authMethod, setAuthMethod] = useState("methods");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeProvider, setActiveProvider] = useState(null);
  const completionInFlight = useRef(false);

  const postAuthRedirect = useMemo(
    () =>
      sanitizeNextPath(
        data.next || getCurrentPath(pathname, searchParams),
        "/",
      ),
    [data.next, pathname, searchParams],
  );
  const isBusy = isSubmitting || Boolean(activeProvider);

  const completeAuthentication = useCallback(async () => {
    if (completionInFlight.current) return;
    completionInFlight.current = true;

    try {
      const assurance = await getAuthenticatorAssurance(auth.client).catch(
        () => null,
      );
      await auth.refresh();
      const destination =
        assurance?.currentLevel !== "aal2" && assurance?.nextLevel === "aal2"
          ? `/auth/mfa?next=${encodeURIComponent(postAuthRedirect)}`
          : postAuthRedirect;

      close?.({ success: true });
      window.location.replace(destination);
    } catch (error) {
      completionInFlight.current = false;
      throw error;
    }
  }, [auth, close, postAuthRedirect]);

  async function handleProviderSignIn(provider) {
    if (isBusy) return;

    setActiveProvider(provider);
    try {
      if (provider === "passkey") {
        await signInWithPasskey(auth.client);
        await completeAuthentication();
        return;
      }

      await signInWithOAuth(auth.client, {
        provider,
        redirectTo: getAuthCallbackUrl(postAuthRedirect),
      });
    } catch (error) {
      toast.error(error.message || "Authentication failed");
    } finally {
      setActiveProvider(null);
    }
  }

  async function handleEmailSubmit(event) {
    event.preventDefault();
    if (isBusy) return;

    setIsSubmitting(true);
    try {
      await requestEmailAuth(auth.client, {
        createUser: false,
        email,
      });
      void openSurface(
        createVerificationSurfaceEntry({
          email,
          mode: "sign-in",
          next: postAuthRedirect,
        }),
      );
    } catch (error) {
      toast.error(error.message || "Authentication failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleMethodSelect(provider) {
    if (provider === "email") {
      setAuthMethod("email");
      return;
    }

    void handleProviderSignIn(provider);
  }

  if (!auth.isConfigured) {
    return (
      <p className="rounded-xl bg-white/5 px-4 py-3 text-sm text-white/70 ring-1 ring-inset ring-white/10">
        Configure the Supabase variables in .env.local first
      </p>
    );
  }

  return (
    <>
      <NavSurfaceAction>
        <NavSurfaceHeaderButton
          disabled={isBusy}
          onClick={() =>
            void openSurface(
              createSignUpSurfaceEntry({
                email,
                next: postAuthRedirect,
              }),
            )
          }
        >
          Sign Up
        </NavSurfaceHeaderButton>
      </NavSurfaceAction>
      <motion.div
        animate="visible"
        className="flex flex-col gap-2.5"
        initial="hidden"
        transition={NAV_FADE_TRANSITION}
        variants={textCrossfadeVariants}
      >
        {authMethod === "methods" ? (
          <OAuthProviderList
            activeProvider={activeProvider}
            disabled={isBusy}
            includeEmail
            includePasskey
            mode="sign-in"
            onSelect={handleMethodSelect}
          />
        ) : (
          <form className="flex flex-col gap-2.5" onSubmit={handleEmailSubmit}>
            <Input
              aria-label="Email"
              autoComplete="email"
              className={AUTH_INPUT_CLASS}
              id="surface-sign-in-email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Email"
              required
              type="email"
              value={email}
            />
            <div className="flex w-full items-center gap-2.5">
              <Button
                aria-label="Back to sign-in methods"
                className="center size-11 shrink-0 rounded-[20px] bg-white/5 text-white/70 ring-1 ring-inset ring-white/5 hover:bg-white hover:text-black"
                disabled={isBusy}
                onClick={() => {
                  setAuthMethod("methods");
                }}
                type="button"
              >
                <Icon icon="material-symbols:arrow-back-rounded" size={20} />
              </Button>
              <Button
                className="h-11 min-w-0 flex-1 justify-center rounded-[20px] bg-white px-4 text-xs font-bold text-black uppercase hover:bg-white/70 disabled:opacity-50"
                disabled={isBusy}
                type="submit"
              >
                {isSubmitting ? "Sending code" : "Continue with email"}
              </Button>
            </div>
          </form>
        )}
      </motion.div>
    </>
  );
}
