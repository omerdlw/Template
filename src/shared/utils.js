import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function toFiniteNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function normalizeFeedbackText(value) {
  if (typeof value !== "string") return value;

  let normalized = value.replace(/\u2026/g, "...").trim();
  while (normalized.endsWith("...") || normalized.endsWith(".")) {
    normalized = normalized.endsWith("...")
      ? normalized.slice(0, -3).trimEnd()
      : normalized.slice(0, -1).trimEnd();
  }
  return normalized;
}
