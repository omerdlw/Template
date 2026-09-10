/**
 * ==============================================================================
 * NAV MODULE - MOTION SYSTEM (CENTRAL SOURCE OF TRUTH)
 * ==============================================================================
 * Bu dosya, Nav modülündeki tüm motion token'larını, fizik yaylarını (spring),
 * geçiş (transition) tanımlarını, Framer Motion variant'larını ve dinamik
 * animasyon hesaplama yardımcılarını tek bir çatı altında yönetir.
 *
 * MİMARİ KATMANLAR:
 * 1. FOUNDATIONS & TOKENS (Easings, Tiers, Springs, Stagger Delays)
 * 2. CHOREOGRAPHY & GESTURE TOKENS (Zamanlamalar, Drag Eşikleri, Tap)
 * 3. SEMANTIC TRANSITIONS (Stack, Surface, Deck, Text, Media Geçişleri)
 * 4. COMPONENT VARIANTS (JSX Animasyon Durumları)
 * 5. DYNAMIC MOTION HELPERS (Props, Delay & Style Hesaplayıcılar)
 * 6. BACKWARD COMPATIBILITY ALIASES (Geriye Dönük Uyumluluk Katmanı)
 * ==============================================================================
 */

// ------------------------------------------------------------------------------
// 1. FOUNDATIONS & TOKENS
// ------------------------------------------------------------------------------

/**
 * Cubic Bezier easing eğrileri.
 * - CINEMATIC: Vurgulu, geniş sahne ve yüzey geçişleri için ipeksi yavaşlama.
 * - EMPHASIZED: Hızlı tepki veren, dikkat çekici girişler.
 * - SOFT: Nazik ve pürüzsüz micro/standard hareketler.
 * - EXIT: Hızlı ivmelenen çıkış/kapanış hareketleri.
 */
export const NAV_EASINGS = Object.freeze({
  APPLE_FLUID: Object.freeze([0.82, 0, 0.18, 1]),
  FLUID_RESIZE: Object.freeze([0.32, 0.12, 0.18, 1]), // Apple Fluid Morph: ölü bölge (boşluk gecikmesi) olmadan ilk kareden başlar, kademeli süzülüp ipeksi oturur
  PROGRESSIVE_EXIT: Object.freeze([0.75, 0, 0.85, 0.2]),
  CINEMATIC: Object.freeze([0.76, 0, 0.24, 1]),
  EMPHASIZED: Object.freeze([0.16, 1, 0.3, 1]),
  SOFT: Object.freeze([0.22, 1, 0.36, 1]),
  EXIT: Object.freeze([0.7, 0, 0.84, 0]),
});

/**
 * Ölçek ve mesafe bazlı hiyerarşik hareket kademeleri (motion tiers).
 */
export const NAV_TIERS = Object.freeze({
  MICRO: Object.freeze({
    duration: 0.24,
    distance: 4,
    scaleDelta: 0.008,
    ease: NAV_EASINGS.EMPHASIZED,
  }),
  FAST: Object.freeze({
    duration: 0.44,
    distance: 9,
    scaleDelta: 0.012,
    ease: NAV_EASINGS.EMPHASIZED,
  }),
  STANDARD: Object.freeze({
    duration: 0.66,
    distance: 18,
    scaleDelta: 0.018,
    ease: NAV_EASINGS.SOFT,
  }),
  SURFACE: Object.freeze({
    duration: 0.96,
    distance: 28,
    scaleDelta: 0.024,
    ease: NAV_EASINGS.CINEMATIC,
  }),
});

/**
 * Fizik tabanlı yay (spring) konfigürasyonları.
 */
export const NAV_SPRINGS = Object.freeze({
  PRESS: Object.freeze({
    type: "spring",
    stiffness: 480,
    damping: 32,
    mass: 0.3,
  }),
  BADGE: Object.freeze({
    type: "spring",
    stiffness: 360,
    damping: 20,
    mass: 0.42,
  }),
  DECK: Object.freeze({
    type: "spring",
    stiffness: 240,
    damping: 28,
    mass: 0.85,
  }),
  PEEK: Object.freeze({
    type: "spring",
    stiffness: 260,
    damping: 26,
    mass: 0.8,
  }),
  SCRUBBER_TOOLTIP: Object.freeze({
    damping: 28,
    stiffness: 350,
  }),
});

/**
 * Ardışık öğelerin animasyon gecikme (stagger) sabitleri (saniye cinsinden).
 */
export const NAV_STAGGER_TIMINGS = Object.freeze({
  EXPAND: 0.068,
  COLLAPSE: 0.052,
  PEEK: 0.078,
  STANDARD: 0.06,
  FAST: 0.042,
});

export const NAV_STAGGER_DELAY = NAV_STAGGER_TIMINGS.STANDARD;

// ------------------------------------------------------------------------------
// 2. CHOREOGRAPHY & GESTURE TOKENS
// ------------------------------------------------------------------------------

/**
 * Surface durum makinesinin (state machine scheduler) faz geçişlerini
 * yönettiği milisaniye (ms) bazlı deterministik zamanlamalar.
 * Bu değerler doğrudan Framer Motion tween süreleriyle eşleştirilmiştir.
 */
export const NAV_SURFACE_CHOREOGRAPHY_TIMINGS = Object.freeze({
  ACTION_DISMISS_MS: 260, // NAV_ACTION_DISMISS_TRANSITION (0.26s) ile senkron
  ACTION_DISMISS_SETTLE_MS: 100, // Eylem butonu çıktıktan sonraki bekleme payı
  HEADER_SWAP_MS: 0,
  HEADER_SWAP_SETTLE_MS: 0,
  BODY_ENTER_MS: 840, // NAV_SURFACE_BODY_ENTER_TRANSITION (0.84s) ile senkron
  BODY_EXIT_MS: 320, // Kademeli geçiş 1. faz: yüzey içeriğinin aşağı kayarak kaybolma süresi (0.32s)
  BODY_COLLAPSE_SETTLE_MS: 0,
  HEADER_RESTORE_MS: 520, // Kademeli geçiş 2. faz: başlığın geri yüklenme süresi (0.52s, toplam 840ms)
  RESTORE_SETTLE_MS: 0,
});

