import "server-only";
import { Resend } from "resend";

// Real transactional email via Resend. Server-only — RESEND_API_KEY must
// never be prefixed NEXT_PUBLIC_ and must never be imported from a client
// component (the "server-only" import above turns that into a build error).
// The key is read once per request via process.env and handed straight to
// the Resend SDK — it is never interpolated into a log line, error message,
// or response body anywhere in this file.
//
// Sender address: without a domain verified in the Resend account,
// RESEND_FROM_EMAIL falls back to Resend's own shared testing sender,
// "TASKORA <onboarding@resend.dev>" (documented at resend.com/docs — no
// invented address). Resend restricts that shared sender to delivering only
// to the Resend account's own registered email address until a custom
// domain is verified; senders on a verified domain can deliver to anyone.
// Set RESEND_FROM_EMAIL explicitly once a domain is verified.

export class EmailNotConfiguredError extends Error {
  constructor() {
    super("Transactional email is not configured yet (RESEND_API_KEY is unset).");
    this.name = "EmailNotConfiguredError";
  }
}

export class EmailDeliveryError extends Error {
  constructor(cause: unknown) {
    super(cause instanceof Error ? cause.message : "The email provider rejected the request.");
    this.name = "EmailDeliveryError";
  }
}

function getResendClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new EmailNotConfiguredError();
  return new Resend(apiKey);
}

interface InvitationEmailInput {
  recipientEmail: string;
  recipientName: string;
  organizationName: string;
  /** null when the invitee has no team yet (a supported case — teams are optional at invite time) or the invite is for an admin without a team-scoped role. */
  teamName: string | null;
  inviterName: string;
  invitationUrl: string;
  expiresAt: string;
}

function invitationEmailHtml(input: InvitationEmailInput): string {
  const expiryLabel = new Date(input.expiresAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const purposeLine = input.teamName
    ? `<strong>${escapeHtml(input.inviterName)}</strong> invited you to join
       <strong>${escapeHtml(input.organizationName)}</strong> on TASKORA, on the
       <strong>${escapeHtml(input.teamName)}</strong> team.`
    : `<strong>${escapeHtml(input.inviterName)}</strong> invited you to join
       <strong>${escapeHtml(input.organizationName)}</strong> on TASKORA.`;
  return `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background:#f4f4f5; padding: 32px 16px;">
    <div style="max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e5e5e5;">
      <div style="background: #362f78; padding: 24px 32px;">
        <span style="color:#ffffff; font-size: 18px; font-weight: 700; letter-spacing: -0.01em;">TASKORA</span>
      </div>
      <div style="padding: 32px;">
        <h1 style="font-size: 20px; margin: 0 0 12px; color: #18181b;">You've been invited to join TASKORA</h1>
        <p style="font-size: 14px; line-height: 1.6; color: #52525b; margin: 0 0 20px;">
          Hi ${escapeHtml(input.recipientName)}, ${purposeLine}
        </p>
        <div style="text-align:center; margin: 28px 0;">
          <a href="${input.invitationUrl}" style="display:inline-block; background:#362f78; color:#ffffff; text-decoration:none; padding: 12px 28px; border-radius: 8px; font-size: 14px; font-weight: 600;">
            Accept Invitation
          </a>
        </div>
        <p style="font-size: 12px; line-height: 1.6; color: #a1a1aa; margin: 0;">
          This invitation expires on ${expiryLabel}. If you weren't expecting this, you can safely ignore this email.
        </p>
      </div>
    </div>
  </div>`;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
}

/**
 * Real email delivery contract (replaces the frontend-phase stub of the same
 * name). Throws EmailNotConfiguredError / EmailDeliveryError on failure —
 * callers must not report the invitation as emailed unless this resolves.
 */
export async function sendInvitationEmail(input: InvitationEmailInput): Promise<void> {
  const resend = getResendClient();
  // Falls back to Resend's shared testing sender when no verified domain is
  // configured yet — see the file header for the recipient restriction that
  // comes with it.
  const from = process.env.RESEND_FROM_EMAIL || "TASKORA <onboarding@resend.dev>";

  const result = await resend.emails.send({
    from,
    to: input.recipientEmail,
    subject: `You're invited to join ${input.organizationName} on TASKORA`,
    html: invitationEmailHtml(input),
  });

  if (result.error) throw new EmailDeliveryError(result.error);
}
