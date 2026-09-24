"use client";

import { useEffect, useState } from "react";
import { Gauge } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { useAuth } from "@/components/auth/auth-provider";
import * as creditService from "@/lib/services/credit.service";
import { CREDIT_CATEGORIES, CREDIT_CATEGORY_LABELS, DEFAULT_CREDIT_WEIGHTS, type CreditRules, type CreditTransaction } from "@/types/credit";
import { formatDate } from "@/lib/format";
import { CreditAmount, CreditEntryBadges } from "@/components/credits/credit-entry";

export function MyCreditsView() {
  const { user, organizationId } = useAuth();
  const [rules, setRules] = useState<CreditRules | null>(null);
  const [transactions, setTransactions] = useState<CreditTransaction[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!organizationId) return;
    return creditService.subscribeToCreditRules(organizationId, setRules, () => {});
  }, [organizationId]);

  useEffect(() => {
    if (!user) return;
    return creditService.subscribeToUserCreditTransactions(user.uid, setTransactions, setError);
  }, [user]);

  const weights = rules?.weights ?? DEFAULT_CREDIT_WEIGHTS;
  const total = Object.values(weights).reduce((sum, v) => sum + v, 0);
  // Net ledger balance: every award and every deduction, exactly as stored —
  // the same sum the server keeps in leaderboardStats.lifetimeCredits.
  const balance = (transactions ?? []).reduce((sum, t) => sum + t.credits, 0);

  const earnedByCategory = CREDIT_CATEGORIES.reduce<Record<string, number>>((acc, category) => {
    acc[category] = (transactions ?? []).filter((t) => t.category === category).reduce((sum, t) => sum + t.credits, 0);
    return acc;
  }, {});

  return (
    <div>
      <PageHeader title="My Credits" description="Your intern performance credits, category breakdown, and full history." />

      <Card className="mb-6">
        <CardContent className="flex flex-col items-center gap-2 px-5 py-8 text-center">
          <Gauge className="size-7 text-primary" />
          <p className="text-4xl font-semibold tracking-tight text-foreground">
            {balance}
            <span className="text-lg text-muted-foreground">/{total}</span>
          </p>
          <p className="text-sm text-muted-foreground">Current credit balance</p>
          <Progress value={total > 0 ? Math.max(0, Math.min(100, Math.round((balance / total) * 100))) : 0} className="mt-2 w-full max-w-xs" />
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Credit Breakdown</CardTitle>
          <CardDescription>Earned vs. target, per category</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {CREDIT_CATEGORIES.map((category) => (
            <div key={category}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="text-foreground">{CREDIT_CATEGORY_LABELS[category]}</span>
                <span className="text-muted-foreground">
                  {earnedByCategory[category] ?? 0}/{weights[category]}
                </span>
              </div>
              <Progress value={weights[category] > 0 ? Math.min(100, Math.round(((earnedByCategory[category] ?? 0) / weights[category]) * 100)) : 0} className="h-1.5" />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Credit History</CardTitle>
          <CardDescription>Every credit you&apos;ve earned, in order</CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : transactions === null ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : transactions.length === 0 ? (
            <EmptyState icon={Gauge} title="No credits yet" description="Credits appear here as soon as your work is verified and awarded." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Activity</TableHead>
                  <TableHead className="text-right">Credits</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>{formatDate(t.createdAt)}</TableCell>
                    <TableCell>
                      <CreditEntryBadges transaction={t} />
                    </TableCell>
                    <TableCell className="whitespace-normal">
                      <p className="text-foreground">{t.action}</p>
                      {t.reason && <p className="text-xs text-muted-foreground">{t.reason}</p>}
                    </TableCell>
                    <TableCell className="text-right">
                      <CreditAmount credits={t.credits} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
