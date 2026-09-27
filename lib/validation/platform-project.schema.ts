import { z } from "zod";
import { repositoryUrlError, requirementsError } from "@/lib/projects/assignment";

export const platformProjectFormSchema = z
  .object({
    name: z.string().trim().min(3, "Project name must be at least 3 characters").max(80),
    description: z.string().trim().min(10, "Description must be at least 10 characters"),
    teamId: z.string().min(1, "Select a team"),
    // Project members chosen from the selected team's roster — the owner is
    // NOT part of this form at all; it's always the authenticated Admin
    // creating the project, derived server/rules-side, never client-supplied.
    memberIds: z.array(z.string()).optional(),
    // Optional, project-scoped manager — assignable from the selected
    // team's roster once one exists; never required to create a project.
    managerId: z.string().optional(),
    status: z.enum(["Planning", "Active", "On Hold", "Completed"]),
    priority: z.enum(["Low", "Medium", "High", "Critical"]),
    startDate: z.string().min(1, "Start date is required"),
    dueDate: z.string().min(1, "Due date is required"),
    // Required http(s) link to the project's code (see the superRefine below
    // and lib/projects/assignment.ts); also shown next to Work Verification
    // evidence — see types/daily-work-update.ts.
    repositoryUrl: z.string().trim(),
    workVerificationEnabled: z.boolean().optional(),
    // Plain-text project requirements — required (see the superRefine below),
    // no Firebase Storage involved, and deliberately no length cap (detailed
    // requirements are legitimate project documentation).
    requirements: z.string(),
  })
  // Both are required on every project (see lib/projects/assignment.ts) —
  // whitespace-only is empty, the URL must be http(s), and neither has a
  // length cap.
  .superRefine((data, ctx) => {
    const requirementsIssue = requirementsError(data.requirements);
    if (requirementsIssue) ctx.addIssue({ code: "custom", message: requirementsIssue, path: ["requirements"] });
    const repositoryIssue = repositoryUrlError(data.repositoryUrl);
    if (repositoryIssue) ctx.addIssue({ code: "custom", message: repositoryIssue, path: ["repositoryUrl"] });
  })
  .refine((data) => new Date(data.dueDate) >= new Date(data.startDate), {
    message: "Due date must be on or after the start date",
    path: ["dueDate"],
  });

export type PlatformProjectFormValues = z.infer<typeof platformProjectFormSchema>;
