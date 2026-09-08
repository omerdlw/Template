"use client";

import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useSpring,
} from "motion/react";
import { PLAYBACK_RATES } from "./constants";
import {
  getNavActionMotionProps,
  getNavMediaVolumeFillTransition,
  getNavMediaVolumeThumbAnimateProps,
  getNavMediaVolumeThumbPositionTransition,
  NAV_BUTTON_TRANSITION,
  NAV_SCRUBBER_TOOLTIP_TRANSITION,
  NAV_SCRUBBER_TOOLTIP_SPRING,
  navScrubberTooltipVariants,
  navSoundwaveBarVariants,
} from "./motion";
import { clamp, formatMediaTime } from "./utils";
export { formatMediaTime };
import { useBackgroundActions, useBackgroundState } from "@/modules/background";
import { cn } from "@/shared/utils";
import { Button } from "@/ui/primitives";
import Iconify from "@/ui/primitives/icon";
function resolveActionNode(action, mediaAction, showMediaAction) {
  const MediaAction = mediaAction;
  if (React.isValidElement(action)) {
    return (
      <div className="flex flex-col gap-2.5">
        {action}
        {showMediaAction && <MediaAction />}
      </div>
    );
  }
  if (typeof action === "function") {
    const ActionComponent = action;
    return (
      <div className="flex flex-col gap-2.5">
        <ActionComponent />
        {showMediaAction && <MediaAction />}
      </div>
    );
  }
  return showMediaAction ? <MediaAction /> : null;
}
export function applyMediaAction(
  item,
  isVideo,
  toggleBackgroundVideo,
  mediaAction,
) {
  if (!item || !isVideo) {
    return item;
  }
  const showMediaAction = Boolean(mediaAction) && item.mediaAction !== false;
  return {
    ...item,
    action: resolveActionNode(item.action, mediaAction, showMediaAction),
    onClick: (event) => {
      event?.preventDefault?.();
      event?.stopPropagation?.();
      toggleBackgroundVideo();
    },
  };
}
export const NavSoundwave = memo(function NavSoundwave({
  isPlaying = false,
  className = "",
  barCount = 4,
}) {
  const safeBarCount = clamp(Math.floor(Number(barCount) || 0), 1, 12);
  return (
    <div
      className={cn("flex h-3.5 items-end justify-center gap-0.5", className)}
      aria-hidden="true"
    >
      {Array.from({
        length: safeBarCount,
      }).map((_, index) => (
        <motion.span
          key={index}
          custom={index}
          variants={navSoundwaveBarVariants}
          animate={isPlaying ? "playing" : "paused"}
          className="h-full w-0.5 origin-bottom rounded-full bg-white/70"
        />
      ))}
    </div>
  );
});
export const NavMediaControls = memo(function NavMediaControls({
  className = "",
}) {
  const { videoElement, videoOptions } = useBackgroundState();
  const { toggleLoop } = useBackgroundActions();
  const [playbackRate, setPlaybackRate] = useState(
    videoElement?.playbackRate || 1,
  );
  const [volume, setVolume] = useState(() => Number(videoElement?.volume ?? 1));
  const [isMuted, setIsMuted] = useState(() => Boolean(videoElement?.muted));
  const [isDraggingVolume, setIsDraggingVolume] = useState(false);
  const [isPipActive, setIsPipActive] = useState(false);
  const [isPipSupported, setIsPipSupported] = useState(false);
  const isDraggingRef = useRef(false);
  const volumeTrackRef = useRef(null);
  const volumeFillRef = useRef(null);
  const volumeThumbRef = useRef(null);
  const volumeDragCleanupRef = useRef(null);
  const isLoop = Boolean(videoOptions?.loop);
  useEffect(() => {
    return () => {
      volumeDragCleanupRef.current?.();
      volumeDragCleanupRef.current = null;
      isDraggingRef.current = false;
    };
  }, []);
  useEffect(() => {
    if (
      typeof document !== "undefined" &&
      "pictureInPictureEnabled" in document
    ) {
      setIsPipSupported(Boolean(document.pictureInPictureEnabled));
    }
  }, []);
  useEffect(() => {
    if (!videoElement) {
      setPlaybackRate(1);
      setVolume(1);
      setIsMuted(false);
      setIsPipActive(false);
      return undefined;
    }
    const syncState = () => {
      const nextRate = Number(videoElement.playbackRate);
      setPlaybackRate(Number.isFinite(nextRate) && nextRate > 0 ? nextRate : 1);
      if (isDraggingRef.current) return;
      const currentVol = Number(videoElement.volume) || 0;
      const currentMute = Boolean(videoElement.muted);
      setVolume(currentVol);
      setIsMuted(currentMute);
      const effective = currentMute ? 0 : currentVol;
      if (volumeFillRef.current) {
        volumeFillRef.current.style.width = `${effective * 100}%`;
      }
      if (volumeThumbRef.current) {
        volumeThumbRef.current.style.left = `${effective * 100}%`;
      }
    };
    const handleEnterPip = () => setIsPipActive(true);
    const handleLeavePip = () => setIsPipActive(false);
    syncState();
    videoElement.addEventListener("ratechange", syncState);
    videoElement.addEventListener("volumechange", syncState);
    videoElement.addEventListener("enterpictureinpicture", handleEnterPip);
    videoElement.addEventListener("leavepictureinpicture", handleLeavePip);
    return () => {
      videoElement.removeEventListener("ratechange", syncState);
      videoElement.removeEventListener("volumechange", syncState);
      videoElement.removeEventListener("enterpictureinpicture", handleEnterPip);
      videoElement.removeEventListener("leavepictureinpicture", handleLeavePip);
    };
  }, [videoElement]);
  const handleCycleSpeed = useCallback(() => {
    if (!videoElement) return;
    const currentIndex = PLAYBACK_RATES.indexOf(playbackRate);
    const nextRate = PLAYBACK_RATES[(currentIndex + 1) % PLAYBACK_RATES.length];
    videoElement.playbackRate = nextRate;
    setPlaybackRate(nextRate);
  }, [playbackRate, videoElement]);
  const updateVolumeFromPosition = useCallback(
    (clientX) => {
      if (!videoElement || !volumeTrackRef.current) return;
      const rect = volumeTrackRef.current.getBoundingClientRect();
      if (rect.width <= 0) return;
      const offsetX = Math.max(0, Math.min(clientX - rect.left, rect.width));
      const fraction = offsetX / rect.width;
      const nextVolume = Math.round(fraction * 100) / 100;
      if (volumeFillRef.current) {
        volumeFillRef.current.style.width = `${fraction * 100}%`;
      }
      if (volumeThumbRef.current) {
        volumeThumbRef.current.style.left = `${fraction * 100}%`;
      }
      videoElement.volume = nextVolume;
      videoElement.muted = nextVolume === 0;
      setVolume(nextVolume);
      setIsMuted(nextVolume === 0);
    },
    [videoElement],
  );
  const handleVolumePointerDown = useCallback(
    (event) => {
      event.preventDefault();
      event.stopPropagation();
      volumeDragCleanupRef.current?.();
      isDraggingRef.current = true;
      setIsDraggingVolume(true);
      try {
        event.currentTarget.setPointerCapture?.(event.pointerId);
      } catch {}
      updateVolumeFromPosition(event.clientX);
      const handlePointerMove = (moveEvent) => {
        if (!isDraggingRef.current) return;
        updateVolumeFromPosition(moveEvent.clientX);
      };
      const handlePointerUp = () => {
        isDraggingRef.current = false;
        setIsDraggingVolume(false);
        if (videoElement) {
          setVolume(Number(videoElement.volume) || 0);
          setIsMuted(Boolean(videoElement.muted));
        }
        removePointerListeners();
      };
      const removePointerListeners = () => {
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
        window.removeEventListener("pointercancel", handlePointerUp);
        if (volumeDragCleanupRef.current === removePointerListeners) {
          volumeDragCleanupRef.current = null;
        }
      };
      window.addEventListener("pointermove", handlePointerMove, {
        passive: true,
      });
      window.addEventListener("pointerup", handlePointerUp);
      window.addEventListener("pointercancel", handlePointerUp);
      volumeDragCleanupRef.current = removePointerListeners;
    },
    [updateVolumeFromPosition, videoElement],
  );
  const handleToggleMute = useCallback(
    (event) => {
      event.stopPropagation();
      if (!videoElement) return;
      if (isMuted || volume === 0) {
        const restoredVolume = volume === 0 ? 0.7 : volume;
        videoElement.volume = restoredVolume;
        videoElement.muted = false;
        setVolume(restoredVolume);
        setIsMuted(false);
        if (volumeFillRef.current) {
          volumeFillRef.current.style.width = `${restoredVolume * 100}%`;
        }
        if (volumeThumbRef.current) {
          volumeThumbRef.current.style.left = `${restoredVolume * 100}%`;
        }
      } else {
        videoElement.muted = true;
        setIsMuted(true);
        if (volumeFillRef.current) {
          volumeFillRef.current.style.width = "0%";
        }
        if (volumeThumbRef.current) {
          volumeThumbRef.current.style.left = "0%";
        }
      }
    },
    [isMuted, videoElement, volume],
  );
  const handleTogglePip = useCallback(async () => {
    if (!videoElement) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled) {
        await videoElement.requestPictureInPicture();
      }
    } catch {}
  }, [videoElement]);
  const handleSkipBackward = useCallback(() => {
    if (!videoElement) return;
    const current = Number(videoElement.currentTime) || 0;
    videoElement.currentTime = Math.max(0, current - 10);
  }, [videoElement]);
  const handleSkipForward = useCallback(() => {
    if (!videoElement) return;
    const current = Number(videoElement.currentTime) || 0;
    const duration = Number(videoElement.duration) || 0;
    videoElement.currentTime =
      duration > 0 ? Math.min(duration, current + 10) : current + 10;
  }, [videoElement]);
  const effectiveVolume = isMuted ? 0 : volume;
  const volumeIcon =
    effectiveVolume === 0
      ? "solar:volume-cross-bold"
      : effectiveVolume < 0.5
        ? "solar:volume-low-bold"
        : "solar:volume-loud-bold";
  return (
    <div
      className={cn(
        "flex w-full items-center justify-between gap-2 select-none",
        className,
      )}
    >
      <div className="flex items-center gap-1.5">
        <Button
          type="button"
          onClick={handleCycleSpeed}
          className={cn(
            "flex h-8 cursor-pointer items-center justify-center rounded-full px-3 text-xs font-semibold tabular-nums ring-1 ring-inset",
            playbackRate !== 1
              ? "bg-white/10 text-white ring-white/10 hover:bg-white/15"
              : "bg-white/5 text-white/70 ring-white/5 hover:bg-white/10 hover:text-white hover:ring-white/10",
          )}
          aria-label={`Playback speed ${playbackRate}x`}
          title={`Playback speed: ${playbackRate}x`}
        >
          <span>{playbackRate}x</span>
        </Button>

        <Button
          type="button"
          onClick={handleSkipBackward}
          className="flex size-8 cursor-pointer items-center justify-center rounded-full bg-white/5 text-white/70 ring-1 ring-white/5 ring-inset hover:bg-white/10 hover:text-white hover:ring-white/10"
          aria-label="Rewind 10 seconds"
          title="Rewind 10 seconds"
        >
          <Iconify icon="solar:rewind-10-seconds-back-bold" size={16} />
        </Button>

        <Button
          type="button"
          onClick={handleSkipForward}
          className="flex size-8 cursor-pointer items-center justify-center rounded-full bg-white/5 text-white/70 ring-1 ring-white/5 ring-inset hover:bg-white/10 hover:text-white hover:ring-white/10"
          aria-label="Forward 10 seconds"
          title="Forward 10 seconds"
        >
          <Iconify icon="solar:rewind-10-seconds-forward-bold" size={16} />
        </Button>
      </div>

      <div className="flex items-center gap-1.5">
        <motion.div
          {...getNavActionMotionProps({
            disabled: isDraggingVolume,
          })}
          className={cn(
            "group flex h-8 items-center gap-1.5 rounded-full px-2.5 ring-1 select-none ring-inset",
            isDraggingVolume
              ? "bg-white/10 ring-white/10"
              : "bg-white/5 ring-white/5 hover:bg-white/10 hover:ring-white/10",
          )}
        >
          <Button
            type="button"
            onClick={handleToggleMute}
            whileHover={false}
            whileTap={false}
            className="flex size-5 cursor-pointer items-center justify-center p-0 text-white/70 hover:text-white"
            aria-label={isMuted ? "Unmute" : "Mute"}
            title={
              isMuted
                ? "Unmute"
                : `Volume: ${Math.round(effectiveVolume * 100)}%`
            }
          >
            <Iconify icon={volumeIcon} size={16} />
          </Button>

          <div
            ref={volumeTrackRef}
            role="slider"
            aria-label="Volume slider"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(effectiveVolume * 100)}
            tabIndex={0}
            onPointerDown={handleVolumePointerDown}
            onKeyDown={(event) => {
              if (!videoElement) return;
              if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
                event.preventDefault();
                const next = Math.max(0, volume - 0.05);
                videoElement.volume = next;
                videoElement.muted = next === 0;
              } else if (
                event.key === "ArrowRight" ||
                event.key === "ArrowUp"
              ) {
                event.preventDefault();
                const next = Math.min(1, volume + 0.05);
                videoElement.volume = next;
                videoElement.muted = false;
              }
            }}
            className="group/track relative flex h-6 w-16 cursor-pointer touch-none items-center select-none sm:w-20"
          >
            <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                ref={volumeFillRef}
                className="h-full origin-left rounded-full bg-white"
                style={{
                  width: `${effectiveVolume * 100}%`,
                  transition: getNavMediaVolumeFillTransition({
                    isDragging: isDraggingVolume,
                  }),
                }}
              />
            </div>

            <motion.div
              ref={volumeThumbRef}
              className={cn(
                "pointer-events-none absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-md ring-2 ring-black",
                isDraggingVolume
                  ? "opacity-100"
                  : "opacity-0 group-hover/track:opacity-100",
              )}
              animate={getNavMediaVolumeThumbAnimateProps({
                isDragging: isDraggingVolume,
              })}
              transition={NAV_BUTTON_TRANSITION}
              style={{
                left: `${effectiveVolume * 100}%`,
                transition: getNavMediaVolumeThumbPositionTransition({
                  isDragging: isDraggingVolume,
                }),
              }}
            />
          </div>
        </motion.div>

        {isPipSupported && (
          <Button
            type="button"
            onClick={handleTogglePip}
            className={cn(
              "flex size-8 cursor-pointer items-center justify-center rounded-full ring-1 ring-inset",
              isPipActive
                ? "bg-white/10 text-white ring-white/10 hover:bg-white/15"
                : "bg-white/5 text-white/70 ring-white/5 hover:bg-white/10 hover:text-white hover:ring-white/10",
            )}
            aria-label={
              isPipActive
                ? "Exit Picture-in-Picture"
                : "Enter Picture-in-Picture"
            }
            title={
              isPipActive ? "Exit Picture-in-Picture" : "Picture-in-Picture"
            }
          >
            <Iconify icon="solar:pip-bold" size={16} />
          </Button>
        )}

        <Button
          type="button"
          onClick={toggleLoop}
          className={cn(
            "flex size-8 cursor-pointer items-center justify-center rounded-full ring-1 ring-inset",
            isLoop
              ? "bg-white/10 text-white ring-white/10 hover:bg-white/15"
              : "bg-white/5 text-white/70 ring-white/5 hover:bg-white/10 hover:text-white hover:ring-white/10",
          )}
          aria-label={isLoop ? "Disable loop" : "Enable loop"}
          title={isLoop ? "Loop: On" : "Loop: Off"}
        >
          <Iconify icon="solar:repeat-bold" size={16} />
        </Button>
      </div>
    </div>
  );
});
export const NavMediaScrubber = memo(function NavMediaScrubber({
  className = "",
  showTimeOnHover = true,
}) {
  const { isVideo, isPlaying, videoElement } = useBackgroundState();
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [hoverTime, setHoverTime] = useState(0);
  const hoverX = useMotionValue(0);
  const smoothHoverX = useSpring(hoverX, NAV_SCRUBBER_TOOLTIP_SPRING);
  const scrubberRef = useRef(null);
  const progressBarRef = useRef(null);
  useEffect(() => {
    if (!videoElement) {
      if (progressBarRef.current) {
        progressBarRef.current.style.transform = "scaleX(0)";
      }
      setCurrentTime(0);
      setDuration(0);
      return undefined;
    }
    let animationFrameId = null;
    const publishProgress = () => {
      const rawCurrentTime = Number(videoElement.currentTime);
      const rawDuration = Number(videoElement.duration);
      const current =
        Number.isFinite(rawCurrentTime) && rawCurrentTime >= 0
          ? rawCurrentTime
          : 0;
      const total =
        Number.isFinite(rawDuration) && rawDuration > 0 ? rawDuration : 0;
      const ratio = total > 0 ? clamp(current / total, 0, 1) : 0;
      if (progressBarRef.current) {
        progressBarRef.current.style.transform = `scaleX(${ratio})`;
      }
      setCurrentTime((publishedTime) =>
        Math.abs(publishedTime - current) >= 0.1 ? current : publishedTime,
      );
      setDuration((publishedDuration) =>
        publishedDuration === total ? publishedDuration : total,
      );
    };
    const runProgressLoop = () => {
      publishProgress();
      animationFrameId = requestAnimationFrame(runProgressLoop);
    };
    publishProgress();
    if (isPlaying) animationFrameId = requestAnimationFrame(runProgressLoop);
    videoElement.addEventListener("timeupdate", publishProgress);
    videoElement.addEventListener("durationchange", publishProgress);
    videoElement.addEventListener("loadedmetadata", publishProgress);
    return () => {
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }
      videoElement.removeEventListener("timeupdate", publishProgress);
      videoElement.removeEventListener("durationchange", publishProgress);
      videoElement.removeEventListener("loadedmetadata", publishProgress);
    };
  }, [isPlaying, videoElement]);
  const seekToTime = useCallback(
    (targetTime) => {
      if (!videoElement || duration <= 0) return;
      const nextTime = clamp(targetTime, 0, duration);
      videoElement.currentTime = nextTime;
      setCurrentTime(nextTime);
      if (progressBarRef.current) {
        progressBarRef.current.style.transform = `scaleX(${nextTime / duration})`;
      }
    },
    [duration, videoElement],
  );
  const handleSeek = useCallback(
    (event) => {
      if (!videoElement || !scrubberRef.current || !duration) return;
      const rect = scrubberRef.current.getBoundingClientRect();
      const clientX = event.clientX ?? event.touches?.[0]?.clientX ?? 0;
      const offsetX = Math.max(0, Math.min(clientX - rect.left, rect.width));
      const percentage = rect.width > 0 ? offsetX / rect.width : 0;
      seekToTime(percentage * duration);
    },
    [duration, seekToTime, videoElement],
  );
  const handleKeyDown = useCallback(
    (event) => {
      const keyTargets = {
        ArrowLeft: currentTime - 5,
        ArrowRight: currentTime + 5,
        Home: 0,
        End: duration,
      };
      if (!(event.key in keyTargets)) return;
      event.preventDefault();
      event.stopPropagation();
      seekToTime(keyTargets[event.key]);
    },
    [currentTime, duration, seekToTime],
  );
  const handleMouseMove = useCallback(
    (event) => {
      if (!scrubberRef.current || !duration) return;
      const rect = scrubberRef.current.getBoundingClientRect();
      const clientX = event.clientX ?? 0;
      const offsetX = Math.max(0, Math.min(clientX - rect.left, rect.width));
      const percentage = rect.width > 0 ? offsetX / rect.width : 0;
      hoverX.set(offsetX);
      setHoverTime(percentage * duration);
    },
    [duration, hoverX],
  );
  if (!isVideo || !videoElement) {
    return null;
  }
  return (
    <div
      ref={scrubberRef}
      role="slider"
      aria-label="Media playback scrubber"
      aria-valuemin={0}
      aria-valuemax={Math.round(duration)}
      aria-valuenow={Math.round(currentTime)}
      aria-valuetext={`${formatMediaTime(currentTime)} of ${formatMediaTime(duration)}`}
      tabIndex={0}
      className={cn(
        "group absolute inset-x-0 top-0 z-30 h-3 cursor-pointer touch-none overflow-hidden rounded-t-[30px] select-none",
        className,
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseMove={handleMouseMove}
      onKeyDown={handleKeyDown}
      onClick={(event) => {
        event.stopPropagation();
        handleSeek(event);
      }}
    >
      <div className="absolute inset-x-0 top-0 h-[2.5px] w-full bg-white/10 group-hover:h-1">
        <div
          ref={progressBarRef}
          className="h-full w-full origin-left bg-white/70 group-hover:bg-white"
          style={{
            transform: "scaleX(0)",
          }}
        />
      </div>

      <AnimatePresence>
        {isHovered && showTimeOnHover && duration > 0 && (
          <motion.div
            variants={navScrubberTooltipVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={NAV_SCRUBBER_TOOLTIP_TRANSITION}
            className="pointer-events-none absolute top-3 -translate-x-1/2 rounded-md bg-black/80 px-1.5 py-0.5 text-xs text-white ring-1 ring-white/10 ring-inset"
            style={{
              left: smoothHoverX,
            }}
          >
            {formatMediaTime(hoverTime)}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
