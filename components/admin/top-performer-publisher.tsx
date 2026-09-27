"use client";

import { useState } from "react";
import { CheckCircle2, Sparkles, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useOrgLeaderboard } from "@/components/credits/use-org-leaderboard";
import { useTopPerformers } from "@/components/credits/use-top-performers";
import { periodLeaders } from "@/lib/credits/leaderboard";
import { monthKey, monthLabel, weekRangeLabel, weekStartKey } from "@/lib/credits/periods";
import { selectItems } from "@/lib/select-items";
import { publishTopPerformer, removeTopPerformer } from "@/lib/services/top-performer.service";
import { TOP_PERFORMER_MESSAGE_MAX, type PerformerPeriod, type TopPerformer } from "@/types/top-performer";
import type { LeaderboardEntry } from "@/types/credit";
import type { PlatformUser } from "@/types/platform";

interface PublisherProps {
  organizationId: string;
  /** The organization's members — the people who can be recognized. */
  users: PlatformUser[];
  adminUid: string;
  adminName: string;
}

/**
 * Admin control for the organization-wide Top Performer recognition: pick the
 * Weekly / Monthly Top Performer (the credit leader is offered as a
 * suggestion, never forced), add a short note, publish. Every member of this
 * organization then sees it on their dashboard (TopPerformerBanner).
 */
export function TopPerformerPublisher({ organizationId, users, adminUid, adminName }: PublisherProps) {
  const { weekly, monthly } = useTopPerformers(organizationId);
  const { entries } = useOrgLeaderboard(organizationId);
  const candidates = users.filter((u) => u.status !== "Suspended").sort((a, b) => a.name.localeCompare(b.name));

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="size-4 text-amber-500" aria-hidden />
          Recognize Top Performers
        </CardTitle>
        <CardDescription>Choose this week&apos;s and this month&apos;s Top Performer. Everyone in your organization sees them on their dashboard.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 lg:grid-cols-2">
        {(["weekly", "monthly"] as const).map((period) => {
          const published = period === "weekly" ? weekly : monthly;
          return (
            <PeriodPublisher
              // Remount when the published recognition changes so the form re-seeds from it.
              key={`${period}-${published?.userId ?? "none"}-${published?.periodKey ?? ""}-${published?.message ?? ""}`}
              period={period}
              published={published}
              entries={entries}
              candidates={candidates}
              organizationId={organizationId}
              adminUid={adminUid}
              adminName={adminName}
            />
          );
        })}
      </CardContent>
    </Card>
  );
}

function PeriodPublisher({
  period,
  published,
  entries,
  candidates,
  organizationId,
  adminUid,
  adminName,
}: {
  period: PerformerPeriod;
  published: TopPerformer | null;
  entries: LeaderboardEntry[] | null;
  candidates: PlatformUser[];
  organizationId: string;
  adminUid: string;
  adminName: string;
}) {
  const currentKey = period === "weekly" ? weekStartKey() : monthKey();
  const periodText = period === "weekly" ? weekRangeLabel(currentKey) : monthLabel(currentKey);
  const publishedIsCurrent = published?.periodKey === currentKey;

  const [userId, setUserId] = useState(publishedIsCurrent ? published!.userId : "");
  const [message, setMessage] = useState(publishedIsCurrent ? published!.message : "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const suggestion = entries ? periodLeaders(entries, period)[0] : undefined;
  const suggestedUser = suggestion ? candidates.find((c) => c.id === suggestion.entry.uid) : undefined;
  const selected = candidates.find((c) => c.id === userId);

  async function publish() {
    if (!selected) {
      setError("Choose a member to recognize.");
      return;
    }
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      await publishTopPerformer({
        organizationId,
        period,
        periodKey: currentKey,
        userId: selected.id,
        displayName: selected.name,
        headline: selected.functionalRole ?? (selected.title || null),
        message,
        publishedBy: adminUid,
        publishedByName: adminName,
      });
      setDone(`${selected.name} is now the Top Performer of the ${period === "weekly" ? "week" : "month"}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to publish.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      await removeTopPerformer(organizationId, period);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to remove.");
      setBusy(false);
    }
  }

  const fieldId = `top-performer-${period}`;

  return (
    <div className="space-y-3 rounded-xl border border-border p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">{period === "weekly" ? "Top Performer of the Week" : "Top Performer of the Month"}</p>
        <p className="text-xs text-muted-foreground">{periodText}</p>
      </div>

      <p className="text-xs text-muted-foreground">
        {published
          ? `Currently shown to everyone: ${published.displayName} (${published.period === "weekly" ? weekRangeLabel(published.periodKey) : monthLabel(published.periodKey)}).`
          : "Nothing published yet — members don't see a Top Performer until you publish one."}
      </p>

      {suggestion && suggestedUser && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-sm">
          <span className="flex items-center gap-1.5 text-foreground">
            <Sparkles className="size-3.5 text-amber-600" aria-hidden />
            Suggested by credits: <strong>{suggestedUser.name}</strong> · {suggestion.score.toLocaleString()} credits
          </span>
          {userId !== suggestedUser.id && (
            <Button type="button" size="sm" variant="outline" onClick={() => setUserId(suggestedUser.id)}>
              Use suggestion
            </Button>
          )}
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor={`${fieldId}-member`}>Member</Label>
        <Select value={userId} onValueChange={(v) => setUserId(v ?? "")} items={selectItems(candidates, (c) => c.id, (c) => c.name, { value: userId, unresolvedLabel: "Unknown member" })}>
          <SelectTrigger id={`${fieldId}-member`} className="w-full">
            <SelectValue placeholder="Choose a member" />
          </SelectTrigger>
          <SelectContent>
            {candidates.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`${fieldId}-message`}>Recognition note (optional)</Label>
        <Textarea
          id={`${fieldId}-message`}
          rows={2}
          maxLength={TOP_PERFORMER_MESSAGE_MAX}
          placeholder="e.g. Shipped the new checkout flow two days early."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <p className="text-right text-[11px] text-muted-foreground">
          {message.length}/{TOP_PERFORMER_MESSAGE_MAX}
        </p>
      </div>

      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {done && (
        <p className="flex items-center gap-1.5 text-sm text-success">
          <CheckCircle2 className="size-4" aria-hidden />
          {done}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={publish} disabled={busy || !userId}>
          {busy ? "Saving…" : publishedIsCurrent ? "Update" : "Publish"}
        </Button>
        {published && (
          <Button type="button" variant="outline" onClick={remove} disabled={busy}>
            Remove
          </Button>
        )}
      </div>
    </div>
  );
}
