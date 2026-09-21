import type { User } from "firebase/auth";
import { getSessionIdentity } from "@/lib/services/user.service";
import { ROLE_HOME_PATH } from "@/lib/platform/constants";

/**
 * The route a just-authenticated user should land on, based on their
 * Firebase ID token's role claim — never a client-side flag. An
 * invitation-created account always arrives with role/organizationId
 * already set (acceptInvitation grants both atomically at activation), so
 * there is no "signed in but pending approval" intermediate state to route
 * around here anymore — a previous candidate self-registration flow used to
 * add one; it was removed along with that flow.
 */
export async function resolvePostAuthPath(user: User): Promise<string> {
  const { role } = await getSessionIdentity(user);
  return ROLE_HOME_PATH[role];
}
