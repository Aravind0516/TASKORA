import { isDemoModeEnabled } from "@/components/platform/demo-role-provider";
import type { PlatformRole } from "@/types/platform";

// Dev-only convenience hints shown on the role-selection login screen so a
// live demo doesn't require memorizing which email belongs to which role.
// These are EMAIL ADDRESSES ONLY — never a password, and never a real
// secret — read from optional NEXT_PUBLIC_* env vars so no account details
// are hardcoded into source. Passwords are never shown or stored client
// side; whoever runs the demo still types the real password for that
// account. This has zero effect on authorization: the role actually
// granted after login always comes from that account's Firebase ID token
// claims (see lib/services/user.service.ts's getSessionIdentity), verified
// against the role selected on this screen — never the other way around.
const DEMO_EMAIL_ENV: Record<PlatformRole, string | undefined> = {
  super_admin: process.env.NEXT_PUBLIC_DEMO_SUPERADMIN_EMAIL,
  admin: process.env.NEXT_PUBLIC_DEMO_ADMIN_EMAIL,
  user: process.env.NEXT_PUBLIC_DEMO_USER_EMAIL,
};

export function getDemoEmailHint(role: PlatformRole): string | null {
  if (!isDemoModeEnabled) return null;
  return DEMO_EMAIL_ENV[role] ?? null;
}
