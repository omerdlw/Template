import { redirect } from "next/navigation";

export const metadata = { title: "Security" };

export default function SecurityPage() {
  redirect("/account");
}
