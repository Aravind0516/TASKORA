"use client";

import { useMemo, useState } from "react";
import { Search, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MemberCard } from "@/components/team/member-card";
import { MemberCardSkeleton } from "@/components/team/member-card-skeleton";
import { MemberDetailSheet } from "@/components/team/member-detail-sheet";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { useWorkspace } from "@/components/workspace/workspace-provider";
import type { TeamMember, UserRole } from "@/types/team";

const ROLES: UserRole[] = ["Admin", "Team Member"];

export function TeamDirectory() {
  const { members, teams, organizationId, getTeamsForMember, loaded, errors, retry } = useWorkspace();

  const [search, setSearch] = useState("");
  const [teamFilter, setTeamFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState<UserRole | "all">("all");
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return members.filter((member) => {
      if (roleFilter !== "all" && member.role !== roleFilter) return false;

      if (teamFilter !== "all") {
        const memberTeamIds = getTeamsForMember(member.id).map((team) => team.id);
        if (!memberTeamIds.includes(teamFilter)) return false;
      }

      if (query) {
        const haystack = `${member.name} ${member.title} ${member.email} ${member.role}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }

      return true;
    });
  }, [members, search, teamFilter, roleFilter, getTeamsForMember]);

  const hasActiveFilters = search.trim() !== "" || teamFilter !== "all" || roleFilter !== "all";
  const loading = !loaded.members || !loaded.teams;
  const error = errors.members ?? errors.teams;

  function clearFilters() {
    setSearch("");
    setTeamFilter("all");
    setRoleFilter("all");
  }

  return (
    <div>
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Search team members"
              placeholder="Search team members..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={teamFilter} onValueChange={(value) => setTeamFilter(value ?? "all")}>
            <SelectTrigger className="w-full sm:w-48" aria-label="Filter by team">
              <SelectValue placeholder="Team" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All teams</SelectItem>
              {teams.map((team) => (
                <SelectItem key={team.id} value={team.id}>
                  {team.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={roleFilter} onValueChange={(value) => setRoleFilter((value ?? "all") as UserRole | "all")}>
            <SelectTrigger className="w-full sm:w-44" aria-label="Filter by role">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              {ROLES.map((role) => (
                <SelectItem key={role} value={role}>
                  {role}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <MemberCardSkeleton key={index} />
          ))}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={retry} />
      ) : !organizationId ? (
        <EmptyState
          icon={Users}
          title="You're not part of an organization yet"
          description="Ask an administrator to invite you — you'll see your team here once you accept an invitation."
        />
      ) : members.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No team members yet"
          description="Your organization's administrator can invite people from the Admin Users page."
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No team members match your search."
          description="Try a different name, role, or team."
          actionLabel="Clear filters"
          onAction={clearFilters}
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((member) => (
            <MemberCard key={member.id} member={member} onSelect={setSelectedMember} />
          ))}
        </div>
      )}

      {!loading && !error && members.length > 0 && (
        <p className="mt-4 text-xs text-muted-foreground">
          Showing {filtered.length} of {members.length} members
          {hasActiveFilters && " · filters applied"}
        </p>
      )}

      <MemberDetailSheet
        member={selectedMember}
        open={selectedMember !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedMember(null);
        }}
      />
    </div>
  );
}
