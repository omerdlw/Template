"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { NavSurfaceExtension, useNavigationActions } from "@/modules/nav";
import { Button, Icon } from "@/ui/primitives";
import { cn } from "@/shared/utils";

export function createTestSurfaceEntry(stepKey = "overview", props = {}) {
  return {
    component: TestSurface,
    title:
      stepKey === "overview"
        ? "Test Laboratuvarı"
        : "Derin Telemetri Detayı",
    description: "Tam donanımlı yüzey ve uzantı mimarisi",
    icon: "solar:test-tube-minimalistic-bold",
    props: { stepKey, ...props },
  };
}

export function TestSurface({
  close,
  stepKey = "overview",
}) {
  const { openSurface } = useNavigationActions();
  const [activeTab, setActiveTab] = useState("overview");
  const [isExpanded, setIsExpanded] = useState(false);
  const [syncCount, setSyncCount] = useState(1);
  const [sliderVal, setSliderVal] = useState(840);
  const [springActive, setSpringActive] = useState(true);
  const [tapCount, setTapCount] = useState(0);

  if (stepKey === "detail") {
    return (
      <div className="flex w-full flex-col gap-3 text-white">
        <NavSurfaceExtension id="test-substep-badge" align="left">
          <div className="flex h-6 items-center gap-1.5 px-2 text-xs font-medium text-sky-400 whitespace-nowrap select-none">
            <Icon icon="solar:shield-check-bold" size={12} />
            <span>Detay</span>
          </div>
        </NavSurfaceExtension>

        <NavSurfaceExtension id="test-substep-action" align="right">
          <Button
            type="button"
            onClick={() => close?.()}
            className="flex h-6 items-center gap-1 rounded-full px-2 text-xs font-medium ring-1 ring-inset ring-white/5 bg-white/5 text-white/70 hover:text-white hover:bg-white/10 transition-all cursor-pointer select-none"
          >
            <Icon icon="solar:close-circle-linear" size={12} />
            <span>Kapat</span>
          </Button>
        </NavSurfaceExtension>

        <div className="rounded-[22px] bg-white/5 p-4 ring-1 ring-inset ring-white/10 backdrop-blur-sm shadow-[0_4px_20px_rgba(0,0,0,0.25)] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex size-6 items-center justify-center rounded-lg bg-sky-500/10 text-sky-400 ring-1 ring-sky-500/20">
                <Icon icon="solar:layers-minimalistic-bold" size={14} />
              </div>
              <h3 className="text-xs font-semibold text-white">
                2. Adım: Alt Seviye Navigasyon
              </h3>
            </div>
            <span className="rounded-full bg-sky-500/10 px-2 py-0.5 text-xs font-mono font-medium text-sky-400 ring-1 ring-sky-500/20">
              Derinlik: 2 / 2
            </span>
          </div>

          <p className="text-xs text-white/70 leading-relaxed font-normal">
            Surface üstüne dikkat edin: <strong className="text-white font-medium">Kapat [ ✕ ]</strong> butonunun hemen yanında sinematik açılışla <strong className="text-white font-medium">Geri [ ← ]</strong> butonu belirdi
          </p>

          <div className="rounded-xl bg-black/60 p-3 ring-1 ring-white/5 space-y-2 text-xs">
            <div className="flex justify-between items-center py-0.5 border-b border-white/5">
              <span className="text-xs text-white/50">Üst Kontroller</span>
              <span className="font-mono text-xs text-emerald-400 font-medium flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-emerald-400" />
                [ ✕ ] + [ ← ] Yatay Dizi
              </span>
            </div>
            <div className="flex justify-between items-center py-0.5 border-b border-white/5">
              <span className="text-xs text-white/50">Geçiş Süresi</span>
              <span className="font-mono text-xs text-sky-400">840ms Sinematik</span>
            </div>
            <div className="flex justify-between items-center py-0.5">
              <span className="text-xs text-white/50">Geri Dönüş Yöntemi</span>
              <span className="font-mono text-xs text-white/70">Üst Buton veya Aşağıdaki Buton</span>
            </div>
          </div>
        </div>

        <Button
          type="button"
          onClick={() => window.history?.back?.() || close?.()}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-[18px] bg-white/10 text-xs font-semibold text-white ring-1 ring-inset ring-white/10 hover:bg-white/15 active:scale-95 transition-all duration-150 cursor-pointer"
        >
          <Icon icon="solar:alt-arrow-left-bold" size={15} />
          <span>Önceki Adıma Geri Dön</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-3 text-white">
      {/* Sol Uzantı: Durum Bildirimi */}
      <NavSurfaceExtension id="test-status-badge" align="left">
        <div className="flex h-6 items-center gap-1.5 px-2 text-xs font-medium select-none whitespace-nowrap">
          <span className="relative flex size-1.5 items-center justify-center">
            <span className="absolute inline-flex h-2 w-2 animate-ping rounded-full bg-emerald-400/50" />
            <span className="relative inline-flex size-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
          </span>
          <span className="text-white text-xs font-medium">Canlı</span>
        </div>
      </NavSurfaceExtension>

      {/* Orta Uzantı: Segmentli Sekmeler */}
      <NavSurfaceExtension id="test-center-tabs" align="center">
        <div className="flex h-6 shrink-0 items-center gap-0.5 select-none">
          {[
            { key: "overview", label: "Genel", icon: "solar:widget-2-bold" },
            { key: "metrics", label: "Telemetri", icon: "solar:graph-bold" },
            { key: "motion", label: "Dinamik", icon: "solar:magic-stick-3-bold" },
          ].map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <Button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "relative flex h-6 shrink-0 cursor-pointer items-center gap-1 rounded-full px-2 text-xs font-medium transition-colors duration-150 select-none",
                  isActive
                    ? "ring-1 ring-inset ring-white/10 bg-white/10 text-white hover:bg-white/15"
                    : "ring-1 ring-inset ring-white/5 bg-white/5 text-white/70 hover:text-white hover:bg-white/10",
                )}
              >
                <Icon icon={tab.icon} size={11} />
                <span>{tab.label}</span>
              </Button>
            );
          })}
        </div>
      </NavSurfaceExtension>

      {/* Sağ Uzantı: Senkronizasyon Butonu */}
      <NavSurfaceExtension id="test-right-action" align="right">
        <Button
          type="button"
          onClick={() => setSyncCount((c) => c + 1)}
          className="group flex h-6 items-center gap-1 rounded-full px-2 text-xs font-medium ring-1 ring-inset ring-white/5 bg-white/5 text-white/70 hover:text-white hover:bg-white/10 active:scale-95 transition-all select-none cursor-pointer"
          title="Telemetriyi Senkronize Et"
        >
          <Icon
            icon="solar:restart-bold"
            size={11}
            className="text-white/50 group-hover:text-sky-400 group-hover:rotate-180 transition-transform duration-500"
          />
          <span className="font-mono text-xs text-white/70 tabular-nums">
            #{syncCount}
          </span>
        </Button>
      </NavSurfaceExtension>

      {/* SEKME 1: GENEL (OVERVIEW) */}
      {activeTab === "overview" && (
        <div className="space-y-3">
          {/* 1. KART: ÇOK ADIMLI NAVİGASYON */}
          <div className="rounded-[22px] bg-white/5 p-4 ring-1 ring-inset ring-white/10 backdrop-blur-sm shadow-[0_4px_20px_rgba(0,0,0,0.25)] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex size-6 items-center justify-center rounded-lg bg-sky-500/10 text-sky-400 ring-1 ring-sky-500/20">
                  <Icon icon="solar:layers-minimalistic-bold" size={14} />
                </div>
                <h3 className="text-xs font-semibold text-white">
                  Çok Adımlı Navigasyon Akışı
                </h3>
              </div>
              <span className="rounded-full bg-white/5 px-2 py-0.5 text-xs font-mono font-medium text-white/70 ring-1 ring-white/10">
                Adım 1 / 2
              </span>
            </div>

            <p className="text-xs text-white/70 leading-relaxed font-normal">
              Alt görünüm açıldığında, üst kontrollerdeki kapat butonunun hemen yanına sinematik geri butonu eklenir
            </p>

            <Button
              type="button"
              onClick={() => {
                void openSurface(createTestSurfaceEntry("detail"));
              }}
              className="group flex h-10 w-full items-center justify-between rounded-[16px] bg-white/5 px-3.5 text-xs font-medium text-white ring-1 ring-inset ring-white/5 hover:bg-white/10 hover:ring-white/10 active:scale-95 transition-all duration-150 cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="flex size-6 items-center justify-center rounded-md bg-white/10 text-white group-hover:bg-white group-hover:text-black transition-colors">
                  <Icon icon="solar:arrow-right-up-bold" size={13} />
                </div>
                <span className="font-medium text-white group-hover:text-white">
                  Alt Düzey Görünüme Geç
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-white/50 group-hover:text-white group-hover:translate-x-0.5 transition-all">
                <span className="text-xs">Detaylar</span>
                <Icon icon="solar:alt-arrow-right-linear" size={14} />
              </div>
            </Button>
          </div>

          {/* 2. KART: DİNAMİK YÜKSEKLİK & RESIZE */}
          <div className="rounded-[22px] bg-white/5 p-4 ring-1 ring-inset ring-white/10 backdrop-blur-sm shadow-[0_4px_20px_rgba(0,0,0,0.25)] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex size-6 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20">
                  <Icon icon="solar:tuning-square-bold" size={14} />
                </div>
                <h3 className="text-xs font-semibold text-white">
                  Dinamik Boyutlandırma & Düzen
                </h3>
              </div>
              <Button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex h-7 items-center gap-1.5 rounded-full bg-white/5 px-2.5 text-xs font-medium text-white/70 hover:bg-white/10 hover:text-white ring-1 ring-white/5 active:scale-95 transition-all cursor-pointer"
              >
                <span>{isExpanded ? "Özeti Gizle" : "Özeti Göster"}</span>
                <Icon
                  icon="solar:alt-arrow-down-linear"
                  size={12}
                  className={cn("transition-transform duration-300", isExpanded && "rotate-180")}
                />
              </Button>
            </div>

            <p className="text-xs text-white/70 leading-relaxed font-normal">
              İçerik değiştikçe kart yüksekliği 840ms sinematik eğriyle kesintisiz olarak adapte olur
            </p>

            <AnimatePresence initial={false}>
              {isExpanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.52, ease: [0.76, 0, 0.24, 1] }}
                  className="overflow-hidden pt-1"
                >
                  <div className="rounded-xl bg-black/60 p-3 ring-1 ring-white/5 space-y-2 text-xs">
                    <div className="flex items-center justify-between py-0.5 border-b border-white/5">
                      <span className="text-xs text-white/50">Yüzey Mimarisi</span>
                      <span className="font-mono text-xs text-white flex items-center gap-1.5">
                        <span className="size-1.5 rounded-full bg-emerald-400" />
                        In-Flow Sıfır-Header
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-0.5 border-b border-white/5">
                      <span className="text-xs text-white/50">Üst Kontroller</span>
                      <span className="font-mono text-xs text-white flex items-center gap-1.5">
                        <span className="size-1.5 rounded-full bg-sky-400" />
                        Sağ Üst Dizi (Row)
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-0.5 border-b border-white/5">
                      <span className="text-xs text-white/50">Animasyon Eğrisi</span>
                      <span className="font-mono text-xs text-purple-400">
                        [0.76, 0, 0.24, 1]
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-0.5">
                      <span className="text-xs text-white/50">GPU Kompozisyon</span>
                      <span className="font-mono text-xs text-emerald-400">
                        60 FPS Donanım İvmesi
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* SEKME 2: TELEMETRİ (METRICS) */}
      {activeTab === "metrics" && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-[18px] bg-white/5 p-3 ring-1 ring-white/10 backdrop-blur-sm text-center space-y-1">
              <div className="text-xs font-medium text-white/50 uppercase">Frame Hızı</div>
              <div className="text-base font-bold text-emerald-400 font-mono flex items-center justify-center gap-1.5">
                <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                60 FPS
              </div>
              <div className="text-xs text-white/50">16.6ms Kararlı</div>
            </div>

            <div className="rounded-[18px] bg-white/5 p-3 ring-1 ring-white/10 backdrop-blur-sm text-center space-y-1">
              <div className="text-xs font-medium text-white/50 uppercase">Süre</div>
              <div className="text-base font-bold text-sky-400 font-mono tabular-nums">
                {sliderVal} ms
              </div>
              <div className="text-xs text-white/50">Sinematik Akış</div>
            </div>

            <div className="rounded-[18px] bg-white/5 p-3 ring-1 ring-white/10 backdrop-blur-sm text-center space-y-1">
              <div className="text-xs font-medium text-white/50 uppercase">Katman</div>
              <div className="text-base font-bold text-purple-400 font-mono">GPU</div>
              <div className="text-xs text-white/50">Hardware Layer</div>
            </div>
          </div>

          <div className="rounded-[22px] bg-white/5 p-4 ring-1 ring-inset ring-white/10 backdrop-blur-sm shadow-[0_4px_20px_rgba(0,0,0,0.25)] space-y-3">
            <div className="flex justify-between items-center text-xs">
              <div className="flex items-center gap-2">
                <div className="flex size-6 items-center justify-center rounded-lg bg-sky-500/10 text-sky-400 ring-1 ring-sky-500/20">
                  <Icon icon="solar:speedometer-middle-bold" size={14} />
                </div>
                <span className="font-semibold text-white">Animasyon Süresi Kalibrasyonu</span>
              </div>
              <span className="font-mono text-sky-400 font-semibold text-xs tabular-nums">
                {sliderVal} ms
              </span>
            </div>

            <input
              type="range"
              min="300"
              max="1500"
              step="20"
              value={sliderVal}
              onChange={(e) => setSliderVal(Number(e.target.value))}
              className="w-full accent-sky-400 h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer"
            />

            <div className="flex gap-1.5 pt-1">
              {[
                { label: "Seri", val: 440 },
                { label: "Dengeli", val: 620 },
                { label: "Sinematik (Varsayılan)", val: 840 },
              ].map((preset) => (
                <Button
                  key={preset.val}
                  type="button"
                  onClick={() => setSliderVal(preset.val)}
                  className={cn(
                    "flex-1 h-7 rounded-full text-xs font-medium transition-all cursor-pointer",
                    sliderVal === preset.val
                      ? "ring-1 ring-inset ring-white/10 bg-white/10 text-white hover:bg-white/15"
                      : "ring-1 ring-inset ring-white/5 bg-white/5 text-white/70 hover:text-white hover:bg-white/10",
                  )}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SEKME 3: DİNAMİK (MOTION) */}
      {activeTab === "motion" && (
        <div className="space-y-3">
          <div className="rounded-[22px] bg-white/5 p-4 ring-1 ring-inset ring-white/10 backdrop-blur-sm shadow-[0_4px_20px_rgba(0,0,0,0.25)] space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-white">Gelişmiş Fizik Yay Modeli</div>
                <div className="text-xs text-white/50 mt-0.5">
                  WWDC kritik sönümlü (damping: 1.0) ve kesilebilir akış
                </div>
              </div>
              <Button
                type="button"
                onClick={() => setSpringActive(!springActive)}
                className={cn(
                  "relative h-6 w-11 rounded-full transition-colors duration-200 p-0.5 cursor-pointer",
                  springActive ? "bg-emerald-500" : "bg-white/15",
                )}
                aria-label="Fizik yay modelini aç/kapat"
              >
                <span
                  className={cn(
                    "block size-5 rounded-full bg-white transition-transform duration-200 shadow-md",
                    springActive ? "translate-x-5" : "translate-x-0",
                  )}
                />
              </Button>
            </div>
            <p className="text-xs text-white/70 leading-relaxed font-normal">
              Yay modellerinde kullanıcı animasyon ortasında bile arayüzü yakalayabilir ve ters yöne yönlendirebilir
            </p>
          </div>

          <div className="rounded-[22px] bg-white/5 p-4 ring-1 ring-inset ring-white/10 backdrop-blur-sm shadow-[0_4px_20px_rgba(0,0,0,0.25)] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white">Tepkisellik & Haptik Testi</span>
              <span className="text-xs font-mono text-white/50">
                Dokunuş: {tapCount}
              </span>
            </div>
            <Button
              type="button"
              onClick={() => setTapCount((c) => c + 1)}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-[16px] bg-white/5 text-xs font-medium text-white ring-1 ring-inset ring-white/5 hover:bg-white/10 hover:ring-white/10 active:scale-95 transition-all duration-150 cursor-pointer"
            >
              <Icon icon="solar:bolt-circle-bold" size={16} className="text-amber-400" />
              <span>Dokunun (0 Latency Press Geri Bildirimi)</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default TestSurface;
