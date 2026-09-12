import { z } from "zod";

export const memberFormSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(60),
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email address"),
  title: z.string().trim().min(2, "Title must be at least 2 characters").max(60),
  role: z.enum(["Admin", "Project Manager", "Team Member"]),
  teamId: z.string().min(1, "Select a team"),
});

export type MemberFormValues = z.infer<typeof memberFormSchema>;
