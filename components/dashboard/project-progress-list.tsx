import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/shared/status-badge";
import { ProjectHealthBadge } from "@/components/shared/project-health-badge";
import { calculateProjectHealth } from "@/lib/project-health";
import { useWorkspace } from "@/components/workspace/workspace-provider";
import type { Project } from "@/types/project";

export function ProjectProgressList({ projects }: { projects: Project[] }) {
  const { getTasksByProjectId } = useWorkspace();

  return (
    <div className="space-y-5">
      {projects.map((project) => (
        <div key={project.id}>
          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <span className="truncate text-sm font-medium text-foreground">{project.name}</span>
              <StatusBadge status={project.status} />
              <ProjectHealthBadge health={calculateProjectHealth(project, getTasksByProjectId(project.id))} />
            </div>
            <span className="shrink-0 text-sm font-medium tabular-nums text-muted-foreground">
              {project.progress}%
            </span>
          </div>
          <Progress value={project.progress} />
        </div>
      ))}
    </div>
  );
}
