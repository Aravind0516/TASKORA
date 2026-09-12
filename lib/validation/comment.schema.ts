import { z } from "zod";

// Plain text only, deliberately — rendered via CSS white-space handling
// (whitespace-pre-wrap) to preserve multiline input, never dangerouslySet-
// InnerHTML or a markdown/HTML parser. React already escapes {content} in
// JSX by default, so this is safe against script/HTML injection as long as
// every render site keeps using plain interpolation (see
// components/comments/comment-section.tsx) — no rich-text editor, matching
// "do not over-engineer" for this phase.
export const commentFormSchema = z.object({
  content: z.string().trim().min(1, "Comment cannot be empty").max(2000, "Comment is too long (2000 characters max)"),
});

export type CommentFormValues = z.infer<typeof commentFormSchema>;
