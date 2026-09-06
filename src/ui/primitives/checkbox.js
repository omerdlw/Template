import { forwardRef } from "react";
import { cn } from "@/shared/utils";

const CHECKBOX_CLASSES =
  "size-4 rounded border-0 bg-white/5 text-white ring-1 ring-inset ring-white/10 accent-white";

const Checkbox = forwardRef(function Checkbox({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      type="checkbox"
      className={cn(CHECKBOX_CLASSES, className)}
      {...props}
    />
  );
});

Checkbox.displayName = "Checkbox";
export default Checkbox;
