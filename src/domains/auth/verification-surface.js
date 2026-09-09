"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";

import { requestJson } from "@/infrastructure/http/client";
import {
  getAuthCallbackUrl,
  getAuthenticatorAssurance,
  requestEmailAuth,
  sanitizeNextPath,
  useAuth,
  verifyEmailOtp,
} from "@/modules/auth";
import {
  NAV_FADE_TRANSITION,
  NavSurfaceAction,
  NavSurfaceHeaderButton,
  textCrossfadeVariants,
} from "@/modules/nav";
import { useToast } from "@/modules/notification";
import { Input } from "@/ui/primitives";
import { cn } from "@/shared/utils";

const OTP_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 60;

export function createVerificationSurfaceEntry(data = {}, config = {}) {
  return {
    component: VerificationSurface,
    props: { data },
    title: "Verify email",
    ...config,
  };
}

function normalizeOtpValue(value) {
  return String(value || "")
    .replace(/\D/g, "")
    .slice(0, OTP_LENGTH);
}

function OtpBoxes({
  code,
  disabled,
  hasError,
  inputRef,
  isFocused,
  onCodeChange,
  setIsFocused,
}) {
  const activeIndex = Math.min(code.length, OTP_LENGTH - 1);

  return (
    <div className="relative" onClick={() => inputRef.current?.focus?.()}>
      <Input
        ref={inputRef}
        aria-label="Verification code"
        autoComplete="one-time-code"
        className="absolute inset-0 z-10 size-full cursor-text rounded-none bg-transparent px-0 py-0 text-transparent opacity-0 outline-none ring-0 focus:bg-transparent focus:ring-0"
        disabled={disabled}
        inputMode="numeric"
        maxLength={OTP_LENGTH}
        onBlur={() => setIsFocused(false)}
        onChange={(event) => onCodeChange(event.target.value)}
        onFocus={() => setIsFocused(true)}
        onPaste={(event) => {
          event.preventDefault();
          onCodeChange(event.clipboardData?.getData("text"));
        }}
        type="text"
        value={code}
      />
      <div className="grid grid-cols-6 gap-2.5 overflow-visible">
        {Array.from({ length: OTP_LENGTH }).map((_, index) => {
          const digit = code[index] || "";
          const isActive = isFocused && activeIndex === index;

          return (
            <div
              className={cn(
                "center h-14 rounded-[20px] text-lg font-semibold text-white/70 ring-1 ring-inset ring-white/5 transition-all duration-300 ease-in-out hover:text-white",
                hasError &&
                  digit &&
                  "bg-error/15 text-error ring-error/30 hover:bg-error/20 hover:ring-error/20",
                isActive &&
                  !digit &&
                  "bg-white/5 text-white ring-white/10 hover:bg-white/10",
                digit &&
                  !hasError &&
                  "bg-success/15 text-success ring-success/30 hover:bg-success/20 hover:ring-success/20",
              )}
              key={`otp-box-${index}`}
            >
              {digit || <span className="invisible">0</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function getAccountPath(username, fallback = "/account") {
  return username
    ? `/account/${encodeURIComponent(username)}`
    : sanitizeNextPath(fallback, "/account");
}

export function VerificationSurface({ close, data = {} }) {
  const auth = useAuth();
  const toast = useToast();
  const inputRef = useRef(null);
  const submitInFlight = useRef(false);
  const lastSubmittedCode = useRef("");
  const resetErrorTimeout = useRef(null);
  const email = String(data.email || data.identifier || "").trim();
  const mode = data.mode === "sign-up" ? "sign-up" : "sign-in";
  const postAuthRedirect = sanitizeNextPath(data.next, "/account");
  const [code, setCode] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [hasCodeError, setHasCodeError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendAvailableAt, setResendAvailableAt] = useState(
    () => Date.now() + RESEND_COOLDOWN_SECONDS * 1000,
  );
  const [now, setNow] = useState(() => Date.now());

  const resendRemainingSeconds = Math.max(
    0,
    Math.ceil((resendAvailableAt - now) / 1000),
  );
  const canResend = resendRemainingSeconds === 0;
  const isBusy = isSubmitting || isResending;

  const sendCode = useCallback(async () => {
    if (isBusy || !canResend) return;

    setIsResending(true);
    try {
      await requestEmailAuth(auth.client, {
        createUser: mode === "sign-up",
        email,
        emailRedirectTo: getAuthCallbackUrl(postAuthRedirect),
      });
      setCode("");
      setHasCodeError(false);
      setResendAvailableAt(Date.now() + RESEND_COOLDOWN_SECONDS * 1000);
      setNow(Date.now());
    } catch (error) {
      toast.error(error.message || "Verification code could not be sent");
    } finally {
      setIsResending(false);
    }
  }, [auth.client, canResend, email, isBusy, mode, postAuthRedirect, toast]);

  const completeVerification = useCallback(
    async (value) => {
      const normalizedCode = normalizeOtpValue(value);
      if (
        normalizedCode.length !== OTP_LENGTH ||
        isBusy ||
        submitInFlight.current ||
        lastSubmittedCode.current === normalizedCode
      ) {
        return;
      }

      lastSubmittedCode.current = normalizedCode;
      submitInFlight.current = true;
      setIsSubmitting(true);
      let emailVerified = false;
      try {
        await verifyEmailOtp(auth.client, {
          email,
          token: normalizedCode,
          type: mode === "sign-up" ? "signup" : "email",
        });
        emailVerified = true;

        if (mode === "sign-up") {
          const result = await requestJson("/api/auth/sign-up/complete", {
            body: JSON.stringify({
              displayName: data.displayName,
              username: data.username,
            }),
            method: "POST",
            notifyOnError: false,
            notifyOnUnauthorized: false,
          });
          const username =
            result.account?.username || result.profile?.username;
          if (!username)
            throw new Error("Account could not be completed");

          await auth.refresh();
          close?.({ success: true });
          window.location.replace(
            getAccountPath(
              username || data.username,
              postAuthRedirect,
            ),
          );
          return;
        }

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
        if (emailVerified && mode === "sign-up") {
          toast.error(
            error.message ||
              "Your email is verified, but the account details could not be saved",
          );
          return;
        }
        lastSubmittedCode.current = "";
        setHasCodeError(true);
        toast.error(error.message || "Email verification failed");

        if (resetErrorTimeout.current) {
          window.clearTimeout(resetErrorTimeout.current);
        }
        resetErrorTimeout.current = window.setTimeout(() => {
          setCode("");
          setHasCodeError(false);
          setIsFocused(false);
          inputRef.current?.focus?.();
          resetErrorTimeout.current = null;
        }, 700);
      } finally {
        submitInFlight.current = false;
        setIsSubmitting(false);
      }
    },
    [
      auth,
      close,
      data.displayName,
      data.username,
      email,
      isBusy,
      mode,
      postAuthRedirect,
      toast,
    ],
  );

  useEffect(() => {
    if (!resendAvailableAt) return undefined;
    const intervalId = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(intervalId);
  }, [resendAvailableAt]);

  const handleCodeChange = useCallback(
    (value) => {
      const normalizedValue = normalizeOtpValue(value);
      setCode(normalizedValue);
      if (normalizedValue.length === OTP_LENGTH) {
        void completeVerification(normalizedValue);
      }
    },
    [completeVerification],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      inputRef.current?.focus?.();
    }, 150);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(
    () => () => {
      if (resetErrorTimeout.current) {
        window.clearTimeout(resetErrorTimeout.current);
      }
    },
    [],
  );

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
          disabled={isBusy || !canResend}
          onClick={() => void sendCode()}
        >
          {isResending
            ? "Sending..."
            : canResend
              ? "Resend"
              : `${resendRemainingSeconds}s`}
        </NavSurfaceHeaderButton>
      </NavSurfaceAction>
      <motion.form
        aria-busy={isBusy}
        className="flex flex-col gap-2.5"
        initial="hidden"
        onSubmit={(event) => {
          event.preventDefault();
          void completeVerification(code);
        }}
        transition={NAV_FADE_TRANSITION}
        animate="visible"
        variants={textCrossfadeVariants}
      >
        <OtpBoxes
          code={code}
          disabled={isBusy}
          hasError={hasCodeError}
          inputRef={inputRef}
          isFocused={isFocused}
          onCodeChange={handleCodeChange}
          setIsFocused={setIsFocused}
        />
      </motion.form>
    </>
  );
}
