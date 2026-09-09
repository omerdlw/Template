"use client";

import { useBackgroundRegistration } from "@/modules/registry";
import { useNavigationActions } from "@/modules/nav";
import { createTestSurfaceEntry } from "@/domains/test/test-surface";
import { Button, Icon } from "@/ui/primitives";
import { HomeRegistry } from "./registry";

export function HomeClient() {
  const { openSurface } = useNavigationActions();

  return (
    <>
      <HomeRegistry />
      <div className="flex min-h-screen w-full flex-col items-center justify-center p-6 select-none">
        <div className="flex flex-col items-center gap-5 max-w-sm text-center">
          <div className="center size-16 rounded-[22px] bg-white/5 ring-1 ring-white/10 text-sky-400 shadow-2xl backdrop-blur-xl">
            <Icon icon="solar:test-tube-minimalistic-bold" size={32} />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-xl font-bold text-white">
              Nav Surface Laboratuvarı
            </h1>
            <p className="text-xs text-white/50 leading-relaxed">
              Extensions bar, üst kontroller (Close / Back / Custom Action) ve sinematik geçişleri test edin
            </p>
          </div>
          <Button
            type="button"
            onClick={() => void openSurface(createTestSurfaceEntry())}
            className="flex items-center gap-2.5 rounded-full bg-white px-6 py-3 text-xs font-semibold text-black transition-all hover:bg-white/70 hover:scale-105 active:scale-95 shadow-xl shadow-white/10 cursor-pointer"
          >
            <Icon icon="solar:play-circle-bold" size={18} />
            <span>Test Surface&apos;i Aç</span>
          </Button>
        </div>
      </div>
    </>
  );
}
