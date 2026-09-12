import type { User } from "firebase/auth";
import { getSessionIdentity } from "@/lib/services/user.service";
import { ROLE_HOME_PATH } from "@/lib/platform/constants";

/**
 * The route a just-authenticated user should land on, based on their
 * Firebase ID token's role claim — never a client-side flag. See
 * getSessionIdentity for why this reads the token, not Firestore.
 */
export async function resolvePostAuthPath(user: User): Promise<string> {
  const { role } = await getSessionIdentity(user);
  return ROLE_HOME_PATH[role];
}
