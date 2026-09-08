"use client";

import { requestJson } from "@/infrastructure/http/client";
import { FOLLOW_STATUSES } from "../constants";

export { FOLLOW_STATUSES };

export async function getFollowState(followingId) {
  const response = await requestJson(
    `/api/social/follows?followingId=${encodeURIComponent(followingId)}`,
    { notifyOnUnauthorized: false },
  );
  return response.status || null;
}

export async function followUser(followingId) {
  if (!followingId) throw new Error("A target account is required");
  const response = await requestJson("/api/social/follows", {
    body: JSON.stringify({ followingId }),
    method: "POST",
  });
  return response.status || "accepted";
}

export async function unfollowUser(followingId) {
  if (!followingId) throw new Error("A target account is required");
  await requestJson("/api/social/follows", {
    body: JSON.stringify({ followingId }),
    method: "DELETE",
  });
  return null;
}

export async function removeFollower(followerId) {
  if (!followerId) throw new Error("Follower ID is required");
  await requestJson("/api/social/follows", {
    body: JSON.stringify({ action: "remove-follower", followerId }),
    method: "DELETE",
  });
  return null;
}

export async function fetchInboxCount() {
  const res = await requestJson("/api/social/follows?resource=inbox-count", {
    notifyOnUnauthorized: false,
  }).catch(() => ({ count: 0 }));
  return Number(res?.count) || 0;
}

export async function fetchFollowRequests() {
  const res = await requestJson("/api/social/follows?resource=requests", {
    notifyOnUnauthorized: false,
  }).catch(() => ({ data: [] }));
  return Array.isArray(res?.data) ? res.data : [];
}

export async function acceptFollowRequest(requesterId) {
  if (!requesterId) throw new Error("Requester ID is required");
  await requestJson("/api/social/follows", {
    body: JSON.stringify({ action: "accept", requesterId }),
    method: "PATCH",
  });
}

export async function rejectFollowRequest(requesterId) {
  if (!requesterId) throw new Error("Requester ID is required");
  await requestJson("/api/social/follows", {
    body: JSON.stringify({ action: "reject", requesterId }),
    method: "PATCH",
  });
}

export async function fetchFollowers(userId) {
  const query = userId
    ? `?resource=followers&userId=${encodeURIComponent(userId)}`
    : "?resource=followers";
  const res = await requestJson(`/api/social/follows${query}`, {
    notifyOnUnauthorized: false,
  }).catch(() => ({ data: [] }));
  return Array.isArray(res?.data) ? res.data : [];
}

export async function fetchFollowing(userId) {
  const query = userId
    ? `?resource=following&userId=${encodeURIComponent(userId)}`
    : "?resource=following";
  const res = await requestJson(`/api/social/follows${query}`, {
    notifyOnUnauthorized: false,
  }).catch(() => ({ data: [] }));
  return Array.isArray(res?.data) ? res.data : [];
}
