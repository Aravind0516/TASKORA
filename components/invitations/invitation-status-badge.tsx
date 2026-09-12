import { cn } from "@/lib/utils";
import type { InvitationStatus } from "@/types/invitation";

const STYLES: Record<InvitationStatus, string> = {
  pending: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
  accepted: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  expired: "bg-muted text-muted-foreground",
  cancelled: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
};

const LABELS: Record<InvitationStatus, string> = {
  pending: "Pending",
  accepted: "Accepted",
  expired: "Expired",
  cancelled: "Cancelled",
};

/**
 * `emailSent` is a separate concern from `status` (see types/invitation.ts:
 * it tracks whether the provider actually delivered the LAST send attempt,
 * not whether the invitee has accepted) — never conflate the two, and never
 * conflate either with the invitee's eventual Firebase auth role. A pending
 * invitation whose email was actually delivered reads as "Email Sent" rather
 * than the more ambiguous plain "Pending".
 */
export function InvitationStatusBadge({
  status,
  emailSent,
  className,
}: {
  status: InvitationStatus;
  emailSent?: boolean;
  className?: string;
}) {
  const label = status === "pending" && emailSent ? "Email Sent" : LABELS[status];
  return (
    <span
      className={cn(
        "inline-flex w-fit shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        STYLES[status],
        className
      )}
    >
      {label}
    </span>
  );
}
