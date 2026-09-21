import { z } from "zod";

// Accepts either a work email or an Admin-assigned User ID — branched at
// submit time (see components/auth/login-form.tsx) rather than split into
// two fields, matching the requested single "User ID or Email" input.
export const loginSchema = z.object({
  identifier: z.string().trim().min(1, "Enter your email or User ID"),
  password: z.string().min(1, "Password is required"),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, "Name must be at least 2 characters").max(60),
    email: z.string().trim().min(1, "Email is required").email("Enter a valid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email address"),
});

export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

// Step 2 of "Register a new organization" — full name/email already exist
// from the just-created Firebase account, so only phone + organization
// details are collected here. Every field but organizationName is optional:
// a Super Admin reviewing the request can always follow up for more detail.
export const registerOrganizationSchema = z.object({
  phone: z.string().trim().max(20).optional(),
  organizationName: z.string().trim().min(2, "Organization name must be at least 2 characters").max(120),
  organizationType: z.string().trim().max(60).optional(),
  industry: z.string().trim().max(80).optional(),
  website: z.string().trim().max(200).refine((v) => v === "" || z.string().url().safeParse(v).success, "Enter a valid URL").optional(),
  location: z.string().trim().max(120).optional(),
  organizationSize: z.string().trim().max(40).optional(),
  description: z.string().trim().max(500).optional(),
});

export type RegisterOrganizationFormValues = z.infer<typeof registerOrganizationSchema>;
