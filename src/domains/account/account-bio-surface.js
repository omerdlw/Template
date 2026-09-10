"use client";

import { motion } from "motion/react";
import {
  NAV_FADE_TRANSITION,
  textCrossfadeVariants,
} from "@/modules/nav";

export function createAccountBioSurfaceEntry(data = {}, config = {}) {
  const account = data?.account || data?.profile || null;
  const username = data?.username || account?.username || "";
  const displayName = String(
    data?.displayName ||
      account?.displayName ||
      account?.display_name ||
      username ||
      "Account",
  ).trim();
  const bio = data?.bio ?? account?.bio ?? "";

  return {
    component: AccountBioSurface,
    props: { account, bio, displayName, username, ...data },
    title: `${displayName} Bio`,
    ...config,
  };
}

export function AccountBioSurface({
  account,
  bio: bioProp,
  displayName: displayNameProp,
  username: usernameProp,
  data,
}) {
  const targetAccount = account || data?.account || data?.profile;
  const bio = bioProp ?? data?.bio ?? targetAccount?.bio ?? "";

  return (
    <motion.div
      animate="visible"
      className="flex flex-col gap-2.5"
      initial="hidden"
      transition={NAV_FADE_TRANSITION}
      variants={textCrossfadeVariants}
    >
      <div
        className="h-auto w-full overflow-y-auto rounded-[20px] bg-white/5 py-3 px-3.5 ring-1 ring-inset ring-white/5 scrollbar-none overscroll-contain"
        data-lenis-prevent
        data-lenis-prevent-wheel
      >
        <p className="select-text whitespace-pre-wrap break-words text-sm leading-relaxed text-justify text-white/70 sm:text-base">
          {bio || "No bio provided"}
        </p>
      </div>
    </motion.div>
  );
}

export default AccountBioSurface;
