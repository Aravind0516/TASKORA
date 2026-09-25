import { z } from "zod";

// A blank hours input must be treated as "not set", never coerced to 0 or
// NaN — normalized to undefined via register()'s setValueAs (see both
// task-form-dialog.tsx files) before it ever reaches this schema, so the
// schema itself stays a plain number|undefined on both sides (a
// z.preprocess() here would make useForm's inferred type and zodResolver's
// expected type diverge — same class of issue as Phase B's z.default()).
const optionalHours = z.number().min(0, "Must be zero or greater").max(1000, "Enter a realistic number of hours").optional();

export const taskFormSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(100),
  description: z.string().trim().min(5, "Description must be at least 5 characters"),
  projectId: z.string().min(1, "Select a project"),
  status: z.enum(["Backlog", "To Do", "In Progress", "In Review", "Blocked", "Completed"]),
  priority: z.enum(["Low", "Medium", "High", "Critical"]),
  assignedTo: z.string().min(1, "Select an assignee"),
  // Optional — reviews the completed work, never grants any permission and
  // never required to create/save a task.
  reviewerId: z.string().optional(),
  estimatedHours: optionalHours,
  actualHours: optionalHours,
  dueDate: z.string().min(1, "Due date is required"),
});

export type TaskFormValues = z.infer<typeof taskFormSchema>;
