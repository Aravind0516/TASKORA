"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, MoreHorizontal, Pencil, Plus, Trash2, UsersRound } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarGroup } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TeamFormDialog } from "@/components/admin/team-form-dialog";
import { initials } from "@/lib/format";
import { usePlatform } from "@/components/platform/platform-provider";
import type { PlatformTeam } from "@/types/platform";
import type { PlatformTeamFormValues } from "@/lib/validation/platform-team.schema";

export function AdminTeamsView() {
  const [loading, setLoading] = useState(true);
  const { currentOrganizationId, teamsInOrg, usersInOrg, tasksInOrg, getUser, createTeam, updateTeam, deleteTeam } = usePlatform();

  const [formOpen, setFormOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<PlatformTeam | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const teams = teamsInOrg(currentOrganizationId);
  const users = usersInOrg(currentOrganizationId);
  const tasks = tasksInOrg(currentOrganizationId);

  useEffect(() => {
    const timeout = setTimeout(() => setLoading(false), 450);
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!successMessage) return;
    const timeout = setTimeout(() => setSuccessMessage(null), 3500);
    return () => clearTimeout(timeout);
  }, [successMessage]);

  function openCreate() {
    setEditingTeam(null);
    setFormOpen(true);
  }

  function openEdit(team: PlatformTeam) {
    setEditingTeam(team);
    setFormOpen(true);
  }

  function handleSubmit(values: PlatformTeamFormValues, memberIds: string[]) {
    if (editingTeam) {
      updateTeam(editingTeam.id, { ...values, memberIds });
      setSuccessMessage(`"${values.name}" was updated.`);
    } else {
      if (!currentOrganizationId) return;
      createTeam({ organizationId: currentOrganizationId, ...values, memberIds });
      setSuccessMessage(`"${values.name}" was created.`);
    }
  }

  function handleDelete(team: PlatformTeam) {
    const confirmed = window.confirm(`Delete "${team.name}"? This can't be undone.`);
    if (!confirmed) return;
    deleteTeam(team.id);
    setSuccessMessage(`"${team.name}" was deleted.`);
  }

  return (
    <div>
      <PageHeader
        title="Teams"
        description="Organize your organization into teams"
        actions={
          <Button size="sm" onClick={openCreate}>
            <Plus />
            Create Team
          </Button>
        }
      />

      {successMessage && (
        <div className="mb-5 flex items-center gap-2 rounded-lg bg-[#0ca30c]/10 px-4 py-2.5 text-sm text-[#0ca30c]">
          <CheckCircle2 className="size-4 shrink-0" />
          {successMessage}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-44 w-full rounded-xl" />
          ))}
        </div>
      ) : teams.length === 0 ? (
        <EmptyState icon={UsersRound} title="No teams yet" description="Create your first team to start organizing work." actionLabel="Create Team" onAction={openCreate} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {teams.map((team) => {
            const lead = getUser(team.leadId);
            const members = team.memberIds.map(getUser).filter(Boolean);
            const openTasks = tasks.filter((t) => team.projectIds.includes(t.projectId) && t.status !== "Completed").length;

            return (
              <Card key={team.id}>
                <CardContent className="flex h-full flex-col px-5 py-5">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-base font-semibold tracking-tight text-foreground">{team.name}</h3>
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-xs" aria-label={`Actions for ${team.name}`} />}>
                        <MoreHorizontal />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(team)}>
                          <Pencil />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem variant="destructive" onClick={() => handleDelete(team)}>
                          <Trash2 />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{team.description}</p>

                  {lead && (
                    <div className="mt-4 flex items-center gap-2">
                      <Avatar size="sm">
                        <AvatarFallback>{initials(lead.name)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-xs text-muted-foreground">Led by</p>
                        <p className="truncate text-sm font-medium text-foreground">{lead.name}</p>
                      </div>
                    </div>
                  )}

                  <div className="mt-4 flex items-center justify-between">
                    <AvatarGroup>
                      {members.slice(0, 4).map((m) => (
                        <Avatar key={m!.id} size="sm">
                          <AvatarFallback>{initials(m!.name)}</AvatarFallback>
                        </Avatar>
                      ))}
                    </AvatarGroup>
                    <Badge variant="outline">{openTasks} open tasks</Badge>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
                    <span>{members.length} members</span>
                    <span>{team.projectIds.length} projects</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <TeamFormDialog key={editingTeam?.id ?? "new"} open={formOpen} onOpenChange={setFormOpen} onSubmitTeam={handleSubmit} users={users} team={editingTeam} />
    </div>
  );
}
