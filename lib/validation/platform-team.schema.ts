import { z } from "zod";

export const platformTeamFormSchema = z.object({
  name: z.string().trim().min(2, "Team name must be at least 2 characters").max(60),
  description: z.string().trim().max(300).optional(),
  // Optional — a brand-new organization has no users yet, so a team must be
  // creatable with no Team Lead. Admin assigns one later once users exist.
  leadId: z.string().optional(),
});

export type PlatformTeamFormValues = z.infer<typeof platformTeamFormSchema>;
