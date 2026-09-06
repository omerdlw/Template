import "server-only";

import { normalizeProfilePatch, toPublicProfile } from "./contract";

function requireAccountContext({ client, userId }) {
  if (!client || !userId)
    throw new Error("Account client and authenticated user id are required");
  return { client, userId };
}

export async function getCurrentAccount(context) {
  const { client, userId } = requireAccountContext(context);
  const [
    { data: account, error: accountError },
    { data: profile, error: profileError },
  ] = await Promise.all([
    client
      .from("accounts")
      .select("id,email,status,deactivated_at,created_at,updated_at")
      .eq("id", userId)
      .single(),
    client.from("profiles").select("*").eq("id", userId).single(),
  ]);

  if (accountError) throw accountError;
  if (profileError) throw profileError;
  return {
    account: {
      createdAt: account.created_at,
      deactivatedAt: account.deactivated_at,
      email: account.email,
      id: account.id,
      status: account.status,
      updatedAt: account.updated_at,
    },
    profile: toPublicProfile(profile),
  };
}

export async function getPublicProfile({ client, username }) {
  if (!client) throw new Error("Account client is required");
  const { data, error } = await client
    .from("profiles")
    .select("*")
    .eq("username", String(username || "").toLowerCase())
    .maybeSingle();
  if (error) throw error;
  return toPublicProfile(data);
}

export async function updateAccountProfile({ client, input, userId }) {
  requireAccountContext({ client, userId });
  const patch = normalizeProfilePatch(input);
  const { data, error } = await client.rpc("update_account_profile", {
    p_avatar_url: patch.avatarUrl,
    p_banner_url: patch.bannerUrl,
    p_bio: patch.bio,
    p_display_name: patch.displayName,
    p_is_private: patch.isPrivate,
    p_username: patch.username,
  });
  if (error) throw error;
  return { profile: toPublicProfile(data), userId };
}

export async function deactivateCurrentAccount({ client, userId }) {
  requireAccountContext({ client, userId });
  const { error } = await client.rpc("deactivate_current_account");
  if (error) throw error;
  return { deactivated: true, userId };
}

export async function reactivateCurrentAccount({ client, userId }) {
  requireAccountContext({ client, userId });
  const { error } = await client.rpc("reactivate_current_account");
  if (error) throw error;
  return { reactivated: true, userId };
}
