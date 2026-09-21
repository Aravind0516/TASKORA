import { z } from "zod";

export const platformProjectFormSchema = z
  .object({
    name: z.string().trim().min(3, "Project name must be at least 3 characters").max(80),
    description: z.string().trim().min(10, "Description must be at least 10 characters").max(500),
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
    // Work Verification (Phase 1) — see types/daily-work-update.ts. Both
    // optional/off by default so existing projects are entirely unaffected.
    repositoryUrl: z.string().trim().max(300).optional().or(z.literal("")),
    workVerificationEnabled: z.boolean().optional(),
    // Plain-text project requirements — never mandatory, no Firebase Storage
    // involved. Large but bounded (matches firestore.rules' isValidRequirements
    // server-side backstop).
    requirements: z.string().max(20000, "Requirements text is too long (max 20,000 characters).").optional(),
  })
  .refine((data) => new Date(data.dueDate) >= new Date(data.startDate), {
    message: "Due date must be on or after the start date",
    path: ["dueDate"],
  });

export type PlatformProjectFormValues = z.infer<typeof platformProjectFormSchema>;
