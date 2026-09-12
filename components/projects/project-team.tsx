import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { initials } from "@/lib/format";
import { useWorkspace } from "@/components/workspace/workspace-provider";
import type { Project } from "@/types/project";

export function ProjectTeam({ project }: { project: Project }) {
  const { getMemberById } = useWorkspace();
  const owner = getMemberById(project.ownerId);
  const otherMembers = project.memberIds
    .filter((id) => id !== project.ownerId)
    .map(getMemberById)
    .filter(Boolean);

  return (
    <div className="space-y-5">
      {owner && (
        <div>
          <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">Owner</p>
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarFallback>{initials(owner.name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{owner.name}</p>
              <p className="truncate text-xs text-muted-foreground">{owner.title}</p>
            </div>
            <Badge>Owner</Badge>
          </div>
        </div>
      )}
      {otherMembers.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Members ({otherMembers.length})
          </p>
          <div className="space-y-3">
            {otherMembers.map((member) => (
              <div key={member!.id} className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback>{initials(member!.name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{member!.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{member!.title}</p>
                </div>
                <Badge variant="outline">{member!.role}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
