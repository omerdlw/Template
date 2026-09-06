"use client";

import { requestJson } from "@/infrastructure/http/client";

export async function getFollowState(followingId) {
  const response = await requestJson(
    `/api/social/follows?followingId=${encodeURIComponent(followingId)}`,
    { notifyOnUnauthorized: false },
  );
  return response.status || null;
}

export async function followUser(followingId) {
  if (!followingId) throw new Error("A target profile is required");
  const response = await requestJson("/api/social/follows", {
    body: JSON.stringify({ followingId }),
    method: "POST",
  });
  return response.status || "accepted";
}

export async function unfollowUser(followingId) {
  if (!followingId) throw new Error("A target profile is required");
  await requestJson("/api/social/follows", {
    body: JSON.stringify({ followingId }),
    method: "DELETE",
  });
  return null;
}
