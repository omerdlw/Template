"use client";

import { useRef, useState } from "react";
import { motion } from "motion/react";
import { requestJson } from "@/infrastructure/http/client";
import { sanitizeNextPath, useAuth } from "@/modules/auth";
import {
  NAV_FADE_TRANSITION,
  textCrossfadeVariants,
} from "@/modules/nav";
import { useToast } from "@/modules/notification";
import { Button, Input } from "@/ui/primitives";
import { AUTH_INPUT_CLASS } from "./auth-form-primitives";

export function createAccountSetupSurfaceEntry(data = {}, config = {}) {
  return {
    component: AccountSetupSurface,
    title: "Set up account",
    props: { data },
    ...config,
  };
}

function getAccountPath(username, fallback = "/account") {
  return username
    ? `/account/${encodeURIComponent(username)}`
    : sanitizeNextPath(fallback, "/account");
}

export function AccountSetupSurface({ close, data = {} }) {
  const auth = useAuth();
  const toast = useToast();
  const submitInFlight = useRef(false);
  const postAuthRedirect = sanitizeNextPath(data.next, "/account");

  const [username, setUsername] = useState(
    () => String(data.username || "").trim(),
  );
  const [displayName, setDisplayName] = useState(
    () => String(data.displayName || auth.user?.user_metadata?.full_name || "").trim(),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (isSubmitting || submitInFlight.current) return;

    const trimmedUsername = username.trim();
    const trimmedDisplayName = displayName.trim();

    if (!trimmedUsername) {
      toast.error("Please enter a username");
      return;
    }

    submitInFlight.current = true;
    setIsSubmitting(true);
    try {
      const result = await requestJson("/api/auth/sign-up/complete", {
        body: JSON.stringify({
          displayName: trimmedDisplayName || trimmedUsername,
          username: trimmedUsername,
        }),
        method: "POST",
        notifyOnError: false,
        notifyOnUnauthorized: false,
      });

      const resolvedUsername =
        result.account?.username || result.profile?.username || trimmedUsername;

      await auth.refresh();
      close?.({ success: true });
      window.location.replace(
        getAccountPath(resolvedUsername, postAuthRedirect),
      );
    } catch (error) {
      toast.error(
        error.message || "Could not complete account setup — try a different username",
      );
    } finally {
      submitInFlight.current = false;
      setIsSubmitting(false);
    }
  }

  return (
    <motion.form
      animate="visible"
      className="flex flex-col gap-2.5"
      initial="hidden"
      transition={NAV_FADE_TRANSITION}
      variants={textCrossfadeVariants}
      onSubmit={handleSubmit}
    >
      <Input
        aria-label="Username"
        autoComplete="username"
        autoFocus
        className={AUTH_INPUT_CLASS}
        disabled={isSubmitting}
        id="account-setup-username"
        onChange={(event) => setUsername(event.target.value)}
        placeholder="Username"
        required
        type="text"
        value={username}
      />
      <Input
        aria-label="Display name"
        autoComplete="name"
        className={AUTH_INPUT_CLASS}
        disabled={isSubmitting}
        id="account-setup-display-name"
        onChange={(event) => setDisplayName(event.target.value)}
        placeholder="Display name (optional)"
        type="text"
        value={displayName}
      />
      <Button
        className="h-11 w-full rounded-[20px] bg-white font-medium text-black hover:bg-white/70 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={isSubmitting || !username.trim()}
        type="submit"
      >
        {isSubmitting ? "Setting up…" : "Continue"}
      </Button>
    </motion.form>
  );
}
