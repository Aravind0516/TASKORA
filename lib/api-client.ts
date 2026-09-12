import { auth } from "@/lib/firebase/auth";

/**
 * fetch() wrapper for the app's own Route Handlers (app/api/*) — attaches the
 * signed-in user's Firebase ID token as a Bearer header so the server can
 * verify identity + role via lib/server/auth.ts. Every privileged mutation
 * (organizations, invitations, admin creation) goes through this, never a
 * direct Firestore client write.
 */
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const user = auth.currentUser;
  if (!user) throw new Error("You must be logged in.");
  const idToken = await user.getIdToken();

  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
      ...init?.headers,
    },
  });

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const message = body && typeof body === "object" && "error" in body ? String(body.error) : "Something went wrong. Please try again.";
    throw new Error(message);
  }
  return body as T;
}

/** Same as apiFetch, but for the one endpoint a signed-out visitor legitimately calls: reading a public invitation by token. */
export async function publicApiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const message = body && typeof body === "object" && "error" in body ? String(body.error) : "Something went wrong. Please try again.";
    throw new Error(message);
  }
  return body as T;
}
