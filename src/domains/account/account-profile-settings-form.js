"use client";

import { Button, Input, Textarea } from "@/ui/primitives";
import AdaptiveImage from "@/ui/components/adaptive-image";
import {
  Field,
  INPUT_BASE_CLASSES,
  SectionCard,
  SurfaceAction,
  TEXTAREA_BASE_CLASSES,
  Toggle,
} from "./account-edit-primitives";

function SurfaceProfileInfoForm({
  form,
  formId,
  handleAccountSubmit,
  handleChange,
}) {
  return (
    <form
      className="flex flex-col gap-2.5"
      id={formId}
      onSubmit={handleAccountSubmit}
    >
      <SectionCard title="Identity">
        <div className="grid gap-2.5 sm:grid-cols-2">
          <Field label="Display name">
            <Input
              className={INPUT_BASE_CLASSES}
              maxLength={80}
              onChange={(event) =>
                handleChange("displayName", event.target.value)
              }
              required
              value={form.displayName}
            />
          </Field>
          <Field label="Username">
            <Input
              className={INPUT_BASE_CLASSES}
              maxLength={30}
              onChange={(event) => handleChange("username", event.target.value)}
              pattern="[a-zA-Z0-9_-]{3,30}"
              required
              value={form.username}
            />
          </Field>
        </div>
        <Field label="Bio">
          <Textarea
            className={TEXTAREA_BASE_CLASSES}
            maxLength={500}
            onChange={(event) => handleChange("bio", event.target.value)}
            placeholder="Tell people a little about yourself"
            value={form.bio}
          />
        </Field>
      </SectionCard>

      <SectionCard title="Privacy">
        <button
          aria-checked={form.isPrivate}
          className="flex w-full items-center justify-between gap-2.5 rounded-xl bg-white/5 p-2.5 text-left ring-1 ring-inset ring-white/5 transition-colors hover:bg-white/10 hover:ring-white/10"
          onClick={() => handleChange("isPrivate", !form.isPrivate)}
          role="switch"
          type="button"
        >
          <span>
            <span className="block text-sm font-semibold text-white/80">
              Private profile
            </span>
            <span className="mt-0.5 block text-xs leading-5 text-white/45">
              Only people you approve can follow you and view private content.
            </span>
          </span>
          <Toggle checked={form.isPrivate} />
        </button>
      </SectionCard>

      <div className="flex justify-end pt-1">
        <Button
          className="rounded-[20px] px-4 py-2 text-xs font-semibold uppercase"
          form={formId}
          type="submit"
        >
          Save changes
        </Button>
      </div>
    </form>
  );
}

function SurfaceMediaForm({ form, formId, handleAccountSubmit, handleChange }) {
  const preview = (value, alt, className) =>
    value ? (
      <AdaptiveImage alt={alt} className={className} src={value} />
    ) : null;
  return (
    <form
      className="flex flex-col gap-2.5"
      id={formId}
      onSubmit={handleAccountSubmit}
    >
      <SectionCard
        description="Use image URLs for the reusable template contract. Storage upload adapters can be added by the host application."
        title="Gallery"
      >
        <div className="overflow-hidden rounded-[20px] bg-white/5 ring-1 ring-inset ring-white/5">
          <div className="relative aspect-[3/1] bg-black/30">
            {preview(
              form.bannerUrl,
              "Banner preview",
              "size-full object-cover",
            )}
            {!form.bannerUrl ? (
              <span className="center absolute inset-0 text-xs text-white/35">
                No banner image
              </span>
            ) : null}
          </div>
          <div className="p-2.5">
            <Field label="Banner URL">
              <Input
                className={INPUT_BASE_CLASSES}
                onChange={(event) =>
                  handleChange("bannerUrl", event.target.value)
                }
                placeholder="https://..."
                type="url"
                value={form.bannerUrl}
              />
            </Field>
          </div>
        </div>
        <div className="grid gap-2.5 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <div className="center min-h-40 overflow-hidden rounded-[20px] bg-white/5 ring-1 ring-inset ring-white/5">
            {preview(
              form.avatarUrl,
              "Avatar preview",
              "size-32 rounded-full object-cover",
            )}
            {!form.avatarUrl ? (
              <span className="text-xs text-white/35">No avatar image</span>
            ) : null}
          </div>
          <div className="flex flex-col justify-center gap-2.5">
            <Field label="Avatar URL">
              <Input
                className={INPUT_BASE_CLASSES}
                onChange={(event) =>
                  handleChange("avatarUrl", event.target.value)
                }
                placeholder="https://..."
                type="url"
                value={form.avatarUrl}
              />
            </Field>
            <SurfaceAction
              onClick={() => {
                handleChange("avatarUrl", "");
                handleChange("bannerUrl", "");
              }}
              type="button"
            >
              Clear images
            </SurfaceAction>
          </div>
        </div>
      </SectionCard>
      <div className="flex justify-end pt-1">
        <Button
          className="rounded-[20px] px-4 py-2 text-xs font-semibold uppercase"
          form={formId}
          type="submit"
        >
          Save changes
        </Button>
      </div>
    </form>
  );
}

export function AccountProfileSettingsForm({
  form,
  formId,
  handleAccountSubmit,
  handleChange,
  section = "profile",
}) {
  const Form =
    section === "avatar-banner" ? SurfaceMediaForm : SurfaceProfileInfoForm;
  return (
    <Form
      form={form}
      formId={formId}
      handleAccountSubmit={handleAccountSubmit}
      handleChange={handleChange}
    />
  );
}
