import { forwardRef } from "react";
import { cn } from "@/shared/utils";

const TEXTAREA_CLASSES =
  "min-h-28 w-full resize-y rounded-xl bg-white/5 px-3.5 py-2.5 text-sm leading-6 text-white/70 ring-1 ring-inset ring-white/5 placeholder:text-white/50 transition-colors hover:bg-white/10 hover:text-white focus:bg-white/10";

const Textarea = forwardRef(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(TEXTAREA_CLASSES, className)}
      {...props}
    />
  );
});

Textarea.displayName = "Textarea";
export default Textarea;
