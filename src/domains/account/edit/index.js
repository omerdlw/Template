"use client";

import { useEffect } from "react";
import { motion } from "motion/react";
import {
  NAV_FADE_TRANSITION,
  textCrossfadeVariants,
  useSurfaceHeader,
} from "@/modules/nav";
import { AccountEditMenu } from "./menu";
import { AccountEditSettings } from "./security-form";
import { AccountSettingsForm } from "./account-form";
import { useAccountEditState } from "./state";

const SETTING_META = Object.freeze({
  account: {
    description: "Name, username, bio and privacy",
    icon: "solar:user-circle-bold",
    title: "Account info",
  },
  "avatar-banner": {
    description: "Avatar and banner image",
    icon: "solar:gallery-bold",
    title: "Gallery",
  },
  authenticator: {
    description: "Two-factor authentication",
    icon: "solar:shield-check-bold",
    title: "Authenticator app",
  },
  delete: {
    description: "Permanently remove this account",
    icon: "solar:trash-bin-trash-bold",
    title: "Delete account",
  },
  email: {
    description: "Email used for sign-in",
    icon: "solar:letter-bold",
    title: "Email sign-in",
  },
  overview: {
    description: "Account, security and controls",
    icon: "solar:user-circle-bold",
    title: "Edit account",
  },
  passkeys: {
    description: "Passwordless device sign-in",
    icon: "solar:key-bold",
    title: "Passkeys",
  },
  profile: {
    description: "Name, username, bio and privacy",
    icon: "solar:user-circle-bold",
    title: "Account info",
  },
  providers: {
    description: "Connected authentication providers",
    icon: "solar:link-bold",
    title: "Connected providers",
  },
  sessions: {
    description: "Review and revoke devices",
    icon: "solar:devices-bold",
    title: "Active sessions",
  },
});

export function createAccountEditSurfaceEntry(
  settingKey = "overview",
  props = {},
  config = {},
) {
  const meta = SETTING_META[settingKey] || SETTING_META.overview;
  const isWide =
    settingKey === "account" ||
    settingKey === "profile" ||
    settingKey === "avatar-banner" ||
    settingKey === "overview";
  return {
    component: AccountEditSurface,
    description: meta.description,
    expandHorizontal: isWide,
    icon: meta.icon,
    props: { settingKey, ...props },
    skipActionDismiss: true,
    title: meta.title,
    width: isWide ? 640 : undefined,
    ...config,
  };
}

function SurfaceHeader({ settingKey }) {
  const setHeader = useSurfaceHeader();
  const meta = SETTING_META[settingKey] || SETTING_META.overview;
  useEffect(() => {
    setHeader?.({ ...meta, headerAction: null, trailing: null });
  }, [meta, setHeader]);
  return null;
}

function SurfaceFrame({ children }) {
  return (
    <motion.div
      animate="visible"
      className="flex flex-col gap-2.5"
      initial="hidden"
      transition={NAV_FADE_TRANSITION}
      variants={textCrossfadeVariants}
    >
      {children}
    </motion.div>
  );
}

export function AccountEditSurface({
  close,
  settingKey = "overview",
  ...props
}) {
  const state = useAccountEditState();

  if (settingKey === "overview") {
    return (
      <>
        <SurfaceHeader settingKey={settingKey} />
        <AccountEditMenu state={state} />
      </>
    );
  }

  if (
    settingKey === "account" ||
    settingKey === "profile" ||
    settingKey === "avatar-banner"
  ) {
    const accountFormProps =
      props.form ? props : state.sharedAccountProps || state.sharedProfileProps;
    async function handleSubmit(event) {
      await accountFormProps.handleAccountSubmit(event);
      close?.({ success: true });
    }
    return (
      <>
        <SurfaceHeader settingKey={settingKey} />
        <SurfaceFrame>
          <AccountSettingsForm
            {...accountFormProps}
            handleAccountSubmit={handleSubmit}
            section={settingKey}
          />
        </SurfaceFrame>
      </>
    );
  }

  return (
    <>
      <SurfaceHeader settingKey={settingKey} />
      <SurfaceFrame>
        <AccountEditSettings
          {...(props.account ? props : state.sharedSecurityProps)}
          close={close}
          section={settingKey}
        />
      </SurfaceFrame>
    </>
  );
}
