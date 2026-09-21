"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Award, CheckCircle2, Eye, MoreHorizontal, Pencil, Plus, Search, ShieldOff, ShieldCheck, Users } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PersonStatusBadge } from "@/components/platform/person-status-badge";
import { UserFormDialog } from "@/components/admin/user-form-dialog";
import { UserDetailSheet } from "@/components/admin/user-detail-sheet";
import { AwardCreditDialog } from "@/components/admin/award-credit-dialog";
import { CreditRulesCard } from "@/components/admin/credit-rules-card";
import { InviteUserDialog } from "@/components/invitations/invite-user-dialog";
import { PendingInvitationsSection } from "@/components/invitations/pending-invitations-section";
import { initials, timeAgo } from "@/lib/format";
import { calculateProfileCompletion, domainLabel } from "@/types/candidate";
import { usePlatform } from "@/components/platform/platform-provider";
import * as invitationService from "@/lib/services/invitation.service";
import * as creditService from "@/lib/services/credit.service";
import type { PersonStatus, PlatformUser } from "@/types/platform";
import type { PlatformUserFormValues } from "@/lib/validation/platform-user.schema";
import type { PlatformInvitation } from "@/types/invitation";
import type { LeaderboardEntry } from "@/types/credit";

const EMAIL_SENT_MESSAGE = "Invitation email sent successfully.";
const EMAIL_UNAVAILABLE_MESSAGE = "Invitation could not be sent. Please try again.";

