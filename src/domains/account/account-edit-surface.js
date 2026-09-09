"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { requestJson } from "@/infrastructure/http/client";
import { useAccount } from "@/modules/account";
import {
  deletePasskey,
  enrollMfa,
  getUserIdentities,
  linkIdentity,
  listMfaFactors,
  listPasskeys,
  registerPasskey,
  renamePasskey,
  unenrollMfa,
  unlinkIdentity,
  useAuth,
  verifyMfa,
} from "@/modules/auth";
import {
  getNavActionClass,
  useNavigationActions,
} from "@/modules/nav";
import { useToast } from "@/modules/notification";
import { Button, Icon, Input } from "@/ui/primitives";
import AdaptiveImage from "@/ui/components/adaptive-image";
import { DESTRUCTIVE_ACTION_TONE_CLASS, INFO_ACTION_TONE_CLASS } from "@/ui/tokens";
import { cn } from "@/shared/utils";

export const SUBMIT_BUTTON_CLASS = getNavActionClass({
  className: "h-10 transition-all disabled:cursor-not-allowed disabled:opacity-50",
  variant: INFO_ACTION_TONE_CLASS,
});

export const INPUT_BASE_CLASSES =
  "h-10 w-full rounded-[20px] bg-white/5 px-4 text-sm text-white ring-1 ring-inset ring-white/5 transition-all placeholder:text-white/50 hover:bg-white/10 focus:bg-white/10 focus:ring-white/10";

export const TEXTAREA_BASE_CLASSES =
  "min-h-36 w-full resize-none rounded-[20px] bg-white/5 p-4 text-sm text-white ring-1 ring-inset ring-white/5 transition-all placeholder:text-white/50 hover:bg-white/10 hover:ring-white/15 focus:bg-white/10 focus:ring-white/50";

export function Field({ children, label }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-xs font-medium text-white/50">{label}</span>
      {children}
    </label>
  );
}

export function SectionCard({ children, description, title }) {
  return (
      <div className="flex flex-col gap-4">{children}</div>
  );
}

export function SurfaceAction({
  children,
  className,
  danger = false,
  ...props
}) {
  return (
    <Button
      {...props}
      className={cn(
        "inline-flex min-h-10 items-center justify-center rounded-[20px] px-4 py-2 text-xs font-semibold uppercase transition-all disabled:cursor-not-allowed disabled:opacity-50",
        danger
          ? "bg-error/10 text-error ring-1 ring-inset ring-error/20 hover:bg-error/20"
          : "bg-white/10 text-white ring-1 ring-inset ring-white/10 hover:bg-white/15",
        className,
      )}
    >
      {children}
    </Button>
  );
}

export function Toggle({ checked }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative h-6 w-10 shrink-0 rounded-full p-1 transition-all",
        checked ? "bg-info" : "bg-white/10",
      )}
    >
      <span
        className={cn(
          "block size-4 rounded-full bg-white",
          checked ? "translate-x-4" : "translate-x-0",
        )}
      />
    </span>
  );
}

export const SETTING_META = Object.freeze({
  account: {
    description: "Name, username, bio and privacy",
    icon: "solar:user-circle-bold",
    title: "Account info",
  },
  "avatar-banner": {
    description: "Avatar and banner image",
    icon: "solar:gallery-bold",
    title: "Gallery",
  },
  authenticator: {
    description: "Two-factor authentication",
    icon: "solar:shield-check-bold",
    title: "Authenticator app",
  },
  delete: {
    description: "Permanently remove this account",
    icon: "solar:trash-bin-trash-bold",
    title: "Delete account",
  },
  email: {
    description: "Email used for sign-in",
    icon: "solar:letter-bold",
    title: "Email sign-in",
  },
  overview: {
    description: "Account, security and controls",
    icon: "solar:user-circle-bold",
    title: "Edit account",
  },
  passkeys: {
    description: "Passwordless device sign-in",
    icon: "solar:key-bold",
    title: "Passkeys",
  },
  profile: {
    description: "Name, username, bio and privacy",
    icon: "solar:user-circle-bold",
    title: "Account info",
  },
  providers: {
    description: "Manage OAuth connections",
    icon: "solar:link-bold",
    title: "Connected providers",
  },
  sessions: {
    description: "Review and revoke devices",
    icon: "solar:devices-bold",
    title: "Active sessions",
  },
});

export const OAUTH_PROVIDER_CONFIG = Object.freeze({
  google: Object.freeze({
    icon: "flat-color-icons:google",
    key: "google",
    label: "Google",
    supabaseProvider: "google",
  }),
  github: Object.freeze({
    icon: "mdi:github",
    key: "github",
    label: "GitHub",
    supabaseProvider: "github",
  }),
  x: Object.freeze({
    icon: "simple-icons:x",
    key: "x",
    label: "X",
    supabaseProvider: "twitter",
  }),
});

export function normalizeOAuthProviderKey(provider) {
  const normalized = String(provider || "").trim().toLowerCase();
  if (normalized === "google" || normalized === "google.com") return "google";
  if (normalized === "github" || normalized === "github.com") return "github";
  if (
    normalized === "x" ||
    normalized === "x.com" ||
    normalized === "twitter" ||
    normalized === "twitter.com"
  ) {
    return "x";
  }
  return null;
}

