"use client";

import { forwardRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import * as Toggle from "@radix-ui/react-toggle";
import { cn } from "@/shared/utils";
import { resolveSlotClasses } from "./utils";
import {
  DESTRUCTIVE_ACTION_TONE_CLASS,
  INFO_ACTION_TONE_CLASS,
  SUCCESS_ACTION_TONE_CLASS,
  WARNING_ACTION_TONE_CLASS,
} from "@/ui/tokens";

const SEMANTIC_VARIANT_CLASSES = Object.freeze({
  danger: DESTRUCTIVE_ACTION_TONE_CLASS,
  destructive: DESTRUCTIVE_ACTION_TONE_CLASS,
  info: INFO_ACTION_TONE_CLASS,
  success: SUCCESS_ACTION_TONE_CLASS,
  warning: WARNING_ACTION_TONE_CLASS,
});

const BUTTON_SPRING_TRANSITION = Object.freeze({
  type: "spring",
  stiffness: 520,
  damping: 30,
  mass: 0.28,
});

function stripConflictingClasses(cls) {
  if (!cls || typeof cls !== "string") return cls;
  return cls
    .replace(/\bactive:scale-\S+/g, "")
    .replace(/\btransition(-\S+)?\b/g, "")
    .replace(/\bduration-\S+\b/g, "")
    .replace(/\bease-\S+\b/g, "")
    .replace(/\bmotion-reduce:transition-none\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const Button = forwardRef(
  (
    {
      variant = "default",
      defaultActive = false,
      onToggle,
      className,
      classNames = {},
      onClick,
      disabled = false,
      children,
      type = "button",
      whileHover: whileHoverProp,
      whileTap: whileTapProp,
      transition: transitionProp,
      style,
      ...props
    },
    ref,
  ) => {
    const [isActive, setIsActive] = useState(defaultActive);
    const reduceMotion = useReducedMotion();
    const canAnimate = !disabled && !reduceMotion;

    const resolvedClassName = stripConflictingClasses(className);
    const resolvedClassNames = classNames
      ? {
          ...classNames,
          root: stripConflictingClasses(classNames.root),
          default: stripConflictingClasses(classNames.default),
        }
      : classNames;

    const classes = resolveSlotClasses(resolvedClassName, resolvedClassNames);

    const isIconLike =
      variant.endsWith("-icon") ||
      variant === "icon" ||
      /\b(size-[0-9.]+|w-[0-9.]+\s+h-[0-9.]+|h-[0-9.]+\s+w-[0-9.]+)\b/.test(
        resolvedClassName || "",
      );

    const isNavAction =
      variant === "nav-action" ||
      (Boolean(resolvedClassName) &&
        resolvedClassName.includes("rounded-[20px]") &&
        resolvedClassName.includes("uppercase") &&
        (resolvedClassName.includes("w-full") ||
          resolvedClassName.includes("flex-1")));

    const defaultTapScale = isIconLike ? 0.94 : isNavAction ? 0.99 : 0.98;

    const motionProps = {
      whileHover: whileHoverProp !== undefined ? whileHoverProp : undefined,
      whileTap:
        whileTapProp !== undefined
          ? whileTapProp
          : canAnimate
            ? { scale: defaultTapScale }
            : undefined,
      transition:
        transitionProp !== undefined
          ? transitionProp
          : BUTTON_SPRING_TRANSITION,
    };

    const mergedStyle = {
      transformOrigin: "center center",
      transitionProperty:
        "background-color, color, border-color, box-shadow, opacity",
      ...style,
    };
    const baseClasses =
      "flex cursor-pointer items-center justify-center disabled:cursor-not-allowed select-none transition-colors duration-150 ease-out motion-reduce:transition-none";
    const semanticIconVariantClasses =
      SEMANTIC_VARIANT_CLASSES[variant.replace(/-icon$/, "")] || null;
    const semanticVariantClasses = SEMANTIC_VARIANT_CLASSES[variant] || null;

    if (semanticIconVariantClasses) {
      return (
        <motion.button
          ref={ref}
          type={type}
          onClick={onClick}
          disabled={disabled}
          className={cn(
            baseClasses,
            semanticIconVariantClasses,
            "size-9",
            classes.root,
          )}
          style={mergedStyle}
          {...motionProps}
          {...props}
        >
          {children}
        </motion.button>
      );
    }

    if (semanticVariantClasses) {
      return (
        <motion.button
          ref={ref}
          type={type}
          onClick={onClick}
          disabled={disabled}
          className={cn(
            baseClasses,
            semanticVariantClasses,
            "h-9 gap-2 px-4 text-xs font-bold uppercase",
            classes.root,
          )}
          style={mergedStyle}
          {...motionProps}
          {...props}
        >
          {children}
        </motion.button>
      );
    }

    if (variant === "toggle") {
      const handleToggleChange = (pressed) => {
        setIsActive(pressed);
        if (onToggle) {
          onToggle(pressed);
        }
      };

      return (
        <Toggle.Root
          ref={ref}
          asChild
          pressed={isActive}
          onPressedChange={handleToggleChange}
          disabled={disabled}
          {...props}
        >
          <motion.button
            type={type}
            className={cn(
              classes.root,
              classes.default,
              isActive && classes.toggle,
            )}
            style={mergedStyle}
            {...motionProps}
          >
            {children}
          </motion.button>
        </Toggle.Root>
      );
    }

    return (
      <motion.button
        ref={ref}
        type={type}
        onClick={onClick}
        disabled={disabled}
        className={cn(baseClasses, classes.root, classes.default)}
        style={mergedStyle}
        {...motionProps}
        {...props}
      >
        {children}
      </motion.button>
    );
  },
);

Button.displayName = "Button";
export default Button;
