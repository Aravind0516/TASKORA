"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Eye, KeyRound, MoreHorizontal, Plus, Search, ShieldCheck, ShieldOff, ShieldX } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { AdminFormDialog } from "@/components/superadmin/admin-form-dialog";
import { AdminDetailSheet } from "@/components/superadmin/admin-detail-sheet";
import { initials, timeAgo } from "@/lib/format";
import { usePlatform } from "@/components/platform/platform-provider";
import { resetPassword } from "@/lib/services/auth.service";
import type { PlatformAdmin } from "@/types/platform";

export function SuperAdminAdminsView() {
  const [loading, setLoading] = useState(true);
  const { admins, organizations, usersInOrg, teamsInOrg, projectsInOrg, getOrganization, createAdmin, updateAdmin } = usePlatform();

  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [detailAdmin, setDetailAdmin] = useState<PlatformAdmin | null>(null);
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
    return admins.filter((a) => !q || `${a.name} ${a.email}`.toLowerCase().includes(q));
  }, [admins, search]);

  async function toggleStatus(admin: PlatformAdmin) {
    const next = admin.status === "Suspended" ? "Active" : "Suspended";
    try {
      await updateAdmin(admin.id, { status: next });
      setSuccessMessage(`"${admin.name}" was ${next === "Suspended" ? "suspended" : "activated"}.`);
    } catch (error) {
      setSuccessMessage(error instanceof Error ? error.message : "Failed to update administrator.");
    }
  }

  async function resetAccess(admin: PlatformAdmin) {
    try {
      await resetPassword(admin.email);
      setSuccessMessage(`Password reset email sent to "${admin.name}".`);
    } catch (error) {
      setSuccessMessage(error instanceof Error ? error.message : "Failed to send the reset email.");
    }
  }

  return (
    <div>
      <PageHeader
        title="Administrators"
        description="Every organization administrator on the platform"
        actions={
          <Button size="sm" onClick={() => setFormOpen(true)}>
            <Plus />
            Add Administrator
          </Button>
        }
      />

      <div className="mb-5 relative w-full sm:max-w-xs">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search administrators..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
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
        <EmptyState icon={ShieldX} title="No administrators found" description="Try a different search, or add a new administrator." actionLabel="Add Administrator" onAction={() => setFormOpen(true)} />
      ) : (
        <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Admin</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead>Users</TableHead>
                <TableHead>Teams</TableHead>
                <TableHead>Projects</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Active</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((admin) => {
                const org = getOrganization(admin.organizationId);
                return (
                  <TableRow key={admin.id}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <Avatar size="sm">
                          <AvatarFallback>{initials(admin.name)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">{admin.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{admin.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{org?.name ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{usersInOrg(admin.organizationId).length}</TableCell>
                    <TableCell className="text-muted-foreground">{teamsInOrg(admin.organizationId).length}</TableCell>
                    <TableCell className="text-muted-foreground">{projectsInOrg(admin.organizationId).length}</TableCell>
                    <TableCell>
                      <PersonStatusBadge status={admin.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">{timeAgo(admin.lastActiveAt)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`Actions for ${admin.name}`} />}>
                          <MoreHorizontal />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setDetailAdmin(admin)}>
                            <Eye />
                            View
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => resetAccess(admin)}>
                            <KeyRound />
                            Reset access
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toggleStatus(admin)}>
                            {admin.status === "Suspended" ? <ShieldCheck /> : <ShieldOff />}
                            {admin.status === "Suspended" ? "Activate" : "Suspend"}
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

      <AdminFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        organizations={organizations}
        onSubmitAdmin={async (values) => {
          try {
            const { emailSent, emailError } = await createAdmin(values);
            setSuccessMessage(
              emailSent
                ? `"${values.name}" was invited as an administrator — they'll receive an email to activate their account.`
                : `Invitation created for "${values.name}", but the email wasn't delivered. ${emailError ?? ""}`
            );
          } catch (error) {
            setSuccessMessage(error instanceof Error ? error.message : "Failed to invite administrator.");
          }
        }}
      />
      <AdminDetailSheet admin={detailAdmin} open={detailAdmin !== null} onOpenChange={(open) => { if (!open) setDetailAdmin(null); }} />
    </div>
  );
}
