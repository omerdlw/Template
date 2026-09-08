"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/modules/auth";
import { useModal } from "@/modules/modal";
import { useNavContextActions } from "@/modules/nav";
import { globalEvents } from "@/shared";
import { fetchUnreadCount } from "./client/notifications";

const NOTIFICATIONS_ICON = "solar:bell-bold";
const NOTIFICATIONS_TITLE = "Notifications";
const NOTIFICATIONS_ACTION_KEY = "social.notifications";
const NOTIFICATIONS_ACTION_ORDER = -10;

export function NotificationsNavSync() {
  const auth = useAuth();
  const { openModal, closeModal, isOpen, modalType } = useModal();
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

  const handleOpenNotifications = useCallback(
    (event) => {
      event?.preventDefault?.();
      event?.stopPropagation?.();
      if (isOpen && modalType === "NOTIFICATIONS_MODAL") {
        closeModal();
        return;
      }
      openModal("NOTIFICATIONS_MODAL", "left", {
        data: { userId: auth.user?.id ?? null },
        title: "Notifications",
      });
    },
    [auth.user?.id, closeModal, isOpen, modalType, openModal],
  );

  const unreadBadge =
    unreadCount > 0 ? (unreadCount > 99 ? "99+" : `${unreadCount}`) : null;

  const actions = useMemo(
    () => [
      {
        badge: unreadBadge,
        icon: NOTIFICATIONS_ICON,
        key: NOTIFICATIONS_ACTION_KEY,
        onClick: handleOpenNotifications,
        order: NOTIFICATIONS_ACTION_ORDER,
        tooltip: NOTIFICATIONS_TITLE,
        visible: auth.isReady && auth.isAuthenticated,
      },
    ],
    [auth.isAuthenticated, auth.isReady, handleOpenNotifications, unreadBadge],
  );

  useNavContextActions(actions);

  return null;
}
