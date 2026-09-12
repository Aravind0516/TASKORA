import { z } from "zod";
import { FUNCTIONAL_ROLES } from "@/types/user";

export const platformUserFormSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(60),
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email address"),
  title: z.string().trim().min(2, "Title must be at least 2 characters").max(60),
  teamId: z.string().optional(),
  functionalRole: z.enum(FUNCTIONAL_ROLES).optional(),
  status: z.enum(["Active", "Invited", "Suspended"]),
});

export type PlatformUserFormValues = z.infer<typeof platformUserFormSchema>;
