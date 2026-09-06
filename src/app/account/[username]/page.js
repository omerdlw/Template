import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/infrastructure/supabase/server";
import { getPublicProfile } from "@/modules/account/server";
import { getOptionalUser } from "@/modules/auth/server";
import { AccountProfileLayout } from "@/domains/account/account-profile-layout";
import { ProjectAccountSummary } from "@/domains/project/account-extension";

export default async function AccountProfilePage({ params }) {
  const { username } = await params;
  const client = await createServerSupabaseClient();
  const [profile, viewer] = await Promise.all([
    getPublicProfile({ client, username }),
    getOptionalUser(),
  ]);

  if (!profile) notFound();

  const isOwner = viewer?.id === profile.id;
  if (profile.isPrivate && !isOwner) notFound();

  return (
    <AccountProfileLayout
      extension={<ProjectAccountSummary />}
      profile={profile}
    />
  );
}