/**
 * Compact→Normal restore animasyonunun toplam süresi (ms).
 * NAV_COMPACT_RESTORE_TRANSITION (0.34s) ile eşleştirilmiştir.
 * Compact moddan çıktıktan sonra normal moda tam geçiş bu sürede tamamlanır.
 */
export const NAV_COMPACT_RESTORE_DURATION_MS = 380;

/**
 * Compact→Expand geçiş kapısı: compact→normal animasyonu tamamlandıktan sonra
 * expand aksiyonunun tetiklenmesi için bekleme süresi.
 * Compact moddan doğrudan expand'e geçilmez; önce normal moda geçiş tamamlanır.
 */
export const NAV_COMPACT_TO_EXPAND_DELAY_MS = NAV_COMPACT_RESTORE_DURATION_MS;

export const NAV_COMPACT_TO_SURFACE_DELAY_MS = 380;
export const NAV_SURFACE_HEADER_REVEAL_DELAY_MS = 220;
export const NAV_SURFACE_EXIT_SETTLE_MS = 520;

/**
 * Surface kapanış animasyonu tamamlandıktan sonra compact moda dönüş öncesi
 * normal mod settle bekleme süresi. Surface Close → Normal → Compact sıralamasını
 * garanti eder; compact lock bu süre dolmadan açılmaz.
 */
export const NAV_SURFACE_CLOSE_TO_COMPACT_DELAY_MS = 520;

/**
 * Dokunmatik/tıklama ölçek küçülmesi (Emil Kowalski & Apple fluid standardı).
 */
export const NAV_TAP_SCALE = 0.96;

/**
 * Surface aşağı kaydırarak kapatma (drag-to-dismiss) fizik ve eşik sabitleri.
 */
export const NAV_SURFACE_DRAG_CONSTRAINTS = Object.freeze({
  top: 0,
  bottom: 0,
});

export const NAV_SURFACE_DRAG_ELASTIC = Object.freeze({
  top: 0.05,
  bottom: 0.5,
});

export const NAV_SURFACE_DRAG_THRESHOLDS = Object.freeze({
  DISMISS_OFFSET_Y: 65,
  DISMISS_VELOCITY_Y: 400,
});

export const NAV_SURFACE_DRAG_INTERPOLATION = Object.freeze({
  DRAG_RANGE: Object.freeze([0, 180]),
  OPACITY_RANGE: Object.freeze([1, 0.75]),
  SCALE_RANGE: Object.freeze([1, 0.96]),
});

export const NAV_SURFACE_DRAG = Object.freeze({
  CONSTRAINTS: NAV_SURFACE_DRAG_CONSTRAINTS,
  ELASTIC: NAV_SURFACE_DRAG_ELASTIC,
  THRESHOLDS: NAV_SURFACE_DRAG_THRESHOLDS,
  INTERPOLATION: NAV_SURFACE_DRAG_INTERPOLATION,
});

/**
 * GPU katman kompozisyon stili (titreme ve antialiasing sorunlarını önler).
 */
export const NAV_COMPOSITOR_STYLE = Object.freeze({
  WebkitBackfaceVisibility: "hidden",
  backfaceVisibility: "hidden",
  WebkitFontSmoothing: "antialiased",
});

// ------------------------------------------------------------------------------
// 3. SEMANTIC TRANSITIONS
// ------------------------------------------------------------------------------

// --- Stack & Boyut Geçişleri ---
export const NAV_STACK_TRANSITION = Object.freeze({
  type: "tween",
  duration: NAV_TIERS.STANDARD.duration,
  ease: NAV_EASINGS.SOFT,
});

export const NAV_CARD_HEIGHT_OPEN_TRANSITION = Object.freeze({
  type: "tween",
  duration: 0.84, // NAV_SURFACE_CHOREOGRAPHY_TIMINGS.BODY_ENTER_MS ile senkron
  ease: NAV_EASINGS.APPLE_FLUID,
});

export const NAV_CARD_HEIGHT_CLOSE_TRANSITION = Object.freeze({
  type: "tween",
  duration: 0.84, // NAV_SURFACE_CHOREOGRAPHY_TIMINGS.BODY_EXIT_MS (0.32s) + HEADER_RESTORE_MS (0.52s) = 0.84s ile senkron
  ease: NAV_EASINGS.APPLE_FLUID,
});

export const NAV_CARD_EXPAND_TRANSITION = NAV_CARD_HEIGHT_OPEN_TRANSITION;

// --- Surface & Eylem Geçişleri ---
export const NAV_SURFACE_BODY_ENTER_TRANSITION = Object.freeze({
  type: "tween",
  duration: 0.84,
  ease: NAV_EASINGS.APPLE_FLUID,
});

export const NAV_SURFACE_BODY_EXIT_TRANSITION = Object.freeze({
  type: "tween",
  duration: 0.32, // NAV_SURFACE_CHOREOGRAPHY_TIMINGS.BODY_EXIT_MS (0.32s) ile senkron
  ease: NAV_EASINGS.APPLE_FLUID,
});

export const NAV_SURFACE_RESIZE_TRANSITION = Object.freeze({
  type: "tween",
  duration: 0.58, // Ölü bölge beklemesi olmadan anında başlayan ve ipeksi yavaşlayan akış
  ease: NAV_EASINGS.FLUID_RESIZE,
  height: {
    type: "tween",
    duration: 0.58,
    ease: NAV_EASINGS.FLUID_RESIZE,
  },
  width: {
    type: "tween",
    duration: 0.58,
    ease: NAV_EASINGS.FLUID_RESIZE,
  },
});

