import { z } from "zod";

export const EVIDENCE_TYPES = ["GITHUB_REPOSITORY", "GITHUB_COMMIT", "GITHUB_PR", "DEPLOYMENT", "SCREENSHOT", "DOCUMENT", "OTHER_URL"] as const;

export const EVIDENCE_TYPE_LABELS: Record<(typeof EVIDENCE_TYPES)[number], string> = {
  GITHUB_REPOSITORY: "GitHub Repository",
  GITHUB_COMMIT: "GitHub Commit",
  GITHUB_PR: "GitHub Pull Request",
  DEPLOYMENT: "Deployment URL",
  SCREENSHOT: "Screenshot",
  DOCUMENT: "Document",
  OTHER_URL: "Other",
};

const evidenceSchema = z.object({
  type: z.enum(EVIDENCE_TYPES),
  url: z.string().trim().min(1, "URL is required").url("Enter a valid URL"),
  title: z.string().trim().max(120),
  description: z.string().trim().max(300),
});

export const dailyWorkUpdateFormSchema = z.object({
  taskId: z.string().optional(),
  workSummary: z.string().trim().min(10, "Describe today's work in at least 10 characters").max(2000),
  completedWork: z.string().trim().min(5, "List what you completed in at least 5 characters").max(2000),
  blockers: z.string().trim().max(1000),
  tomorrowPlan: z.string().trim().max(1000),
  evidence: z.array(evidenceSchema).max(20, "That's a lot of evidence — keep it to the most relevant links."),
});

export type DailyWorkUpdateFormValues = z.infer<typeof dailyWorkUpdateFormSchema>;

export const reviewFormSchema = z
  .object({
    status: z.enum(["VERIFIED", "PARTIALLY_VERIFIED", "NEEDS_CLARIFICATION"]),
    reviewerComment: z.string().trim().max(1000).optional().default(""),
  })
  .refine((data) => data.status === "VERIFIED" || data.reviewerComment.length > 0, {
    message: "A comment is required for Partially Verified or Needs Clarification.",
    path: ["reviewerComment"],
  });

export type ReviewFormValues = z.infer<typeof reviewFormSchema>;
