import Link from "next/link";
import { Mail, FolderKanban } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { initials } from "@/lib/format";
import { useWorkspace } from "@/components/workspace/workspace-provider";
import type { TeamMember } from "@/types/team";

const ROLE_VARIANT = {
  Admin: "default",
  "Project Manager": "secondary",
  "Team Member": "outline",
} as const;

interface MemberDetailSheetProps {
  member: TeamMember | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MemberDetailSheet({ member, open, onOpenChange }: MemberDetailSheetProps) {
  const { getTeamsForMember, getProjectsForMember, getActivityByActorId } = useWorkspace();
  if (!member) return null;

  const teams = getTeamsForMember(member.id);
  const projects = getProjectsForMember(member.id);
  const activity = getActivityByActorId(member.id);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="sr-only">{member.name}</SheetTitle>
          <SheetDescription className="sr-only">Member details for {member.name}</SheetDescription>
        </SheetHeader>

        <div className="px-4 pb-6">
          <div className="flex items-center gap-4">
            <Avatar size="lg">
              <AvatarFallback>{initials(member.name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-foreground">{member.name}</p>
              <p className="truncate text-sm text-muted-foreground">{member.title}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <Badge variant={ROLE_VARIANT[member.role]}>{member.role}</Badge>
                {member.functionalRole && <Badge variant="outline">{member.functionalRole}</Badge>}
              </div>
            </div>
          </div>

          <a
            href={`mailto:${member.email}`}
            className="mt-4 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <Mail className="size-4" />
            {member.email}
          </a>

          {teams.length > 0 && (
            <div className="mt-5">
              <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">Teams</p>
              <div className="flex flex-wrap gap-1.5">
                {teams.map((team) => (
                  <Badge key={team.id} variant="outline">
                    {team.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="mt-5">
            <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Projects ({projects.length})
            </p>
            {projects.length === 0 ? (
              <p className="text-sm text-muted-foreground">Not associated with any projects yet.</p>
            ) : (
              <ul className="space-y-2">
                {projects.map((project) => (
                  <li key={project.id}>
                    <Link
                      href={`/projects/${project.id}`}
                      className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 -mx-2.5 text-sm hover:bg-muted"
                    >
                      <FolderKanban className="size-4 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate text-foreground">{project.name}</span>
                      <Badge variant={project.ownerId === member.id ? "default" : "outline"} className="shrink-0">
                        {project.ownerId === member.id ? "Owner" : "Member"}
                      </Badge>
                      <StatusBadge status={project.status} className="shrink-0" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-5">
            <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Recent Activity
            </p>
            {activity.length === 0 ? (
              <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
            ) : (
              <RecentActivity entries={activity.slice(0, 5)} />
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