export const NAV_SURFACE_BODY_STEP_TRANSITION = Object.freeze({
  type: "tween",
  duration: 0.54, // Yüzey yükseklik süzülmesiyle kilitli 1:1 senkron
  ease: NAV_EASINGS.FLUID_RESIZE,
});

export const NAV_SURFACE_TRANSITION = Object.freeze({
  type: "tween",
  duration: NAV_TIERS.SURFACE.duration,
  ease: NAV_EASINGS.APPLE_FLUID,
});

export const NAV_ACTION_DISMISS_TRANSITION = Object.freeze({
  type: "tween",
  duration: 0.26, // NAV_SURFACE_CHOREOGRAPHY_TIMINGS.ACTION_DISMISS_MS ile senkron
  ease: NAV_EASINGS.EXIT,
});

export const NAV_HEADER_SWAP_TRANSITION = Object.freeze({
  type: "tween",
  duration: 0.52, // NAV_SURFACE_CHOREOGRAPHY_TIMINGS.HEADER_RESTORE_MS (0.52s) ile senkron
  ease: NAV_EASINGS.APPLE_FLUID,
});

export const NAV_SURFACE_CONTROLS_CONTAINER_TRANSITION = Object.freeze({
  type: "tween",
  duration: 0.44,
  ease: NAV_EASINGS.APPLE_FLUID,
});

export const NAV_SURFACE_CONTROLS_ITEM_TRANSITION = Object.freeze({
  type: "tween",
  duration: 0.32,
  ease: NAV_EASINGS.APPLE_FLUID,
});

export const NAV_SURFACE_CONTROLS_ACTION_TRANSITION = Object.freeze({
  type: "tween",
  duration: 0.28,
  ease: NAV_EASINGS.APPLE_FLUID,
});

export const NAV_SURFACE_EXTENSIONS_ENTER_TRANSITION = Object.freeze({
  type: "tween",
  duration: 0.54,
  ease: NAV_EASINGS.CINEMATIC,
});

export const NAV_SURFACE_EXTENSIONS_EXIT_TRANSITION = Object.freeze({
  type: "tween",
  duration: 0.38,
  ease: NAV_EASINGS.EXIT,
});

// --- Deste & Kart Geçişleri ---
export const NAV_CARD_TRANSITION = Object.freeze({
  type: "tween",
  duration: NAV_TIERS.STANDARD.duration,
  ease: NAV_EASINGS.EMPHASIZED,
});

export const NAV_CARD_COLLAPSE_TRANSITION = Object.freeze({
  type: "tween",
  duration: 0.62,
  ease: NAV_EASINGS.EXIT,
});

export const NAV_PEEK_TRANSITION = Object.freeze({
  type: "tween",
  duration: 0.38,
  ease: NAV_EASINGS.SOFT,
});

export const NAV_COMPACT_CONTENT_TRANSITION = Object.freeze({
  type: "tween",
  duration: 0.22,
  ease: NAV_EASINGS.EXIT,
});

export const NAV_COMPACT_RESTORE_TRANSITION = Object.freeze({
  type: "tween",
  duration: 0.34,
  ease: NAV_EASINGS.EMPHASIZED,
});

export const NAV_CARD_SPRING = NAV_SPRINGS.DECK;
export const NAV_PEEK_SPRING = NAV_SPRINGS.PEEK;

// --- Element & Metin Geçişleri ---
export const NAV_BACKDROP_TRANSITION = Object.freeze({
  type: "tween",
  duration: 0.84,
  ease: NAV_EASINGS.APPLE_FLUID,
});

export const NAV_BACKDROP_EXPAND_TRANSITION = Object.freeze({
  type: "tween",
  duration: 0.66,
  ease: NAV_EASINGS.EMPHASIZED,
});

export const NAV_BACKDROP_COLLAPSE_TRANSITION = Object.freeze({
  type: "tween",
  duration: 0.52,
  ease: NAV_EASINGS.EXIT,
});

/**
 * Arkaplan karartması (backdrop) için duruma duyarlı senkron geçişi hesaplar.
 * - Yüzey (surface) açıkken: 0.84s APPLE_FLUID (yüzey ile tam senkron)
 * - Deste genişlerken (expanded): 0.66s EMPHASIZED (kartlarla eşzamanlı, gecikmesiz)
 * - Deste daralırken (collapse): 0.52s EXIT (kartların toplanmasıyla senkron)
 */
export function getNavBackdropTransition({
  expanded = false,
  isSurface = false,
} = {}) {
  if (isSurface) {
    return NAV_BACKDROP_TRANSITION;
  }
  if (expanded) {
    return NAV_BACKDROP_EXPAND_TRANSITION;
  }
  return NAV_BACKDROP_COLLAPSE_TRANSITION;
}

export const NAV_FADE_TRANSITION = Object.freeze({
  type: "tween",
  duration: NAV_TIERS.STANDARD.duration,
  ease: NAV_EASINGS.EMPHASIZED,
});

export const NAV_TEXT_ENTER_TRANSITION = Object.freeze({
  type: "tween",
  duration: 0.62,
  ease: NAV_EASINGS.EMPHASIZED,
});

export const NAV_TEXT_EXIT_TRANSITION = Object.freeze({
  type: "tween",
  duration: 0.38,
  ease: NAV_EASINGS.EXIT,
});

export const NAV_ICON_TRANSITION = Object.freeze({
  type: "tween",
  duration: 0.48,
  ease: NAV_EASINGS.SOFT,
});

export const NAV_BREADCRUMBS_TRANSITION = Object.freeze({
  type: "tween",
  duration: 0.57,
  ease: NAV_EASINGS.EMPHASIZED,
});

export const NAV_HUD_TRANSITION = Object.freeze({
  type: "tween",
  duration: 0.66,
  ease: NAV_EASINGS.CINEMATIC,
});

