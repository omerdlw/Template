"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { motion } from "motion/react";

import { requestJson } from "@/infrastructure/http/client";
import { normalizeAccountPatch } from "@/modules/account";
import {
  getAuthCallbackUrl,
  requestEmailAuth,
  sanitizeNextPath,
  signInWithOAuth,
  useAuth,
} from "@/modules/auth";
import {
  NAV_FADE_TRANSITION,
  NavSurfaceAction,
  NavSurfaceHeaderButton,
  textCrossfadeVariants,
  useNavigationActions,
} from "@/modules/nav";
import { EVENT_TYPES, globalEvents } from "@/shared";
import { useToast } from "@/modules/notification";
import { Button, Icon, Input } from "@/ui/primitives";
import { AUTH_INPUT_CLASS, OAuthProviderList } from "./auth-form-primitives";
import { createSignInSurfaceEntry } from "./sign-in-surface";
import { createVerificationSurfaceEntry } from "./verification-surface";

export function createSignUpSurfaceEntry(data = {}, config = {}) {
  return {
    component: SignUpSurface,
    title: "Sign Up",
    props: { data },
    ...config,
  };
}

function getCurrentPath(pathname, searchParams) {
  const query = searchParams?.toString();
  return `${pathname || "/"}${query ? `?${query}` : ""}`;
}

export function SignUpSurface({ close, data = {} }) {
  const auth = useAuth();
  const toast = useToast();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { openSurface } = useNavigationActions();
  const [step, setStep] = useState("methods");
  const [email, setEmail] = useState(() =>
    String(data.email || data.identifier || "").trim(),
  );
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeProvider, setActiveProvider] = useState(null);
  const submitInFlight = useRef(false);

  const postAuthRedirect = useMemo(
    () =>
      sanitizeNextPath(
        data.next || getCurrentPath(pathname, searchParams),
        "/account",
      ),
    [data.next, pathname, searchParams],
  );
  const isBusy = isSubmitting || Boolean(activeProvider);

  async function handleProviderSignUp(provider) {
    if (isBusy) return;

    setActiveProvider(provider);
    globalEvents.emit(EVENT_TYPES.AUTH_FEEDBACK, {
      description: `Redirecting to ${provider.charAt(0).toUpperCase() + provider.slice(1)} sign-up`,
      flow: "login",
      phase: "start",
      priority: 110,
      statusType: "LOGIN",
      themeType: "LOGIN",
      title: "Creating Account",
    });

    let redirecting = false;
    try {
      await signInWithOAuth(auth.client, {
        provider,
        redirectTo: getAuthCallbackUrl(postAuthRedirect),
      });
      redirecting = true;
      window.setTimeout(() => {
        globalEvents.emit(EVENT_TYPES.AUTH_FEEDBACK, {
          flow: "login",
          phase: "clear",
          statusType: "LOGIN",
        });
      }, 12000);
    } catch (error) {
      globalEvents.emit(EVENT_TYPES.AUTH_FEEDBACK, {
        flow: "login",
        phase: "failure",
        statusType: "LOGIN",
      });
      toast.error(error.message || "Sign-up failed");
    } finally {
      if (!redirecting) setActiveProvider(null);
    }
  }

  async function handleEmailSubmit(event) {
    event.preventDefault();
    if (isBusy || submitInFlight.current) return;

    submitInFlight.current = true;
    setIsSubmitting(true);
    try {
      if (step === "email") {
        await requestJson("/api/auth/sign-up", {
          body: JSON.stringify({ email }),
          method: "POST",
          notifyOnError: false,
          notifyOnUnauthorized: false,
        });
        setStep("account");
        return;
      }

      if (step === "account" || step === "profile") {
        const accountData = normalizeAccountPatch({ username, displayName });
        await requestEmailAuth(auth.client, {
          createUser: true,
          email,
        });
        void openSurface(
          createVerificationSurfaceEntry({
            displayName: accountData.displayName,
            email,
            mode: "sign-up",
            next: postAuthRedirect,
            username: accountData.username,
          }),
        );
        return;
      }
    } catch (error) {
      toast.error(error.message || "Sign-up failed");
    } finally {
      submitInFlight.current = false;
      setIsSubmitting(false);
    }
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
      {step === "methods" && (
        <NavSurfaceAction>
          <NavSurfaceHeaderButton
            disabled={isBusy}
            onClick={() =>
              void openSurface(
                createSignInSurfaceEntry({
                  email,
                  next: postAuthRedirect,
                }),
              )
            }
          >
            Sign In
          </NavSurfaceHeaderButton>
        </NavSurfaceAction>
      )}
      <motion.div
        animate="visible"
        className="flex flex-col gap-2.5"
        initial="hidden"
        transition={NAV_FADE_TRANSITION}
        variants={textCrossfadeVariants}
      >
        {step === "methods" ? (
          <OAuthProviderList
            activeProvider={activeProvider}
            disabled={isBusy}
            includeEmail
            mode="sign-up"
            onSelect={(provider) => {
              if (provider === "email") {
                setStep("email");
                return;
              }
              void handleProviderSignUp(provider);
            }}
          />
        ) : (
          <form className="flex flex-col gap-2.5" onSubmit={handleEmailSubmit}>
            {step === "email" ? (
              <Input
                aria-label="Email"
                autoComplete="email"
                className={AUTH_INPUT_CLASS}
                id="surface-sign-up-email"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Email"
                required
                type="email"
                value={email}
              />
            ) : null}

            {step === "account" || step === "profile" ? (
              <>
                <Input
                  aria-label="Username"
                  autoComplete="username"
                  className={AUTH_INPUT_CLASS}
                  id="surface-sign-up-username"
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="Username"
                  required
                  value={username}
                />
                <Input
                  aria-label="Display name"
                  autoComplete="name"
                  className={AUTH_INPUT_CLASS}
                  id="surface-sign-up-display-name"
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="Display name"
                  required
                  value={displayName}
                />
              </>
            ) : null}

            <div className="flex w-full items-center gap-2.5">
              <Button
                aria-label="Back"
                className="center size-11 shrink-0 rounded-[20px] bg-white/5 text-white/70 ring-1 ring-inset ring-white/5 hover:bg-white hover:text-black"
                disabled={isBusy}
                onClick={() => {
                  const previousStep = {
                    account: "email",
                    email: "methods",
                    profile: "email",
                  }[step];

                  if (previousStep) {
                    setStep(previousStep);
                  }
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
                {isSubmitting
                  ? step === "email"
                    ? "Checking email"
                    : "Sending code"
                  : step === "email"
                    ? "Continue with email"
                    : "Send verification code"}
              </Button>
            </div>
          </form>
        )}
      </motion.div>
    </>
  );
}
