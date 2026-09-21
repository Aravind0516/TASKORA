"use client";

import { useEffect, useMemo, useState } from "react";
import { MoreHorizontal, Pencil, Search, ShieldCheck, ShieldOff, Users, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PersonStatusBadge } from "@/components/platform/person-status-badge";
import { UserFormDialog } from "@/components/admin/user-form-dialog";
import { initials, timeAgo } from "@/lib/format";
import { usePlatform } from "@/components/platform/platform-provider";
import type { PersonStatus, PlatformUser } from "@/types/platform";
import type { PlatformUserFormValues } from "@/lib/validation/platform-user.schema";

export function SuperAdminUsersView() {
  const [loading, setLoading] = useState(true);
  const { users, organizations, teams, getOrganization, getTeam, updateUser } = usePlatform();

  const [search, setSearch] = useState("");
  const [orgFilter, setOrgFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<PersonStatus | "all">("all");
  const [editingUser, setEditingUser] = useState<PlatformUser | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => setLoading(false), 450);
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!successMessage) return;
    const timeout = setTimeout(() => setSuccessMessage(null), 3500);
    return () => clearTimeout(timeout);
  }, [successMessage]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (orgFilter !== "all" && u.organizationId !== orgFilter) return false;
      if (statusFilter !== "all" && u.status !== statusFilter) return false;
      if (q && !`${u.name} ${u.email} ${u.title}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [users, search, orgFilter, statusFilter]);

  function isLead(user: PlatformUser) {
    return teams.some((t) => t.leadId === user.id);
  }

  function toggleStatus(user: PlatformUser) {
    const next: PersonStatus = user.status === "Suspended" ? "Active" : "Suspended";
    updateUser(user.id, { status: next });
    setSuccessMessage(`"${user.name}" was ${next === "Suspended" ? "deactivated" : "activated"}.`);
  }

  function handleEditSubmit(values: PlatformUserFormValues) {
    if (!editingUser) return;
    updateUser(editingUser.id, { name: values.name, title: values.title, status: values.status });
    setSuccessMessage(`"${values.name}" was updated.`);
  }

  const orgTeamsForEditing = editingUser ? teams.filter((t) => t.organizationId === editingUser.organizationId) : [];

  return (
    <div>
      <PageHeader title="Users" description="Every user across every organization on the platform" />

      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search users..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={orgFilter} onValueChange={(v) => setOrgFilter(v ?? "all")}>
          <SelectTrigger className="w-full sm:w-52">
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

      {successMessage && (
        <div className="mb-5 flex items-center gap-2 rounded-lg bg-success/10 px-4 py-2.5 text-sm text-success">
          <CheckCircle2 className="size-4 shrink-0" />
          {successMessage}
        </div>
      )}

      {loading ? (
        <Skeleton className="h-96 w-full rounded-xl" />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Users} title="No users found" description="Try a different search or filter." />
      ) : (
        <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>User</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Team</TableHead>
                <TableHead>Projects</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Active</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((user) => {
                const org = getOrganization(user.organizationId);
                const userTeams = user.teamIds.map(getTeam).filter(Boolean);
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
                    <TableCell className="text-muted-foreground">{org?.name ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={isLead(user) ? "default" : "outline"}>{isLead(user) ? "Lead" : "Member"}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{userTeams.map((t) => t!.name).join(", ") || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{user.projectIds.length}</TableCell>
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
                          <DropdownMenuItem onClick={() => { setEditingUser(user); setFormOpen(true); }}>
                            <Pencil />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toggleStatus(user)}>
                            {user.status === "Suspended" ? <ShieldCheck /> : <ShieldOff />}
                            {user.status === "Suspended" ? "Activate" : "Suspend"}
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

      <UserFormDialog key={editingUser?.id ?? "none"} open={formOpen} onOpenChange={setFormOpen} onSubmitUser={handleEditSubmit} teams={orgTeamsForEditing} user={editingUser} />
    </div>
  );
}
