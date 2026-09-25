"use client";

import { useEffect, useMemo, useState } from "react";
import { UsersRound } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
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
import { usePlatform } from "@/components/platform/platform-provider";
import { selectItems } from "@/lib/select-items";
import { SearchInput } from "@/components/shared/search-input";

export function SuperAdminTeamsView() {
  const [loading, setLoading] = useState(true);
  const { teams, organizations, getOrganization, getUser, tasksInOrg } = usePlatform();
  const [search, setSearch] = useState("");
  const [orgFilter, setOrgFilter] = useState("all");

  useEffect(() => {
    const timeout = setTimeout(() => setLoading(false), 450);
    return () => clearTimeout(timeout);
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return teams.filter((t) => {
      if (orgFilter !== "all" && t.organizationId !== orgFilter) return false;
      if (q && !t.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [teams, search, orgFilter]);

  if (loading) {
    return (
      <div>
        <PageHeader title="Teams" description="Every team across every organization" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Teams" description="Every team across every organization on the platform" />

      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center">
        <SearchInput
          className="w-full sm:max-w-xs"
          aria-label="Search teams"
          placeholder="Search teams..."
          value={search}
          onValueChange={setSearch}
        />
        <Select
          value={orgFilter}
          onValueChange={(v) => setOrgFilter(v ?? "all")}
          items={selectItems(organizations, (o) => o.id, (o) => o.name, { extra: { all: "All organizations" } })}
        >
          <SelectTrigger className="w-full sm:w-52 data-[size=default]:h-10">
            <SelectValue placeholder="Organization" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All organizations</SelectItem>
            {organizations.map((org) => (
              <SelectItem key={org.id} value={org.id}>
                {org.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={UsersRound} title="No teams found" description="Try a different search or filter." />
      ) : (
        <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Team</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead>Team Lead</TableHead>
                <TableHead>Members</TableHead>
                <TableHead>Projects</TableHead>
                <TableHead>Open Tasks</TableHead>
                <TableHead>Completed Tasks</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((team) => {
                const org = getOrganization(team.organizationId);
                const lead = getUser(team.leadId);
                const orgTasks = tasksInOrg(team.organizationId);
                const teamTasks = orgTasks.filter((t) => team.projectIds.includes(t.projectId));
                const open = teamTasks.filter((t) => t.status !== "Completed").length;
                const completed = teamTasks.filter((t) => t.status === "Completed").length;

                return (
                  <TableRow key={team.id}>
                    <TableCell className="font-medium text-foreground">{team.name}</TableCell>
                    <TableCell className="text-muted-foreground">{org?.name ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{lead?.name ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{team.memberIds.length}</TableCell>
                    <TableCell className="text-muted-foreground">{team.projectIds.length}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{open}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{completed}</Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
