// A logout deliberately signs the user out, which flips useAuth()'s `user`
// to null — the exact same signal AdminRoute/SuperAdminRoute/ProtectedRoute
// treat as "an unauthenticated visitor landed on a protected route," and
// each of them reacts by redirecting to /login. That's correct for someone
// who was never signed in, but wrong for someone who just clicked "Log out"
// (who should land on the marketing page, "/", per the product's routing
// requirements) — and the guard's effect fires from Firebase's own
// onAuthStateChanged callback, which only runs after logout() resolves, so
// no amount of reordering router.replace()/await logout() in the logout
// handler can reliably make its own navigation win that race.
//
// This flag lets a logout handler say "this user-becomes-null transition is
// mine, don't redirect for it" — the guards check it and skip their redirect
// while it's set. Reset on a short timer rather than the logout handler's
// own navigation completing, since that completion isn't an event this
// module can reliably observe either; 2s is far longer than any real
// navigation takes but short enough that a genuine later involuntary
// sign-out (e.g. a revoked session) is only briefly, harmlessly delayed
// rather than permanently masked.
let loggingOut = false;
let resetTimer: ReturnType<typeof setTimeout> | null = null;

export function markIntentionalLogout(): void {
  loggingOut = true;
  if (resetTimer) clearTimeout(resetTimer);
  resetTimer = setTimeout(() => {
    loggingOut = false;
    resetTimer = null;
  }, 2000);
}

export function isIntentionalLogout(): boolean {
  return loggingOut;
}
