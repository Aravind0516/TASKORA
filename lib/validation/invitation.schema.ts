import { z } from "zod";
import { EMPLOYMENT_TYPES, FUNCTIONAL_ROLES } from "@/types/user";

// A raw User ID is validated for FORMAT here (client-side, fast feedback);
// global UNIQUENESS is checked live against the server (see
// components/invitations/invite-user-dialog.tsx's debounced availability
// check) and re-enforced atomically at submit time regardless
// (lib/server/user-ids.ts's reserveUserId transaction) — this schema alone
// can never guarantee uniqueness, only shape.
const userIdFormat = /^[A-Za-z0-9]+(-[A-Za-z0-9]+)*$/;

// Conditional "required when employmentType is INTERN" validation is done
// manually in invite-user-dialog.tsx's onSubmit (setError per missing
// field) rather than via a Zod .superRefine on this object — a superRefine
// wraps the schema in ZodEffects, whose inferred type stopped lining up
// cleanly with useForm<InviteUserFormValues>()'s single generic parameter
// (an unrelated-nominal-Resolver-type build error). Keeping every field
// here independently optional/shape-only avoids that friction entirely.
export const inviteUserSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(60),
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email address"),
  // Optional — a new organization has no teams yet, and a user must be
  // inviteable without one. Admin assigns a team later once teams exist.
  teamId: z.string().optional(),
  projectIds: z.array(z.string()),
  // Optional — what they'll do on the team, separate from system role.
  functionalRole: z.enum(FUNCTIONAL_ROLES).optional(),
  employmentType: z.enum(EMPLOYMENT_TYPES),
  userId: z
    .string()
    .trim()
    .max(40)
    .refine((v) => v.length === 0 || (v.length >= 3 && userIdFormat.test(v)), "3-40 characters, letters/numbers/hyphens only")
    .optional(),
  collegeName: z.string().trim().max(120).optional(),
  branch: z.string().trim().max(80).optional(),
  // Kept as a plain string at the schema/form-field level — an HTML number
  // input's value is always a string anyway, and this avoids a z.coerce +
  // z.literal("") union that (empirically) breaks zodResolver's generic
  // inference against useForm<InviteUserFormValues>() in this zod v4 /
  // @hookform/resolvers v5 combination. Converted to a real number only at
  // submit time (see invite-user-dialog.tsx's onSubmit).
  passedOutYear: z
    .string()
    .trim()
    .refine((v) => v === "" || (/^\d{4}$/.test(v) && Number(v) >= 1950 && Number(v) <= 2100), "Enter a valid year")
    .optional(),
  academicYear: z.string().trim().max(40).optional(),
  domain: z.string().trim().max(60).optional(),
  secondaryDomain: z.string().trim().max(60).optional(),
  linkedinUrl: z.string().trim().max(300).refine((v) => v === "" || z.string().url().safeParse(v).success, "Enter a valid URL").optional(),
  githubUrl: z.string().trim().max(300).refine((v) => v === "" || z.string().url().safeParse(v).success, "Enter a valid URL").optional(),
  phone: z.string().trim().max(20).optional(),
  // Public/demo invitations can only issue "user" accounts — an "admin" invite
  // flow is a controlled, future addition (see types/invitation.ts).
  role: z.literal("user"),
});

export type InviteUserFormValues = z.infer<typeof inviteUserSchema>;

/** The full REQUIRED_PROFILE_FIELDS set (types/candidate.ts) mirrored as form field names — an Admin filling in an intern's details must supply everything Profile Completion will later require. */
export const REQUIRED_INTERN_FIELDS: Array<[keyof InviteUserFormValues, string]> = [
  ["userId", "User ID is required for an intern"],
  ["collegeName", "College is required for an intern"],
  ["branch", "Branch is required for an intern"],
  ["passedOutYear", "Passed Out Year is required for an intern"],
  ["domain", "Domain is required for an intern"],
  ["linkedinUrl", "LinkedIn is required for an intern"],
  ["githubUrl", "GitHub is required for an intern"],
];