export const NAV_COMPACT_TITLE_ENTER_TRANSITION = Object.freeze({
  type: "tween",
  duration: 0.26,
  delay: 0.14,
  ease: NAV_EASINGS.EMPHASIZED,
});

export const NAV_COMPACT_TITLE_EXIT_TRANSITION = Object.freeze({
  type: "tween",
  duration: 0.18,
  ease: NAV_EASINGS.EXIT,
});

export const NAV_STAGGER_TRANSITION = Object.freeze({
  type: "tween",
  duration: 0.62,
  ease: NAV_EASINGS.EMPHASIZED,
});

export const NAV_MICRO_TRANSITION = Object.freeze({
  type: "tween",
  duration: NAV_TIERS.MICRO.duration,
  ease: NAV_TIERS.MICRO.ease,
});

export const NAV_ACTIVE_INDICATOR_TRANSITION = Object.freeze({
  type: "tween",
  duration: 0.48,
  ease: NAV_EASINGS.SOFT,
});

export const NAV_RESULTS_TRANSITION = Object.freeze({
  type: "tween",
  duration: 0.79,
  ease: NAV_EASINGS.CINEMATIC,
});

export const NAV_RESULTS_EXIT_TRANSITION = Object.freeze({
  type: "tween",
  duration: 0.48,
  ease: NAV_EASINGS.EXIT,
});

export const NAV_RESULTS_STAGGER_DELAY = NAV_STAGGER_TIMINGS.STANDARD;

export const NAV_BUTTON_TRANSITION = NAV_SPRINGS.PRESS;
export const NAV_BADGE_TRANSITION = NAV_SPRINGS.BADGE;

// --- Medya Geçişleri ---
export const NAV_SCRUBBER_TOOLTIP_TRANSITION = Object.freeze({
  type: "tween",
  duration: 0.31,
  ease: NAV_EASINGS.EMPHASIZED,
});

export const NAV_SCRUBBER_TOOLTIP_SPRING = NAV_SPRINGS.SCRUBBER_TOOLTIP;

export const NAV_MEDIA_VOLUME_FILL_TRANSITION =
  "width 240ms cubic-bezier(0.16, 1, 0.3, 1)";
export const NAV_MEDIA_VOLUME_THUMB_POSITION_TRANSITION =
  "left 240ms cubic-bezier(0.16, 1, 0.3, 1)";

export const NAV_SKELETON_PULSE_CLASS = "animate-pulse";

// ------------------------------------------------------------------------------
// 4. COMPONENT VARIANTS
// ------------------------------------------------------------------------------

/**
 * GPU uyumlu translate3d ve scale dizesi üretir.
 */
export function toGpuTransform(y = 0, scale = 1) {
  const safeY = Number.parseFloat(y);
  const safeScale = Number.parseFloat(scale);
  return `translate3d(0, ${Number.isFinite(safeY) ? safeY : 0}px, 0) scale(${Number.isFinite(safeScale) ? safeScale : 1})`;
}

export const navSurfaceDragTransformTemplate = ({ y, scale }) =>
  toGpuTransform(y, scale);

/**
 * Tıklanabilir eylem butonları için basılma (tap) variant'ı.
 */
export const navActionVariants = Object.freeze({
  idle: {
    transform: toGpuTransform(0, 1),
  },
  hover: {
    transform: toGpuTransform(0, 1),
  },
  tap: {
    transform: toGpuTransform(0, NAV_TAP_SCALE),
  },
});

/**
 * Medya ses kaydırıcı tutamacı (thumb) variant'ı.
 */
export const navMediaVolumeThumbVariants = Object.freeze({
  idle: Object.freeze({
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.5)",
    scale: 1,
  }),
  dragging: Object.freeze({
    boxShadow: "0 0 8px rgba(255, 255, 255, 0.5)",
    scale: 1.25,
  }),
});

/**
 * Kademeli tier hesaplayıcısı ile variant üretici.
 */
export function buildVariants(tierName, { distanceScale = 0 } = {}) {
  const tier = NAV_TIERS[tierName];
  const distance = Math.round(tier.distance * distanceScale);
  const hidden = {
    opacity: 0,
  };
  const visible = {
    opacity: 1,
    transition: {
      duration: tier.duration,
      ease: tier.ease,
    },
  };
  const exit = {
    opacity: 0,
    transition: {
      duration: tier.duration * 0.72,
      ease: NAV_EASINGS.EXIT,
    },
  };
  if (distance) {
    hidden.transform = toGpuTransform(distance, 1 - tier.scaleDelta);
    visible.transform = toGpuTransform(0);
    exit.transform = toGpuTransform(
      Math.round(distance * 0.72),
      1 - tier.scaleDelta * 0.6,
    );
  }
  return Object.freeze({
    hidden,
    visible,
    exit,
  });
}

export const slideFadeVariants = buildVariants("SURFACE", {
  distanceScale: 0,
});

export const textCrossfadeVariants = buildVariants("STANDARD", {
  distanceScale: 0.42,
});

export const staggerItemVariants = buildVariants("FAST", {
  distanceScale: 0.75,
});

/**
 * Kart başlığı ve yüzey içeriği takas (swap) variant'ı.
 */
export const navHeaderSwapVariants = Object.freeze({
  hidden: {
    opacity: 0,
    transform: toGpuTransform(16, 0.98),
    filter: "blur(6px)",
  },
  visible: {
    opacity: 1,
    transform: toGpuTransform(0),
    filter: "blur(0px)",
    transition: {
      duration: 0.64,
      ease: NAV_EASINGS.APPLE_FLUID,
    },
  },
  exit: {
    opacity: 0,
    transform: toGpuTransform(-12, 0.97),
    filter: "blur(6px)",
    transition: {
      duration: 0.54,
      ease: NAV_EASINGS.APPLE_FLUID,
    },
  },
});

/**
 * Yüzey eklenti rafı (extension shelf) katman variant'ı.
 */
