"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { motion } from "motion/react";

import { requestJson } from "@/infrastructure/http/client";
import {
  getAuthCallbackUrl,
  requestEmailAuth,
  sanitizeNextPath,
  signInWithOAuth,
  useAuth,
} from "@/modules/auth";
import {
  NAV_FADE_TRANSITION,
  textCrossfadeVariants,
  useNavigationActions,
  useSurfaceHeader,
} from "@/modules/nav";
import { useToast } from "@/modules/notification";
import { Button, Icon, Input } from "@/ui/primitives";
import { OAuthProviderList } from "./auth-form-primitives";
import { createVerificationSurfaceEntry } from "./verification-surface";

export function createSignUpSurfaceEntry(data = {}, config = {}) {
  return {
    component: SignUpSurface,
    description: "Create your account",
    icon: "solar:user-plus-bold",
    props: { data },
    title: "Sign Up",
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
  const setHeader = useSurfaceHeader();
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

  useEffect(() => {
    const headers = {
      description:
        step === "profile"
          ? "Finish setting up your profile"
          : "Choose how you want to sign up",
      headerAction: null,
      icon: "solar:user-plus-bold",
      title: step === "profile" ? "Your profile" : "Sign Up",
      trailing: null,
    };
    setHeader?.(headers);
  }, [setHeader, step]);

  async function handleProviderSignUp(provider) {
    if (isBusy) return;

    setActiveProvider(provider);
    try {
      await signInWithOAuth(auth.client, {
        provider,
        redirectTo: getAuthCallbackUrl(postAuthRedirect),
      });
    } catch (error) {
      toast.error(error.message || "Sign-up failed");
    } finally {
      setActiveProvider(null);
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
        setStep("profile");
        return;
      }

      if (step === "profile") {
        await requestEmailAuth(auth.client, {
          createUser: true,
          email,
          emailRedirectTo: getAuthCallbackUrl(postAuthRedirect),
        });
        void openSurface(
          createVerificationSurfaceEntry({
            displayName,
            email,
            mode: "sign-up",
            next: postAuthRedirect,
            username,
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
      <p className="rounded-xl bg-white/5 px-4 py-3 text-sm text-white/65 ring-1 ring-inset ring-white/10">
        Configure the Supabase variables in .env.local first.
      </p>
    );
  }

  return (
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
              id="surface-sign-up-email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Email"
              required
              type="email"
              value={email}
            />
          ) : null}

          {step === "profile" ? (
            <>
              <Input
                aria-label="Username"
                autoComplete="username"
                id="surface-sign-up-username"
                onChange={(event) => setUsername(event.target.value)}
                placeholder="Username"
                required
                value={username}
              />
              <Input
                aria-label="Display name"
                autoComplete="name"
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
              className="h-11 min-w-0 flex-1 justify-center rounded-[20px] bg-white/70 px-4 text-xs font-bold text-black uppercase hover:bg-white disabled:opacity-50"
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
  );
}
