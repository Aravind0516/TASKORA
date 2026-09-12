import Link from "next/link";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PersonStatusBadge } from "@/components/platform/person-status-badge";
import { initials, timeAgo, formatDate } from "@/lib/format";
import { usePlatform } from "@/components/platform/platform-provider";
import type { PlatformAdmin } from "@/types/platform";

interface AdminDetailSheetProps {
  admin: PlatformAdmin | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AdminDetailSheet({ admin, open, onOpenChange }: AdminDetailSheetProps) {
  const { getOrganization, usersInOrg, teamsInOrg, projectsInOrg, activityInOrg } = usePlatform();
  if (!admin) return null;

  const org = getOrganization(admin.organizationId);
  const members = usersInOrg(admin.organizationId);
  const teams = teamsInOrg(admin.organizationId);
  const projects = projectsInOrg(admin.organizationId);
  const activity = activityInOrg(admin.organizationId).slice(0, 5);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="sr-only">{admin.name}</SheetTitle>
          <SheetDescription className="sr-only">Admin details for {admin.name}</SheetDescription>
        </SheetHeader>

        <div className="px-4 pb-6">
          <div className="flex items-center gap-4">
            <Avatar size="lg">
              <AvatarFallback>{initials(admin.name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-foreground">{admin.name}</p>
              <p className="truncate text-sm text-muted-foreground">{admin.email}</p>
              <PersonStatusBadge status={admin.status} className="mt-1.5" />
            </div>
          </div>

          {org && (
            <Link
              href="#"
              onClick={(e) => e.preventDefault()}
              className="mt-4 flex items-center gap-2.5 rounded-lg border border-border px-3 py-2.5 text-sm hover:bg-muted"
            >
              <span className="min-w-0 flex-1 truncate text-foreground">{org.name}</span>
              <PersonStatusBadge status={org.status} />
            </Link>
          )}

          <div className="mt-5 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg border border-border py-3">
              <p className="text-lg font-semibold text-foreground">{members.length}</p>
              <p className="text-xs text-muted-foreground">Users</p>
            </div>
            <div className="rounded-lg border border-border py-3">
              <p className="text-lg font-semibold text-foreground">{teams.length}</p>
              <p className="text-xs text-muted-foreground">Teams</p>
            </div>
            <div className="rounded-lg border border-border py-3">
              <p className="text-lg font-semibold text-foreground">{projects.length}</p>
              <p className="text-xs text-muted-foreground">Projects</p>
            </div>
          </div>

          <div className="mt-5">
            <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">Joined</p>
            <p className="text-sm text-foreground">{formatDate(admin.joinedAt)}</p>
          </div>

          <div className="mt-5">
            <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">Recent Activity</p>
            {activity.length === 0 ? (
              <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
            ) : (
              <ul className="space-y-2">
                {activity.map((entry) => (
                  <li key={entry.id} className="text-sm">
                    <span className="font-medium text-foreground">{entry.actorName}</span>{" "}
                    <span className="text-muted-foreground">{entry.entityName}</span>
                    <span className="ml-1.5 text-xs text-muted-foreground/70">{timeAgo(entry.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
