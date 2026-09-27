import { z } from "zod";
import { repositoryUrlError, requirementsError } from "@/lib/projects/assignment";

export const projectFormSchema = z
  .object({
    name: z.string().trim().min(3, "Project name must be at least 3 characters").max(80),
    description: z.string().trim().min(10, "Description must be at least 10 characters"),
    status: z.enum(["Planning", "Active", "On Hold", "Completed"]),
    priority: z.enum(["Low", "Medium", "High", "Critical"]),
    startDate: z.string().min(1, "Start date is required"),
    dueDate: z.string().min(1, "Due date is required"),
    // Owner is NEVER part of this form — it's always the authenticated
    // account that creates the project, and is read-only thereafter (see
    // firestore.rules' projects update rule and PROJECT OWNER fix).
    teamId: z.string().min(1, "Select a team"),
    memberIds: z.array(z.string()),
    // Optional, project-scoped manager — never required to create a project.
    managerId: z.string().optional(),
    // Admin-only in the UI (components/projects/project-form-dialog.tsx hides
    // this field entirely for a non-admin editor) — a project manager's
    // firestore.rules onlyChangingFields allow-list doesn't include it, so a
    // manager submitting a value here would just get permission-denied.
    workVerificationEnabled: z.boolean().optional(),
    // Required http(s) link to the project's code — see the superRefine below
    // and lib/projects/assignment.ts.
    repositoryUrl: z.string().trim(),
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

export type ProjectFormValues = z.infer<typeof projectFormSchema>;
