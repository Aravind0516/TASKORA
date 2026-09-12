import { z } from "zod";
import { FUNCTIONAL_ROLES } from "@/types/user";

export const inviteUserSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(60),
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email address"),
  // Optional — a new organization has no teams yet, and a user must be
  // inviteable without one. Admin assigns a team later once teams exist.
  teamId: z.string().optional(),
  // Optional — what they'll do on the team, separate from system role.
  functionalRole: z.enum(FUNCTIONAL_ROLES).optional(),
  // Public/demo invitations can only issue "user" accounts — an "admin" invite
  // flow is a controlled, future addition (see types/invitation.ts).
  role: z.literal("user"),
});

export type InviteUserFormValues = z.infer<typeof inviteUserSchema>;