export const navExtensionShelfVariants = Object.freeze({
  hidden: {
    opacity: 0,
    transform: toGpuTransform(6, 0.99),
  },
  visible: {
    opacity: 1,
    transform: toGpuTransform(0, 1),
    transition: {
      duration: 0.44,
      ease: NAV_EASINGS.CINEMATIC,
    },
  },
  exit: {
    opacity: 0,
    transform: toGpuTransform(-6, 0.99),
    transition: {
      duration: 0.32,
      ease: NAV_EASINGS.EXIT,
    },
  },
});

/**
 * Yüzeyden standart karta dönüşte başlık geri yükleme variant'ı.
 */
export const navHeaderRestoreVariants = Object.freeze({
  hidden: {
    opacity: 0,
    transform: toGpuTransform(-16, 0.98),
    filter: "blur(6px)",
  },
  visible: {
    opacity: 1,
    transform: toGpuTransform(0),
    filter: "blur(0px)",
    transition: {
      duration: 0.52,
      ease: NAV_EASINGS.APPLE_FLUID,
    },
  },
  exit: {
    opacity: 0,
    transform: toGpuTransform(14, 0.97),
    filter: "blur(6px)",
    transition: {
      duration: 0.54,
      ease: NAV_EASINGS.APPLE_FLUID,
    },
  },
});

/**
 * NavSurfaceControls butonları için merkezi variant'lar.
 */
export const navSurfaceControlsContainerVariants = Object.freeze({
  hidden: (targetY = 0) => ({
    opacity: 0,
    y: (Number(targetY) || 0) + 6,
    transition: {
      duration: 0.32,
      ease: NAV_EASINGS.EXIT,
    },
  }),
  visible: (targetY = 0) => ({
    opacity: 1,
    y: Number(targetY) || 0,
    transition: NAV_SURFACE_CONTROLS_CONTAINER_TRANSITION,
  }),
  exit: (targetY = 0) => ({
    opacity: 0,
    y: (Number(targetY) || 0) + 6,
    transition: {
      duration: 0.32,
      ease: NAV_EASINGS.EXIT,
    },
  }),
});

export const navSurfaceControlsActionVariants = Object.freeze({
  hidden: {
    opacity: 0,
    scale: 0.92,
    x: 4,
    filter: "blur(4px)",
  },
  visible: {
    opacity: 1,
    scale: 1,
    x: 0,
    filter: "blur(0px)",
    transition: NAV_SURFACE_CONTROLS_ACTION_TRANSITION,
  },
  exit: {
    opacity: 0,
    scale: 0.92,
    x: 4,
    filter: "blur(4px)",
    transition: {
      duration: 0.24,
      ease: NAV_EASINGS.PROGRESSIVE_EXIT,
    },
  },
});

export const navSurfaceControlsBackVariants = Object.freeze({
  hidden: {
    opacity: 0,
    scale: 0.85,
    x: 4,
    filter: "blur(4px)",
  },
  visible: {
    opacity: 1,
    scale: 1,
    x: 0,
    filter: "blur(0px)",
    transition: NAV_SURFACE_CONTROLS_ITEM_TRANSITION,
  },
  exit: {
    opacity: 0,
    scale: 0.85,
    x: 4,
    filter: "blur(4px)",
    transition: {
      duration: 0.24,
      ease: NAV_EASINGS.PROGRESSIVE_EXIT,
    },
  },
});

export const navSurfaceControlsCloseVariants = Object.freeze({
  hidden: {
    opacity: 0,
    scale: 0.85,
    filter: "blur(4px)",
  },
  visible: {
    opacity: 1,
    scale: 1,
    filter: "blur(0px)",
    transition: NAV_SURFACE_CONTROLS_ITEM_TRANSITION,
  },
  exit: {
    opacity: 0,
    scale: 0.85,
    filter: "blur(4px)",
    transition: {
      duration: 0.24,
      ease: NAV_EASINGS.PROGRESSIVE_EXIT,
    },
  },
});

/**
 * Geriye dönük uyumluluk için eski navSurfaceControlsVariants tanımı.
 */
export const navSurfaceControlsVariants = Object.freeze({
  hidden: {
    opacity: 0,
    transform: "translate3d(0px, 14px, 0) scale(0.92)",
  },
  visible: (customIndex = 0) => ({
    opacity: 1,
    transform: "translate3d(0px, 0px, 0) scale(1)",
    transition: {
      duration: 0.64,
      delay: (Number(customIndex) || 0) * 0.04,
      ease: NAV_EASINGS.CINEMATIC,
    },
  }),
  exit: {
    opacity: 0,
    transform: "translate3d(0px, 10px, 0) scale(0.95)",
    transition: {
      duration: 0.44,
      ease: NAV_EASINGS.CINEMATIC,
    },
  },
});

/**
 * Komut çubuğu (Command bar) eylemlerinin yatay giriş/çıkış variant'ı.
 */
export const navCommandBarSwapVariants = Object.freeze({
  hidden: {
    opacity: 0,
    transform: "translate3d(12px, 0, 0) scale(0.88)",
  },
  visible: (customIndex = 0) => ({
    opacity: 1,
    transform: "translate3d(0px, 0, 0) scale(1)",
    transition: {
      duration: 0.44,
      delay: (Number(customIndex) || 0) * 0.04 + 0.06,
      ease: NAV_EASINGS.CINEMATIC,
    },
  }),
  exit: (customIndex = 0) => ({
    opacity: 0,
    transform: "translate3d(12px, 0, 0) scale(0.85)",
    transition: {
      duration: 0.32,
      delay: (Number(customIndex) || 0) * 0.02,
      ease: NAV_EASINGS.EXIT,
    },
  }),
});

/**
 * Açılan yüzey gövdesi (surface body) variant'ı.
 */
