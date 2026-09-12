"use client";

import { useEffect, useMemo, useState } from "react";
import { Building2, CheckCircle2, ChevronLeft, ChevronRight, MoreHorizontal, Plus, Search, ShieldOff, ShieldCheck, Eye } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
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
import { OrganizationFormDialog } from "@/components/superadmin/organization-form-dialog";
import { OrganizationDetailSheet } from "@/components/superadmin/organization-detail-sheet";
import { formatDate, timeAgo } from "@/lib/format";
import { usePlatform } from "@/components/platform/platform-provider";
import type { Organization, OrgStatus } from "@/types/platform";
import type { PlatformOrganizationFormValues } from "@/lib/validation/platform-organization.schema";

export function SuperAdminOrganizationsView() {
  const [loading, setLoading] = useState(true);
  const { organizations, usersInOrg, teamsInOrg, projectsInOrg, getAdminForOrg, createOrganization, updateOrganization } = usePlatform();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrgStatus | "all">("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [formOpen, setFormOpen] = useState(false);
  const [detailOrg, setDetailOrg] = useState<Organization | null>(null);
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
    return organizations.filter((o) => {
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      if (q && !`${o.name} ${o.industry}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [organizations, search, statusFilter]);

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelected((prev) => (prev.size === filtered.length ? new Set() : new Set(filtered.map((o) => o.id))));
  }

  async function bulkSetStatus(status: OrgStatus) {
    try {
      await Promise.all(Array.from(selected).map((id) => updateOrganization(id, { status })));
      setSuccessMessage(`${selected.size} organization(s) ${status === "Suspended" ? "suspended" : "activated"}.`);
      setSelected(new Set());
    } catch (error) {
      setSuccessMessage(error instanceof Error ? error.message : "Failed to update organizations.");
    }
  }

  async function handleCreate(values: PlatformOrganizationFormValues) {
    try {
      await createOrganization(values);
      setSuccessMessage(`"${values.name}" was added to the platform.`);
    } catch (error) {
      setSuccessMessage(error instanceof Error ? error.message : "Failed to create organization.");
    }
  }

  async function toggleStatus(org: Organization) {
    const next: OrgStatus = org.status === "Suspended" ? "Active" : "Suspended";
    try {
      await updateOrganization(org.id, { status: next });
      setSuccessMessage(`"${org.name}" was ${next === "Suspended" ? "suspended" : "activated"}.`);
    } catch (error) {
      setSuccessMessage(error instanceof Error ? error.message : "Failed to update organization.");
    }
  }

  return (
    <div>
      <PageHeader
        title="Organizations"
        description="Every organization on the TASKORA platform"
        actions={
          <Button size="sm" onClick={() => setFormOpen(true)}>
            <Plus />
            Add Organization
          </Button>
        }
      />

      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search organizations..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter((v ?? "all") as OrgStatus | "all")}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="Suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>
        {selected.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{selected.size} selected</span>
            <Button variant="outline" size="sm" onClick={() => bulkSetStatus("Active")}>
              <ShieldCheck />
              Activate
            </Button>
            <Button variant="outline" size="sm" onClick={() => bulkSetStatus("Suspended")}>
              <ShieldOff />
              Suspend
            </Button>
          </div>
        )}
      </div>

      {successMessage && (
        <div className="mb-5 flex items-center gap-2 rounded-lg bg-[#0ca30c]/10 px-4 py-2.5 text-sm text-[#0ca30c]">
          <CheckCircle2 className="size-4 shrink-0" />
          {successMessage}
        </div>
      )}

      {loading ? (
        <Skeleton className="h-96 w-full rounded-xl" />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Building2} title="No organizations found" description="Try a different search or add a new organization." actionLabel="Add Organization" onAction={() => setFormOpen(true)} />
      ) : (
        <>
          <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-10">
                    <Checkbox checked={selected.size === filtered.length} onCheckedChange={toggleSelectAll} aria-label="Select all" />
                  </TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Admin</TableHead>
                  <TableHead>Users</TableHead>
                  <TableHead>Teams</TableHead>
                  <TableHead>Projects</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Last Activity</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((org) => {
                  const admin = getAdminForOrg(org.id);
                  return (
                    <TableRow key={org.id}>
                      <TableCell>
                        <Checkbox checked={selected.has(org.id)} onCheckedChange={() => toggleSelected(org.id)} aria-label={`Select ${org.name}`} />
                      </TableCell>
                      <TableCell className="font-medium text-foreground">{org.name}</TableCell>
                      <TableCell className="text-muted-foreground">{admin?.name ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{usersInOrg(org.id).length}</TableCell>
                      <TableCell className="text-muted-foreground">{teamsInOrg(org.id).length}</TableCell>
                      <TableCell className="text-muted-foreground">{projectsInOrg(org.id).length}</TableCell>
                      <TableCell>
                        <PersonStatusBadge status={org.status} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(org.createdAt)}</TableCell>
                      <TableCell className="text-muted-foreground">{timeAgo(org.lastActivityAt)}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`Actions for ${org.name}`} />}>
                            <MoreHorizontal />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setDetailOrg(org)}>
                              <Eye />
                              View
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toggleStatus(org)}>
                              {org.status === "Suspended" ? <ShieldCheck /> : <ShieldOff />}
                              {org.status === "Suspended" ? "Activate" : "Suspend"}
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

          <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
            <span>Showing {filtered.length} of {organizations.length} organizations</span>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon-xs" disabled aria-label="Previous page">
                <ChevronLeft />
              </Button>
              <span className="px-2">Page 1 of 1</span>
              <Button variant="outline" size="icon-xs" disabled aria-label="Next page">
                <ChevronRight />
              </Button>
            </div>
          </div>
        </>
      )}

      <OrganizationFormDialog open={formOpen} onOpenChange={setFormOpen} onSubmitOrg={handleCreate} />
      <OrganizationDetailSheet organization={detailOrg} open={detailOrg !== null} onOpenChange={(open) => { if (!open) setDetailOrg(null); }} />
    </div>
  );
}
