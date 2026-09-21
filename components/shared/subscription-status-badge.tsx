import { cn } from "@/lib/utils";
import type { SubscriptionStatus } from "@/types/organization";

// Display badge for the DERIVED status from lib/access-control.ts's
// getEffectiveSubscriptionStatus() — never the organization's raw stored
// subscriptionStatus field directly, so "EXPIRED" always reflects reality
// (see that function's own comment on why nothing ever literally writes
// "EXPIRED" to Firestore).

const STYLES: Record<SubscriptionStatus, string> = {
  TRIAL: "bg-info/10 text-info",
  PENDING: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  ACTIVE: "bg-success/10 text-success",
  REJECTED: "bg-danger/10 text-danger",
  EXPIRED: "bg-muted text-muted-foreground",
};

const LABELS: Record<SubscriptionStatus, string> = {
  TRIAL: "Trial",
  PENDING: "Pending review",
  ACTIVE: "Active",
  REJECTED: "Rejected",
  EXPIRED: "Expired",
};

export function SubscriptionStatusBadge({ status, className }: { status: SubscriptionStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex w-fit shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        STYLES[status],
        className
      )}
    >
      {LABELS[status]}
    </span>
  );
}
