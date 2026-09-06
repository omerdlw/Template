import { Suspense } from "react";
import { MfaChallenge } from "./mfa-challenge";

export const metadata = { title: "Verify MFA" };

export default function MfaPage() {
  return (
    <main className="auth-page">
      <section className="auth-card panel">
        <p className="eyebrow">Second factor</p>
        <h2>Verify your authenticator</h2>
        <Suspense fallback={<p className="muted">Loading factors…</p>}>
          <MfaChallenge />
        </Suspense>
      </section>
    </main>
  );
}
