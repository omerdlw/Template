"use client";

import { useState } from "react";
import AdaptiveImage from "@/ui/components/adaptive-image";
import { Input } from "@/ui/primitives";
import {
  deletePasskey,
  enrollMfa,
  registerPasskey,
  renamePasskey,
  unenrollMfa,
  verifyMfa,
} from "@/modules/auth";
import {
  Field,
  INPUT_BASE_CLASSES,
  SectionCard,
  SurfaceAction,
} from "./primitives";

function EmailSection({ account, auth }) {
  const [email, setEmail] = useState(account?.email || "");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function updateEmail() {
    setPending(true);
    setMessage("");
    try {
      const { error } = await auth.client.auth.updateUser({ email });
      if (error) throw error;
      setMessage("Check your inbox to confirm the new email");
    } catch (error) {
      setMessage(error.message || "Email could not be updated");
    } finally {
      setPending(false);
    }
  }

  return (
    <SectionCard
      description="A confirmation link will be sent before the new email becomes active"
      title="Email sign-in"
    >
      <Field label="Current email">
        <Input
          className={INPUT_BASE_CLASSES}
          onChange={(event) => setEmail(event.target.value)}
          type="email"
          value={email}
        />
      </Field>
      <div className="flex items-center gap-2.5">
        <SurfaceAction
          disabled={pending || !auth.client || !email}
          onClick={() => void updateEmail()}
          type="button"
        >
          {pending ? "Updating" : "Update email"}
        </SurfaceAction>
        {message ? <p className="text-xs text-white/50">{message}</p> : null}
      </div>
    </SectionCard>
  );
}

function ProvidersSection({ user }) {
  const providers = (user?.identities || [])
    .map((identity) => identity.provider)
    .filter(Boolean);

  return (
    <SectionCard
      description="Authentication providers connected to this account"
      title="Connected providers"
    >
      <div className="flex flex-wrap gap-2.5">
        {providers.length ? (
          providers.map((provider) => (
            <span
              className="rounded-[20px] bg-white/5 px-3 py-2 text-xs font-semibold uppercase text-white/70 ring-1 ring-inset ring-white/5"
              key={provider}
            >
              {provider}
            </span>
          ))
        ) : (
          <p className="text-sm text-white/50">
            No external providers connected
          </p>
        )}
      </div>
    </SectionCard>
  );
}

function SessionsSection({
  sessions = [],
  reloadSecurity,
  revokeOthers,
  revokeSession,
}) {
  return (
    <SectionCard
      description="Review active sessions and revoke access from devices you no longer use"
      title="Active sessions"
    >
      <div className="flex flex-col gap-2.5">
        {sessions.length ? (
          sessions.map((session) => (
            <div
              className="flex items-start justify-between gap-3 rounded-[20px] bg-white/5 p-3 ring-1 ring-inset ring-white/5"
              key={session.session_id}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">
                  {session.user_agent || "Unknown device"}
                </p>
                <p className="mt-1 text-xs text-white/50">
                  {session.is_current
                    ? "Current session"
                    : session.ip_address || "Remote session"}
                </p>
              </div>
              {!session.is_current ? (
                <SurfaceAction
                  onClick={() => void revokeSession(session.session_id)}
                  type="button"
                >
                  Revoke
                </SurfaceAction>
              ) : null}
            </div>
          ))
        ) : (
          <p className="text-sm text-white/50">No active session data</p>
        )}
      </div>
      <div className="flex gap-2.5">
        <SurfaceAction onClick={() => void reloadSecurity()} type="button">
          Refresh
        </SurfaceAction>
        <SurfaceAction onClick={() => void revokeOthers()} type="button">
          Sign out others
        </SurfaceAction>
      </div>
    </SectionCard>
  );
}

function PasskeysSection({ auth, passkeys = [], reloadSecurity }) {
  const [pending, setPending] = useState(false);

  async function addPasskey() {
    setPending(true);
    try {
      await registerPasskey(auth.client);
      await reloadSecurity();
    } finally {
      setPending(false);
    }
  }

  async function removePasskey(passkeyId) {
    setPending(true);
    try {
      await deletePasskey(auth.client, { passkeyId });
      await reloadSecurity();
    } finally {
      setPending(false);
    }
  }

  async function rename(passkeyId, currentName) {
    const friendlyName = window.prompt(
      "Passkey name",
      currentName || "Passkey",
    );
    if (!friendlyName?.trim()) return;
    setPending(true);
    try {
      await renamePasskey(auth.client, {
        friendlyName: friendlyName.trim(),
        passkeyId,
      });
      await reloadSecurity();
    } finally {
      setPending(false);
    }
  }

  return (
    <SectionCard
      description="Use a device passkey for passwordless sign-in"
      title="Passkeys"
    >
      <div className="flex flex-col gap-2.5">
        {passkeys.length ? (
          passkeys.map((passkey) => (
            <div
              className="flex items-center justify-between gap-3 rounded-[20px] bg-white/5 p-3 text-sm text-white/70"
              key={passkey.id || passkey.passkeyId}
            >
              <span className="truncate">
                {passkey.friendlyName || "Passkey"}
              </span>
              <span className="flex gap-2">
                <SurfaceAction
                  disabled={pending}
                  onClick={() =>
                    void rename(
                      passkey.id || passkey.passkeyId,
                      passkey.friendlyName,
                    )
                  }
                  type="button"
                >
                  Rename
                </SurfaceAction>
                <SurfaceAction
                  danger
                  disabled={pending}
                  onClick={() =>
                    void removePasskey(passkey.id || passkey.passkeyId)
                  }
                  type="button"
                >
                  Remove
                </SurfaceAction>
              </span>
            </div>
          ))
        ) : (
          <p className="text-sm text-white/50">No passkeys registered</p>
        )}
      </div>
      <SurfaceAction
        disabled={pending || !auth.client}
        onClick={() => void addPasskey()}
        type="button"
      >
        {pending ? "Adding" : "Add passkey"}
      </SurfaceAction>
    </SectionCard>
  );
}

