// Domain/profile-completion helpers shared by the intern-facing dashboard,
// admin invite form, and admin user detail view. There is no separate
// "candidate profile" collection or verification workflow anymore — an
// intern's identity IS their users/{uid} document (see types/user.ts),
// created by an Admin at invite time and activated at invitation acceptance.
// "Candidate ID" is simply the display label for users/{uid}.userId.

export const DOMAIN_OPTIONS = [
  { value: "software-development", label: "Software Development", code: "SD" },
  { value: "web-development", label: "Web Development", code: "WD" },
  { value: "data-science", label: "Data Science", code: "DS" },
  { value: "ai-ml", label: "AI / Machine Learning", code: "AI" },
  { value: "cloud-devops", label: "Cloud / DevOps", code: "CD" },
  { value: "ui-ux", label: "UI / UX Design", code: "UX" },
  { value: "qa-testing", label: "QA / Testing", code: "QA" },
  { value: "other", label: "Other", code: "GN" },
] as const;

export type DomainValue = (typeof DOMAIN_OPTIONS)[number]["value"];

export function domainLabel(value: string | null | undefined): string {
  if (!value) return "";
  return DOMAIN_OPTIONS.find((d) => d.value === value)?.label ?? value;
}
export function domainCode(value: string | null | undefined): string {
  return DOMAIN_OPTIONS.find((d) => d.value === value)?.code ?? "GN";
}

/** The fields that count toward "Profile Completion" for an intern — everything else (address/phone/secondary domain) is optional and shown separately, never counted against the candidate. */
export const REQUIRED_PROFILE_FIELDS = ["name", "collegeName", "branch", "passedOutYear", "domain", "linkedinUrl", "githubUrl"] as const;

export interface ProfileCompletionResult {
  percent: number;
  completedSections: string[];
  missingSections: string[];
}

const SECTION_LABELS: Record<string, string> = {
  name: "Name",
  collegeName: "College",
  branch: "Branch",
  passedOutYear: "Passed Out Year",
  domain: "Domain",
  linkedinUrl: "LinkedIn",
  githubUrl: "GitHub",
};

export type ProfileCompletionInput = {
  name?: string;
  collegeName?: string | null;
  branch?: string | null;
  passedOutYear?: number | null;
  domain?: string | null;
  linkedinUrl?: string | null;
  githubUrl?: string | null;
};

/**
 * Pure function, never a stored field — recomputed fresh everywhere it's
 * shown (intern dashboard, My Profile, admin user detail) so it can never
 * read as 100% just because the page loaded. Calculated from the actual
 * users/{uid} fields an Admin has filled in — never faked.
 */
export function calculateProfileCompletion(profile: ProfileCompletionInput): ProfileCompletionResult {
  const completedSections: string[] = [];
  const missingSections: string[] = [];
  for (const field of REQUIRED_PROFILE_FIELDS) {
    const value = profile[field];
    const filled = typeof value === "number" ? value > 0 : Boolean(value && String(value).trim().length > 0);
    (filled ? completedSections : missingSections).push(SECTION_LABELS[field]);
  }
  const percent = Math.round((completedSections.length / REQUIRED_PROFILE_FIELDS.length) * 100);
  return { percent, completedSections, missingSections };
}
