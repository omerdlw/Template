import { cn } from "@/shared/utils";
import Icon from "@/ui/primitives/icon";

export function Spinner({ className, size = 15 }) {
  return (
    <div
      className={cn(
        "inline-flex animate-spin items-center justify-center align-middle leading-none",
        className,
      )}
      aria-label="Loading"
      role="status"
    >
      <Icon icon="mingcute:loading-3-fill" size={size} />
    </div>
  );
}
