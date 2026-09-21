import { cn } from "@/lib/utils";
import type { OrgStatus, PersonStatus } from "@/types/platform";

const STYLES: Record<PersonStatus | OrgStatus, string> = {
  Active: "bg-success/10 text-success",
  Invited: "bg-info/10 text-info",
  Suspended: "bg-danger/10 text-danger",
};

export function PersonStatusBadge({ status, className }: { status: PersonStatus | OrgStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex w-fit shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        STYLES[status],
        className
      )}
    >
      {status}
    </span>
  );
}
