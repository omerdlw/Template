"use client";

import { cn } from "@/shared/utils";

export const BACKDROP_HERO_GRADIENT = [
  "linear-gradient(to right, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 0.97) 2%, rgba(0, 0, 0, 0.90) 5%, rgba(0, 0, 0, 0.79) 8%, rgba(0, 0, 0, 0.64) 12%, rgba(0, 0, 0, 0.47) 16%, rgba(0, 0, 0, 0.30) 20%, rgba(0, 0, 0, 0.15) 24%, rgba(0, 0, 0, 0.04) 27%, transparent 30%, transparent 70%, rgba(0, 0, 0, 0.04) 73%, rgba(0, 0, 0, 0.15) 76%, rgba(0, 0, 0, 0.30) 80%, rgba(0, 0, 0, 0.47) 84%, rgba(0, 0, 0, 0.64) 88%, rgba(0, 0, 0, 0.79) 92%, rgba(0, 0, 0, 0.90) 95%, rgba(0, 0, 0, 0.97) 98%, rgba(0, 0, 0, 1) 100%)",
  "linear-gradient(to bottom, transparent 0%, transparent 28%, rgba(0, 0, 0, 0.03) 38%, rgba(0, 0, 0, 0.10) 48%, rgba(0, 0, 0, 0.22) 58%, rgba(0, 0, 0, 0.42) 68%, rgba(0, 0, 0, 0.68) 78%, rgba(0, 0, 0, 0.88) 88%, rgba(0, 0, 0, 0.98) 95%, rgba(0, 0, 0, 1) 100%)",
].join(", ");

export const BACKDROP_HERO_GRADIENT_CLASS =
  "pointer-events-none absolute inset-0 z-10";

export function BackdropHero({
  className,
  gradientClassName,
  gradientStyle,
  image,
  imageClassName,
  position = "center 20%",
}) {
  if (!image) return null;

  return (
    <div
      aria-hidden="true"
      className={cn(
        "relative isolate h-80 w-[calc(100%+2rem)] -translate-x-4 overflow-hidden sm:h-96 sm:w-[calc(100%+3rem)] sm:-translate-x-6 lg:h-[clamp(36rem,52vw,44rem)] lg:w-[calc(100%+16rem)] lg:-translate-x-32 xl:h-[clamp(40rem,56vw,48rem)] xl:w-[calc(100%+24rem)] xl:-translate-x-48",
        className,
      )}
    >
      <div
        className={cn("absolute inset-0 bg-cover bg-no-repeat", imageClassName)}
        style={{
          backgroundColor: "var(--black)",
          backgroundImage: `url(${image})`,
          backgroundPosition: position,
        }}
      />
      <div
        className={cn(BACKDROP_HERO_GRADIENT_CLASS, gradientClassName)}
        style={{
          background: BACKDROP_HERO_GRADIENT,
          ...gradientStyle,
        }}
      />
    </div>
  );
}

export default BackdropHero;