function AuthenticatorSection({ auth, factors = [], reloadSecurity }) {
  const [pending, setPending] = useState(false);
  const [enrollment, setEnrollment] = useState(null);
  const [code, setCode] = useState("");

  async function removeFactor(factorId) {
    setPending(true);
    try {
      await unenrollMfa(auth.client, { factorId });
      await reloadSecurity();
    } finally {
      setPending(false);
    }
  }

  async function beginEnrollment() {
    setPending(true);
    try {
      setEnrollment(await enrollMfa(auth.client));
    } finally {
      setPending(false);
    }
  }

  async function confirmEnrollment() {
    if (!enrollment?.id || !code) return;
    setPending(true);
    try {
      await verifyMfa(auth.client, { code, factorId: enrollment.id });
      setEnrollment(null);
      setCode("");
      await reloadSecurity();
    } finally {
      setPending(false);
    }
  }

  return (
    <SectionCard
      description="Protect the account with an authenticator app"
      title="Authenticator app"
    >
      {factors.length ? (
        factors.map((factor) => (
          <div
            className="flex items-center justify-between gap-3 rounded-[20px] bg-white/5 p-3"
            key={factor.id}
          >
            <span className="text-sm text-white/70">
              {factor.friendly_name || factor.factor_type || "Authenticator"}
            </span>
            <SurfaceAction
              disabled={pending}
              danger
              onClick={() => void removeFactor(factor.id)}
              type="button"
            >
              Remove
            </SurfaceAction>
          </div>
        ))
      ) : (
        <p className="text-sm text-white/50">
          No authenticator factor configured
        </p>
      )}
      {enrollment ? (
        <div className="flex flex-col gap-2.5 rounded-[20px] bg-white/5 p-3 ring-1 ring-inset ring-white/5">
          {enrollment.totp?.qr_code ? (
            <AdaptiveImage
              alt="Authenticator QR code"
              className="size-full object-contain"
              wrapperClassName="size-40 rounded-xl bg-white p-2"
              src={enrollment.totp.qr_code}
            />
          ) : null}
          <p className="text-xs text-white/50">
            Scan the QR code, then enter the six-digit code
          </p>
          <Input
            inputMode="numeric"
            maxLength={6}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
            value={code}
          />
          <SurfaceAction
            disabled={pending || code.length !== 6}
            onClick={() => void confirmEnrollment()}
            type="button"
          >
            Verify authenticator
          </SurfaceAction>
        </div>
      ) : null}
      {!factors.length && !enrollment ? (
        <SurfaceAction
          disabled={pending || !auth.client}
          onClick={() => void beginEnrollment()}
          type="button"
        >
          Add authenticator
        </SurfaceAction>
      ) : null}
    </SectionCard>
  );
}

function DeleteSection({ deleteAccount }) {
  const [confirmation, setConfirmation] = useState("");
  const [pending, setPending] = useState(false);

  async function submit() {
    setPending(true);
    try {
      await deleteAccount(confirmation);
    } finally {
      setPending(false);
    }
  }

  return (
    <SectionCard
      description="This permanently removes the account and cannot be undone"
      title="Delete account"
    >
      <Field label='Type "DELETE" to confirm'>
        <Input
          className={INPUT_BASE_CLASSES}
          onChange={(event) => setConfirmation(event.target.value)}
          value={confirmation}
        />
      </Field>
      <SurfaceAction
        danger
        disabled={pending || confirmation !== "DELETE"}
        onClick={() => void submit()}
        type="button"
      >
        {pending ? "Deleting" : "Delete account"}
      </SurfaceAction>
    </SectionCard>
  );
}

export function AccountEditSettings({
  account,
  auth,
  deleteAccount,
  factors,
  passkeys,
  reloadSecurity,
  revokeOthers,
  revokeSession,
  section,
  sessions,
  user,
}) {
  if (section === "email")
    return <EmailSection account={account} auth={auth} />;
  if (section === "providers") return <ProvidersSection user={user} />;
  if (section === "sessions")
    return (
      <SessionsSection
        reloadSecurity={reloadSecurity}
        revokeOthers={revokeOthers}
        revokeSession={revokeSession}
        sessions={sessions}
      />
    );
  if (section === "passkeys")
    return (
      <PasskeysSection
        auth={auth}
        passkeys={passkeys}
        reloadSecurity={reloadSecurity}
      />
    );
  if (section === "authenticator")
    return (
      <AuthenticatorSection
        auth={auth}
        factors={factors}
        reloadSecurity={reloadSecurity}
      />
    );
  if (section === "delete")
    return <DeleteSection deleteAccount={deleteAccount} />;
  return (
    <p className="text-sm text-white/50">
      This account setting is not available yet
    </p>
  );
}
