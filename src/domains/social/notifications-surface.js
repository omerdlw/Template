"use client";

import { useEffect } from "react";
import { motion } from "motion/react";
import {
  NAV_FADE_TRANSITION,
  textCrossfadeVariants,
  useSurfaceHeader,
} from "@/modules/nav";

export function NotificationsSurface() {
  const setHeader = useSurfaceHeader();
  useEffect(() => {
    setHeader?.({
      description: "Follow, activity and account updates",
      headerAction: null,
      icon: "solar:bell-bold",
      title: "Notifications",
      trailing: null,
    });
  }, [setHeader]);

  return (
    <motion.div
      animate="visible"
      className="flex flex-col gap-2.5"
      initial="hidden"
      transition={NAV_FADE_TRANSITION}
      variants={textCrossfadeVariants}
    >
      <div className="center min-h-28 rounded-[20px] bg-white/5 p-6 text-center ring-1 ring-inset ring-white/5">
        <p className="text-sm text-white/60">You&apos;re all caught up.</p>
        <p className="mt-1 text-xs text-white/35">
          Social activity notifications will appear here.
        </p>
      </div>
    </motion.div>
  );
}
