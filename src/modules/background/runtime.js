"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";

import { useBackgroundValue } from "../registry";
import { DEFAULT_BACKGROUND, mergeBackgroundState } from "./model";

function useSafePathname() {
  try {
    return usePathname();
  } catch {
    return null;
  }
}

// ── Background state and actions ───────────────────────────────────────────────

const BackgroundActionsContext = createContext(null);
const BackgroundStateContext = createContext(null);

export function BackgroundProvider({ children }) {
  const [background, setBackgroundState] = useState(DEFAULT_BACKGROUND);
  const registryBackground = useBackgroundValue();
  const pathname = useSafePathname();
  const previousPathnameRef = useRef(pathname);

  const setBackground = useCallback((nextBackground) => {
    setBackgroundState((prevState) =>
      mergeBackgroundState(prevState, nextBackground),
    );
  }, []);

  const setVideoPlaying = useCallback((isPlaying) => {
    setBackgroundState((prevState) =>
      prevState.isPlaying === isPlaying
        ? prevState
        : { ...prevState, isPlaying },
    );
  }, []);

  const setVideoElement = useCallback((videoElement) => {
    setBackgroundState((prevState) =>
      prevState.videoElement === videoElement
        ? prevState
        : { ...prevState, videoElement },
    );
  }, []);

  const toggleVideo = useCallback(() => {
    setBackgroundState((prevState) => ({
      ...prevState,
      isPlaying: !prevState.isPlaying,
    }));
  }, []);

  const toggleMute = useCallback(() => {
    setBackgroundState((prevState) => {
      const nextMuted = !prevState.videoOptions?.muted;

      return {
        ...prevState,
        videoOptions: {
          ...prevState.videoOptions,
          muted: nextMuted,
        },
        isPlaying: nextMuted ? prevState.isPlaying : true,
      };
    });
  }, []);

  const toggleLoop = useCallback(() => {
    setBackgroundState((prevState) => {
      const nextLoop = !prevState.videoOptions?.loop;
      if (prevState.videoElement) prevState.videoElement.loop = nextLoop;

      return {
        ...prevState,
        videoOptions: {
          ...prevState.videoOptions,
          loop: nextLoop,
        },
      };
    });
  }, []);

  const resetBackground = useCallback(() => {
    setBackgroundState(DEFAULT_BACKGROUND);
  }, []);

  const setBackgroundFromRegistry = useCallback((registryConfig) => {
    setBackgroundState((prevState) => {
      const isSameVideo = Boolean(
        prevState.video && prevState.video === registryConfig?.video,
      );
      const isSameImage = Boolean(
        prevState.image && prevState.image === registryConfig?.image,
      );

      return mergeBackgroundState(
        isSameVideo || isSameImage ? prevState : DEFAULT_BACKGROUND,
        registryConfig,
      );
    });
  }, []);

  useLayoutEffect(() => {
    if (registryBackground) {
      setBackgroundFromRegistry(registryBackground);
      return;
    }

    resetBackground();
  }, [registryBackground, resetBackground, setBackgroundFromRegistry]);

  useEffect(() => {
    if (previousPathnameRef.current === pathname) return;
    previousPathnameRef.current = pathname;

    if (!registryBackground) {
      resetBackground();
    }
  }, [pathname, registryBackground, resetBackground]);

  const stateValue = useMemo(
    () => ({
      hasBackground: Boolean(background.image || background.video),
      overlayOpacity: background.overlayOpacity,
      overlayColor: background.overlayColor,
      leftGradient: background.leftGradient,
      rightGradient: background.rightGradient,
      videoOptions: background.videoOptions,
      videoElement: background.videoElement,
      videoStyle: background.videoStyle,
      videoClassName: background.videoClassName,
      className: background.className,
      width: background.width,
      fit: background.fit,
      fadeEdges: background.fadeEdges,
      imageStyle: background.imageStyle,
      noiseStyle: background.noiseStyle,
      isPlaying: background.isPlaying,
      isVideo: Boolean(background.video),
      position: background.position,
      overlay: background.overlay,
      image: background.image,
      video: background.video,
      animation: background.animation,
    }),
    [background],
  );

  const actionsValue = useMemo(
    () => ({
      setVideoPlaying,
      setVideoElement,
      resetBackground,
      setBackground,
      toggleVideo,
      toggleMute,
      toggleLoop,
    }),
    [
      setVideoPlaying,
      setVideoElement,
      resetBackground,
      setBackground,
      toggleVideo,
      toggleMute,
      toggleLoop,
    ],
  );

  return (
    <BackgroundActionsContext.Provider value={actionsValue}>
      <BackgroundStateContext.Provider value={stateValue}>
        {children}
      </BackgroundStateContext.Provider>
    </BackgroundActionsContext.Provider>
  );
}

export function useBackgroundState() {
  const context = useContext(BackgroundStateContext);
  if (!context)
    throw new Error("useBackgroundState must be within BackgroundProvider");
  return context;
}

export function useBackgroundActions() {
  const context = useContext(BackgroundActionsContext);
  if (!context)
    throw new Error("useBackgroundActions must be within BackgroundProvider");
  return context;
}

export function useOptionalBackgroundActions() {
  return useContext(BackgroundActionsContext);
}

// ── Video and style runtime helpers ────────────────────────────────────────────

export function getVisualStyle(currentStyle = {}) {
  const { leftGradient = 0, rightGradient = 0, ...baseStyle } = currentStyle;
  return { rightGradient, leftGradient, baseStyle };
}

export function applyVideoPlaybackState({
  setVideoPlaying,
  playbackRate,
  videoElement,
  isPlaying,
  isMuted,
}) {
  if (!videoElement) return;

  const numericPlaybackRate = Number(playbackRate);
  const resolvedPlaybackRate =
    Number.isFinite(numericPlaybackRate) && numericPlaybackRate > 0
      ? numericPlaybackRate
      : 1;

  try {
    videoElement.playbackRate = resolvedPlaybackRate;
    videoElement.muted = isMuted;
  } catch {
    return;
  }

  if (!isPlaying) {
    if (!videoElement.paused) videoElement.pause();
    return;
  }

  if (videoElement.ended) videoElement.currentTime = 0;

  if (videoElement.paused) {
    videoElement.play().catch((error) => {
      console.warn("Play failed", error);
      setVideoPlaying(false);
    });
  }
}
