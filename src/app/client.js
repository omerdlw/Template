"use client";

import { useBackgroundRegistration } from "@/modules/registry";

export function HomeClient() {
  useBackgroundRegistration({
    video: '/download.mp4',
    overlay: true,
    overlayOpacity: 0.6,
    width: '70%',
    noiseStyle: {
      opacity: .5
  },
    fadeEdges: { left: 10, right: 10 },
    videoOptions: {
      autoplay: true,
      muted: true,
      loop: true,
      playbackRate: 1,
    },
  })

  return (
    <main className="relative z-10 min-h-screen">
      <div className="h-screen w-full center text-6xl font-bold">q</div>
      <div className="h-screen w-full center text-6xl font-bold">w</div>
      <div className="h-screen w-full center text-6xl font-bold">s</div>
    </main>
  );
}
