import { formatDate } from "@/lib/format";

interface ProjectRequirementsTextSectionProps {
  requirements: string;
  updatedAt: string;
}

/**
 * Read-only display of a project's plain-text requirements (types/project.ts's
 * `requirements`). There is deliberately no edit affordance here for anyone,
 * including Admin/manager: editing happens through the existing Edit Project
 * dialog (already gated to canManageProject), so this component never needs
 * its own permission check to keep Employees/Interns read-only.
 *
 * "Last updated" reuses the project's own `updatedAt` rather than a new
 * dedicated timestamp — it reflects the project's last edit in general, not
 * specifically the last requirements edit, since introducing a second
 * timestamp field solely for this would be exactly the unnecessary
 * duplication this feature was asked to avoid.
 */
export function ProjectRequirementsTextSection({ requirements, updatedAt }: ProjectRequirementsTextSectionProps) {
  const trimmed = requirements.trim();

  return (
    <div className="mb-5 space-y-2.5 rounded-lg border border-border p-4">
      <p className="text-sm font-semibold text-foreground">Project Requirements</p>
      {trimmed ? (
        <>
          <p className="max-h-96 overflow-y-auto text-sm whitespace-pre-wrap text-foreground">{requirements}</p>
          <p className="text-xs text-muted-foreground">Last updated: {formatDate(updatedAt)}</p>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">No project requirements have been added yet.</p>
      )}
    </div>
  );
}
