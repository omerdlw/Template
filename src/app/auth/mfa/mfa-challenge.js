"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  listMfaFactors,
  sanitizeNextPath,
  useAuth,
  verifyMfa,
} from "@/modules/auth";
import { Button, Input } from "@/ui/primitives";

export function MfaChallenge() {
  const auth = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [factors, setFactors] = useState([]);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!auth.client) return;
    void listMfaFactors(auth.client)
      .then((items) =>
        setFactors(items.filter((factor) => factor.status === "verified")),
      )
      .catch((reason) => setError(reason.message));
  }, [auth.client]);

  async function submit(event) {
    event.preventDefault();
    const factor = factors[0];
    if (!factor) {
      setError("No verified authenticator is available");
      return;
    }
    setPending(true);
    setError("");
    try {
      await verifyMfa(auth.client, { code, factorId: factor.id });
      await auth.refresh();
      router.replace(sanitizeNextPath(searchParams.get("next")));
      router.refresh();
    } catch (reason) {
      setError(reason.message || "MFA verification failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={submit}>
      <label className="flex flex-col gap-2">
        <span className="text-xs font-medium text-white/50">Six-digit code</span>
        <Input
          autoComplete="one-time-code"
          inputMode="numeric"
          maxLength={6}
          required
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
        />
      </label>
      <Button
        className="h-11 w-full justify-center rounded-[20px] bg-white px-4 text-xs font-bold text-black uppercase hover:bg-white/70 disabled:opacity-50"
        disabled={pending || code.length !== 6}
        type="submit"
      >
        Verify
      </Button>
      {error ? <p className="text-xs text-error">{error}</p> : null}
    </form>
  );
}
