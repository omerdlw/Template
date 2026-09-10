"use client";

import Link from "next/link";
import { Button } from "@/ui/primitives";

export default function AccountError({ error, reset }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
      <h2 className="text-xl font-semibold text-white">Profile unavailable</h2>
      <p className="mt-2 text-sm text-white/50">
        {error?.message || "Could not load this profile"}
      </p>
      <div className="mt-6 flex items-center gap-3">
        <Button
          className="rounded-xl bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/15"
          onClick={() => reset?.()}
          type="button"
        >
          Try again
        </Button>
        <Link
          className="rounded-xl bg-white/5 px-4 py-2 text-sm font-medium text-white/70 ring-1 ring-white/10 transition hover:bg-white/10"
          href="/"
        >
          Home
        </Link>
      </div>
    </main>
  );
}
