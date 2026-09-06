const USERNAME_PATTERN = /^[a-z0-9](?:[a-z0-9_-]{1,28}[a-z0-9])?$/;

function normalizeText(value, maxLength) {
  return String(value || "")
    .trim()
    .slice(0, maxLength);
}

export function normalizeUsername(value) {
  const username = String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!USERNAME_PATTERN.test(username)) {
    throw new Error(
      "Username must be 3-30 characters and contain letters, numbers, _ or -",
    );
  }
  return username;
}

export function normalizeProfilePatch(input = {}) {
  const displayName = normalizeText(input.displayName, 80);
  if (!displayName) throw new Error("Display name is required");

  return {
    avatarUrl: normalizeText(input.avatarUrl, 2048) || null,
    bannerUrl: normalizeText(input.bannerUrl, 2048) || null,
    bio: normalizeText(input.bio, 500) || null,
    displayName,
    isPrivate: input.isPrivate === true || input.isPrivate === "on",
    username: normalizeUsername(input.username),
  };
}

export function toPublicProfile(row) {
  if (!row) return null;
  return {
    avatarUrl: row.avatar_url || null,
    bannerUrl: row.banner_url || null,
    bio: row.bio || null,
    createdAt: row.created_at,
    displayName: row.display_name,
    id: row.id,
    isPrivate: row.is_private === true,
    updatedAt: row.updated_at,
    username: row.username,
  };
}
