"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { useAuth } from "@/modules/auth";
import {
  NAV_FADE_TRANSITION,
  textCrossfadeVariants,
  useNavContextActions,
  useNavigationActions,
  useSurfaceHeader,
} from "@/modules/nav";
import { Button, Icon } from "@/ui/primitives";
import AdaptiveImage from "@/ui/components/adaptive-image";
import { getInitial, globalEvents } from "@/shared";
import { cn } from "@/shared/utils";
import {
  deleteAllNotifications,
  fetchNotifications,
  fetchUnreadCount,
  markAllAsRead,
  markAsRead,
} from "./client/notifications";

const NOTIFICATIONS_DESCRIPTION = "Follow, activity and account updates";
const NOTIFICATIONS_ICON = "solar:bell-bold";
const NOTIFICATIONS_TITLE = "Notifications";
const NOTIFICATIONS_ACTION_KEY = "social.notifications";
const NOTIFICATIONS_ACTION_ORDER = -10;

function formatRelativeTime(dateValue) {
  if (!dateValue) return "";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "";

  const diffInSeconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffInSeconds < 60) return "Just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
  }).format(date);
}

export function createNotificationsSurfaceEntry() {
  return {
    component: NotificationsSurface,
    description: NOTIFICATIONS_DESCRIPTION,
    icon: NOTIFICATIONS_ICON,
    title: NOTIFICATIONS_TITLE,
    width: 400,
  };
}

export function NotificationsNavSync() {
  const auth = useAuth();
  const { openSurface } = useNavigationActions();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!auth.isAuthenticated) return;
    let active = true;
    void fetchUnreadCount()
      .then((count) => {
        if (active) setUnreadCount(count);
      })
      .catch(() => null);

    return () => {
      active = false;
    };
  }, [auth.isAuthenticated]);

  useEffect(() => {
    return globalEvents.subscribe("social:notification-change", () => {
      if (auth.isAuthenticated) {
        void fetchUnreadCount().then(setUnreadCount).catch(() => null);
      }
    });
  }, [auth.isAuthenticated]);

  const openNotifications = useCallback(() => {
    void openSurface(createNotificationsSurfaceEntry());
  }, [openSurface]);

  const actions = useMemo(
    () => [
      {
        badge: unreadCount > 0 ? unreadCount : null,
        icon: NOTIFICATIONS_ICON,
        key: NOTIFICATIONS_ACTION_KEY,
        onClick: openNotifications,
        order: NOTIFICATIONS_ACTION_ORDER,
        tooltip: NOTIFICATIONS_TITLE,
        visible: auth.isReady && auth.isAuthenticated,
      },
    ],
    [auth.isAuthenticated, auth.isReady, openNotifications, unreadCount],
  );
  useNavContextActions(actions);

  return null;
}

export function NotificationsSurface({ close }) {
  const setHeader = useSurfaceHeader();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void fetchNotifications({ limitCount: 50 })
      .then((data) => {
        if (active) {
          setNotifications(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const handleMarkAllRead = useCallback(async () => {
    await markAllAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    globalEvents.emit("social:notification-change");
  }, []);

  const handleClearAll = useCallback(async () => {
    await deleteAllNotifications();
    setNotifications([]);
    globalEvents.emit("social:notification-change");
  }, []);

  const handleItemClick = useCallback(
    async (item) => {
      if (!item.read) {
        void markAsRead(item.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, read: true } : n)),
        );
        globalEvents.emit("social:notification-change");
      }
      close?.();
    },
    [close],
  );

  useEffect(() => {
    setHeader?.({
      description: NOTIFICATIONS_DESCRIPTION,
      headerAction: null,
      icon: NOTIFICATIONS_ICON,
      title: NOTIFICATIONS_TITLE,
      trailing:
        notifications.length > 0 ? (
          <div className="flex items-center gap-1">
            <Button
              aria-label="Mark all as read"
              className="size-7 center rounded-lg text-white/50 hover:bg-white/10 hover:text-white"
              onClick={() => void handleMarkAllRead()}
              type="button"
            >
              <Icon icon="solar:check-read-bold" size={14} />
            </Button>
            <Button
              aria-label="Clear all notifications"
              className="size-7 center rounded-lg text-white/50 hover:bg-white/10 hover:text-error"
              onClick={() => void handleClearAll()}
              type="button"
            >
              <Icon icon="solar:trash-bin-trash-bold" size={14} />
            </Button>
          </div>
        ) : null,
    });
  }, [handleClearAll, handleMarkAllRead, notifications.length, setHeader]);

  return (
    <motion.div
      animate="visible"
      className="flex flex-col gap-2.5"
      initial="hidden"
      transition={NAV_FADE_TRANSITION}
      variants={textCrossfadeVariants}
    >
      {loading ? (
        <div className="center min-h-28">
          <Icon
            className="text-white/50"
            icon="svg-spinners:90-ring-with-bg"
            size={24}
          />
        </div>
      ) : notifications.length === 0 ? (
        <div className="center min-h-28 rounded-[20px] bg-white/5 p-6 text-center ring-1 ring-inset ring-white/5">
          <p className="text-sm text-white/70">You&apos;re all caught up</p>
          <p className="mt-1 text-xs text-white/50">
            Follow and account notifications will appear here
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5 max-h-[400px] overflow-y-auto pr-0.5">
          {notifications.map((n) => {
            const actor = n.metadata?.actor || {};
            const displayName =
              actor.displayName || actor.username || "Someone";
            const targetHref = n.href || (actor.username ? `/account/${actor.username}` : "#");

            return (
              <Link
                className={cn(
                  "group flex items-center gap-3 rounded-2xl p-3 transition-colors",
                  n.read
                    ? "ring-1 ring-inset ring-white/5 bg-white/5 text-white/70 hover:text-white hover:bg-white/10"
                    : "ring-1 ring-inset ring-white/10 bg-white/10 text-white hover:bg-white/15",
                )}
                href={targetHref}
                key={n.id}
                onClick={() => void handleItemClick(n)}
              >
                <div className="center size-10 shrink-0 overflow-hidden rounded-full bg-black/20 text-sm font-semibold text-white ring-1 ring-white/10">
                  {actor.avatarUrl ? (
                    <AdaptiveImage
                      alt=""
                      className="size-full object-cover"
                      src={actor.avatarUrl}
                    />
                  ) : (
                    getInitial(displayName)
                  )}
                </div>

                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-xs font-semibold text-white">
                    {n.title || `${displayName} sent an update`}
                  </span>
                  <span className="mt-0.5 text-xs text-white/50">
                    {formatRelativeTime(n.created_at)}
                  </span>
                </div>

                {!n.read ? (
                  <div className="size-2 shrink-0 rounded-full bg-info" />
                ) : null}
              </Link>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
