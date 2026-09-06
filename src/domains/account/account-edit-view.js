"use client";

import { motion } from "motion/react";
import { Icon } from "@/ui/primitives";
import { NAV_FADE_TRANSITION, textCrossfadeVariants } from "@/modules/nav";
import { createAccountEditSurfaceEntry } from "./account-edit-surface";

const SETTINGS = Object.freeze([
  {
    description: "Avatar and banner image",
    icon: "solar:gallery-bold",
    key: "avatar-banner",
    title: "Gallery",
  },
  {
    description: "Name, username, bio and privacy",
    icon: "solar:user-circle-bold",
    key: "profile",
    title: "Profile info",
  },
  {
    description: "Email used for sign-in",
    icon: "solar:letter-bold",
    key: "email",
    title: "Email sign-in",
  },
  {
    description: "Connected authentication providers",
    icon: "solar:link-bold",
    key: "providers",
    title: "Connected providers",
  },
  {
    description: "Review and revoke devices",
    icon: "solar:devices-bold",
    key: "sessions",
    title: "Active sessions",
  },
  {
    description: "Passwordless device sign-in",
    icon: "solar:key-bold",
    key: "passkeys",
    title: "Passkeys",
  },
  {
    description: "Two-factor authentication",
    icon: "solar:shield-check-bold",
    key: "authenticator",
    title: "Authenticator app",
  },
  {
    danger: true,
    description: "Permanently remove this account",
    icon: "solar:trash-bin-trash-bold",
    key: "delete",
    title: "Delete account",
  },
]);

export function AccountEditView({ state }) {
  function openSetting(setting) {
    const props =
      setting.key === "profile" || setting.key === "avatar-banner"
        ? state.sharedProfileProps
        : state.sharedSecurityProps;
    void state.openSurface(createAccountEditSurfaceEntry(setting.key, props));
  }
  return (
    <motion.div
      animate="visible"
      className="flex flex-col gap-2.5"
      initial="hidden"
      transition={NAV_FADE_TRANSITION}
      variants={textCrossfadeVariants}
    >
      <div className="grid gap-2.5">
        {SETTINGS.map((setting) => (
          <button
            className={
              setting.danger
                ? "flex w-full items-center gap-2.5 rounded-[20px] bg-error/5 p-2.5 text-left ring-1 ring-inset ring-error/5 transition-colors hover:bg-error/10"
                : "flex w-full items-center gap-2.5 rounded-[20px] bg-white/5 p-2.5 text-left ring-1 ring-inset ring-white/5 transition-colors hover:bg-white/10"
            }
            key={setting.key}
            onClick={() => openSetting(setting)}
            type="button"
          >
            <span
              className={
                setting.danger
                  ? "center size-10 shrink-0 rounded-[10px] text-error"
                  : "center size-10 shrink-0 rounded-[10px] text-white/70"
              }
            >
              <Icon icon={setting.icon} size={20} />
            </span>
            <span className="min-w-0 flex-1">
              <span
                className={
                  setting.danger
                    ? "block text-sm font-semibold text-error"
                    : "block text-sm font-semibold text-white/85"
                }
              >
                {setting.title}
              </span>
              <span
                className={
                  setting.danger
                    ? "mt-0.5 block truncate text-xs text-error/55"
                    : "mt-0.5 block truncate text-xs text-white/50"
                }
              >
                {setting.description}
              </span>
            </span>
            <Icon
              className={setting.danger ? "text-error/40" : "text-white/50"}
              icon="solar:alt-arrow-right-linear"
              size={18}
            />
          </button>
        ))}
      </div>
      {state.securityLoading ? (
        <p className="px-2 text-xs text-white/35">
          Refreshing security status...
        </p>
      ) : null}
    </motion.div>
  );
}
