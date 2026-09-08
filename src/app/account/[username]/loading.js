import { Spinner } from "@/ui/feedback/spinner";

export default function AccountProfileLoading() {
  return (
    <main
      aria-busy="true"
      aria-label="Loading account profile"
      className="min-h-screen bg-black"
    >
      <div className="mx-auto flex min-h-screen w-full max-w-4xl items-center justify-center px-6">
        <Spinner size={20} />
      </div>
    </main>
  );
}
