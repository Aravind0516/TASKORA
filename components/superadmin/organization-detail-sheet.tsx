import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PersonStatusBadge } from "@/components/platform/person-status-badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { initials, formatDate, timeAgo } from "@/lib/format";
import { usePlatform } from "@/components/platform/platform-provider";
import type { Organization } from "@/types/platform";

interface OrganizationDetailSheetProps {
  organization: Organization | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OrganizationDetailSheet({ organization, open, onOpenChange }: OrganizationDetailSheetProps) {
  const { getAdminForOrg, usersInOrg, teamsInOrg, projectsInOrg, activityInOrg } = usePlatform();
  if (!organization) return null;

  const admin = getAdminForOrg(organization.id);
  const members = usersInOrg(organization.id);
  const teams = teamsInOrg(organization.id);
  const projects = projectsInOrg(organization.id);
  const activity = activityInOrg(organization.id).slice(0, 5);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{organization.name}</SheetTitle>
          <SheetDescription>{organization.industry}</SheetDescription>
        </SheetHeader>

        <div className="space-y-6 px-4 pb-6">
          <div className="flex items-center gap-2">
            <PersonStatusBadge status={organization.status} />
            <Badge variant="outline">{organization.plan}</Badge>
          </div>

          <p className="text-sm text-muted-foreground">{organization.description}</p>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Created</p>
              <p className="mt-1 text-foreground">{formatDate(organization.createdAt)}</p>
            </div>
            <div>
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Last Activity</p>
              <p className="mt-1 text-foreground">{timeAgo(organization.lastActivityAt)}</p>
            </div>
          </div>

          {admin && (
            <div>
              <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">Administrator</p>
              <div className="flex items-center gap-3">
                <Avatar size="sm">
                  <AvatarFallback>{initials(admin.name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{admin.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{admin.email}</p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg border border-border py-3">
              <p className="text-lg font-semibold text-foreground">{members.length}</p>
              <p className="text-xs text-muted-foreground">Members</p>
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

          {projects.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">Projects</p>
              <ul className="space-y-2">
                {projects.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate text-foreground">{p.name}</span>
                    <StatusBadge status={p.status} className="shrink-0" />
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
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
