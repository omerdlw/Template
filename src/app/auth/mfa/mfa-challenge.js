"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  listMfaFactors,
  sanitizeNextPath,
  useAuth,
  verifyMfa,
} from "@/modules/auth";

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
    <form className="stack" onSubmit={submit}>
      <label>
        Six-digit code
        <input
          autoComplete="one-time-code"
          inputMode="numeric"
          maxLength={6}
          required
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
        />
      </label>
      <button
        className="primary"
        disabled={pending || code.length !== 6}
        type="submit"
      >
        Verify
      </button>
      {error ? <p className="error">{error}</p> : null}
    </form>
  );
}
