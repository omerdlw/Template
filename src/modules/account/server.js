import "server-only";
import {
  normalizeAccountPatch,
  toCurrentAccount,
  toPublicAccount,
} from "./utils";

function requireAccountContext({ client, userId }) {
  if (!client || !userId)
    throw new Error("Account client and authenticated user id are required");
  return {
    client,
    userId,
  };
}

export async function getCurrentAccount(context) {
  const { client, userId } = requireAccountContext(context);
  const [{ data: accountRow, error }, { data: emailRow }] = await Promise.all([
    client
      .from("accounts")
      .select("*")
      .eq("id", userId)
      .single(),
    client
      .from("account_emails")
      .select("email")
      .eq("id", userId)
      .maybeSingle(),
  ]);

  if (error) throw error;
  const account = toCurrentAccount({
    ...accountRow,
    email: emailRow?.email || null,
  });
  return {
    account,
    profile: account,
  };
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getPublicAccount({ client, username }) {
  if (!client) throw new Error("Account client is required");
  const identifier = String(username || "").toLowerCase();
  if (!identifier) return null;

  let query = client
    .from("accounts")
    .select(
      "id,username,display_name,avatar_url,banner_url,bio,is_private,created_at,updated_at",
    );

  if (UUID_PATTERN.test(identifier)) {
    query = query.or(`username.eq.${identifier},id.eq.${identifier}`);
  } else {
    query = query.eq("username", identifier);
  }

  const { data, error } = await query.maybeSingle();

  if (error) throw error;
  return toPublicAccount(data);
}

export const getPublicProfile = getPublicAccount;

export async function updateAccount({ client, input, userId }) {
  requireAccountContext({
    client,
    userId,
  });

  const { data: current, error: fetchError } = await client
    .from("accounts")
    .select("username, display_name, avatar_url, banner_url, bio, is_private")
    .eq("id", userId)
    .single();

  if (fetchError) throw fetchError;

  const mergedInput = {
    avatarUrl:
      input?.avatarUrl !== undefined
        ? input.avatarUrl
        : input?.avatar_url !== undefined
          ? input.avatar_url
          : current?.avatar_url,
    bannerUrl:
      input?.bannerUrl !== undefined
        ? input.bannerUrl
        : input?.banner_url !== undefined
          ? input.banner_url
          : current?.banner_url,
    bio:
      input?.bio !== undefined
        ? input.bio
        : current?.bio,
    displayName:
      input?.displayName !== undefined
        ? input.displayName
        : input?.display_name !== undefined
          ? input.display_name
          : current?.display_name,
    isPrivate:
      input?.isPrivate !== undefined
        ? input.isPrivate
        : input?.is_private !== undefined
          ? input.is_private
          : current?.is_private,
    username:
      input?.username !== undefined
        ? input.username
        : current?.username,
  };

  const patch = normalizeAccountPatch(mergedInput);
  const [{ data, error }, { data: emailRow }] = await Promise.all([
    client.rpc("update_account", {
      p_avatar_url: patch.avatarUrl,
      p_banner_url: patch.bannerUrl,
      p_bio: patch.bio,
      p_display_name: patch.displayName,
      p_is_private: patch.isPrivate,
      p_username: patch.username,
    }),
    client
      .from("account_emails")
      .select("email")
      .eq("id", userId)
      .maybeSingle(),
  ]);
  if (error) throw error;
  const account = toCurrentAccount({
    ...data,
    email: emailRow?.email || null,
  });
  return {
    account,
    profile: account,
    userId,
  };
}

export const updateAccountProfile = updateAccount;
export async function deactivateCurrentAccount({ client, userId }) {
  requireAccountContext({
    client,
    userId,
  });
  const { error } = await client.rpc("deactivate_current_account");
  if (error) throw error;
  return {
    deactivated: true,
    userId,
  };
}
export async function reactivateCurrentAccount({ client, userId }) {
  requireAccountContext({
    client,
    userId,
  });
  const { error } = await client.rpc("reactivate_current_account");
  if (error) throw error;
  return {
    reactivated: true,
    userId,
  };
}
