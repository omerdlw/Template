"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { cn } from "@/shared/utils";

function toDimension(value) {
  if (typeof value === "number") return `${value}px`;
  if (typeof value === "string" && value.trim()) return value;
  return undefined;
}

const RESIZE_MAP = Object.freeze({
  none: "resize-none",
  false: "resize-none",
  y: "resize-y",
  vertical: "resize-y",
  x: "resize-x",
  horizontal: "resize-x",
  both: "resize",
  true: "resize",
});

const Input = forwardRef(function Input(
  {
    autoResize = false,
    className,
    decoration,
    decorationClassName,
    decorationPosition = "bottom",
    defaultValue,
    disabled = false,
    maxHeight,
    minHeight,
    mode = "input",
    onChange,
    resize,
    style,
    type = "text",
    value,
    wrapperClassName,
    ...props
  },
  ref,
) {
  const innerRef = useRef(null);

  const setRef = useCallback(
    (element) => {
      innerRef.current = element;
      if (typeof ref === "function") {
        ref(element);
      } else if (ref) {
        ref.current = element;
      }
    },
    [ref],
  );

  const isTextarea = mode === "textarea";

  const resolvedMinHeight = toDimension(minHeight);
  const resolvedMaxHeight = toDimension(maxHeight);
  const resizeClass = resize !== undefined ? RESIZE_MAP[String(resize)] : "";

  const adjustAutoHeight = useCallback(() => {
    const el = innerRef.current;
    if (!el || !isTextarea || !autoResize) return;
    el.style.height = "auto";
    let target = el.scrollHeight;
    if (typeof minHeight === "number") target = Math.max(target, minHeight);
    if (typeof maxHeight === "number") target = Math.min(target, maxHeight);
    el.style.height = `${target}px`;
  }, [autoResize, isTextarea, maxHeight, minHeight]);

  useEffect(() => {
    adjustAutoHeight();
  }, [adjustAutoHeight, value, defaultValue]);

  const handleChange = (event) => {
    if (autoResize && isTextarea) {
      adjustAutoHeight();
    }
    onChange?.(event);
  };

  const computedStyle = {
    ...(resolvedMinHeight ? { minHeight: resolvedMinHeight } : null),
    ...(resolvedMaxHeight ? { maxHeight: resolvedMaxHeight } : null),
    ...style,
  };

  const renderDecoration = () => {
    if (!decoration) return null;
    if (typeof decoration === "function") {
      return decoration({
        element: innerRef.current,
        value,
      });
    }
    return decoration;
  };

  const elementNode = isTextarea ? (
    <textarea
      className={cn(
        "w-full disabled:cursor-not-allowed disabled:opacity-50",
        resizeClass,
        className,
      )}
      defaultValue={defaultValue}
      disabled={disabled}
      onChange={handleChange}
      ref={setRef}
      style={computedStyle}
      value={value}
      {...props}
    />
  ) : (
    <input
      className={cn(
        "w-full disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      defaultValue={defaultValue}
      disabled={disabled}
      onChange={onChange}
      ref={setRef}
      style={computedStyle}
      type={type}
      value={value}
      {...props}
    />
  );

  if (!decoration) {
    return elementNode;
  }

  if (isTextarea) {
    if (decorationPosition === "inside" || decorationPosition === "bottom-right") {
      return (
        <div className={cn("relative w-full", wrapperClassName)}>
          {elementNode}
          <div
            className={cn(
              "pointer-events-auto absolute bottom-2.5 right-2.5 z-10",
              decorationClassName,
            )}
          >
            {renderDecoration()}
          </div>
        </div>
      );
    }

    if (decorationPosition === "top") {
      return (
        <div className={cn("flex w-full flex-col gap-1.5", wrapperClassName)}>
          <div className={cn("flex items-center justify-between", decorationClassName)}>
            {renderDecoration()}
          </div>
          {elementNode}
        </div>
      );
    }

    return (
      <div className={cn("flex w-full flex-col gap-1.5", wrapperClassName)}>
        {elementNode}
        <div className={cn("flex items-center justify-between", decorationClassName)}>
          {renderDecoration()}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative flex w-full items-center", wrapperClassName)}>
      {elementNode}
      <div className={cn("pointer-events-auto", decorationClassName)}>
        {renderDecoration()}
      </div>
    </div>
  );
});

export const Textarea = forwardRef(function Textarea(props, ref) {
  return <Input mode="textarea" ref={ref} {...props} />;
});

Textarea.displayName = "Textarea";
Input.displayName = "Input";
Input.Textarea = Textarea;

export { Input };
export default Input;