export const navSurfaceBodyVariants = Object.freeze({
  hidden: {
    opacity: 0,
    transform: toGpuTransform(20, 0.98),
    filter: "blur(10px)",
  },
  visible: {
    opacity: 1,
    transform: toGpuTransform(0),
    filter: "blur(0px)",
  },
  exit: {
    opacity: 0,
    transform: toGpuTransform(24, 0.98),
    filter: "blur(8px)",
    transition: {
      duration: 0.32,
      ease: NAV_EASINGS.APPLE_FLUID,
    },
  },
});

export const navSurfaceExtensionsVariants = Object.freeze({
  hidden: {
    opacity: 0,
    transform: toGpuTransform(-18, 0.85),
  },
  visible: {
    opacity: 1,
    transform: toGpuTransform(-28, 0.85),
    transition: {
      duration: 0.54,
      ease: NAV_EASINGS.CINEMATIC,
    },
  },
  exit: {
    opacity: 0,
    transform: toGpuTransform(-18, 0.85),
    transition: {
      duration: 0.38,
      ease: NAV_EASINGS.EXIT,
    },
  },
});

/**
 * Kart altındaki eylem butonunun yüzey açılırken hızlıca kaybolma variant'ı.
 */
export const navActionDismissVariants = Object.freeze({
  hidden: {
    opacity: 0,
    transform: toGpuTransform(10, 0.98),
  },
  visible: {
    opacity: 1,
    transform: toGpuTransform(0),
    transition: {
      duration: 0.26,
      ease: NAV_EASINGS.SOFT,
    },
  },
  exit: {
    opacity: 0,
    transform: toGpuTransform(-8, 0.98),
    transition: {
      duration: 0.26,
      ease: NAV_EASINGS.EXIT,
    },
  },
});

/**
 * Liste elemanları için ardışık giriş variant'ı.
 */
export const navListItemVariants = Object.freeze({
  hidden: staggerItemVariants.hidden,
  visible: (index = 0) => ({
    ...staggerItemVariants.visible,
    transition: {
      ...NAV_STAGGER_TRANSITION,
      delay: Math.min(
        Math.max(Number(index) || 0, 0) * NAV_STAGGER_TIMINGS.STANDARD,
        0.42,
      ),
    },
  }),
  exit: {
    ...staggerItemVariants.exit,
    transition: {
      ...NAV_TEXT_EXIT_TRANSITION,
    },
  },
});

/**
 * Kart başlığı ve standart kart içerik katmanı için dikey geçiş variant'ı.
 */
export const navFadeVariants = Object.freeze({
  hidden: {
    opacity: 0,
    transform: toGpuTransform(12, 0.98),
  },
  visible: {
    opacity: 1,
    transform: toGpuTransform(0),
    transition: NAV_TEXT_ENTER_TRANSITION,
  },
  exit: {
    opacity: 0,
    transform: toGpuTransform(-8, 0.99),
    transition: NAV_TEXT_EXIT_TRANSITION,
  },
});

/**
 * Kart ikonu ölçekli giriş/çıkış variant'ı.
 */
export const navIconVariants = Object.freeze({
  hidden: {
    opacity: 0,
    transform: toGpuTransform(0, 0.88),
  },
  visible: {
    opacity: 1,
    transform: toGpuTransform(0, 1),
    transition: {
      duration: 0.22,
      ease: NAV_EASINGS.SOFT,
    },
  },
  exit: {
    opacity: 0,
    transform: toGpuTransform(0, 0.88),
    transition: {
      duration: 0.16,
      ease: NAV_EASINGS.EXIT,
    },
  },
});

/**
 * Rozet (badge) pop-in ölçek variant'ı.
 */
export const navBadgeVariants = Object.freeze({
  hidden: {
    opacity: 0,
    transform: toGpuTransform(0, 0.78),
  },
  visible: {
    opacity: 1,
    transform: toGpuTransform(0),
  },
  exit: {
    opacity: 0,
    transform: toGpuTransform(0, 0.82),
  },
});

/**
 * Nav arkaplan karartması (backdrop) variant'ı.
 */
export const navBackdropVariants = Object.freeze({
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
  },
  exit: {
    opacity: 0,
  },
});

/**
 * Breadcrumbs kartı yukarıdan açılma variant'ı.
 */
export const navBreadcrumbsVariants = Object.freeze({
  hidden: {
    opacity: 0,
    transform: toGpuTransform(-10, 0.96),
  },
  visible: {
    opacity: 1,
    transform: toGpuTransform(0),
  },
  exit: {
    opacity: 0,
    transform: toGpuTransform(-6, 0.98),
  },
});

/**
 * HUD paneli sinematik geçiş variant'ı.
 */
export const navHudVariants = Object.freeze({
  hidden: {
    opacity: 0,
    transform: toGpuTransform(14, 0.975),
  },
  visible: {
    opacity: 1,
    transform: toGpuTransform(0),
    transition: NAV_HUD_TRANSITION,
  },
  exit: {
    opacity: 0,
    transform: toGpuTransform(-6, 0.99),
    transition: NAV_TEXT_EXIT_TRANSITION,
  },
});

/**
 * Kompakt mod kart başlığı variant'ı (gecikmeli giriş).
 */
export const navCompactTitleVariants = Object.freeze({
  hidden: {
    opacity: 0,
    transform: toGpuTransform(8, 0.98),
  },
  visible: {
    opacity: 1,
    transform: toGpuTransform(0),
    transition: NAV_COMPACT_TITLE_ENTER_TRANSITION,
  },
  exit: {
    opacity: 0,
    transform: toGpuTransform(-6, 0.99),
    transition: NAV_COMPACT_TITLE_EXIT_TRANSITION,
  },
});

