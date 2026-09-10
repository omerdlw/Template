"use client";

import { motion } from "motion/react";
import { OAUTH_PROVIDERS } from "@/modules/auth";
import { navListItemVariants } from "@/modules/nav";
import { Button, Icon } from "@/ui/primitives";

const PROVIDER_CONFIG = Object.freeze({
  email: Object.freeze({ icon: "solar:letter-bold", label: "Email" }),
  github: Object.freeze({ icon: "mdi:github", label: "GitHub" }),
  google: Object.freeze({
    icon: "flat-color-icons:google",
    label: "Google",
  }),
  x: Object.freeze({ icon: "simple-icons:x", label: "Twitter" }),
  passkey: Object.freeze({ icon: "solar:key-bold", label: "Passkey" }),
});

export const AUTH_INPUT_CLASS =
  "h-10 w-full rounded-[20px] bg-white/5 px-4 text-sm text-white ring-1 ring-inset ring-white/5 placeholder:text-white/50 transition-all hover:bg-white/10 hover:ring-white/10 focus:bg-white/10 focus:ring-white/10";

const PROVIDER_BUTTON_CLASS =
  "group flex h-10 w-full text-sm cursor-pointer items-center justify-between rounded-[20px] bg-white/5 px-4 text-white/70 ring-1 ring-inset ring-white/5 hover:bg-white hover:text-black hover:ring-transparent disabled:cursor-not-allowed disabled:opacity-50";

export function OAuthProviderButton({
  disabled = false,
  isBusy = false,
  mode = "sign-in",
  onClick,
  provider,
}) {
  const config = PROVIDER_CONFIG[provider] || PROVIDER_CONFIG.email;
  const actionLabel = mode === "sign-up" ? "Sign up with" : "Continue with";

  return (
    <Button
      aria-label={`${actionLabel} ${config.label}`}
      className={PROVIDER_BUTTON_CLASS}
      disabled={disabled || isBusy}
      onClick={onClick}
      type="button"
    >
      <span className="flex min-w-0 items-center gap-3">
        <span className="center size-7 shrink-0 text-white/70 group-hover:text-black">
          <Icon icon={config.icon} size={18} />
        </span>
        <span className="text-sm font-medium">
          {actionLabel} {config.label}
        </span>
      </span>
    </Button>
  );
}

export function OAuthProviderList({
  activeProvider = null,
  disabled = false,
  includeEmail = false,
  includePasskey = false,
  mode = "sign-in",
  onSelect,
}) {
  const providers = [
    ...(includePasskey ? ["passkey"] : []),
    ...(includeEmail ? ["email"] : []),
    ...OAUTH_PROVIDERS,
  ];

  return (
    <div className="flex w-full flex-col gap-2.5">
      {providers.map((provider, index) => (
        <motion.div
          animate="visible"
          className="w-full"
          custom={index}
          exit="exit"
          initial="hidden"
          key={provider}
          variants={navListItemVariants}
        >
          <OAuthProviderButton
            disabled={disabled || Boolean(activeProvider)}
            isBusy={activeProvider === provider}
            mode={mode}
            onClick={() => onSelect?.(provider)}
            provider={provider}
          />
        </motion.div>
      ))}
    </div>
  );
}
