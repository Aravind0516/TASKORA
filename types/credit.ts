// The 500-credit intern evaluation framework. Every award is an immutable,
// auditable ledger entry (creditTransactions) — never a bare "credits: 350"
// field silently overwritten. Category weights live in creditRules, one
// document per organization, so an Admin can change them later WITHOUT
// rewriting historical transactions (each transaction stores the credits it
// actually awarded at the time, not a live reference to the current rule).

export const CREDIT_CATEGORIES = [
  "LINKEDIN_OFFER_LETTER",
  "PROJECT_SUBMISSION",
  "DOCUMENT_SUBMISSION",
  "ON_TIME_PROJECT",
  "MEETING_PARTICIPATION",
  "PRODUCTIVITY",
] as const;
export type CreditCategory = (typeof CREDIT_CATEGORIES)[number];

export const CREDIT_CATEGORY_LABELS: Record<CreditCategory, string> = {
  LINKEDIN_OFFER_LETTER: "LinkedIn / Offer Letter",
  PROJECT_SUBMISSION: "Project Submission",
  DOCUMENT_SUBMISSION: "Documentation",
  ON_TIME_PROJECT: "On-Time Submission",
  MEETING_PARTICIPATION: "Meetings",
  PRODUCTIVITY: "Productivity",
};

/** Default weights, seeded per-organization on first use — matches the requested TOTAL = 500 breakdown exactly. Never hard-coded elsewhere; every credit calculation reads from the organization's actual creditRules document. */
export const DEFAULT_CREDIT_WEIGHTS: Record<CreditCategory, number> = {
  LINKEDIN_OFFER_LETTER: 100,
  PROJECT_SUBMISSION: 150,
  DOCUMENT_SUBMISSION: 50,
  ON_TIME_PROJECT: 100,
  MEETING_PARTICIPATION: 50,
  PRODUCTIVITY: 50,
};

export interface CreditRules {
  organizationId: string;
  weights: Record<CreditCategory, number>;
  /** Sum of weights — shown as the "target" total (e.g. "420 / 500"); recomputed from weights, but cached here for cheap display. */
  totalTarget: number;
  updatedAt: string;
  updatedBy: string | null;
}

export type CreditTransactionStatus = "VERIFIED" | "REVERSED";

/** What a transaction's credits are evidence FOR — free-form enough to point at any existing collection without inventing a parallel reference system. */
export type CreditSourceType = "LINKEDIN_EVIDENCE" | "PROJECT" | "TASK" | "DOCUMENT_ATTACHMENT" | "MEETING" | "MANUAL";

export interface CreditTransaction {
  id: string;
  organizationId: string;
  /** The candidate this award belongs to. */
  userId: string;
  /** Denormalized for display without a candidateProfiles lookup per row. */
  candidateId: string | null;
  category: CreditCategory;
  /** Positive to award, negative only for an explicit, reasoned reversal — never silently edited. */
  credits: number;
  status: CreditTransactionStatus;
  sourceType: CreditSourceType;
  /** e.g. a projects/{id}, tasks/{id}, meetings/{id}, or attachments/{id} id — null for a purely manual award. */
  sourceId: string | null;
  /** Short label for the "Activity" column — e.g. "Project Submission — Website Redesign". */
  action: string;
  /** Required — who awarded it must always say why (see reversal/audit requirements). */
  reason: string;
  /** Who awarded this — never the candidate themselves (enforced in firestore.rules, not just here). */
  awardedBy: string;
  createdAt: string;
}

/** "Rahul Kumar" -> "Rahul K." — enough to identify yourself and recognize teammates on the leaderboard without publishing a full name to the whole organization. */
export function safeDisplayName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Candidate";
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

/** A safe-to-broadcast aggregate — the ONLY credit data visible to the whole organization (for the leaderboard). Never contains a reason, category breakdown, or anything else from creditTransactions; those stay admin/self-only. */
export interface LeaderboardEntry {
  uid: string;
  organizationId: string;
  candidateId: string | null;
  /** First name + last-initial only (see leaderboard-privacy note in credit.service.ts) — never the full profile. */
  displayName: string;
  lifetimeCredits: number;
  weeklyCredits: number;
  /** ISO date of the Monday this weekly total is for — lets the UI show "This Week" and lets writers detect a rollover. */
  weekStartDate: string;
  monthlyCredits: number;
  /** "YYYY-MM" for the month this monthly total is for. */
  monthKey: string;
  updatedAt: string;
}
