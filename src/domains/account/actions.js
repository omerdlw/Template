"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createAdminSupabaseClient,
  createServerSupabaseClient,
} from "@/infrastructure/supabase/server";
import {
  deactivateCurrentAccount,
  reactivateCurrentAccount,
  updateAccount,
} from "@/modules/account/server";
import {
  requireRecentAuthentication,
  requireUser,
} from "@/modules/auth/server";

export async function updateAccountAction(_previousState, formData) {
  try {
    const user = await requireUser();
    const client = await createServerSupabaseClient();
    await updateAccount({
      client,
      input: {
        avatarUrl: formData.get("avatarUrl"),
        bannerUrl: formData.get("bannerUrl"),
        bio: formData.get("bio"),
        displayName: formData.get("displayName"),
        isPrivate: formData.get("isPrivate"),
        username: formData.get("username"),
      },
      userId: user.id,
    });
    revalidatePath("/account", "page");
    revalidatePath("/account/[username]", "page");
    return { error: null, success: true };
  } catch (error) {
    return {
      error: error.message || "Account could not be updated",
      success: false,
    };
  }
}

export const updateProfileAction = updateAccountAction;

export async function deactivateAccountAction() {
  const user = await requireRecentAuthentication();
  const client = await createServerSupabaseClient();
  await deactivateCurrentAccount({ client, userId: user.id });
  await client.auth.signOut({ scope: "global" });
  redirect("/?reason=account-deactivated");
}

export async function reactivateAccountAction() {
  const user = await requireUser();
  const client = await createServerSupabaseClient();
  await reactivateCurrentAccount({ client, userId: user.id });
  revalidatePath("/account", "page");
  revalidatePath("/account/[username]", "page");
}

export async function deleteAccountAction(formData) {
  if (formData.get("confirmation") !== "DELETE") {
    throw new Error('Type "DELETE" to permanently remove the account');
  }

  const user = await requireRecentAuthentication();
  const client = await createServerSupabaseClient();
  const admin = createAdminSupabaseClient();

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) throw error;
  await client.auth.signOut({ scope: "local" });
  redirect("/?reason=account-deleted");
}
