"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Minus, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useAuth } from "@/components/auth/auth-provider";
import * as creditService from "@/lib/services/credit.service";
import { CREDIT_CATEGORIES, CREDIT_CATEGORY_LABELS, DEFAULT_CREDIT_WEIGHTS, safeDisplayName, type CreditCategory, type CreditRules } from "@/types/credit";
import { cn } from "@/lib/utils";

// All 6 categories are awarded through this one audited action. A dedicated
// candidate-facing "submit your LinkedIn post URL" flow was scoped out of
// this pass (see final report) — the admin instead pastes the LinkedIn post
// URL they verified into the Reference field below, so LinkedIn/offer-letter
// credit still requires the same "admin verifies, then credits are awarded"
// sequence, never an automatic award for merely entering a URL.
const MANUAL_CATEGORIES = CREDIT_CATEGORIES;

/** Minimal recipient shape — satisfied by PlatformUser (the admin Users page's display type), so this dialog never needs its own candidate-fetching logic. */
export interface CreditRecipient {
  uid: string;
  name: string;
  email: string;
  userId?: string;
}

interface AwardCreditDialogProps {
  organizationId: string;
  candidate: CreditRecipient;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Action = "award" | "deduct";

export function AwardCreditDialog({ organizationId, candidate, open, onOpenChange }: AwardCreditDialogProps) {
  const { user } = useAuth();
  const [rules, setRules] = useState<CreditRules | null>(null);
  const [action, setAction] = useState<Action>("award");
  const [category, setCategory] = useState<CreditCategory>("PROJECT_SUBMISSION");
  const [credits, setCredits] = useState(String(DEFAULT_CREDIT_WEIGHTS.PROJECT_SUBMISSION));
  const [reason, setReason] = useState("");
  const [reference, setReference] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const unsubscribe = creditService.subscribeToCreditRules(organizationId, setRules, () => setRules(null));
    return unsubscribe;
  }, [organizationId, open]);

  function handleCategoryChange(next: CreditCategory) {
    setCategory(next);
    if (action === "award") setCredits(String(rules?.weights[next] ?? DEFAULT_CREDIT_WEIGHTS[next]));
  }

  function handleActionChange(next: Action) {
    setAction(next);
    // A deduction has no natural default amount — clear it rather than
    // pre-filling the category's full target, which would read as "deduct
    // the entire category" by default.
    setCredits(next === "award" ? String(rules?.weights[category] ?? DEFAULT_CREDIT_WEIGHTS[category]) : "");
  }

  async function handleSubmit() {
    if (!user) return;
    const magnitude = Number(credits);
    if (!Number.isFinite(magnitude) || magnitude <= 0) {
      setError("Enter a positive credit amount.");
      return;
    }
    if (!reason.trim()) {
      setError(`A reason is required for every credit ${action === "deduct" ? "deduction" : "award"}.`);
      return;
    }
    const signedAmount = action === "deduct" ? -magnitude : magnitude;
    setSubmitting(true);
    setError(null);
    try {
      await creditService.awardCredit({
        organizationId,
        userId: candidate.uid,
        candidateId: candidate.userId ?? null,
        displayName: safeDisplayName(candidate.name),
        category,
        credits: signedAmount,
        sourceType: "MANUAL",
        sourceId: reference.trim() || null,
        action: `${CREDIT_CATEGORY_LABELS[category]}${reference.trim() ? ` — ${reference.trim()}` : ""}`,
        reason: reason.trim(),
        awardedBy: user.uid,
      });
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : `Failed to ${action === "deduct" ? "deduct" : "award"} credit.`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Manage credits</DialogTitle>
          <DialogDescription>
            {candidate.name || candidate.email} — every adjustment is recorded permanently with your reason attached.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleActionChange("award")}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                action === "award" ? "border-success bg-success/10 text-success" : "border-border text-muted-foreground hover:bg-muted"
              )}
            >
              <Plus className="size-4" /> Award
            </button>
            <button
              type="button"
              onClick={() => handleActionChange("deduct")}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                action === "deduct" ? "border-destructive bg-destructive/10 text-destructive" : "border-border text-muted-foreground hover:bg-muted"
              )}
            >
              <Minus className="size-4" /> Deduct
            </button>
          </div>

          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select value={category} onValueChange={(v) => handleCategoryChange((v ?? "PROJECT_SUBMISSION") as CreditCategory)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MANUAL_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {CREDIT_CATEGORY_LABELS[c]} ({rules?.weights[c] ?? DEFAULT_CREDIT_WEIGHTS[c]} credits)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="award-credits">{action === "deduct" ? "Credits to deduct" : "Credits to award"}</Label>
            <Input id="award-credits" type="number" min={1} placeholder={action === "deduct" ? "e.g. 10" : undefined} value={credits} onChange={(e) => setCredits(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="award-reference">Reference (optional)</Label>
            <Input
              id="award-reference"
              placeholder="Project name, meeting date, document title..."
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              A reference lets the same item be {action === "deduct" ? "deducted" : "credited"} only once — re-{action === "deduct" ? "deducting" : "awarding"} the same category + reference is blocked automatically.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="award-reason">Reason (required)</Label>
            <Textarea
              id="award-reason"
              rows={3}
              placeholder={
                action === "deduct"
                  ? "Missed mandatory team meeting without notice."
                  : "Verified the pull request and manager sign-off for the sprint deliverable."
              }
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting} variant={action === "deduct" ? "destructive" : "default"}>
            {submitting ? "Saving..." : action === "deduct" ? "Deduct credit" : "Award credit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