export function AdminUsersView() {
  const [loading, setLoading] = useState(true);
  const { currentOrganizationId, usersInOrg, teamsInOrg, projectsInOrg, tasksInOrg, invitationsInOrg, updateUser } = usePlatform();
  const orgId = currentOrganizationId ?? "";

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<PersonStatus | "all">("all");
  const [teamFilter, setTeamFilter] = useState<string>("all");
  const [employmentFilter, setEmploymentFilter] = useState<string>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<PlatformUser | null>(null);
  const [viewingUser, setViewingUser] = useState<PlatformUser | null>(null);
  const [awardingUser, setAwardingUser] = useState<PlatformUser | null>(null);
  const [banner, setBanner] = useState<{ text: string; tone: "success" | "error" } | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  const users = usersInOrg(orgId);
  const teams = teamsInOrg(orgId);
  const projects = projectsInOrg(orgId);
  const tasks = tasksInOrg(orgId);
  const invitations = invitationsInOrg(orgId);

  useEffect(() => {
    if (!orgId) return;
    return creditService.subscribeToLeaderboard(orgId, setLeaderboard, () => setLeaderboard([]));
  }, [orgId]);

  useEffect(() => {
    const timeout = setTimeout(() => setLoading(false), 450);
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!banner) return;
    const timeout = setTimeout(() => setBanner(null), 4500);
    return () => clearTimeout(timeout);
  }, [banner]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (statusFilter !== "all" && u.status !== statusFilter) return false;
      if (teamFilter !== "all" && !u.teamIds.includes(teamFilter)) return false;
      if (employmentFilter !== "all" && (u.employmentType ?? "EMPLOYEE") !== employmentFilter) return false;
      if (q && !`${u.name} ${u.email} ${u.title} ${u.userId ?? ""}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [users, search, statusFilter, teamFilter, employmentFilter]);

  function openEdit(user: PlatformUser) {
    setEditingUser(user);
    setFormOpen(true);
  }

  function handleSubmit(values: PlatformUserFormValues) {
    if (!editingUser) return;
    updateUser(editingUser.id, {
      name: values.name,
      title: values.title,
      teamIds: values.teamId ? [values.teamId] : [],
      functionalRole: values.functionalRole,
      status: values.status,
    });
    setBanner({ text: `"${values.name}" was updated.`, tone: "success" });
  }

  function toggleStatus(user: PlatformUser) {
    const next: PersonStatus = user.status === "Suspended" ? "Active" : "Suspended";
    updateUser(user.id, { status: next });
    setBanner({ text: `"${user.name}" was ${next === "Suspended" ? "deactivated" : "activated"}.`, tone: "success" });
  }

  // The email provider's actual send result decides the tone here — never
  // shown as a success unless it genuinely was one (see lib/server/email.ts:
  // sendInvitationEmail throws on any real failure, so emailSent is only
  // ever true when the provider actually accepted the message).
  async function handleResend(invitation: PlatformInvitation) {
    try {
      const { emailSent } = await invitationService.resendInvitation(invitation.id);
      setBanner(emailSent ? { text: EMAIL_SENT_MESSAGE, tone: "success" } : { text: EMAIL_UNAVAILABLE_MESSAGE, tone: "error" });
    } catch {
      setBanner({ text: EMAIL_UNAVAILABLE_MESSAGE, tone: "error" });
    }
  }

  async function handleCancel(invitation: PlatformInvitation) {
    try {
      await invitationService.cancelInvitation(invitation.id);
      setBanner({ text: `Invitation to "${invitation.name}" was cancelled.`, tone: "success" });
    } catch (error) {
      setBanner({ text: error instanceof Error ? error.message : "Failed to cancel invitation.", tone: "error" });
    }
  }

  return (
    <div>
      <PageHeader
        title="Users"
        description="Manage the people in your organization"
        actions={
          <Button size="sm" onClick={() => setInviteOpen(true)} disabled={!currentOrganizationId}>
            <Plus />
            Add User
          </Button>
        }
      />

      {currentOrganizationId && <CreditRulesCard organizationId={currentOrganizationId} />}

      <h2 className="mb-3 text-sm font-semibold tracking-tight text-foreground">Active Users</h2>

      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by name, email, or Candidate ID..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={employmentFilter} onValueChange={(v) => setEmploymentFilter(v ?? "all")}>
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            <SelectItem value="EMPLOYEE">Employee</SelectItem>
            <SelectItem value="INTERN">Intern</SelectItem>
          </SelectContent>
        </Select>
        <Select value={teamFilter} onValueChange={(v) => setTeamFilter(v ?? "all")}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Team" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All teams</SelectItem>
            {teams.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter((v ?? "all") as PersonStatus | "all")}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="Invited">Invited</SelectItem>
            <SelectItem value="Suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {banner && (
        <div
          className={
            banner.tone === "success"
              ? "mb-5 flex items-center gap-2 rounded-lg bg-success/10 px-4 py-2.5 text-sm text-success"
              : "mb-5 flex items-center gap-2 rounded-lg bg-destructive/10 px-4 py-2.5 text-sm text-destructive"
          }
        >
          {banner.tone === "success" ? <CheckCircle2 className="size-4 shrink-0" /> : <AlertCircle className="size-4 shrink-0" />}
          {banner.text}
        </div>
      )}

      {loading ? (
        <Skeleton className="h-96 w-full rounded-xl" />
      ) : users.length === 0 ? (
        <EmptyState icon={Users} title="No users yet" description="Add your first member to get started." actionLabel="Add User" onAction={() => setInviteOpen(true)} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Search} title="No users found" description="Try a different search or filter." actionLabel="Clear filters" onAction={() => { setSearch(""); setStatusFilter("all"); setTeamFilter("all"); setEmploymentFilter("all"); }} />
      ) : (
        <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>User</TableHead>
                <TableHead>Candidate ID</TableHead>
                <TableHead>Domain</TableHead>
                <TableHead>Team</TableHead>
                <TableHead>Projects</TableHead>
                <TableHead>Profile</TableHead>
                <TableHead>Credits</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Active</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((user) => {
                const userTeams = teams.filter((t) => user.teamIds.includes(t.id));
                const userProjects = projects.filter((p) => user.projectIds.includes(p.id));
                const completion = calculateProfileCompletion(user);
                const credits = leaderboard.find((e) => e.uid === user.id)?.lifetimeCredits ?? 0;
                return (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <Avatar size="sm">
                          <AvatarFallback>{initials(user.name)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">{user.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{user.userId ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{domainLabel(user.domain) || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {userTeams.map((t) => t.name).join(", ") || "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{userProjects.length}</TableCell>
                    <TableCell className="text-muted-foreground">{completion.percent}%</TableCell>
                    <TableCell className="font-medium text-foreground">{credits}</TableCell>
                    <TableCell>
                      <PersonStatusBadge status={user.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">{timeAgo(user.lastActiveAt)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`Actions for ${user.name}`} />}>
                          <MoreHorizontal />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setViewingUser(user)}>
                            <Eye />
                            View
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEdit(user)}>
                            <Pencil />
                            Edit
                          </DropdownMenuItem>
                          {user.status === "Active" && (
                            <DropdownMenuItem onClick={() => setAwardingUser(user)}>
                              <Award />
                              Manage Credits
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => toggleStatus(user)}>
                            {user.status === "Suspended" ? <ShieldCheck /> : <ShieldOff />}
                            {user.status === "Suspended" ? "Activate" : "Deactivate"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <PendingInvitationsSection
        invitations={invitations}
        teams={teams}
        onResend={handleResend}
        onCancel={handleCancel}
      />

      <UserFormDialog key={editingUser?.id ?? "new"} open={formOpen} onOpenChange={setFormOpen} onSubmitUser={handleSubmit} teams={teams} user={editingUser} />
      {currentOrganizationId && (
        <InviteUserDialog open={inviteOpen} onOpenChange={setInviteOpen} organizationId={currentOrganizationId} teams={teams} projects={projects} />
      )}
      <UserDetailSheet
        open={Boolean(viewingUser)}
        onOpenChange={(open) => !open && setViewingUser(null)}
        user={viewingUser}
        projects={projects}
        tasks={tasks}
        teams={teams}
        invitation={viewingUser ? invitations.find((i) => i.email === viewingUser.email) : undefined}
      />
      {awardingUser && (
        <AwardCreditDialog
          organizationId={orgId}
          candidate={{ uid: awardingUser.id, name: awardingUser.name, email: awardingUser.email, userId: awardingUser.userId }}
          open={Boolean(awardingUser)}
          onOpenChange={(open) => !open && setAwardingUser(null)}
        />
      )}
    </div>
  );
}
