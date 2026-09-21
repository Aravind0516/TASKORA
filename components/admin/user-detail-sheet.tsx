"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ExternalLink, Link2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PersonStatusBadge } from "@/components/platform/person-status-badge";
import * as creditService from "@/lib/services/credit.service";
import * as dailyWorkUpdateService from "@/lib/services/daily-work-update.service";
import { calculateProfileCompletion, domainLabel } from "@/types/candidate";
import { initials, formatDate } from "@/lib/format";
import type { PlatformUser, PlatformProject, PlatformTask, PlatformTeam } from "@/types/platform";
import type { PlatformInvitation } from "@/types/invitation";
import type { LeaderboardEntry } from "@/types/credit";
import type { DailyWorkUpdate } from "@/types/daily-work-update";

interface UserDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: PlatformUser | null;
  projects: PlatformProject[];
  tasks: PlatformTask[];
  teams: PlatformTeam[];
  invitation?: PlatformInvitation;
}

export function UserDetailSheet({ open, onOpenChange, user, projects, tasks, teams, invitation }: UserDetailSheetProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry | null>(null);
  const [dailyUpdates, setDailyUpdates] = useState<DailyWorkUpdate[]>([]);

  useEffect(() => {
    if (!user) return;
    creditService.getLeaderboardEntry(user.id).then(setLeaderboard).catch(() => setLeaderboard(null));
    const unsubscribe = dailyWorkUpdateService.subscribeToMyDailyUpdates(user.id, setDailyUpdates, () => setDailyUpdates([]));
    return unsubscribe;
  }, [user]);

  if (!user) return null;

  const userProjects = projects.filter((p) => p.memberIds.includes(user.id));
  const userTasks = tasks.filter((t) => t.assigneeId === user.id);
  const completedTasks = userTasks.filter((t) => t.status === "Completed");
  const userTeams = teams.filter((t) => user.teamIds.includes(t.id));
  const completion = calculateProfileCompletion({
    name: user.name,
    collegeName: user.collegeName,
    domain: user.domain,
    branch: undefined,
    passedOutYear: undefined,
    linkedinUrl: undefined,
    githubUrl: undefined,
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <div className="flex items-center gap-3">
            <Avatar size="lg">
              <AvatarFallback>{initials(user.name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <SheetTitle className="truncate">{user.name}</SheetTitle>
              <SheetDescription className="truncate">{user.email}</SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="px-4">
          <Tabs defaultValue="profile">
            <TabsList className="mb-4 w-full">
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="work">Work</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="verification">Verification</TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="space-y-3 text-sm">
              <Row label="Candidate ID" value={user.userId ?? "—"} />
              <Row label="Employment type" value={user.employmentType ?? "Employee"} />
              <Row label="College" value={user.collegeName ?? "—"} />
              <Row label="Domain" value={domainLabel(user.domain) || "—"} />
              <Row label="Functional role" value={user.functionalRole ?? "—"} />
              <Row label="Team" value={userTeams.map((t) => t.name).join(", ") || "—"} />
              <div className="pt-2">
                <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Profile completion</span>
                  <span>{completion.percent}%</span>
                </div>
                <Progress value={completion.percent} className="h-1.5" />
              </div>
            </TabsContent>

            <TabsContent value="work" className="space-y-4 text-sm">
              <div>
                <p className="mb-1.5 text-xs font-medium text-muted-foreground uppercase">Projects ({userProjects.length})</p>
                {userProjects.length === 0 ? (
                  <p className="text-muted-foreground">No projects assigned.</p>
                ) : (
                  <ul className="space-y-1">
                    {userProjects.map((p) => (
                      <li key={p.id} className="flex items-center justify-between">
                        <span className="truncate">{p.name}</span>
                        <span className="text-muted-foreground">{p.progress}%</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <p className="mb-1.5 text-xs font-medium text-muted-foreground uppercase">
                  Tasks ({completedTasks.length}/{userTasks.length} completed)
                </p>
              </div>
              <div>
                <p className="mb-1.5 text-xs font-medium text-muted-foreground uppercase">Daily updates ({dailyUpdates.length})</p>
                {dailyUpdates.slice(0, 5).map((u) => (
                  <div key={u.id} className="border-b border-border py-1.5 last:border-0">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-foreground">{formatDate(u.date)}</span>
                      <span className="text-muted-foreground">{u.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="performance" className="space-y-3 text-sm">
              <Row label="Lifetime credits" value={leaderboard ? String(leaderboard.lifetimeCredits) : "—"} />
              <Row label="Weekly credits" value={leaderboard ? String(leaderboard.weeklyCredits) : "—"} />
              <Row label="Monthly credits" value={leaderboard ? String(leaderboard.monthlyCredits) : "—"} />
            </TabsContent>

            <TabsContent value="verification" className="space-y-3 text-sm">
              <Row label="Account status" value={<PersonStatusBadge status={user.status} />} />
              <Row label="Invitation status" value={invitation ? invitation.status : "—"} />
              {invitation?.linkedinUrl && (
                <a href={invitation.linkedinUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                  <Link2 className="size-3.5" /> LinkedIn <ExternalLink className="size-3" />
                </a>
              )}
              {invitation?.githubUrl && (
                <a href={invitation.githubUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                  <Link2 className="size-3.5" /> GitHub <ExternalLink className="size-3" />
                </a>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}
