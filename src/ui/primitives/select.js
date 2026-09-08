import { forwardRef } from "react";
import { cn } from "@/shared/utils";

const SELECT_CLASSES =
  "min-h-10 w-full rounded-xl bg-white/5 px-3.5 py-2.5 text-sm text-white/70 ring-1 ring-inset ring-white/5 transition-colors hover:bg-white/10 hover:text-white focus:bg-white/10 focus:text-white outline-none cursor-pointer";

const Select = forwardRef(function Select(
  { className, children, ...props },
  ref,
) {
  return (
    <select ref={ref} className={cn(SELECT_CLASSES, className)} {...props}>
      {children}
    </select>
  );
});

Select.displayName = "Select";
export default Select;