const SOUNDWAVE_FREQUENCY_PROFILES = Object.freeze([
  // Bar 0: Sub-bass & Bass (derin ritmik vuruşlar)
  Object.freeze({
    scaleY: [0.35, 0.85, 0.4, 1.0, 0.35],
    duration: 1.05,
    delay: 0,
    ease: NAV_EASINGS.SOFT,
  }),
  // Bar 1: Low-mids (dinamik gövde ve nabız)
  Object.freeze({
    scaleY: [0.4, 0.65, 1.0, 0.5, 0.4],
    duration: 0.92,
    delay: 0.08,
    ease: NAV_EASINGS.EMPHASIZED,
  }),
  // Bar 2: High-mids (hızlı vokal ve enstrüman hareketleri)
  Object.freeze({
    scaleY: [0.25, 0.95, 0.45, 0.8, 0.25],
    duration: 1.15,
    delay: 0.04,
    ease: NAV_EASINGS.SOFT,
  }),
  // Bar 3: Treble / Air (canlı, parlak tiz titreşimler)
  Object.freeze({
    scaleY: [0.3, 0.75, 0.35, 0.9, 0.3],
    duration: 0.85,
    delay: 0.12,
    ease: NAV_EASINGS.EMPHASIZED,
  }),
]);

/**
 * Medya ses dalgası (equalizer) çubukları variant'ı.
 * Gerçek frekans spektrumunu yansıtan asimetrik dalga desenleri.
 */
export const navSoundwaveBarVariants = Object.freeze({
  playing: (index) => {
    const safeIdx = Math.max(0, Number(index) || 0);
    const profile =
      SOUNDWAVE_FREQUENCY_PROFILES[
        safeIdx % SOUNDWAVE_FREQUENCY_PROFILES.length
      ];
    return {
      transform: profile.scaleY.map((scale) => toGpuTransform(0, scale)),
      transition: {
        duration: profile.duration,
        repeat: Infinity,
        ease: profile.ease,
        delay: profile.delay,
      },
    };
  },
  paused: {
    transform: toGpuTransform(0, 0.3),
    transition: {
      duration: 0.44,
      ease: NAV_EASINGS.EXIT,
    },
  },
});

/**
 * Medya scrubber zaman tooltip'i variant'ı.
 */
export const navScrubberTooltipVariants = Object.freeze({
  hidden: {
    opacity: 0,
    transform: toGpuTransform(8, 0.94),
  },
  visible: {
    opacity: 1,
    transform: toGpuTransform(0),
  },
  exit: {
    opacity: 0,
    transform: toGpuTransform(6, 0.96),
  },
});

// ------------------------------------------------------------------------------
// 5. DYNAMIC MOTION HELPERS
// ------------------------------------------------------------------------------

/**
 * Dinamik hedef opaklığa göre NavDescription variant'ı üretir.
 */
export function getNavDescriptionVariants(targetOpacity = 0.7) {
  return {
    hidden: {
      opacity: 0,
      transform: toGpuTransform(8, 0.99),
    },
    visible: {
      opacity: targetOpacity,
      transform: toGpuTransform(0),
      transition: {
        duration: 0.62,
        ease: NAV_EASINGS.EMPHASIZED,
      },
    },
    exit: {
      opacity: 0,
      transform: toGpuTransform(-5, 0.99),
      transition: {
        duration: 0.38,
        ease: NAV_EASINGS.EXIT,
      },
    },
  };
}

/**
 * Aksiyon elemanları için sıralı gecikmeli transition üretir.
 */
export function getNavActionStaggerTransition(index = 0) {
  return {
    ...NAV_STAGGER_TRANSITION,
    delay: Math.min(Math.max(Number(index) || 0, 0) * NAV_STAGGER_DELAY, 0.42),
  };
}

/**
 * Eylem butonları için Motion props paketi.
 */
export function getNavActionMotionProps({
  disabled = false,
  reduceMotion = false,
} = {}) {
  const canMove = !disabled && !reduceMotion;
  return {
    initial: false,
    animate: "idle",
    whileTap: canMove ? "tap" : undefined,
    variants: navActionVariants,
    transition: NAV_BUTTON_TRANSITION,
  };
}

/**
 * Medya ses çubuğu dolum CSS geçişi (sürükleme sırasında 'none').
 */
export function getNavMediaVolumeFillTransition({ isDragging = false } = {}) {
  return isDragging ? "none" : NAV_MEDIA_VOLUME_FILL_TRANSITION;
}

/**
 * Medya ses tutamacı animate prop'u.
 */
export function getNavMediaVolumeThumbAnimateProps({
  isDragging = false,
} = {}) {
  return isDragging
    ? navMediaVolumeThumbVariants.dragging
    : navMediaVolumeThumbVariants.idle;
}

/**
 * Medya ses tutamacı yatay pozisyon CSS geçişi (sürükleme sırasında 'none').
 */
export function getNavMediaVolumeThumbPositionTransition({
  isDragging = false,
} = {}) {
  return isDragging ? "none" : NAV_MEDIA_VOLUME_THUMB_POSITION_TRANSITION;
}

/**
 * NavCardStack ana konteyneri için genişlik, yükseklik ve breadcrumb offset hesaplar.
 */
export function getNavStackAnimateProps({
  width,
  height,
  isBreadcrumbsVisible = false,
  isExtensionsVisible = false,
  isFullscreen = false,
}) {
  const safeWidth = Number(width);
  const safeHeight = Number(height);
  const liftAmount = isBreadcrumbsVisible ? -42 : 0;
  return {
    width: Math.max(0, Math.round(Number.isFinite(safeWidth) ? safeWidth : 0)),
    height: Math.max(
      0,
      Math.round(Number.isFinite(safeHeight) ? safeHeight : 0),
    ),
    transform: toGpuTransform(liftAmount),
    opacity: isFullscreen ? 0 : 1,
    pointerEvents: isFullscreen ? "none" : "auto",
  };
}

/**
 * Kartın destedeki pozisyonuna ve hover/expand durumuna göre giriş gecikmesini hesaplar.
 */
