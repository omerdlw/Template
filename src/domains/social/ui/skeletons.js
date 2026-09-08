export function NotificationListSkeleton({ count = 12 }) {
  return Array.from({ length: count }, (_, index) => (
    <div
      key={index}
      className="flex animate-pulse items-center gap-3 border-b border-white/10 p-3 last:border-b-0 lg:p-4"
    >
      <div className="skeleton-block size-10 shrink-0 rounded-[14px]" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="skeleton-block h-3 w-3/5 rounded-full" />
        <div className="skeleton-block-soft h-2.5 w-2/5 rounded-full" />
      </div>
    </div>
  ));
}
