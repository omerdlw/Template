"use client";

import { forwardRef } from "react";
import { cn } from "@/shared/utils";
import { resolveSlotClasses } from "./utils";

const Button = forwardRef(
  (
    {
      animate: _animate,
      children,
      className,
      classNames = {},
      disabled = false,
      exit: _exit,
      initial: _initial,
      transition: _transition,
      type = "button",
      variants: _variants,
      whileDrag: _whileDrag,
      whileFocus: _whileFocus,
      whileHover: _whileHover,
      whileTap: _whileTap,
      ...props
    },
    ref,
  ) => {
    const classes = resolveSlotClasses(className, classNames);

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled}
        className={cn(
          "disabled:cursor-not-allowed disabled:opacity-50",
          classes.root,
          classes.default,
        )}
        {...props}
      >
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";
export default Button;
