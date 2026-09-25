import { z } from "zod";

// A blank hours input must be treated as "not set" — see
// lib/validation/task.schema.ts's identical field for the full rationale.
const optionalHours = z.number().min(0, "Must be zero or greater").max(1000, "Enter a realistic number of hours").optional();

export const platformTaskFormSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(100),
  description: z.string().trim().min(5, "Description must be at least 5 characters"),
  projectId: z.string().min(1, "Select a project"),
  status: z.enum(["Backlog", "To Do", "In Progress", "In Review", "Blocked", "Completed"]),
  priority: z.enum(["Low", "Medium", "High", "Critical"]),
  assigneeId: z.string().optional(),
  reviewerId: z.string().optional(),
  estimatedHours: optionalHours,
  actualHours: optionalHours,
  dueDate: z.string().min(1, "Due date is required"),
});

export type PlatformTaskFormValues = z.infer<typeof platformTaskFormSchema>;
