import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { creditEntryLabels, formatCreditAmount, type CreditTransaction } from "@/types/credit";

/** "Awarded" / "Deducted" (+ "Adjustment" for an admin's manual entry) — shared by every credit history table so they can never disagree. */
export function CreditEntryBadges({
  transaction,
  showAdjustment = true,
}: {
  transaction: Pick<CreditTransaction, "entryType" | "sourceType" | "status">;
  /** Hide the "Adjustment" chip where the table already has its own Source column. */
  showAdjustment?: boolean;
}) {
  const { kind, isAdjustment } = creditEntryLabels(transaction);
  return (
    <div className="flex flex-wrap items-center gap-1">
      <Badge variant={kind === "Deducted" ? "destructive" : "secondary"}>{kind}</Badge>
      {showAdjustment && isAdjustment && <Badge variant="outline">Adjustment</Badge>}
      {transaction.status === "REVERSED" && <Badge variant="outline">Reversed</Badge>}
    </div>
  );
}

/** Signed amount, colored by the ledger's own sign — a deduction can never render as a positive award. */
export function CreditAmount({ credits, className }: { credits: number; className?: string }) {
  return <span className={cn("font-medium tabular-nums", credits < 0 ? "text-danger" : "text-success", className)}>{formatCreditAmount(credits)}</span>;
}
