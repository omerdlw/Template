"use client";

import { Button } from "@/ui/primitives";

export default function ErrorBoundary({ error, reset }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
      <h2 className="text-xl font-semibold text-white">Something went wrong</h2>
      <p className="mt-2 text-sm text-white/50">
        {error?.message || "An unexpected error occurred"}
      </p>
      <Button
        className="mt-6 rounded-xl bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/15"
        onClick={() => reset?.()}
        type="button"
      >
        Try again
      </Button>
    </main>
  );
}