const SETTINGS = Object.freeze([
  {
    description: "Avatar and banner image",
    icon: "solar:gallery-bold",
    key: "avatar-banner",
    title: "Gallery",
  },
  {
    description: "Name, username, bio and privacy",
    icon: "solar:user-circle-bold",
    key: "account",
    title: "Account info",
  },
  {
    description: "Email used for sign-in",
    icon: "solar:letter-bold",
    key: "email",
    title: "Email sign-in",
  },
  {
    description: "Manage OAuth connections",
    icon: "solar:link-bold",
    key: "providers",
    title: "Connected providers",
  },
  {
    description: "Review and revoke devices",
    icon: "solar:devices-bold",
    key: "sessions",
    title: "Active sessions",
  },
  {
    description: "Passwordless device sign-in",
    icon: "solar:key-bold",
    key: "passkeys",
    title: "Passkeys",
  },
  {
    description: "Two-factor authentication",
    icon: "solar:shield-check-bold",
    key: "authenticator",
    title: "Authenticator app",
  },
  {
    danger: true,
    description: "Permanently remove this account",
    icon: "solar:trash-bin-trash-bold",
    key: "delete",
    title: "Delete account",
  },
]);

export function useAccountEditState(settingKey = "overview") {
  const accountState = useAccount();
  const auth = useAuth();
  const { closeSurface, openSurface } = useNavigationActions();
  const router = useRouter();
  const [sessions, setSessions] = useState([]);
  const [passkeys, setPasskeys] = useState([]);
  const [factors, setFactors] = useState([]);
  const [identities, setIdentities] = useState(auth.user?.identities || []);
  const [securityLoading, setSecurityLoading] = useState(false);

  const shouldFetchSecurity =
    settingKey === "sessions" ||
    settingKey === "passkeys" ||
    settingKey === "authenticator" ||
    settingKey === "providers";

  const reloadSecurity = useCallback(async () => {
    if (!auth.client || !auth.isAuthenticated) return;
    setSecurityLoading(true);
    try {
      const [sessionResponse, nextPasskeys, nextFactors, nextIdentities] =
        await Promise.all([
          requestJson("/api/auth/sessions", { notifyOnUnauthorized: false }),
          listPasskeys(auth.client).catch(() => []),
          listMfaFactors(auth.client).catch(() => []),
          getUserIdentities(auth.client).catch(
            () => auth.user?.identities || [],
          ),
        ]);
      setSessions(sessionResponse.sessions || []);
      setPasskeys(nextPasskeys);
      setFactors(nextFactors);
      setIdentities(nextIdentities);
    } finally {
      setSecurityLoading(false);
    }
  }, [auth.client, auth.isAuthenticated, auth.user?.identities]);

  useEffect(() => {
    if (!shouldFetchSecurity || !auth.client || !auth.isAuthenticated) return;
    let isCancelled = false;

    const frameId = requestAnimationFrame(() => {
      if (isCancelled) return;
      void reloadSecurity();
    });

    return () => {
      isCancelled = true;
      cancelAnimationFrame(frameId);
    };
  }, [shouldFetchSecurity, auth.client, auth.isAuthenticated, reloadSecurity]);

  const revokeSession = useCallback(
    async (sessionId) => {
      await requestJson(`/api/auth/sessions/${encodeURIComponent(sessionId)}`, {
        method: "DELETE",
      });
      await reloadSecurity();
    },
    [reloadSecurity],
  );

  const revokeOthers = useCallback(async () => {
    await requestJson("/api/auth/sessions/others", { method: "POST" });
    await reloadSecurity();
  }, [reloadSecurity]);

  const deleteAccount = useCallback(
    async (confirmation) => {
      await requestJson("/api/account/me", {
        body: JSON.stringify({ confirmation }),
        method: "DELETE",
      });
      await auth.signOut("local");
      closeSurface?.();
      router.replace("/?reason=account-deleted");
    },
    [auth, closeSurface, router],
  );

  const sharedSecurityProps = useMemo(
    () => ({
      account: accountState.account,
      auth,
      deleteAccount,
      factors,
      identities,
      passkeys,
      reloadSecurity,
      revokeOthers,
      revokeSession,
      securityLoading,
      sessions,
      user: auth.user,
    }),
    [
      accountState.account,
      auth,
      deleteAccount,
      factors,
      identities,
      passkeys,
      reloadSecurity,
      revokeOthers,
      revokeSession,
      securityLoading,
      sessions,
    ],
  );

  return {
    account: accountState.account,
    factors,
    openSurface,
    passkeys,
    securityLoading,
    sessions,
    sharedSecurityProps,
  };
}

export function AccountEditMenu({ state }) {
  function openSetting(setting) {
    void state.openSurface(createAccountEditSurfaceEntry(setting.key));
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div className="grid gap-2.5">
        {SETTINGS.map((setting) => (
          <Button
            className={
              setting.danger
                ? "flex w-full items-center gap-2.5 rounded-[20px] bg-error/5 p-2.5 text-left ring-1 ring-inset ring-error/5 transition-all hover:bg-error/10"
                : "flex w-full items-center gap-2.5 rounded-[20px] bg-white/5 p-2.5 text-left ring-1 ring-inset ring-white/5 transition-all hover:bg-white/10"
            }
            key={setting.key}
            onClick={() => openSetting(setting)}
            type="button"
          >
            <span
              className={
                setting.danger
                  ? "center size-10 shrink-0 rounded-[10px] text-error"
                  : "center size-10 shrink-0 rounded-[10px] text-white/70"
              }
            >
              <Icon icon={setting.icon} size={20} />
            </span>
            <span className="min-w-0 flex-1">
              <span
                className={
                  setting.danger
                    ? "block text-sm font-semibold text-error"
                    : "block text-sm font-semibold text-white"
                }
              >
                {setting.title}
              </span>
              <span
                className={
                  setting.danger
                    ? "mt-0.5 block truncate text-xs text-error/50"
                    : "mt-0.5 block truncate text-xs text-white/50"
                }
              >
                {setting.description}
              </span>
            </span>
            <Icon
              className={setting.danger ? "text-error/50" : "text-white/50"}
              icon="solar:alt-arrow-right-linear"
              size={18}
            />
          </Button>
        ))}
      </div>
    </div>
  );
}

