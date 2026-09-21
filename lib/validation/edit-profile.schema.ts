import { z } from "zod";

// Self-editable profile fields only — deliberately excludes userId (Candidate
// ID), employmentType, role, organizationId, teamIds, functionalRole, and
// status, none of which this form ever renders. The real enforcement
// boundary is firestore.rules' users/{uid} update rule (isSelf branch); this
// schema exists for fast client-side feedback, matching every other form in
// this codebase (see lib/validation/invitation.schema.ts).
export const editProfileSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(60),
  phone: z.string().trim().max(20).optional(),
  address: z.string().trim().max(240).optional(),
  collegeName: z.string().trim().max(120).optional(),
  branch: z.string().trim().max(80).optional(),
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
  portfolioUrl: z.string().trim().max(300).refine((v) => v === "" || z.string().url().safeParse(v).success, "Enter a valid URL").optional(),
});

export type EditProfileFormValues = z.infer<typeof editProfileSchema>;
