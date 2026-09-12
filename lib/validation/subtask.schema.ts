import { z } from "zod";

export const subtaskFormSchema = z.object({
  title: z.string().trim().min(2, "Title must be at least 2 characters").max(150),
  assigneeId: z.string().optional(),
});

export type SubtaskFormValues = z.infer<typeof subtaskFormSchema>;
