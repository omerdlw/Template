import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/infrastructure/supabase/server";
import { getCurrentAccount } from "@/modules/account/server";
import { getOptionalUser } from "@/modules/auth/server";

export const metadata = { title: "Account" };

export default async function AccountEntryPage() {
  const user = await getOptionalUser();
  if (!user) return null;

  const client = await createServerSupabaseClient();
  const { account } = await getCurrentAccount({ client, userId: user.id });

  if (!account?.username) redirect("/?reason=account-incomplete");
  redirect(`/account/${encodeURIComponent(account.username)}`);
}
