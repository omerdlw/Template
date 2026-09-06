"use client";

import { forwardRef } from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { Z_INDEX } from "@/shared";
import { cn } from "@/shared/utils";
import { resolveSlotClasses } from "./primitive-support";

const Tooltip = forwardRef(
  (
    {
      text,
      position = "top",
      delayMs,
      className,
      classNames = {},
      children,
      open,
      defaultOpen,
      onOpenChange,
      sideOffset = 6,
      collisionPadding = 8,
      ...props
    },
    ref,
  ) => {
    const classes = resolveSlotClasses(className, classNames);

    const rootElement = (
      <TooltipPrimitive.Root
        open={open}
        defaultOpen={defaultOpen}
        onOpenChange={onOpenChange}
        delayDuration={delayMs}
      >
        <TooltipPrimitive.Trigger asChild className={cn(classes.trigger)}>
          {children}
        </TooltipPrimitive.Trigger>

        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            ref={ref}
            side={position}
            align="center"
            sideOffset={sideOffset}
            collisionPadding={collisionPadding}
            className={cn(
              "tooltip-content pointer-events-none z-(--z-tooltip) rounded-full font-medium select-none",
              "bg-white px-2.5 py-1 text-xs font-semibold text-black shadow-lg shadow-black/60",
              classes.content,
              classes.root,
            )}
            style={{
              "--z-tooltip": Z_INDEX.TOOLTIP,
            }}
            {...props}
          >
            {text}
            {classes.arrow && (
              <TooltipPrimitive.Arrow
                className={cn("fill-white", classes.arrow)}
              />
            )}
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    );

    return (
      <TooltipPrimitive.Provider
        delayDuration={typeof delayMs === "number" ? delayMs : undefined}
        disableHoverableContent
      >
        {rootElement}
      </TooltipPrimitive.Provider>
    );
  },
);
Tooltip.displayName = "Tooltip";
export { Tooltip };
export default Tooltip;
