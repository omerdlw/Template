import { forwardRef } from "react";
import { cn } from "@/shared/utils";

const INPUT_CLASSES =
  "min-h-10 w-full rounded-xl bg-white/5 px-3.5 py-2.5 text-sm text-white/70 ring-1 ring-inset ring-white/5 placeholder:text-white/50 transition-colors hover:bg-white/10 hover:text-white focus:bg-white/10";

const Input = forwardRef(function Input({ className, ...props }, ref) {
  return (
    <input ref={ref} className={cn(INPUT_CLASSES, className)} {...props} />
  );
});

Input.displayName = "Input";
export default Input;
