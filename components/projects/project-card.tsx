import Link from "next/link";
import { ArrowRight, CalendarDays } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarGroup } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/shared/status-badge";
import { PriorityBadge } from "@/components/shared/priority-badge";
import { ProjectHealthBadge } from "@/components/shared/project-health-badge";
import { formatDate, initials, timeAgo } from "@/lib/format";
import { calculateProjectHealth } from "@/lib/project-health";
import { useWorkspace } from "@/components/workspace/workspace-provider";
import type { Project } from "@/types/project";

export function ProjectCard({ project }: { project: Project }) {
  const { getMemberById, getTasksByProjectId } = useWorkspace();
  const members = project.memberIds.map(getMemberById).filter(Boolean);
  const owner = getMemberById(project.ownerId);
  const health = calculateProjectHealth(project, getTasksByProjectId(project.id));

  return (
    <Card className="h-full transition-colors hover:bg-muted/40">
      <CardContent className="flex h-full flex-col px-5 py-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <StatusBadge status={project.status} />
            <ProjectHealthBadge health={health} />
          </div>
          <PriorityBadge priority={project.priority} />
        </div>

        <h3 className="mt-3 text-base font-semibold tracking-tight text-foreground">
          {project.name}
        </h3>
        <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">
          {project.description}
        </p>
        {owner && (
          <p className="mt-1.5 text-xs text-muted-foreground">
            Owned by <span className="font-medium text-foreground">{owner.name}</span>
          </p>
        )}

        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
            <span>Progress</span>
            <span className="font-medium text-foreground">{project.progress}%</span>
          </div>
          <Progress value={project.progress} />
        </div>

        <div className="mt-4 flex items-center justify-between">
          <AvatarGroup>
            {members.slice(0, 4).map((member) => (
              <Avatar key={member!.id} size="sm">
                <AvatarFallback>{initials(member!.name)}</AvatarFallback>
              </Avatar>
            ))}
          </AvatarGroup>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarDays className="size-3.5" />
            {formatDate(project.dueDate)}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
          <span className="text-[11px] text-muted-foreground">Updated {timeAgo(project.updatedAt)}</span>
          <Link
            href={`/projects/${project.id}`}
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            View Project
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
