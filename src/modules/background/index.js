"use client";

import { useEffect, useMemo, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Z_INDEX } from "@/shared";
import { cn } from "@/shared/utils";
import { FIT_TO_OBJECT_CLASS_MAP } from "./constants";
import {
  BACKGROUND_ANIMATE_PRESENCE_MODE,
  BACKGROUND_EXIT_EASE,
  BACKGROUND_OVERLAY_TRANSITION_PROPERTY,
  BACKGROUND_WILL_CHANGE,
  getBackgroundMotionConfig,
  toCssDelay,
  toCssDuration,
  toCssEasing,
} from "./motion";
import {
  extractWidthClasses,
  getEdgeFadeMask,
  resolveGradientSettings,
  resolveVideoClasses,
} from "./utils";
import {
  applyVideoPlaybackState,
  BackgroundProvider,
  getVisualStyle,
  useBackgroundActions,
  useBackgroundState,
} from "./provider";
export {
  BACKGROUND_ANIMATE_PRESENCE_MODE,
  BACKGROUND_EXIT_EASE,
  BACKGROUND_OVERLAY_TRANSITION_PROPERTY,
  BACKGROUND_WILL_CHANGE,
  getBackgroundMotionConfig,
  toCssDelay,
  toCssDuration,
  toCssEasing,
} from "./motion";
export {
  BackgroundProvider,
  useBackgroundActions,
  useBackgroundState,
} from "./provider";
export { useOptionalBackgroundActions } from "./provider";
function BackgroundGradients({ count, direction }) {
  if (!count || count <= 0) return null;
  const opacity = Math.min(1, Math.max(0.2, count * 0.25));
  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-y-0 z-0",
        direction === "left" ? "left-0" : "right-0",
      )}
      style={{
        width: "50vw",
        opacity,
        background:
          direction === "left"
            ? "linear-gradient(to right, rgba(0,0,0,1) 0%, rgba(0,0,0,0.85) 15%, rgba(0,0,0,0.5) 45%, rgba(0,0,0,0.18) 75%, rgba(0,0,0,0) 100%)"
            : "linear-gradient(to left, rgba(0,0,0,1) 0%, rgba(0,0,0,0.85) 15%, rgba(0,0,0,0.5) 45%, rgba(0,0,0,0.18) 75%, rgba(0,0,0,0) 100%)",
      }}
    />
  );
}
export function BackgroundOverlay() {
  const {
    hasBackground,
    leftGradient: configuredLeftGradient,
    overlayOpacity,
    overlayColor,
    rightGradient: configuredRightGradient,
    videoStyle,
    videoClassName,
    className,
    width,
    fit,
    fadeEdges,
    imageStyle,
    videoOptions,
    animation,
    isPlaying,
    noiseStyle,
    position,
    isVideo,
    overlay,
    image,
    video,
  } = useBackgroundState();
  const { setVideoPlaying, setVideoElement } = useBackgroundActions();
  const videoRef = useRef(null);
  const isMuted = videoOptions?.muted ?? true;
  const shouldAutoPlay = videoOptions?.autoplay ?? true;
  const isLoop = videoOptions?.loop ?? false;
  const playbackRate = videoOptions?.playbackRate ?? 1;
  const corp = videoOptions?.corp ?? 0;
  const backgroundKey = isVideo ? video : image;
  const motionConfig = useMemo(
    () => getBackgroundMotionConfig(animation),
    [animation],
  );
  const currentStyle = isVideo ? videoStyle : imageStyle;
  const {
    baseStyle,
    leftGradient: styleLeftGradient,
    rightGradient: styleRightGradient,
  } = useMemo(() => getVisualStyle(currentStyle), [currentStyle]);
  const leftGradient = configuredLeftGradient ?? styleLeftGradient;
  const rightGradient = configuredRightGradient ?? styleRightGradient;
  const {
    opacity: noiseOpacity,
    mixBlendMode: noiseBlendMode,
    ...noiseInlineStyle
  } = noiseStyle || {};
  const overlayTransitionStyle = useMemo(
    () => ({
      transitionDuration: toCssDuration(motionConfig.transition?.duration),
      transitionTimingFunction: toCssEasing(motionConfig.transition?.ease),
      transitionDelay: toCssDelay(motionConfig.transition?.delay),
      transitionProperty: BACKGROUND_OVERLAY_TRANSITION_PROPERTY,
    }),
    [motionConfig.transition],
  );
  const exitDurationFactor = Number.isFinite(motionConfig.exitDurationFactor)
    ? Math.max(0, motionConfig.exitDurationFactor)
    : 0.6;
  const resolvedExitDuration =
    motionConfig.exit?.transition?.duration ??
    (motionConfig.transition?.duration ?? 0.6) * exitDurationFactor;
  const rawWidth = width ?? videoOptions?.width ?? videoStyle?.width;
  const resolvedWidth =
    rawWidth !== undefined && rawWidth !== null && rawWidth !== ""
      ? typeof rawWidth === "number"
        ? `${rawWidth}px`
        : rawWidth
      : undefined;
  const rawFit = fit ?? videoOptions?.fit ?? videoOptions?.objectFit;
  const fitClass = rawFit ? FIT_TO_OBJECT_CLASS_MAP[rawFit] || "" : "";
  const { customClasses, mappedClasses } = useMemo(
    () =>
      resolveVideoClasses(
        videoClassName,
        className,
        videoOptions?.videoClassName,
        videoOptions?.className,
        videoStyle?.className,
      ),
    [
      videoClassName,
      className,
      videoOptions?.videoClassName,
      videoOptions?.className,
      videoStyle?.className,
    ],
  );
  const { widthClasses, nonWidthClasses } = useMemo(
    () => extractWidthClasses(customClasses),
    [customClasses],
  );
  const hasCustomWidth = Boolean(resolvedWidth || widthClasses?.trim());
  const gradientSettings = useMemo(
    () =>
      resolveGradientSettings({
        fadeEdges,
        leftGradient,
        rightGradient,
        hasWidth: hasCustomWidth,
      }),
    [fadeEdges, leftGradient, rightGradient, hasCustomWidth],
  );
  const resolvedMaskImage = useMemo(
    () =>
      gradientSettings.enabled
        ? getEdgeFadeMask({
            leftPercent: gradientSettings.leftPercent,
            rightPercent: gradientSettings.rightPercent,
          })
        : undefined,
    [gradientSettings],
  );
  const wrapperPositionClass =
    position === "left"
      ? "left-0 ml-0 mr-auto"
      : position === "right"
        ? "right-0 mr-0 ml-auto"
        : "inset-x-0 mx-auto";
  const videoClasses = cn(
    "h-full w-full object-cover",
    fitClass,
    mappedClasses,
    nonWidthClasses,
  );
  const resolvedObjectPosition =
    baseStyle?.objectPosition ||
    (typeof position === "string" && position ? position : undefined);
  useEffect(() => {
    if (!isVideo || !videoRef.current) {
      setVideoElement(null);
      return undefined;
    }
    const videoElement = videoRef.current;
    setVideoElement(videoElement);
    applyVideoPlaybackState({
      videoElement,
      isPlaying,
      isMuted,
      playbackRate,
      setVideoPlaying,
    });
    return () => {
      try {
        videoElement.pause();
      } catch {}
    };
  }, [
    isVideo,
    video,
    isPlaying,
    isMuted,
    playbackRate,
    setVideoElement,
    setVideoPlaying,
  ]);
  useEffect(() => () => setVideoElement(null), [setVideoElement]);
  function handleEnded() {
    const videoElement = videoRef.current;
    if (!videoElement) return;
    if (Boolean(videoElement.loop)) {
      videoElement.currentTime = 0;
      videoElement
        .play()
        .catch((error) => console.warn("Loop play failed", error));
      return;
    }
    videoElement.pause();
    setVideoPlaying(false);
  }
  function handleTimeUpdate() {
    const videoElement = videoRef.current;
    if (
      videoElement &&
      videoElement.duration &&
      corp > 0 &&
      videoElement.currentTime >= videoElement.duration - corp
    ) {
      handleEnded();
    }
  }
  return (
    <AnimatePresence mode={BACKGROUND_ANIMATE_PRESENCE_MODE}>
      {hasBackground && (
        <motion.div
          key={backgroundKey}
          initial={motionConfig.initial}
          animate={motionConfig.animate}
          transition={motionConfig.transition}
          exit={{
            ...motionConfig.exit,
            transition: {
              ...motionConfig.transition,
              delay: 0,
              duration: resolvedExitDuration,
              ease: motionConfig.exit?.transition?.ease ?? BACKGROUND_EXIT_EASE,
            },
          }}
          className="pointer-events-none fixed inset-0 transform-gpu"
          style={{
            zIndex: Z_INDEX.BACKGROUND,
            willChange: BACKGROUND_WILL_CHANGE,
          }}
        >
          {isVideo ? (
            <div
              className={cn(
                "pointer-events-none absolute inset-y-0 overflow-hidden",
                wrapperPositionClass,
                widthClasses || (resolvedWidth ? "" : "w-full"),
              )}
              style={{
                ...(resolvedWidth
                  ? {
                      width: resolvedWidth,
                    }
                  : {}),
                maxWidth: "100%",
              }}
            >
              <video
                ref={videoRef}
                src={video}
                className={videoClasses}
                preload="auto"
                muted={isMuted}
                loop={isLoop}
                playsInline
                style={{
                  ...(resolvedObjectPosition
                    ? {
                        objectPosition: resolvedObjectPosition,
                      }
                    : {}),
                  ...(resolvedMaskImage
                    ? {
                        maskImage: resolvedMaskImage,
                        WebkitMaskImage: resolvedMaskImage,
                      }
                    : {}),
                  ...baseStyle,
                  filter: baseStyle?.filter || undefined,
                }}
                onTimeUpdate={handleTimeUpdate}
                onEnded={handleEnded}
                onLoadedData={() => {
                  const videoElement = videoRef.current;
                  if (!videoElement) return;
                  videoElement.playbackRate = playbackRate;
                  if (isMuted && shouldAutoPlay) {
                    videoElement.muted = true;
                    videoElement
                      .play()
                      .then(() => setVideoPlaying(true))
                      .catch((error) =>
                        console.warn("Autoplay prevented on load", error),
                      );
                  }
                }}
              />

              {gradientSettings.leftOpacity > 0 && (
                <div
                  className="pointer-events-none absolute inset-y-0 left-0 z-10"
                  style={{
                    width: `${Math.max(30, gradientSettings.leftPercent * 1.15)}%`,
                    opacity: gradientSettings.leftOpacity,
                    background:
                      "linear-gradient(to right, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.7) 25%, rgba(0,0,0,0.35) 55%, rgba(0,0,0,0.1) 80%, rgba(0,0,0,0) 100%)",
                  }}
                />
              )}
              {gradientSettings.rightOpacity > 0 && (
                <div
                  className="pointer-events-none absolute inset-y-0 right-0 z-10"
                  style={{
                    width: `${Math.max(30, gradientSettings.rightPercent * 1.15)}%`,
                    opacity: gradientSettings.rightOpacity,
                    background:
                      "linear-gradient(to left, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.7) 25%, rgba(0,0,0,0.35) 55%, rgba(0,0,0,0.1) 80%, rgba(0,0,0,0) 100%)",
                  }}
                />
              )}

              {hasCustomWidth && (
                <div
                  className="pointer-events-none absolute inset-0 transform-gpu"
                  style={{
                    opacity:
                      typeof noiseOpacity === "number" ? noiseOpacity : 0.04,
                    mixBlendMode:
                      typeof noiseBlendMode === "string" &&
                      noiseBlendMode.trim()
                        ? noiseBlendMode
                        : "overlay",
                    backgroundImage: "url(/images/noise.png)",
                    backgroundRepeat: "repeat",
                    ...(resolvedMaskImage
                      ? {
                          maskImage: resolvedMaskImage,
                          WebkitMaskImage: resolvedMaskImage,
                        }
                      : {}),
                    ...noiseInlineStyle,
                  }}
                />
              )}

              {hasCustomWidth && overlay && (
                <div
                  className={cn(
                    "pointer-events-none absolute inset-0 transition-all duration-300 ease-in-out",
                  )}
                  style={{
                    opacity: overlayOpacity,
                    backgroundColor: overlayColor,
                    ...(resolvedMaskImage
                      ? {
                          maskImage: resolvedMaskImage,
                          WebkitMaskImage: resolvedMaskImage,
                        }
                      : {}),
                    ...overlayTransitionStyle,
                  }}
                />
              )}
            </div>
          ) : (
            <div
              className="absolute inset-0 bg-cover bg-no-repeat"
              style={{
                backgroundImage: `url(${image})`,
                backgroundPosition: position,
                ...baseStyle,
                filter: baseStyle?.filter || undefined,
              }}
            />
          )}

          {(!isVideo || !hasCustomWidth) && (
            <>
              <BackgroundGradients count={leftGradient} direction="left" />
              <BackgroundGradients count={rightGradient} direction="right" />
            </>
          )}

          {(!isVideo || !hasCustomWidth) && (
            <div
              className="pointer-events-none fixed inset-0 h-screen w-screen transform-gpu"
              style={{
                opacity: typeof noiseOpacity === "number" ? noiseOpacity : 0.04,
                mixBlendMode:
                  typeof noiseBlendMode === "string" && noiseBlendMode.trim()
                    ? noiseBlendMode
                    : "overlay",
                backgroundImage: "url(/images/noise.png)",
                backgroundRepeat: "repeat",
                ...noiseInlineStyle,
              }}
            />
          )}

          {(!isVideo || !hasCustomWidth) && overlay && (
            <div
              className="absolute inset-0 transition-all duration-300 ease-in-out"
              style={{
                opacity: overlayOpacity,
                backgroundColor: overlayColor,
                ...overlayTransitionStyle,
              }}
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
