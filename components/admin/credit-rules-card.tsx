"use client";

import { useEffect, useState } from "react";
import { Gauge, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/components/auth/auth-provider";
import * as creditService from "@/lib/services/credit.service";
import { CREDIT_CATEGORIES, CREDIT_CATEGORY_LABELS, DEFAULT_CREDIT_WEIGHTS, type CreditCategory, type CreditRules } from "@/types/credit";

/**
 * Admin-only weight editor for the credit framework's 6 categories. Never
 * changes a single hard-coded "500" anywhere in the app — every credit
 * calculation reads these weights live, and saving here never rewrites
 * ALREADY-AWARDED transactions (each one keeps the credits it was actually
 * given at award time; see lib/services/credit.service.ts).
 */
export function CreditRulesCard({ organizationId }: { organizationId: string }) {
  const { user } = useAuth();
  const [rules, setRules] = useState<CreditRules | null>(null);
  const [weights, setWeights] = useState<Record<CreditCategory, number>>(DEFAULT_CREDIT_WEIGHTS);
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedRulesUpdatedAt, setSavedRulesUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = creditService.subscribeToCreditRules(organizationId, (r) => {
      setRules(r);
      if (r.updatedAt !== savedRulesUpdatedAt) {
        setWeights(r.weights);
        setSavedRulesUpdatedAt(r.updatedAt);
      }
    }, () => {});
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId]);

  const total = Object.values(weights).reduce((sum, v) => sum + (Number.isFinite(v) ? v : 0), 0);

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    setError(null);
    try {
      await creditService.updateCreditRules(organizationId, weights, user.uid);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save credit rules.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="mb-5">
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Gauge className="size-4 text-muted-foreground" /> Credit rules
          </CardTitle>
          <CardDescription>
            Target total: {total} credits{rules?.updatedAt ? " · configurable per category" : " (defaults, not yet customized)"}
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={() => setExpanded((v) => !v)}>
          {expanded ? "Hide" : "Edit"}
        </Button>
      </CardHeader>
      {expanded && (
        <CardContent>
          {error && <p className="mb-3 text-sm text-destructive">{error}</p>}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {CREDIT_CATEGORIES.map((category) => (
              <div key={category} className="space-y-1.5">
                <Label htmlFor={`weight-${category}`}>{CREDIT_CATEGORY_LABELS[category]}</Label>
                <Input
                  id={`weight-${category}`}
                  type="number"
                  min={0}
                  value={weights[category]}
                  onChange={(e) => setWeights((prev) => ({ ...prev, [category]: Number(e.target.value) || 0 }))}
                />
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-end gap-2">
            <Button size="sm" onClick={handleSave} disabled={saving}>
              <Save /> {saving ? "Saving..." : "Save rules"}
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
