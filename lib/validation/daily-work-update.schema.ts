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

/** SCREENSHOT/DOCUMENT are uploaded files (attachmentId), never a URL the employee types in — everything else requires a real URL. */
export const FILE_EVIDENCE_TYPES = new Set<(typeof EVIDENCE_TYPES)[number]>(["SCREENSHOT", "DOCUMENT"]);

/** Per-type field label/placeholder for the URL-based evidence types — SCREENSHOT/DOCUMENT have no URL field at all, so they're absent here. */
export const EVIDENCE_URL_FIELD: Partial<Record<(typeof EVIDENCE_TYPES)[number], { label: string; placeholder: string }>> = {
  GITHUB_REPOSITORY: { label: "Repository URL", placeholder: "https://github.com/company/project" },
  GITHUB_COMMIT: { label: "Commit URL", placeholder: "https://github.com/company/project/commit/abc123" },
  GITHUB_PR: { label: "Pull Request URL", placeholder: "https://github.com/company/project/pull/12" },
  DEPLOYMENT: { label: "Deployment URL", placeholder: "https://project.vercel.app" },
  OTHER_URL: { label: "URL", placeholder: "https://..." },
};

const evidenceSchema = z
  .object({
    type: z.enum(EVIDENCE_TYPES),
    url: z.string().trim().max(2000),
    title: z.string().trim().max(120),
    description: z.string().trim(),
    attachmentId: z.string().optional(),
    fileName: z.string().optional(),
    fileSize: z.number().optional(),
  })
  .superRefine((val, ctx) => {
    if (FILE_EVIDENCE_TYPES.has(val.type)) {
      if (!val.attachmentId) {
        ctx.addIssue({ code: "custom", path: ["attachmentId"], message: "Upload a file for this evidence type." });
      }
    } else if (!val.url) {
      ctx.addIssue({ code: "custom", path: ["url"], message: "URL is required." });
    } else if (!z.string().url().safeParse(val.url).success) {
      ctx.addIssue({ code: "custom", path: ["url"], message: "Enter a valid URL." });
    }
  });

export const dailyWorkUpdateFormSchema = z.object({
  taskId: z.string().optional(),
  workSummary: z.string().trim().min(10, "Describe today's work in at least 10 characters"),
  completedWork: z.string().trim().min(5, "List what you completed in at least 5 characters"),
  blockers: z.string().trim(),
  tomorrowPlan: z.string().trim(),
  evidence: z.array(evidenceSchema).max(20, "That's a lot of evidence — keep it to the most relevant links."),
});

export type DailyWorkUpdateFormValues = z.infer<typeof dailyWorkUpdateFormSchema>;

export const reviewFormSchema = z
  .object({
    status: z.enum(["VERIFIED", "PARTIALLY_VERIFIED", "NEEDS_CLARIFICATION"]),
    reviewerComment: z.string().trim().optional().default(""),
  })
  .refine((data) => data.status === "VERIFIED" || data.reviewerComment.length > 0, {
    message: "A comment is required for Partially Verified or Needs Clarification.",
    path: ["reviewerComment"],
  });

export type ReviewFormValues = z.infer<typeof reviewFormSchema>;
