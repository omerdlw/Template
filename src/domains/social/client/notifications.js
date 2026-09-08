"use client";

import { requestJson } from "@/infrastructure/http/client";

export async function fetchNotifications({ limitCount = 50 } = {}) {
  const res = await requestJson(
    `/api/notifications?limitCount=${encodeURIComponent(limitCount)}`,
    { notifyOnUnauthorized: false },
  ).catch(() => ({ data: [] }));

  return Array.isArray(res?.data) ? res.data : [];
}

export async function fetchUnreadCount() {
  const res = await requestJson("/api/notifications?resource=unread-count", {
    notifyOnUnauthorized: false,
  }).catch(() => ({ data: 0 }));

  return Number(res?.data) || 0;
}

export async function markAsRead(notificationId) {
  if (!notificationId) return;
  await requestJson("/api/notifications", {
    body: JSON.stringify({ action: "mark-read", notificationId }),
    method: "PATCH",
  });
}

export async function markAllAsRead() {
  await requestJson("/api/notifications", {
    body: JSON.stringify({ action: "mark-all-read" }),
    method: "PATCH",
  });
}

export async function deleteNotification(notificationId) {
  if (!notificationId) return;
  await requestJson(
    `/api/notifications?action=delete&notificationId=${encodeURIComponent(notificationId)}`,
    { method: "DELETE" },
  );
}

export async function deleteAllNotifications() {
  await requestJson("/api/notifications?action=delete-all", {
    method: "DELETE",
  });
}
