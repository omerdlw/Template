"use client";

import { memo } from "react";
import { Button, Icon } from "@/ui/primitives";
import { getNavActionClass } from "@/modules/nav";
import { INFO_ACTION_TONE_CLASS } from "@/shared";

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
        className={getNavActionClass({
          className: "transition-all disabled:cursor-not-allowed disabled:opacity-50",
          variant: INFO_ACTION_TONE_CLASS,
        })}
        onClick={(event) => {
          event.stopPropagation();
          onOpenInbox?.(event);
        }}
        type="button"
      >
        <Icon icon="solar:inbox-bold" size={16} />
        <span>Inbox {inboxCount}</span>
      </Button>
    </div>
  );
});

export const AccountAction = AccountInboxAction;
export default AccountInboxAction;
