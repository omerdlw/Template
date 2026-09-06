"use client";

import { cn } from "@/shared/utils";

export const INPUT_BASE_CLASSES =
  "h-11 w-full rounded-[20px] bg-white/5 px-4 text-sm text-white ring-1 ring-inset ring-white/5 transition-all duration-300 ease-in-out placeholder:text-white/50 hover:bg-white/10 hover:ring-white/15 focus:bg-white/10 focus:ring-white/50";

export const TEXTAREA_BASE_CLASSES =
  "min-h-36 w-full resize-none rounded-[20px] bg-white/5 p-4 text-sm text-white ring-1 ring-inset ring-white/5 transition-all duration-300 ease-in-out placeholder:text-white/50 hover:bg-white/10 hover:ring-white/15 focus:bg-white/10 focus:ring-white/50";

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
    <section className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-4 border-b border-white/5 pb-2.5">
        <h2 className="text-sm font-semibold text-white/70">{title}</h2>
      </div>
      {description ? (
        <p className="text-xs leading-5 text-white/45">{description}</p>
      ) : null}
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}

export function SurfaceAction({
  children,
  className,
  danger = false,
  ...props
}) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex min-h-10 items-center justify-center rounded-[20px] px-4 py-2 text-xs font-semibold uppercase transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        danger
          ? "bg-error/10 text-error ring-1 ring-inset ring-error/20 hover:bg-error/20"
          : "bg-white/10 text-white ring-1 ring-inset ring-white/10 hover:bg-white/15",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Toggle({ checked }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative h-6 w-10 shrink-0 rounded-full p-1 transition-colors",
        checked ? "bg-info" : "bg-white/10",
      )}
    >
      <span
        className={cn(
          "block size-4 rounded-full bg-white transition-transform",
          checked ? "translate-x-4" : "translate-x-0",
        )}
      />
    </span>
  );
}
