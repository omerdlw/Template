import { requireUser } from "@/modules/auth/server";

export default async function AccountLayout({ children }) {
  await requireUser({ redirectTo: "/" });
  return children;
}