function SurfaceAccountInfoForm({
  close,
  currentAccount,
  form: formProp,
  formId = "account-edit-info-form",
  handleAccountSubmit: submitProp,
  handleChange: changeProp,
}) {
  const accountState = useAccount();
  const account = currentAccount || accountState?.account || accountState?.profile;
  const router = useRouter();
  const toast = useToast();

  const [displayName, setDisplayName] = useState(
    () => formProp?.displayName ?? account?.displayName ?? "",
  );
  const [username, setUsername] = useState(
    () => formProp?.username ?? account?.username ?? "",
  );
  const [bio, setBio] = useState(
    () => formProp?.bio ?? account?.bio ?? "",
  );
  const [isPrivate, setIsPrivate] = useState(() =>
    Boolean(formProp?.isPrivate ?? account?.isPrivate),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event?.preventDefault();

    if (submitProp) {
      return submitProp(event);
    }

    const trimmedDisplayName = displayName.trim();
    if (!trimmedDisplayName) {
      toast.error("Display name is required");
      return;
    }

    const trimmedUsername = username.trim().toLowerCase();
    if (!/^[a-zA-Z0-9_-]{3,30}$/.test(trimmedUsername)) {
      toast.error(
        "Username must be 3-30 characters and contain letters, numbers, _ or -",
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await accountState.update({
        bio: bio.trim(),
        displayName: trimmedDisplayName,
        isPrivate,
        username: trimmedUsername,
      });

      await accountState.refresh();
      toast.success("Account info updated successfully");
      router.refresh();

      const nextUsername =
        result?.account?.username ||
        result?.profile?.username ||
        trimmedUsername;
      if (nextUsername && nextUsername !== account?.username) {
        router.replace(`/account/${encodeURIComponent(nextUsername)}`);
      }

      close?.({ success: true });
    } catch (err) {
      const message = err?.message || "Account could not be updated";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleNameChange = (val) => {
    setDisplayName(val);
    changeProp?.("displayName", val);
  };

  const handleUsernameChange = (val) => {
    setUsername(val);
    changeProp?.("username", val);
  };

  const handleBioChange = (val) => {
    setBio(val);
    changeProp?.("bio", val);
  };

  const handlePrivateChange = (val) => {
    setIsPrivate(val);
    changeProp?.("isPrivate", val);
  };

  return (
    <form
      className="flex flex-col gap-2.5"
      id={formId}
      onSubmit={handleSubmit}
    >
      <div className="grid gap-2.5 sm:grid-cols-2">
        <Input
          className={INPUT_BASE_CLASSES}
          disabled={isSubmitting}
          maxLength={80}
          onChange={(event) => handleNameChange(event.target.value)}
          placeholder="Display Name"
          required
          value={formProp?.displayName ?? displayName}
        />
        <Input
          className={INPUT_BASE_CLASSES}
          disabled={isSubmitting}
          maxLength={30}
          onChange={(event) => handleUsernameChange(event.target.value)}
          pattern="[a-zA-Z0-9_-]{3,30}"
          placeholder="Username"
          required
          spellCheck={false}
          value={formProp?.username ?? username}
        />
      </div>

      <Input
        className={TEXTAREA_BASE_CLASSES}
        disabled={isSubmitting}
        maxLength={500}
        mode="textarea"
        onChange={(event) => handleBioChange(event.target.value)}
        placeholder="Bio"
        rows={4}
        value={formProp?.bio ?? bio}
      />

      <Button
        aria-checked={formProp?.isPrivate ?? isPrivate}
        className="flex h-11 w-full items-center justify-between rounded-[20px] bg-white/5 px-4 ring-1 ring-inset ring-white/5 transition-all hover:bg-white/10 hover:ring-white/10"
        disabled={isSubmitting}
        onClick={() =>
          handlePrivateChange(!(formProp?.isPrivate ?? isPrivate))
        }
        role="switch"
        type="button"
      >
        <span className="text-sm font-medium text-white">
          {(formProp?.isPrivate ?? isPrivate)
            ? "Private profile"
            : "Public profile"}
        </span>
        <span
          aria-hidden="true"
          className={cn(
            "flex h-6 w-11 shrink-0 rounded-full p-0.5 ring-1 ring-inset transition-all",
            (formProp?.isPrivate ?? isPrivate)
              ? "bg-white/15 ring-white/15"
              : "bg-black/60 ring-white/10",
          )}
        >
          <span
            className={cn(
              "size-5 rounded-full transition-all",
              (formProp?.isPrivate ?? isPrivate)
                ? "translate-x-5 bg-white shadow-sm"
                : "translate-x-0 bg-white/50",
            )}
          />
        </span>
      </Button>

      <Button
        className={SUBMIT_BUTTON_CLASS}
        disabled={isSubmitting}
        form={formId}
        type="submit"
      >
        {isSubmitting ? "Saving..." : "Save changes"}
      </Button>
    </form>
  );
}

function SurfaceMediaForm({
  close,
  currentAccount,
  form: formProp,
  formId = "account-edit-media-form",
  handleAccountSubmit: submitProp,
  handleChange: changeProp,
}) {
  const accountState = useAccount();
  const account = currentAccount || accountState?.account || accountState?.profile;
  const router = useRouter();
  const toast = useToast();

  const [avatarUrl, setAvatarUrl] = useState(
    () => formProp?.avatarUrl ?? account?.avatarUrl ?? "",
  );
  const [bannerUrl, setBannerUrl] = useState(
    () => formProp?.bannerUrl ?? account?.bannerUrl ?? "",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event?.preventDefault();

    if (submitProp) {
      return submitProp(event);
    }

    setIsSubmitting(true);

    try {
      await accountState.update({
        avatarUrl: avatarUrl.trim() || null,
        bannerUrl: bannerUrl.trim() || null,
      });

      await accountState.refresh();
      toast.success("Gallery images updated successfully");
      router.refresh();
      close?.({ success: true });
    } catch (err) {
      const message = err?.message || "Failed to update images";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleAvatarChange = (val) => {
    setAvatarUrl(val);
    changeProp?.("avatarUrl", val);
  };

  const handleBannerChange = (val) => {
    setBannerUrl(val);
    changeProp?.("bannerUrl", val);
  };

  const currentBanner = formProp?.bannerUrl ?? bannerUrl;
  const currentAvatar = formProp?.avatarUrl ?? avatarUrl;

  return (
    <form
      className="flex flex-col gap-2.5"
      id={formId}
      onSubmit={handleSubmit}
    >
      <div className="flex w-full flex-col gap-2.5 sm:flex-row">
        <div className="flex flex-1 flex-col gap-3 rounded-[20px] bg-white/5 p-3.5 ring-1 ring-inset ring-white/5">
          <span className="text-xs font-semibold text-white/70">Avatar</span>
          <div className="flex h-24 w-full items-center justify-center">
            <div className="relative size-20 shrink-0 overflow-hidden rounded-full bg-black/60 ring-1 ring-inset ring-white/10">
              {currentAvatar ? (
                <AdaptiveImage
                  alt="Avatar preview"
                  className="size-full object-cover"
                  src={currentAvatar}
                />
              ) : (
                <div className="flex size-full items-center justify-center text-white/40">
                  <Icon icon="solar:user-circle-bold" size={32} />
                </div>
              )}
            </div>
          </div>
          <Input
            className={INPUT_BASE_CLASSES}
            disabled={isSubmitting}
            onChange={(event) => handleAvatarChange(event.target.value)}
            placeholder="Avatar URL"
            type="url"
            value={currentAvatar}
          />
          {currentAvatar ? (
            <Button
              className="h-10 w-full rounded-[20px] bg-white/5 px-4 text-xs font-semibold text-white/70 ring-1 ring-inset ring-white/5 transition-all hover:bg-white/10 hover:text-white hover:ring-white/10 disabled:opacity-50"
              disabled={isSubmitting}
              onClick={() => handleAvatarChange("")}
              type="button"
            >
              Clear avatar
            </Button>
          ) : null}
        </div>

        {/* Banner Card */}
        <div className="flex flex-1 flex-col gap-3 rounded-[20px] bg-white/5 p-3.5 ring-1 ring-inset ring-white/5">
          <span className="text-xs font-semibold text-white/70">Banner</span>
          <div className="flex h-24 w-full items-center justify-center">
            <div className="relative h-20 w-full overflow-hidden rounded-[14px] bg-black/60 ring-1 ring-inset ring-white/10">
              {currentBanner ? (
                <AdaptiveImage
                  alt="Banner preview"
                  className="size-full object-cover"
                  src={currentBanner}
                />
              ) : (
                <div className="flex size-full items-center justify-center text-white/40">
                  <Icon icon="solar:gallery-bold" size={32} />
                </div>
              )}
            </div>
          </div>
          <Input
            className={INPUT_BASE_CLASSES}
            disabled={isSubmitting}
            onChange={(event) => handleBannerChange(event.target.value)}
            placeholder="Banner URL"
            type="url"
            value={currentBanner}
          />
          {currentBanner ? (
            <Button
              className="h-10 w-full rounded-[20px] bg-white/5 px-4 text-xs font-semibold text-white/70 ring-1 ring-inset ring-white/5 transition-all hover:bg-white/10 hover:text-white hover:ring-white/10 disabled:opacity-50"
              disabled={isSubmitting}
              onClick={() => handleBannerChange("")}
              type="button"
            >
              Clear banner
            </Button>
          ) : null}
        </div>
      </div>

      <Button
        className={SUBMIT_BUTTON_CLASS}
        disabled={isSubmitting}
        form={formId}
        type="submit"
      >
        {isSubmitting ? "Saving..." : "Save changes"}
      </Button>
    </form>
  );
}

export function AccountSettingsForm({
  close,
  form,
  formId,
  handleAccountSubmit,
  handleChange,
  section = "account",
}) {
  const accountState = useAccount();
  const currentAccount = accountState?.account || accountState?.profile;

  const Form =
    section === "avatar-banner" ? SurfaceMediaForm : SurfaceAccountInfoForm;

  return (
    <Form
      key={currentAccount?.id || "anonymous"}
      close={close}
      currentAccount={currentAccount}
      form={form}
      formId={formId}
      handleAccountSubmit={handleAccountSubmit}
      handleChange={handleChange}
    />
  );
}

export const AccountProfileSettingsForm = AccountSettingsForm;

function EmailSection({ account, auth }) {
  const toast = useToast();
  const [email, setEmail] = useState(account?.email || "");
  const [pending, setPending] = useState(false);

  async function updateEmail() {
    setPending(true);
    try {
      const { error } = await auth.client.auth.updateUser({ email });
      if (error) throw error;
      toast.info("Check your inbox to confirm the new email");
    } catch (error) {
      toast.error(error.message || "Email could not be updated");
    } finally {
      setPending(false);
    }
  }

  const isCurrentEmail = email.trim() === (account?.email || "").trim();

  return (
    <div className="flex flex-col gap-2.5">
      <Input
        aria-label="New email"
        className={INPUT_BASE_CLASSES}
        disabled={pending}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="New email"
        type="email"
        value={email}
      />
      <Button
        className={SUBMIT_BUTTON_CLASS}
        disabled={pending || !auth?.client || !email.trim() || isCurrentEmail}
        onClick={() => void updateEmail()}
        type="button"
      >
        {pending ? "Verifying..." : "Verify and update email"}
      </Button>
    </div>
  );
}

function ProvidersSection({
  auth,
  identities: providedIdentities,
  reloadSecurity,
  user,
}) {
  const toast = useToast();
  const [linkingProvider, setLinkingProvider] = useState(null);
  const [unlinkingProvider, setUnlinkingProvider] = useState(null);
  const [unlinkedIds, setUnlinkedIds] = useState(() => new Set());

  const activeIdentities = useMemo(() => {
    const rawIdentities = providedIdentities?.length
      ? providedIdentities
      : user?.identities || [];
    return rawIdentities.filter(
      (id) => !unlinkedIds.has(id?.id || id?.identity_id),
    );
  }, [providedIdentities, unlinkedIds, user?.identities]);

  const linkedOAuthMap = useMemo(() => {
    const map = new Map();
    for (const identity of activeIdentities) {
      const key = normalizeOAuthProviderKey(identity?.provider);
      if (key && OAUTH_PROVIDER_CONFIG[key]) {
        map.set(key, identity);
      }
    }
    return map;
  }, [activeIdentities]);

  const connectedList = useMemo(() => {
    const list = [];
    for (const [key, identity] of linkedOAuthMap.entries()) {
      list.push({
        config: OAUTH_PROVIDER_CONFIG[key],
        identity,
        key,
      });
    }
    return list;
  }, [linkedOAuthMap]);

  const availableList = useMemo(() => {
    return Object.values(OAUTH_PROVIDER_CONFIG).filter(
      (item) => !linkedOAuthMap.has(item.key),
    );
  }, [linkedOAuthMap]);

  async function handleUnlink(item) {
    if (unlinkingProvider || !auth?.client) return;

    if (activeIdentities.length < 2) {
      toast.error("Keep at least one sign-in method connected to this account");
      return;
    }

    setUnlinkingProvider(item.key);
    try {
      await unlinkIdentity(auth.client, item.identity);
      const targetId = item.identity?.id || item.identity?.identity_id;
      if (targetId) {
        setUnlinkedIds((prev) => new Set([...prev, targetId]));
      }
      toast.success(`${item.config.label} disconnected`);
      await reloadSecurity?.();
      await auth.refresh?.();
    } catch (error) {
      if (
        error.message?.toLowerCase().includes("manual linking") ||
        error.message?.toLowerCase().includes("manual_linking")
      ) {
        toast.error(
          `${item.config.label} disconnecting is disabled. Enable "Manual Linking" in Supabase Auth settings, then try again`,
        );
      } else {
        toast.error(
          error.message || `${item.config.label} could not be disconnected`,
        );
      }
    } finally {
      setUnlinkingProvider(null);
    }
  }

  async function handleLink(config) {
    if (linkingProvider || !auth?.client) return;

    setLinkingProvider(config.key);
    try {
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent("/account")}`;
      await linkIdentity(auth.client, {
        provider: config.supabaseProvider,
        redirectTo,
      });
    } catch (error) {
      setLinkingProvider(null);
      if (
        error.message?.toLowerCase().includes("manual linking") ||
        error.message?.toLowerCase().includes("manual_linking")
      ) {
        toast.error(
          `${config.label} linking is disabled. Enable "Manual Linking" in Supabase Auth settings, then try again`,
        );
      } else {
        toast.error(error.message || `${config.label} connection failed`);
      }
    }
  }

  return (
    <div className="flex flex-col gap-2.5">
      {connectedList.map((item) => {
        const isDisconnecting = unlinkingProvider === item.key;

        return (
          <div
            className="flex h-11 w-full items-center justify-between rounded-[20px] bg-white/5 p-1 pl-4 text-white ring-1 ring-inset ring-white/5"
            key={item.key}
          >
            <div className="flex min-w-0 items-center gap-3">
              <Icon
                aria-hidden="true"
                className="shrink-0"
                icon={item.config.icon}
                size={18}
              />
              <span className="truncate text-sm font-medium text-white">
                {item.config.label}
              </span>
            </div>
            <Button
              className="flex h-9 items-center justify-center rounded-[16px] bg-error/10 px-3.5 py-1 text-xs font-semibold text-error ring-1 ring-inset ring-error/20 transition-all hover:bg-error/20 disabled:opacity-50"
              disabled={Boolean(unlinkingProvider)}
              onClick={() => void handleUnlink(item)}
              type="button"
            >
              {isDisconnecting ? "Disconnecting" : "Disconnect"}
            </Button>
          </div>
        );
      })}

      {availableList.map((config) => {
        const isConnecting = linkingProvider === config.key;

        return (
          <Button
            className="flex h-11 w-full items-center justify-between rounded-[20px] bg-white/5 px-4 text-white/70 ring-1 ring-inset ring-white/5 transition-all hover:bg-white/10 hover:text-white hover:ring-white/10 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={Boolean(linkingProvider)}
            key={config.key}
            onClick={() => void handleLink(config)}
            type="button"
          >
            <span className="flex min-w-0 items-center gap-3">
              <Icon
                aria-hidden="true"
                className="shrink-0 text-white/70"
                icon={config.icon}
                size={18}
              />
              <span className="truncate text-sm font-medium">
                {isConnecting
                  ? `Connecting ${config.label}...`
                  : `Connect ${config.label}`}
              </span>
            </span>
            <Icon
              aria-hidden="true"
              className="shrink-0 text-white/50"
              icon="solar:link-linear"
              size={16}
            />
          </Button>
        );
      })}
    </div>
  );
}

function SessionsSection({
  reloadSecurity,
  revokeOthers,
  revokeSession,
  securityLoading = false,
  sessions = [],
}) {
  const toast = useToast();
  const [busySessionId, setBusySessionId] = useState(null);
  const [busyRevokingOthers, setBusyRevokingOthers] = useState(false);

  async function onRevoke(sessionId) {
    if (!sessionId || busySessionId) return;
    setBusySessionId(sessionId);
    try {
      await revokeSession?.(sessionId);
      await reloadSecurity?.();
      toast.success("Session revoked");
    } catch (error) {
      toast.error(error?.message || "Failed to revoke session");
    } finally {
      setBusySessionId(null);
    }
  }

  async function onRevokeOthers() {
    if (busyRevokingOthers) return;
    setBusyRevokingOthers(true);
    try {
      await revokeOthers?.();
      await reloadSecurity?.();
      toast.success("Other sessions revoked");
    } catch (error) {
      toast.error(error?.message || "Failed to revoke other sessions");
    } finally {
      setBusyRevokingOthers(false);
    }
  }

  if (securityLoading && sessions.length === 0) {
    return (
      <div className="flex flex-col gap-2.5">
        {Array.from({ length: 2 }).map((_, index) => (
          <div
            className="flex w-full animate-pulse items-center justify-between gap-3 rounded-[20px] bg-white/5 p-3 ring-1 ring-inset ring-white/5"
            key={`session-skeleton-${index}`}
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="size-10 shrink-0 rounded-xl bg-white/10" />
              <div className="flex min-w-0 flex-col gap-1.5">
                <div className="h-3.5 w-32 rounded-full bg-white/10" />
                <div className="h-2.5 w-48 rounded-full bg-white/5" />
              </div>
            </div>
            <div className="h-6 w-16 shrink-0 rounded-full bg-white/10" />
          </div>
        ))}
      </div>
    );
  }

  const otherSessions = sessions.filter((s) => !s.is_current);

  return (
    <div className="flex flex-col gap-2.5">
      {sessions.length ? (
        sessions.map((session) => {
          const isCurrent = Boolean(session.is_current);
          const isBusy = busySessionId === session.session_id;

          return (
            <div
              className="flex w-full items-center justify-between gap-3 rounded-[20px] bg-white/5 p-3 text-white ring-1 ring-inset ring-white/5"
              key={session.session_id}
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/5 text-white/70 ring-1 ring-inset ring-white/5">
                  <Icon icon="solar:monitor-smartphone-bold" size={20} />
                </div>
                <div className="flex min-w-0 flex-col justify-center gap-0.5">
                  <span className="truncate text-sm font-semibold text-white">
                    {session.user_agent || "Browser session"}
                  </span>
                  <span className="truncate text-xs text-white/50">
                    {isCurrent
                      ? "Current session"
                      : session.ip_address || "Remote session"}
                  </span>
                </div>
              </div>

              <div className="flex shrink-0 items-center">
                {isCurrent ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400 ring-1 ring-inset ring-emerald-500/20">
                    <span className="size-1.5 rounded-full bg-emerald-400" />
                    Current
                  </span>
                ) : (
                  <Button
                    className="rounded-lg px-2.5 py-1 text-xs font-semibold text-error/80 transition-all hover:bg-error/10 hover:text-error disabled:opacity-50"
                    disabled={isBusy}
                    onClick={() => void onRevoke(session.session_id)}
                    type="button"
                  >
                    {isBusy ? "Revoking..." : "Revoke"}
                  </Button>
                )}
              </div>
            </div>
          );
        })
      ) : (
        <div className="flex min-h-24 w-full items-center justify-center rounded-[20px] bg-white/5 p-4 text-center ring-1 ring-inset ring-white/5">
          <span className="text-xs text-white/50">No active sessions found</span>
        </div>
      )}

      {otherSessions.length ? (
        <Button
          className="flex h-11 w-full items-center justify-center rounded-[20px] bg-white/5 px-4 text-xs font-semibold text-white/70 ring-1 ring-inset ring-white/5 transition-all hover:bg-white/10 hover:text-white hover:ring-white/10 disabled:opacity-50"
          disabled={busyRevokingOthers}
          onClick={() => void onRevokeOthers()}
          type="button"
        >
          {busyRevokingOthers ? "Signing out..." : "Sign out other sessions"}
        </Button>
      ) : null}
    </div>
  );
}

function PasskeysSection({
  auth,
  passkeys = [],
  reloadSecurity,
  securityLoading = false,
}) {
  const toast = useToast();
  const [pending, setPending] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState("");

  async function addPasskey() {
    setPending(true);
    try {
      await registerPasskey(auth.client);
      await reloadSecurity?.();
      toast.success("Passkey added successfully");
    } catch (error) {
      toast.error(error?.message || "Failed to add passkey");
    } finally {
      setPending(false);
    }
  }

  async function removePasskey(passkeyId) {
    setPending(true);
    try {
      await deletePasskey(auth.client, { passkeyId });
      await reloadSecurity?.();
      toast.success("Passkey removed");
    } catch (error) {
      toast.error(error?.message || "Failed to remove passkey");
    } finally {
      setPending(false);
    }
  }

  async function saveRename(passkeyId) {
    if (!editingName.trim()) return;
    setPending(true);
    try {
      await renamePasskey(auth.client, {
        friendlyName: editingName.trim(),
        passkeyId,
      });
      setEditingId(null);
      setEditingName("");
      await reloadSecurity?.();
      toast.success("Passkey renamed");
    } catch (error) {
      toast.error(error?.message || "Failed to rename passkey");
    } finally {
      setPending(false);
    }
  }

  if (securityLoading && passkeys.length === 0) {
    return (
      <div className="flex flex-col gap-2.5">
        {Array.from({ length: 2 }).map((_, index) => (
          <div
            className="flex h-11 w-full animate-pulse items-center justify-between rounded-[20px] bg-white/5 px-4 ring-1 ring-inset ring-white/5"
            key={`passkey-skeleton-${index}`}
          >
            <div className="h-3.5 w-28 rounded-full bg-white/10" />
            <div className="h-6 w-16 rounded-lg bg-white/10" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      {passkeys.length ? (
        passkeys.map((passkey) => {
          const passkeyId = passkey.id || passkey.passkeyId;
          const friendlyName =
            passkey.friendlyName || passkey.friendly_name || "Passkey";
          const isRenaming = editingId === passkeyId;

          return (
            <div
              className={cn(
                "w-full rounded-[20px] bg-white/5 text-white p-1 ring-1 ring-inset ring-white/5",
                isRenaming
                  ? "flex flex-col gap-2.5 p-0 bg-transparent ring-0"
                  : "flex h-auto items-center justify-between",
              )}
              key={passkeyId}
            >
              {isRenaming ? (
                <>
                  <Input
                    autoFocus
                    className={INPUT_BASE_CLASSES}
                    onChange={(event) => setEditingName(event.target.value)}
                    placeholder="Passkey name"
                    value={editingName}
                  />
                  <div className="flex gap-2.5 w-full">
                    <Button
                      disabled={pending || !editingName.trim()}
                      onClick={() => void saveRename(passkeyId)}
                      className={SUBMIT_BUTTON_CLASS}
                      type="button"
                    >
                      {pending ? "Saving..." : "Save"}
                    </Button>
                    <Button
                      className="size-10 center shrink-0 rounded-[20px] bg-white/5 text-xs cursor-pointer uppercase text-white/70 ring-1 ring-inset ring-white/5 transition-all hover:bg-white/10 hover:text-white"
                      disabled={pending}
                      onClick={() => {
                        setEditingId(null);
                        setEditingName("");
                      }}
                      type="button"
                    >
                      <Icon icon={"solar:close-bold"}/>
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-sm ml-3">
                      {friendlyName}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      className="py-2 px-4 rounded-[20px] text-xs text-white/70 transition-all hover:bg-white/10 hover:text-white disabled:opacity-50"
                      disabled={pending}
                      onClick={() => {
                        setEditingId(passkeyId);
                        setEditingName(friendlyName);
                      }}
                      type="button"
                    >
                      Rename
                    </Button>
                    <Button
                      className={cn("py-2 px-4 rounded-[20px] text-xs font-semibold cursor-pointer text-white/70 transition-all hover:bg-white/10 disabled:opacity-50", DESTRUCTIVE_ACTION_TONE_CLASS)}
                      disabled={pending}
                      onClick={() => void removePasskey(passkeyId)}
                      type="button"
                    >
                      Remove
                    </Button>
                  </div>
                </>
              )}
            </div>
          );
        })
      ) : (
        <div className="flex min-h-24 w-full items-center justify-center rounded-[20px] bg-white/5 p-4 text-center ring-1 ring-inset ring-white/5">
          <span className="text-xs text-white/50">No passkeys registered</span>
        </div>
      )}

      <Button
        className={SUBMIT_BUTTON_CLASS}
        disabled={pending || !auth?.client}
        onClick={() => void addPasskey()}
        type="button"
      >
        <Icon icon="solar:key-bold" size={16} />
        {pending ? "Adding..." : "Add passkey"}
      </Button>
    </div>
  );
}

function AuthenticatorSection({ auth, factors = [], reloadSecurity }) {
  const toast = useToast();
  const [pending, setPending] = useState(false);
  const [enrollment, setEnrollment] = useState(null);
  const [code, setCode] = useState("");
  const verifiedRef = useRef(false);

  useEffect(() => {
    if (!enrollment?.id || !auth?.client) return;
    const factorId = enrollment.id;
    verifiedRef.current = false;

    return () => {
      if (!verifiedRef.current) {
        void unenrollMfa(auth.client, { factorId }).catch(() => {});
      }
    };
  }, [auth?.client, enrollment?.id]);

  async function removeFactor(factorId) {
    setPending(true);
    try {
      await unenrollMfa(auth.client, { factorId });
      await reloadSecurity?.();
      toast.success("Authenticator removed");
    } catch (error) {
      toast.error(error?.message || "Failed to remove authenticator");
    } finally {
      setPending(false);
    }
  }

  async function beginEnrollment() {
    setPending(true);
    try {
      setEnrollment(await enrollMfa(auth.client));
    } catch (error) {
      toast.error(error?.message || "Failed to setup authenticator");
    } finally {
      setPending(false);
    }
  }

  async function confirmEnrollment() {
    if (!enrollment?.id || !code) return;
    setPending(true);
    try {
      await verifyMfa(auth.client, { code, factorId: enrollment.id });
      verifiedRef.current = true;
      setEnrollment(null);
      setCode("");
      await reloadSecurity?.();
      toast.success("Authenticator enabled");
    } catch (error) {
      toast.error(error?.message || "Invalid authenticator code");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-2.5">
      {factors.length ? (
        factors.map((factor) => (
          <div
            className="flex h-11 w-full items-center justify-between"
            key={factor.id}
          >
            <div className="flex min-w-0 items-center gap-3">
              <Icon
                className="shrink-0 text-emerald-400"
                icon="solar:shield-check-bold"
                size={18}
              />
              <span className="truncate text-sm font-medium text-white">
                {factor.friendly_name || factor.factor_type || "Authenticator"}
              </span>
            </div>
            <Button
              className="rounded-lg px-2.5 py-1 text-xs font-semibold text-error/80 transition-all hover:bg-error/10 hover:text-error disabled:opacity-50"
              disabled={pending}
              onClick={() => void removeFactor(factor.id)}
              type="button"
            >
              Remove
            </Button>
          </div>
        ))
      ) : !enrollment ? (
        <div className="flex min-h-24 w-full items-center justify-center rounded-[20px] bg-white/5 p-4 text-center ring-1 ring-inset ring-white/5">
          <span className="text-xs text-white/50">
            No authenticator factor configured
          </span>
        </div>
      ) : null}

      {enrollment ? (
        <div className="flex flex-col items-center gap-2.5">
          {enrollment.totp?.qr_code ? (
            <AdaptiveImage
              alt="Authenticator QR code"
              className="size-full object-contain"
              src={enrollment.totp.qr_code}
              wrapperClassName="size-40 rounded-xl bg-white p-2"
            />
          ) : null}
          <p className="text-center text-xs text-white/50">
            Scan the QR code, then enter the six-digit code
          </p>
          <Input
            className={INPUT_BASE_CLASSES}
            inputMode="numeric"
            maxLength={6}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
            placeholder="000000"
            value={code}
          />
          <Button
            className={SUBMIT_BUTTON_CLASS}
            disabled={pending || code.length !== 6}
            onClick={() => void confirmEnrollment()}
            type="button"
          >
            {pending ? "Verifying..." : "Verify code"}
          </Button>
        </div>
      ) : null}

      {!factors.length && !enrollment ? (
        <Button
          className={SUBMIT_BUTTON_CLASS}
          disabled={pending || !auth?.client}
          onClick={() => void beginEnrollment()}
          type="button"
        >
          <Icon icon="solar:shield-check-bold" size={16} />
          {pending ? "Setting up..." : "Add authenticator"}
        </Button>
      ) : null}
    </div>
  );
}

function DeleteSection({ deleteAccount }) {
  const toast = useToast();
  const [confirmation, setConfirmation] = useState("");
  const [pending, setPending] = useState(false);

  async function submit() {
    setPending(true);
    try {
      await deleteAccount?.(confirmation);
    } catch (error) {
      toast.error(error?.message || "Failed to delete account");
    } finally {
      setPending(false);
    }
  }

  const canDelete = confirmation === "DELETE";

  return (
    <div className="flex flex-col gap-2.5">
      <Input
        aria-label='Type "DELETE" to confirm'
        className={INPUT_BASE_CLASSES}
        disabled={pending}
        onChange={(event) => setConfirmation(event.target.value)}
        placeholder='Type "DELETE" to confirm'
        value={confirmation}
      />
      <Button
        className="flex h-11 w-full items-center justify-center rounded-[20px] bg-error/10 text-xs font-semibold uppercase text-error ring-1 ring-inset ring-error/20 transition-all hover:bg-error/20 disabled:opacity-50"
        disabled={pending || !canDelete}
        onClick={() => void submit()}
        type="button"
      >
        {pending ? "Deleting..." : "Delete account"}
      </Button>
    </div>
  );
}

export function AccountEditSettings({
  account,
  auth,
  deleteAccount,
  factors,
  identities,
  passkeys,
  reloadSecurity,
  revokeOthers,
  revokeSession,
  section,
  securityLoading,
  sessions,
  user,
}) {
  if (section === "email")
    return <EmailSection account={account} auth={auth} />;
  if (section === "providers")
    return (
      <ProvidersSection
        auth={auth}
        identities={identities}
        reloadSecurity={reloadSecurity}
        user={user}
      />
    );
  if (section === "sessions")
    return (
      <SessionsSection
        reloadSecurity={reloadSecurity}
        revokeOthers={revokeOthers}
        revokeSession={revokeSession}
        securityLoading={securityLoading}
        sessions={sessions}
      />
    );
  if (section === "passkeys")
    return (
      <PasskeysSection
        auth={auth}
        passkeys={passkeys}
        reloadSecurity={reloadSecurity}
        securityLoading={securityLoading}
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

function SurfaceFrame({ children }) {
  return <div className="flex flex-col gap-2.5">{children}</div>;
}

export function createAccountEditSurfaceEntry(
  settingKey = "overview",
  props = {},
  config = {},
) {
  const meta = SETTING_META[settingKey] || SETTING_META.overview;

  return {
    component: AccountEditSurface,
    description: meta.description,
    expandHorizontal: false,
    icon: meta.icon,
    props: { settingKey, ...props },
    title: meta.title,
    ...config,
  };
}

export function AccountEditSurface({
  close,
  settingKey = "overview",
  ...props
}) {
  const state = useAccountEditState(settingKey);

  if (settingKey === "overview") {
    return <AccountEditMenu state={state} />;
  }

  if (
    settingKey === "account" ||
    settingKey === "profile" ||
    settingKey === "avatar-banner"
  ) {
    return (
      <SurfaceFrame>
        <AccountSettingsForm
          close={close}
          section={settingKey}
          {...props}
        />
      </SurfaceFrame>
    );
  }

  return (
    <SurfaceFrame>
      <AccountEditSettings
        {...(props.account ? props : state.sharedSecurityProps)}
        close={close}
        section={settingKey}
      />
    </SurfaceFrame>
  );
}

export default AccountEditSurface;
