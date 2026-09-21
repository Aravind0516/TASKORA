"use client";

import { useEffect, useMemo, useState } from "react";
import { Award, Gauge, Search, TrendingUp, BarChart3, Users } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { CreditRulesCard } from "@/components/admin/credit-rules-card";
import { usePlatform } from "@/components/platform/platform-provider";
import * as creditService from "@/lib/services/credit.service";
import { CREDIT_CATEGORIES, CREDIT_CATEGORY_LABELS, type CreditTransaction, type LeaderboardEntry } from "@/types/credit";
import { formatDate } from "@/lib/format";

type DateFilter = "all" | "week" | "month";
type SourceFilter = "all" | "automated" | "manual";

export function AdminCreditsView() {
  const { currentOrganizationId, getUser } = usePlatform();
  const orgId = currentOrganizationId ?? "";
  const [transactions, setTransactions] = useState<CreditTransaction[] | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[] | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");

  useEffect(() => {
    if (!orgId) return;
    return creditService.subscribeToOrgCreditTransactions(orgId, setTransactions, () => setTransactions([]));
  }, [orgId]);

  useEffect(() => {
    if (!orgId) return;
    return creditService.subscribeToLeaderboard(orgId, setLeaderboard, () => setLeaderboard([]));
  }, [orgId]);

  const filtered = useMemo(() => {
    if (!transactions) return [];
    const q = search.trim().toLowerCase();
    return transactions.filter((t) => {
      if (categoryFilter !== "all" && t.category !== categoryFilter) return false;
      if (sourceFilter === "automated" && t.sourceType === "MANUAL") return false;
      if (sourceFilter === "manual" && t.sourceType !== "MANUAL") return false;
      if (dateFilter !== "all") {
        const days = dateFilter === "week" ? 7 : 30;
        const cutoff = new Date().getTime() - days * 24 * 60 * 60 * 1000;
        if (new Date(t.createdAt).getTime() < cutoff) return false;
      }
      if (q) {
        const person = getUser(t.userId);
        const haystack = `${person?.name ?? ""} ${person?.userId ?? t.candidateId ?? ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [transactions, categoryFilter, sourceFilter, dateFilter, search, getUser]);

  const totalIssued = (transactions ?? []).filter((t) => t.credits > 0).reduce((sum, t) => sum + t.credits, 0);
  const candidateCount = (leaderboard ?? []).length;
  const averageCredits = candidateCount > 0 ? Math.round((leaderboard ?? []).reduce((sum, e) => sum + e.lifetimeCredits, 0) / candidateCount) : 0;
  const topCandidates = [...(leaderboard ?? [])].sort((a, b) => b.lifetimeCredits - a.lifetimeCredits).slice(0, 5);

  const loading = transactions === null || leaderboard === null;

  return (
    <div>
      <PageHeader title="Credit Management" description="Organization-wide credit ledger, awards, and rules." />

      {orgId && <CreditRulesCard organizationId={orgId} />}

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={Gauge} label="Total Credits Issued" value={String(totalIssued)} />
            <StatCard icon={Users} label="Candidates" value={String(candidateCount)} />
            <StatCard icon={TrendingUp} label="Average Credits" value={String(averageCredits)} />
            <StatCard icon={Award} label="Total Transactions" value={String((transactions ?? []).length)} />
          </div>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="size-4 text-muted-foreground" /> Top Candidates
              </CardTitle>
            </CardHeader>
            <CardContent>
              {topCandidates.length === 0 ? (
                <p className="text-sm text-muted-foreground">No credits awarded yet.</p>
              ) : (
                <ul className="space-y-2">
                  {topCandidates.map((entry, i) => (
                    <li key={entry.uid} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <span className="w-5 text-center text-xs font-semibold text-muted-foreground">#{i + 1}</span>
                        {entry.displayName}
                      </span>
                      <span className="font-medium text-foreground">{entry.lifetimeCredits} credits</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search by name or Candidate ID..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v ?? "all")}>
              <SelectTrigger className="w-full sm:w-52">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {CREDIT_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {CREDIT_CATEGORY_LABELS[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sourceFilter} onValueChange={(v) => setSourceFilter((v ?? "all") as SourceFilter)}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sources</SelectItem>
                <SelectItem value="automated">Automated</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
              </SelectContent>
            </Select>
            <Select value={dateFilter} onValueChange={(v) => setDateFilter((v ?? "all") as DateFilter)}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All time</SelectItem>
                <SelectItem value="week">Last 7 days</SelectItem>
                <SelectItem value="month">Last 30 days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>Every credit award and deduction — immutable, fully auditable</CardDescription>
            </CardHeader>
            <CardContent className="px-0 py-0">
              {filtered.length === 0 ? (
                <div className="py-8">
                  <EmptyState icon={Gauge} title="No transactions found" description="Try a different filter." />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Candidate</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Credits</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Awarded By</TableHead>
                      <TableHead>Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.slice(0, 100).map((t) => {
                      const person = getUser(t.userId);
                      const awarder = getUser(t.awardedBy);
                      return (
                        <TableRow key={t.id}>
                          <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(t.createdAt)}</TableCell>
                          <TableCell>
                            <div className="min-w-0">
                              <p className="truncate font-medium text-foreground">{person?.name ?? "Unknown"}</p>
                              <p className="truncate text-xs text-muted-foreground">{person?.userId ?? t.candidateId ?? "—"}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{CREDIT_CATEGORY_LABELS[t.category]}</TableCell>
                          <TableCell className={t.credits >= 0 ? "font-medium text-success" : "font-medium text-danger"}>
                            {t.credits >= 0 ? "+" : ""}
                            {t.credits}
                          </TableCell>
                          <TableCell>
                            <span
                              className={
                                t.sourceType === "MANUAL"
                                  ? "inline-flex rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400"
                                  : "inline-flex rounded-full bg-info/10 px-2 py-0.5 text-xs font-medium text-info"
                              }
                            >
                              {t.sourceType === "MANUAL" ? "Manual" : "Automated"}
                            </span>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{awarder?.name ?? "—"}</TableCell>
                          <TableCell className="max-w-xs truncate text-muted-foreground" title={t.reason}>
                            {t.reason}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: typeof Gauge; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between px-5 py-5">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">{value}</p>
        </div>
        <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-4.5" />
        </div>
      </CardContent>
    </Card>
  );
}
