"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { cn } from "@/shared/utils";

function getSafeSrc(src) {
  const value = String(src || "").trim();
  return value || null;
}

export default function AdaptiveImage({
  mode = "img",
  src,
  alt = "",
  className = "",
  wrapperClassName = "",
  skeletonClassName = "",
  fill,
  priority = false,
  preload = false,
  loading,
  fetchPriority,
  onLoad,
  onError,
  decoding = "async",
  ...props
}) {
  const imageRef = useRef(null);
  const resolvedSrc = getSafeSrc(src);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);

  useEffect(() => {
    const imageElement = imageRef.current;
    if (
      imageElement &&
      imageElement.complete &&
      imageElement.naturalWidth > 0
    ) {
      setHasLoaded(true);
      setHasFailed(false);
    } else {
      setHasLoaded(false);
      setHasFailed(false);
    }
  }, [resolvedSrc]);

  if (!resolvedSrc) {
    return null;
  }

  const resolvedFill =
    fill !== undefined ? fill : !props.width && !props.height;

  const imageClassName = cn(
    resolvedFill
      ? "absolute inset-0 h-full w-full select-none"
      : "h-full w-full",
    "transition-opacity duration-200 ease-out",
    hasLoaded ? "opacity-100" : "opacity-0",
    className,
  );

  const resolvedLoading = loading || (priority ? "eager" : "lazy");
  const resolvedFetchPriority =
    fetchPriority || (priority ? "high" : undefined);

  const handleLoad = (event) => {
    setHasLoaded(true);
    setHasFailed(false);
    onLoad?.(event);
  };

  const handleError = (event) => {
    setHasFailed(true);
    onError?.(event);
  };

  return (
    <div
      className={cn(
        "relative h-full w-full overflow-hidden bg-white/5 select-none",
        skeletonClassName,
        wrapperClassName,
      )}
      suppressHydrationWarning
    >
      {mode === "img" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={imageRef}
          src={resolvedSrc}
          alt={alt}
          draggable={false}
          onDragStart={(event) => event.preventDefault()}
          className={imageClassName}
          onLoad={handleLoad}
          onError={handleError}
          loading={resolvedLoading}
          fetchPriority={resolvedFetchPriority}
          decoding={decoding}
          suppressHydrationWarning
          {...props}
        />
      ) : (
        <Image
          ref={imageRef}
          src={resolvedSrc}
          alt={alt}
          fill={resolvedFill}
          preload={preload}
          draggable={false}
          onDragStart={(event) => event.preventDefault()}
          loading={resolvedLoading}
          fetchPriority={resolvedFetchPriority}
          decoding={decoding}
          className={imageClassName}
          onLoad={handleLoad}
          onError={handleError}
          suppressHydrationWarning
          {...props}
        />
      )}
    </div>
  );
}
