"use client";

import { memo } from "react";
import { Button, Icon } from "@/ui/primitives";

export const AccountInboxAction = memo(function AccountInboxAction({
  canManageRequests = false,
  inboxCount = 0,
  isOwner = false,
  onOpenInbox,
}) {
  if (!isOwner) return null;

  const shouldShowInboxAction =
    canManageRequests && inboxCount > 0 && typeof onOpenInbox === "function";

  if (!shouldShowInboxAction) return null;

  return (
    <div className="flex items-center gap-2">
      <Button
        aria-label={`Inbox with ${inboxCount} pending requests`}
        className="flex items-center gap-2 rounded-xl bg-info/15 px-3 py-1.5 text-xs font-semibold text-info hover:bg-info hover:text-black transition-all"
        onClick={(event) => {
          event.stopPropagation();
          onOpenInbox?.(event);
        }}
        type="button"
      >
        <Icon icon="solar:inbox-bold" size={14} />
        <span>Inbox {inboxCount}</span>
      </Button>
    </div>
  );
});

export const AccountAction = AccountInboxAction;
export default AccountInboxAction;