export function getNavCardDelay({
  expanded = false,
  isStackHovered = false,
  position = 0,
} = {}) {
  const safePosition = Math.max(0, Number(position) || 0);
  if (expanded && safePosition > 0) {
    return Math.min(safePosition * NAV_STAGGER_TIMINGS.EXPAND, 0.42);
  }
  if (isStackHovered && safePosition > 0) {
    return Math.min((safePosition - 1) * NAV_STAGGER_TIMINGS.PEEK, 0.32);
  }
  return 0;
}

/**
 * Kartın deste içi yığılma, derinlik, hover-peek ve surface-recede transform değerlerini hesaplar.
 */
export function getNavItemAnimateValues({
  motionValues,
  expanded = false,
  isStackHovered = false,
  isSurfaceActive = false,
  position = 0,
} = {}) {
  if (!motionValues) return {};
  const safePosition = Math.max(0, Number(position) || 0);
  const isHoveredOffset =
    !expanded && isStackHovered && safePosition > 0 && !isSurfaceActive;
  const peekProgress = Math.min(safePosition / 3, 1);
  const peekOffset = NAV_TIERS.MICRO.distance * (0.85 + peekProgress * 0.35);
  const peekScale = NAV_TIERS.MICRO.scaleDelta * (1 - peekProgress * 0.25);
  let y = isHoveredOffset
    ? motionValues.y - safePosition * peekOffset
    : motionValues.y;
  let scale = isHoveredOffset
    ? motionValues.scale * (1 + peekScale)
    : motionValues.scale;
  let opacity = motionValues.opacity;

  // Active surface opened on top card: background cards gracefully recede into depth
  if (isSurfaceActive && safePosition > 0) {
    scale = +(scale * 0.94).toFixed(3);
    y = y + 4;
    opacity = +(opacity * 0.38).toFixed(2);
  }

  return {
    transform: toGpuTransform(y, scale),
    opacity,
  };
}

/**
 * Kart durumuna uygun transition konfigürasyonunu döner.
 */
export function getNavItemTransition({
  expanded = false,
  isStackHovered = false,
  isRestoringDeck = false,
  position = 0,
  delay = 0,
} = {}) {
  const safePosition = Math.max(0, Number(position) || 0);
  const baseTransition = isRestoringDeck
    ? NAV_COMPACT_RESTORE_TRANSITION
    : !expanded && isStackHovered && safePosition > 0
      ? NAV_PEEK_TRANSITION
      : NAV_CARD_TRANSITION;
  return {
    ...baseTransition,
    delay:
      (Number(delay) || 0) +
      (isRestoringDeck
        ? Math.min(safePosition * NAV_STAGGER_TIMINGS.EXPAND, 0.16)
        : 0),
  };
}

/**
 * Kullanıcının işletim sistemi düzeyindeki hareket azaltma (prefers-reduced-motion)
 * tercihini tespit eder. Sunucu tarafında (SSR) güvenli biçimde false döner.
 */
export function getPrefersReducedMotion() {
  if (
    typeof window === "undefined" ||
    typeof window.matchMedia !== "function"
  ) {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * İndirgenmiş hareket tercihi aktifken kullanılacak güvenli crossfade geçişi.
 */
export const NAV_REDUCED_MOTION_TRANSITION = Object.freeze({
  type: "tween",
  duration: 0.2,
  ease: "easeInOut",
});

/**
 * Kompakt moddan çıkarken deste katmanlarının başlangıç (initial) konumunu hesaplar.
 */
export function getNavItemCompactRestoreValues({
  motionValues,
  position = 0,
} = {}) {
  if (!motionValues) return {};
  const safePosition = Math.max(0, Number(position) || 0);
  if (safePosition === 0)
    return getNavItemAnimateValues({
      motionValues,
    });
  return {
    opacity: 0,
    transform: toGpuTransform(0, 0.975 - Math.min(safePosition * 0.006, 0.018)),
  };
}

/**
 * Kompakt moda girerken alt kartların çıkış (exit) animasyonunu yönetir.
 */
export function getNavItemCompactExitValues({ position = 0 } = {}) {
  const safePosition = Math.max(0, Number(position) || 0);
  return {
    opacity: 0,
    transform: toGpuTransform(0, 0.98 - Math.min(safePosition * 0.008, 0.024)),
    transition: {
      ...NAV_CARD_COLLAPSE_TRANSITION,
      delay: Math.min(
        Math.max(2 - safePosition, 0) * NAV_STAGGER_TIMINGS.COLLAPSE,
        0.08,
      ),
    },
  };
}

/**
 * Kart gövdesinin kompakt veya deste altında gizlenip gösterilmesini kontrol eder.
 */
export function getNavCardContentAnimateProps({
  compact = false,
  expanded = false,
  position = 0,
  isExtensionShelf = false,
} = {}) {
  const isHidden = compact || (!expanded && position > 0 && !isExtensionShelf);
  return {
    opacity: isHidden ? 0 : 1,
    transform: toGpuTransform(
      isHidden ? NAV_TIERS.STANDARD.distance * 0.35 : 0,
      isHidden ? 1 - NAV_TIERS.MICRO.scaleDelta : 1,
    ),
  };
}

/**
 * Kart gövdesi görünürlük transition'ını belirler.
 */
export function getNavCardContentTransition({
  compact = false,
  isRestoringFromCompact = false,
} = {}) {
  if (compact) return NAV_COMPACT_CONTENT_TRANSITION;
  if (!isRestoringFromCompact) return NAV_TEXT_ENTER_TRANSITION;
  return {
    ...NAV_TEXT_ENTER_TRANSITION,
    delay: NAV_COMPACT_TITLE_EXIT_TRANSITION.duration + 0.06,
  };
}

/**
 * Sayfa kaydırma ilerleme stili (transform origin left).
 */
export function getNavScrollProgressStyle(progress = 0) {
  const safeProgress = Math.min(Math.max(Number(progress) || 0, 0), 1);
  return {
    width: "100%",
    transformOrigin: "left center",
    transform: `scaleX(${safeProgress})`,
  };
}
