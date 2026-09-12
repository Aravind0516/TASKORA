import { cn } from "@/lib/utils";
import type { OrgStatus, PersonStatus } from "@/types/platform";

const STYLES: Record<PersonStatus | OrgStatus, string> = {
  Active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  Invited: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
  Suspended: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
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
