# TASKORA — Repository Audit

Date: 2026-09-15
Scope: Full re-audit of the actual current codebase, requested because the previous version of this document (dated 2026-09-12) had drifted from the code it shipped alongside — see §0. No code was changed to produce this document; this is a documentation-only regeneration, approved as a standalone step.

## 0. Headline finding — read this first

**The previous `TASKORA_AUDIT.md` was itself stale**, in the opposite direction from the failure mode it originally warned about. It described comments, subtasks, attachments, meetings, and calendar as "not started," and claimed `storage.rules` "doesn't exist in this repo." None of that is true of the code actually in the repository: all five of those features are implemented, and `storage.rules` exists with a full claims-based rule set mirroring `firestore.rules`. The most likely explanation is that the audit document and a large amount of feature code landed together in one squashed commit (`40d6096`, "Initial TASKORA production version"), so the doc reflects an earlier point in development than the code it was committed alongside.

This regeneration is based strictly on reading the current files — route tree, `firestore.rules`, `storage.rules`, `types/*.ts`, `lib/services/*`, `lib/server/*`, relevant components — plus running `npm run lint` and `npm run build` in this session. It does **not** re-confirm anything by running the app against live Firebase (no dev server was started, no browser session was run, no `firebase deploy` was executed, per this task's constraints). Where the previous audit asserted something was "tested live," that claim is **not** re-verified here — see the live-verification caveat in each section and the category key below.

## 1. Category key (used throughout)

1. **Implemented** — the code exists and is wired end-to-end (types → service → UI or rule), confirmed by direct reading.
2. **Implemented and live-verified** — implemented, *and* actually exercised against a running app / real Firebase in this session. (No items in this audit currently qualify — this session did not run the dev server or a browser.)
3. **Implemented but not live-verified** — implemented per static reading and passes `lint`/`build`, but not exercised at runtime in this session. This is the status of nearly everything below.
4. **Not implemented** — no code found.
5. **Known limitation** — implemented, working as designed, but intentionally partial or with a documented gap.

## 2. Build/lint/test status (verified this session)

- `npm run lint` — **passes clean**, zero errors/warnings.
- `npm run build` — **passes clean**. `next build` (Next.js 16.3.4, Turbopack) compiles successfully, TypeScript check passes, all 39 routes generate (static + the dynamic API/`[id]`/`[token]` routes). [Implemented, build-verified]
- No test runner is configured (`package.json` has no `test` script, no `jest`/`vitest`/`playwright` dependency). [Known limitation — matches `CLAUDE.md`'s own statement]
- Firestore/Storage rules deployment status to the live project (`taskora-38082`) was **not checked** in this session (`firebase deploy` was out of scope). Whether the rules committed in `firestore.rules`/`storage.rules` match what's actually live cannot be confirmed from a repo read alone — see `CLAUDE.md`'s own standing warning about this exact failure mode. [Not live-verified]

## 3. Authentication and role routing

- Firebase Authentication (email/password), single source of truth in `components/auth/auth-provider.tsx` — reads `role`/`organizationId` **only** from the verified ID token's custom claims via `getSessionIdentity` (`lib/services/user.service.ts`), never a Firestore field. [Implemented]
- Three system roles: `super_admin`, `admin`, `user`. Set **exclusively** server-side, from exactly four code paths, all Admin-SDK-gated: `scripts/bootstrap-super-admin.mjs`, `scripts/bootstrap-admin.mjs`, `lib/server/organizations.ts`'s `claimNewOrganizationForSelf` (self-serve org creation), and `lib/server/invitations.ts`'s `acceptInvitation`. No other `setCustomUserClaims` call exists in the repo. [Implemented]
- Post-login routing: `lib/auth-redirect.ts` + `ROLE_HOME_PATH` (`lib/platform/constants.ts`) → `super_admin → /superadmin`, `admin → /admin`, `user → /overview`. An org-less self-registered account (no claims yet) resolves to `role: "user"`, `organizationId: null`, lands on `/overview`. [Implemented]
- Route guards (`components/auth/protected-route.tsx`, `admin-route.tsx`, `super-admin-route.tsx`) read `useAuth()` + `usePlatformRole()`: `ProtectedRoute` requires any signed-in account (redirects to `/login`); `AdminRoute` requires `admin`/`super_admin` (else `/overview`); `SuperAdminRoute` requires exactly `super_admin`. These are UI-routing convenience only — the actual authorization boundary is `firestore.rules` + `lib/server/auth.ts`'s `requireAuth`/`requireRole`, which independently re-verify the ID token server-side. [Implemented]
- Login/registration: `/login` (`components/auth/login-form.tsx`) and a 2-step `/register` flow (`components/auth/register-flow.tsx`: account creation, then `create-workspace-step.tsx` calling `POST /api/organizations/self-serve`) — recently redesigned (see git log: "Jira-inspired auth and 2-step registration onboarding," "premium two-column /login"). `/forgot-password` exists as a separate route. [Implemented]
- Dev-only demo role switcher (`components/platform/demo-role-provider.tsx`): gated by `isDemoModeEnabled = process.env.NODE_ENV !== "production"` — confirmed by direct read this session — changes only which shell renders, never actual Firestore access (rules are claims-based regardless). [Implemented, code-verified]

## 4. Organization isolation (multi-tenancy)

- `organizationId` is the hard boundary on every `projects`/`tasks`/`subtasks`/`comments`/`attachments`/`teams`/`meetings`/`invitations`/`activityLogs`/`notifications` document, enforced in `firestore.rules` — never assumed client-side; write rules re-derive the real parent's `organizationId` via `get()` (`taskOrgId()`, `projectOrgId()`) rather than trusting the client-declared value on comments/attachments/subtasks. [Implemented]
- `organizations` document itself carries `ownerId`/`adminIds[]`/`memberIds[]`, mutated only via `lib/server/organizations.ts` (Admin SDK) or invitation acceptance — never a direct client write to those fields (rules' `organizations` update rule only allows non-sensitive profile fields for that org's admin). [Implemented]
- Self-serve org creation (`POST /api/organizations/self-serve`) requires the caller to have no existing `organizationId` and not already be `super_admin`; Super-Admin-only org creation (`POST /api/organizations`) is a separate path. [Implemented]

## 5. Firestore security rules

`firestore.rules` (419 lines) — claims-based, org-scoped, default-deny (`match /{document=**} { allow read, write: if false; }` catch-all). Collections covered: `users`, `organizations`, `teams`, `projects`, `tasks`, `subtasks`, `comments`, `attachments`, `meetings`, `invitations`, `activityLogs`, `notifications`. Notable patterns confirmed by direct read:

- `onlyChangingFields()` allow-lists gate every self-editable/partially-editable document (`users`, `comments` content, `notifications.read`, project manager's day-to-day fields).
- `projects.ownerId` is pinned unchanged on update in both the admin branch and the manager branch's field allow-list (the "PROJECT OWNER fix" the rules file documents in its own comments).
- `projects.managerId` grants project-scoped elevated permissions via `isManagerOfProject()`, a `get()` lookup — not an account-wide claim. Also enforced identically in `storage.rules` for attachment deletion.
- `tasks` support an assignee-only `status`-only self-update path (Kanban drag-drop), separate from the admin/manager full-edit path.
- Sensitive `activityLogs` actions (`organization_*`, `admin_*`, `user_invited`/`_resent`/`_cancelled`/`_accepted`/`_joined`) are excluded from the org-member client-write rule — server-only.

`storage.rules` (148 lines) — **exists** (the previous audit's claim that it didn't was wrong), mirrors the Firestore claims model, path-verifies attachments against the real Firestore parent document via `firestore.get()`, enforces a content-type allowlist (no executables) and a 10MB size cap. [Implemented]

[Not live-verified: whether these exact rule files are the ones currently deployed to `taskora-38082` was not checked this session.]

## 6. Projects

- `types/project.ts`: `organizationId`, `teamId`, `status` (Planning/Active/On Hold/Completed), `priority`, `progress`, `startDate`/`dueDate`, `ownerId`, **`managerId: string | null`**, `memberIds[]`, `archived`. [Implemented — this resolves the previous audit's open §3 decision in favor of "Option A, additive," and it has visibly already been built, not just decided.]
- Two project create/edit dialogs exist (`components/admin/project-form-dialog.tsx` for `/admin/projects`, `components/projects/project-form-dialog.tsx` for the individual shell) — **the previously-flagged bug is fixed**: both now render Owner as a read-only display (`ownerName`), not an editable `<Select>`. Confirmed by direct read — no owner-`<Select>` exists in either file anymore. [Implemented, previously-flagged bug resolved]
- Project health (`lib/project-health.ts`'s `calculateProjectHealth`) — deterministic Healthy/At Risk/Critical with explainable reasons (overdue/blocked task counts, deadline proximity, completion %), consumed by `components/team/workload-view.tsx`, `components/dashboard/project-progress-list.tsx`, `components/admin/admin-projects-view.tsx`, `components/projects/project-detail-view.tsx`, `components/projects/project-card.tsx`. [Implemented — the previous audit listed this as "Not started"; it is not.]
- Project detail page (`app/(app)/projects/[id]/page.tsx` → `project-detail-view.tsx`) has 7 tabs: Overview, Tasks, Members, **Deliverables, Files, Discussion, Activity**. Files = real attachments, Discussion = real comments (see §9/§10), Activity = real `activityLogs`. **Deliverables is the one tab still backed by `lib/mock-data/deliverables.ts`**, not Firestore — confirmed, matches `CLAUDE.md`'s documented exception. [Known limitation, documented]

## 7. Tasks

- `types/task.ts`: status now includes **`Blocked`** (`Backlog | To Do | In Progress | In Review | Blocked | Completed`), plus **`reviewerId`** (descriptive only, never authorization — rules' `isValidReviewer()` still validates it's a same-org uid), **`estimatedHours`/`actualHours`** (validated non-negative via rules' `isValidHours()`), `labels[]`. All four fields are wired into `components/tasks/task-form-dialog.tsx`'s actual form (reviewer picker, hours inputs registered with RHF, labels). [Implemented — the previous audit listed all of these as missing; they are not.]
- Assignee self-update path limited to `status`/`updatedAt` only (rules-enforced), matching Kanban drag-and-drop. Admin and the project's manager (via `managerId`) get full task CRUD scoped to their org/project respectively. [Implemented]
- No dedicated task-detail route (`app/(app)/tasks` has no `[id]` page) — a task's comments/subtasks/attachments are only reachable via the edit dialog, not a standalone URL. [Known limitation]

## 8. Subtasks

- `types/subtask.ts`, `lib/services/subtask.service.ts` (CRUD + `subscribeToSubtasks`, `toggleSubtaskCompleted`), `lib/validation/subtask.schema.ts`. Rules block (`match /subtasks/{subtaskId}`) verifies `organizationId` against the real parent task via `taskOrgId()`, pins `taskId` unchanged on update. A composite index exists for `subtasks` (`taskId` asc + `order` asc) in `firestore.indexes.json`. [Implemented]
- UI: `components/tasks/subtask-checklist.tsx`, rendered inside `task-form-dialog.tsx` only when editing an existing task (not available at task-creation time). Local completion-percentage progress bar exists in the checklist component itself. [Implemented]
- **Subtask completion does not roll up into the parent task's `progress`/`status`** — confirmed `lib/services/task.service.ts` has no subtask references. Purely a display-local computation inside the checklist. [Known limitation — previous audit's finding on this point still holds]

## 9. Comments

- `types/comment.ts`, `lib/services/comment.service.ts`, `lib/validation/comment.schema.ts`. Rules block enforces author-only content edit (`onlyChangingFields(["content","updatedAt"])`), author-or-org-admin delete, and the same "verify against the real parent" pattern as subtasks (`projectOrgId()`/`taskOrgId()`) for create. [Implemented]
- UI: `components/comments/comment-section.tsx`, used in the project detail page's Discussion tab (project-level comments) and embedded (compact) in `task-form-dialog.tsx` for task-level comments. Includes author-only edit/delete and a notification hookup (`notifyRecipientIds`). [Implemented — previous audit listed this as "Not started"; it is not.]

## 10. Notifications

- `types/notification.ts`, `lib/services/notification.service.ts`, bell/menu UI (`components/layout/notifications-menu.tsx`), per-user scoped (`isSelf(resource.data.userId)`), `read` toggle via a field-restricted update rule. [Implemented]
- Creation is peer-to-peer capable: any org member may notify another verified same-org member, with `isValidNotificationRecipient()` re-deriving the real recipient org from their user doc (never trusting the client-declared org) and `actorId` pinned to the caller (anti-impersonation). [Implemented]
- Notification-preference toggles (Settings page) **do persist** — `components/settings/settings-view.tsx` calls `updateNotificationPreferences` (`lib/services/user.service.ts`) on toggle, with an optimistic-flip-and-revert-on-failure pattern, and syncs the loaded value via the render-body "adjust state when a value changes" pattern the project's own conventions call for (not a `useEffect`+`setState`). **This corrects the previous audit's claim that these toggles were "UI-only... does not persist."** [Implemented — previously-flagged gap is resolved]
- Trigger coverage (which events actually fire a notification) was not fully re-enumerated this session; the previous audit's note that coverage is narrower than a hypothetical full spec (no explicit re-check of "mentioned in a comment," "moved to review," etc.) is plausible but not re-verified line-by-line here.

## 11. Attachments / Firebase Storage

- `types/attachment.ts`, `lib/services/attachment.service.ts` — genuinely imports and uses `firebase/storage` (`uploadBytesResumable`, `getBlob`, `deleteObject`, `ref`), not just Firestore metadata. Upload-then-record pattern with orphan cleanup if the Firestore write fails after a successful Storage upload. [Implemented — previous audit listed this as entirely unimplemented with "no `firebase/storage` import anywhere"; that is no longer true of the current code.]
- `lib/validation/attachment.ts`: `MAX_ATTACHMENT_SIZE_BYTES` (10MB), `ALLOWED_ATTACHMENT_TYPES` (PDF/Word/Excel/PowerPoint/CSV/TXT/PNG/JPEG/GIF/WEBP), cross-checked against `storage.rules`' own `isAllowedContentType()`/`isWithinSizeLimit()` (client validation is UX convenience; Storage rules are the real enforcement). [Implemented]
- UI: `components/attachments/attachment-section.tsx` — real upload button with progress, authenticated-blob download (not a public `getDownloadURL()`), uploader-only delete (plus org-admin/project-manager per rules). Rendered in the project detail page's Files tab and (compact) in the task edit dialog. [Implemented]
- Storage path convention encodes `organizationId`/`projectId`/`taskId?`/`attachmentId` — the attachment's own Firestore doc id is the final path segment, never the original filename, so nothing user-controlled sits in the path. [Implemented]

## 12. Calendar

- `app/(app)/calendar/page.tsx` → `components/calendar/calendar-view.tsx`. Real month/week grid (42-cell month view, 7-day week view), prev/next/today navigation, color-coded entries for task due dates, project deadlines, and meetings, with per-day overflow ("+N more") in month view. [Implemented]
- Deliberately has **no dedicated Firestore collection or service** — it's a derived view over `useWorkspace()`'s already-loaded tasks/projects/meetings, documented as an intentional choice in the component's own top comment (not a missing feature). Permissions are inherited from those underlying subscriptions. [Implemented — previous audit listed this as "Not started"; it is not.]

## 13. Meetings

- `types/meeting.ts`, `lib/services/meeting.service.ts`, `lib/validation/meeting.schema.ts`. Rules block: read is Admin/organizer/participant-only (**deliberately not org-wide**, unlike projects/tasks — matches an explicit "regular member sees only what they organize or attend" design choice documented in the rules' own comments); `organizationId`/`organizerId`/`projectId` pinned unchanged on update. [Implemented]
- UI: `components/meetings/meetings-view.tsx` + `meeting-form-dialog.tsx` — full create/edit/cancel/delete, Upcoming/Past sections, organizer/participant avatars, optional project link and meeting URL. `app/(app)/meetings/page.tsx` renders this directly, not a stub. [Implemented — previous audit listed this as "Not started"; it is not.]
- List view only within the Meetings page itself; the grid/calendar rendering of meetings lives in the separate Calendar feature (§12), which pulls meetings in as one of its three entry types.

## 14. Productivity (team workload)

- `lib/workload.ts`'s `calculateMemberWorkload` — deterministic LOW/NORMAL/HIGH/OVERLOADED classification from real assigned-task counts (pending/blocked/overdue/active-projects), explicitly documented as never tracking behavioral signals (keystrokes, time-in-app). Consumed by `components/team/workload-view.tsx`, itself a tab inside `components/team/team-tabs-view.tsx` (the `/team` page). [Implemented — previous audit listed this as only "Partially done" with "dedicated workload-distribution view not built"; a dedicated view exists.]

## 15. Admin / Super Admin

- Admin console (`app/admin/*`, `AdminRoute`, `PlatformProvider`): organization profile, users (edit name/title/teamIds/functionalRole/status, suspend/activate — via client-side `updateUser`, safe because `firestore.rules`' admin-update branch excludes `role`/`organizationId` from the allow-list), teams, projects, tasks, analytics, activity log. [Implemented]
- Super Admin console (`app/superadmin/*`, `SuperAdminRoute`): platform-wide read across all organizations (rules: `isSuperAdmin()` bypasses the org-scoping check on every collection). Includes an `admins`/`organizations`/`projects`/`teams`/`users`/`activity`/`analytics`/`system`/`settings` set of pages. [Implemented]
- **The Super Admin `system`, `analytics`, and `overview` views consume `systemServices` from `lib/mock-data/platform-data.ts`** (`components/platform/platform-provider.tsx` imports `systemServices as seedSystemServices` and exposes it unchanged through the provider's context; consumed by `superadmin-system-view.tsx`, `superadmin-analytics-view.tsx`, `superadmin-overview-view.tsx`). **This is a second, real exception to `CLAUDE.md`'s "only `deliverables.ts`" claim** — corrected in `CLAUDE.md` as part of this audit (see §18). It renders a hardcoded platform-service-status list (e.g., API/Database/Email uptime), not a real infrastructure health check — there is no live monitoring integration to be real about, so this is a plausible permanent placeholder rather than an oversight, but the doc needed to say so accurately. [Implemented as a static display; not backed by real monitoring]

## 16. Environment configuration

`.env.example` documents: 6 `NEXT_PUBLIC_FIREBASE_*` client vars, `NEXT_PUBLIC_APP_URL` (optional), 3 `NEXT_PUBLIC_DEMO_*_EMAIL` (dev-only login hints, no auth effect), 3 `FIREBASE_ADMIN_*` (server-only, `server-only`-guarded), `RESEND_API_KEY`/`RESEND_FROM_EMAIL`, `EMAIL_DELIVERY_OPTIONAL` (default `false`), `INVITATION_TTL_DAYS` (default 7).

Confirmed this session (values not read, only presence checked): the local `.env.local` has all 6 client Firebase vars, all 3 `FIREBASE_ADMIN_*` vars, `RESEND_API_KEY`, and `EMAIL_DELIVERY_OPTIONAL` set. `RESEND_FROM_EMAIL`, `NEXT_PUBLIC_APP_URL`, `INVITATION_TTL_DAYS`, and the three demo-email hints are unset locally (all have safe defaults or are optional). [Implemented, config present for local dev]

## 17. Vercel deployment

- No `vercel.json` in the repo — deployment relies on Vercel's zero-config Next.js App Router detection.
- `package.json` pins `"engines": { "node": "22.x" }`. Git history shows this, plus three other deployment-specific fixes, were needed to get this app running on Vercel: `fix: pin Node.js 22.x runtime to resolve ERR_REQUIRE_ESM on Vercel`, `fix: force jose CJS build under jwks-rsa to eliminate ERR_REQUIRE_ESM`, `fix: normalize FIREBASE_ADMIN_PRIVATE_KEY parsing for hosting dashboards`, `fix: reject malformed FIREBASE_ADMIN_PROJECT_ID instead of silently using it`. This indicates real Vercel-specific friction was hit and resolved, not just local-build risk. [Not live-verified this session — whether the current `main` branch is actually deployed and working on Vercel right now was not checked; only local `npm run build` was run.]
- `README.md` is still the unedited `create-next-app` boilerplate — no project-specific deployment runbook exists in-repo. [Known limitation]

## 18. `CLAUDE.md` accuracy review — corrections made

`CLAUDE.md` was compared line-by-line against the current code (not just this audit's own findings). It was overwhelmingly accurate — far more so than the previous `TASKORA_AUDIT.md` was — and already correctly documents `managerId`, `functionalRole`, the invitation system, the render-body state-sync pattern, the `onlyChangingFields` rule pattern, and more. One inaccuracy was found and corrected in this pass:

- **Mock-data usage claim.** `CLAUDE.md` stated `lib/mock-data/*` is unused live "except `lib/mock-data/deliverables.ts`." In fact, `components/platform/platform-provider.tsx` also imports `systemServices` from `lib/mock-data/platform-data.ts` and exposes it live to three Super Admin views (`system`, `analytics`, `overview`). `CLAUDE.md`'s "Project status" paragraph has been updated to name both exceptions instead of one. No other inaccuracies were found in `CLAUDE.md` during this pass.

No other edits were made to `CLAUDE.md` — it was not restructured, and no other claims in it were altered.

## 19. Summary table

| Area | Status |
|---|---|
| Auth, role routing, claims | Implemented, not live-verified |
| Organization isolation | Implemented, not live-verified |
| Firestore rules | Implemented (code-complete); live deployment state unverified |
| Storage rules | Implemented (code-complete, previous audit was wrong that it didn't exist); live deployment state unverified |
| Projects incl. `managerId`, health | Implemented, not live-verified |
| Tasks incl. `Blocked`, `reviewerId`, hours | Implemented, not live-verified |
| Subtasks | Implemented; no progress rollup (known limitation) |
| Comments | Implemented, not live-verified |
| Notifications incl. preference persistence | Implemented, not live-verified |
| Attachments / Storage | Implemented, not live-verified |
| Calendar | Implemented (derived view), not live-verified |
| Meetings | Implemented, not live-verified |
| Productivity / workload view | Implemented, not live-verified |
| Admin / Super Admin consoles | Implemented, not live-verified |
| Super Admin system/analytics/overview `systemServices` | Implemented as static placeholder data, not real monitoring |
| Deliverables tab | Known limitation — mock-data-backed by design, not Firestore |
| Task-detail deep link | Known limitation — no `/tasks/[id]` route |
| Environment config | Present locally; production/Vercel env parity not checked |
| Vercel deployment | Config present; live deployment not re-verified this session |
| Test runner | Not implemented (none configured) |
| Lint / Build | Both pass clean, verified this session |

## 20. Recommended next steps (unchanged in spirit from the previous audit, updated for what's actually left)

1. Confirm `firestore.rules`/`storage.rules`/`firestore.indexes.json` as committed are actually the versions deployed and `READY` on `taskora-38082` (`firebase deploy --only firestore` + console check) — this was the one thing this audit could not verify from a repo read alone.
2. Do a live smoke test of the deployed Vercel app (login, invite-accept, a Firestore read/write) given the run of deployment-specific fix commits already in history.
3. Decide whether subtask→task progress rollup is worth adding (currently display-local only).
4. Decide whether a dedicated `/tasks/[id]` route is worth adding, or whether the dialog-based task detail is the intended permanent design.
5. Once a Resend domain is verified, flip `EMAIL_DELIVERY_OPTIONAL=false` and set `RESEND_FROM_EMAIL`.
6. `README.md` still reflects `create-next-app` defaults — worth a real project-specific rewrite whenever documentation work is next in scope.
