import { z } from "zod";

export const platformOrganizationFormSchema = z.object({
  name: z.string().trim().min(2, "Organization name must be at least 2 characters").max(80),
  description: z.string().trim().min(10, "Description must be at least 10 characters").max(500),
  industry: z.string().trim().min(2, "Industry is required").max(60),
  contactEmail: z.string().trim().min(1, "Contact email is required").email("Enter a valid email address"),
});

export type PlatformOrganizationFormValues = z.infer<typeof platformOrganizationFormSchema>;
