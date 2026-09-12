import { z } from "zod";

export const projectFormSchema = z
  .object({
    name: z.string().trim().min(3, "Project name must be at least 3 characters").max(80),
    description: z.string().trim().min(10, "Description must be at least 10 characters").max(500),
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
  })
  .refine((data) => new Date(data.dueDate) >= new Date(data.startDate), {
    message: "Due date must be on or after the start date",
    path: ["dueDate"],
  });

export type ProjectFormValues = z.infer<typeof projectFormSchema>;
