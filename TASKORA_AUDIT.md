# TASKORA — Repository Audit

Date: 2026-09-12
Scope: Phase 1 audit only, per the "upgrade to a real internal company platform" request. No code was changed to produce this document.

## 0. Headline finding — read this first

**`CLAUDE.md` in this repo is significantly out of date.** It describes a single-tenant-per-account model ("every document carries `ownerId`... Team collaboration beyond one's own roster is not implemented"). That is **not** the current state of the code. The actual app has already been substantially built out into a real multi-tenant platform: organizations, an admin-invitation system, three system roles, org-scoped Firestore rules, real Resend email, functional (non-auth) roles, and a working end-to-end invite → accept → login flow, all verified live against real Firebase in prior work. `CLAUDE.md` should be rewritten once this phase's direction is agreed — I have **not** touched it, since the instructions said not to modify code before the audit.

Because of this, "already implemented" below is considerably larger than the stale doc suggests. The real gap between current state and the new spec is narrower than a from-scratch read of `CLAUDE.md` would imply — this is an *upgrade*, not a build-from-zero, and the plan should reflect that.

---

## 1. Current architecture (verified against the actual code, not the stale doc)

- **Next.js 16 (App Router) + TypeScript**, Tailwind v4, shadcn/ui **on Base UI** (not Radix — `render` prop, not `asChild`), Lucide icons. `npm run lint` and `npm run build` both pass clean right now.
- **Three route surfaces**, each with its own layout/shell:
  - `app/(app)/*` — the individual contributor experience (`/overview`, `/projects`, `/projects/[id]`, `/tasks`, `/kanban`, `/team`, `/analytics`, `/settings`), gated by `ProtectedRoute`, fed by `components/workspace/workspace-provider.tsx` (one real-time hub, one `onSnapshot` per collection, **already scoped by the signed-in user's real `organizationId`** from Firebase custom claims — not a legacy single-tenant listener as `CLAUDE.md` implies).
  - `app/admin/*` — Admin console (`/admin`, `/admin/organization`, `/admin/users`, `/admin/teams`, `/admin/projects`, `/admin/tasks`, `/admin/analytics`, `/admin/activity`, `/admin/settings`), gated by `AdminRoute`, fed by `components/platform/platform-provider.tsx` (same real Firestore data, mapped into the admin UI's display shapes).
  - `app/superadmin/*` — platform-wide console (`/superadmin` + organizations/admins/users/projects/teams/activity/analytics/system/settings), gated by `SuperAdminRoute`, reads **all** organizations' data (rules-enforced).
- **Auth**: Firebase Authentication (email/password). `components/auth/auth-provider.tsx` is the single source of truth for `{ user, role, organizationId }`, read exclusively from the verified ID token's custom claims — never a client-editable Firestore field. Three system roles exist today: `super_admin | admin | user` (see §6 — this does not match the new spec's `ADMIN / PROJECT_MANAGER / TEAM_MEMBER`, a decision point, not an oversight).
- **Organizations**: `organizations` collection, self-serve bootstrap (`POST /api/organizations/self-serve` — a signed-in, org-less account creates an org and becomes its admin) plus a Super-Admin-only `POST /api/organizations` path. Fields: `id, name, slug, description, industry?, contactEmail?, plan, ownerId, adminIds[], memberIds[], status, createdAt, updatedAt`.
- **Teams**: `teams` collection scoped by `organizationId`, with `leadUserId | null` (Team Lead, optional, never blocks team creation), `memberIds[]`, `createdBy`. Admin UI supports create/edit/delete, Team Lead selection from same-org users only, and member assignment via the Users page (bidirectional `users.teamIds` ↔ `teams.memberIds` sync, verified live).
- **Projects**: `projects` collection scoped by `organizationId`, fields `teamId, name, description, status (Planning/Active/On Hold/Completed), priority (Low/Medium/High/Critical), progress, startDate, dueDate, ownerId, memberIds[], archived`. `ownerId` is **server/rules-enforced** to equal the authenticated creator (`firestore.rules`: `request.resource.data.ownerId == request.auth.uid` on create) — a client can never submit another account's uid as owner. **No `PROJECT_MANAGER`/`managerId` concept exists yet** — see §3.
- **Tasks**: `tasks` collection scoped by `organizationId`, fields `teamId, projectId, ownerId (creator), title, description, status (Backlog/To Do/In Progress/In Review/Completed), priority, assignedTo, dueDate, labels[]`. Assignee may self-update only `status`/`updatedAt` (drag-and-drop-safe); everything else is admin-only. **No `Blocked` status, no `reviewerId`, no `estimatedHours`/`actualHours`, no `createdBy` distinct from `ownerId`, no tags beyond `labels[]` (unused in UI), no subtasks.**
- **Invitations**: `invitations` collection (Admin-SDK-only writes, `allow write: if false` in rules), secure random token hashed with SHA-256 (raw token never stored), 7-day default expiry, org-and-team ownership validated server-side, duplicate-email and already-has-account checks, functional-role validated against a fixed allow-list. Acceptance (`POST /api/invitations/accept`) creates the real Firebase Auth account, sets custom claims, batches Firestore writes (user doc, org `memberIds`, team `memberIds`, invitation status) atomically. **Fully tested live end-to-end**, including cross-organization isolation and self-promotion denial.
- **Email**: Resend is the only provider, correctly integrated (`lib/server/email.ts`), invitation creation never blocks on email failure. **No verified sending domain exists on the Resend account**, so a dev/demo escape hatch (`EMAIL_DELIVERY_OPTIONAL=true`) skips the automatic send and instead surfaces a Copy-Invitation-Link + explicit Send-Email flow, always honest about `emailSent`. This is a known, accepted limitation for the current (B.Tech/demo) deployment, not a bug.
- **Functional roles**: a separate, non-authorization `functionalRole` field on `users` (Frontend Developer, Backend Developer, AI/ML Engineer, Data Analyst, UI/UX Designer, QA/Tester, DevOps/Cloud Engineer, Project Manager, Full Stack Developer) — assignable by Admin at invite time or via edit, shown in the Users table, Team Directory cards, member detail sheet, and project member/task-assignee selectors (filtered to the selected team). **Note: "Project Manager" already exists here as a functional-role *label*, not a system role or `managerId` field** — relevant to §3/§6.
- **Notifications**: `notifications` collection + `types/notification.ts` + `lib/services/notification.service.ts` + a bell/menu UI (`components/layout/notifications-menu.tsx`) already exist, scoped per-user, with `read` toggling. Trigger coverage is narrow today (task assigned/status-changed/due-soon/completed, project updated, invitation accepted) — most of the new spec's trigger list (task reassigned, mentioned/commented, moved to review, member added) is not wired yet, mostly because the underlying events (comments, review step) don't exist yet either.
- **Activity log**: `activityLogs` collection, already covers org/team/project/task/invitation lifecycle events, with a unified `ActivityType` vocabulary, org-scoped read rule, and a rule that lets any org member write *routine* CRUD activity but reserves sensitive platform events (org/admin/invitation lifecycle) for server-only (Admin SDK) writes. Displayed on Admin/Super Admin activity pages and the project detail page.
- **Dashboard/Analytics**: `(app)/overview` and `(app)/analytics` (individual-scope) plus `admin/analytics` and `superadmin/analytics` (org-/platform-scope) already compute KPIs and Recharts visualizations from real Firestore data (`lib/analytics.ts`), not hardcoded — completion trend, status/priority distribution, upcoming deadlines, recent activity all present in some form already.
- **Global search**: exists (`components/layout/global-search.tsx`) — client-side substring match across the already-loaded `projects`/`tasks`/`members` arrays from `useWorkspace()`. No dedicated search page, no team/task deep-linking (tasks/team results link to the list page, not the specific item).
- **Settings**: profile (name via `updateDisplayName`, avatar-less), notification-preference toggles (**UI-only — not yet wired to a Firestore write; toggling does not persist**), organization settings for Admin (`admin-organization-view.tsx`, name/description/industry/contactEmail via the existing update rule). No theme/appearance settings exist (no dark-mode toggle UI found, though CSS supports `prefers-color-scheme`-style tokens architecturally).
- **Firestore security rules** (`firestore.rules`) are **already** claims-based, org-scoped, default-deny, and were deployed live and verified (self-promotion denial, cross-org read/write denial, project-owner spoof denial all tested and passing). Not the `allow read, write: if true` anti-pattern the new instructions warn against.
- **Firestore indexes** (`firestore.indexes.json`) — four composite indexes exist (`projects`/`tasks` by `organizationId`+`updatedAt`, `activityLogs` by `organizationId`+`createdAt`, `notifications` by `userId`+`createdAt`), deployed and confirmed `READY` against the live project. Some **stale leftover indexes** from an earlier single-tenant schema (`ownerId`/`userId`-keyed on `projects`/`tasks`) remain on the live project, unused but harmless — flagged for cleanup, not urgent.
- **No Firebase Storage usage anywhere in the app code** (only the client-config env var exists; no `firebase/storage` import, no upload UI, no `deliverables`/`attachments` Firestore fields). File attachments are entirely unimplemented.
- **No comments/discussions on tasks or projects** — no type, no collection, no UI.
- **No subtasks** — no type, no collection, no UI, no completion-percentage rollup.
- **No calendar/work-planning view, no meetings/action-items feature.**
- **Demo/seed data mechanism**: `scripts/bootstrap-admin.mjs` and `scripts/bootstrap-super-admin.mjs` (Admin-SDK, one-off Node scripts, not run automatically) are the only seeding mechanism. `lib/mock-data/*` (analytics, deliverables, notifications, platform-data) remains in the repo as **inert reference/history**, not imported by any live production view **except** `lib/mock-data/deliverables.ts`, which the project detail page's "Deliverables" tab still genuinely uses (a known, intentional scope boundary from an earlier phase — deliverables aren't in the Firestore schema yet).
- **Landing page** (`components/landing/*`, ~15 files) is a fully built marketing/demo page at `/` — outside the scope of this internal-tool upgrade but present and working.

## 2. Concrete inconsistency found during this audit

**Two separate Project create/edit dialogs exist**, and they are not equivalent:

- `components/admin/project-form-dialog.tsx` (used by `/admin/projects`) — already upgraded: no client-editable Owner field (owner is always the authenticated Admin, shown read-only), team-scoped member picker with functional-role labels.
- `components/projects/project-form-dialog.tsx` (used by `/projects` and `/projects/[id]` in the individual-contributor shell) — **still has an editable Owner `<Select>`** defaulting to the current uid but allowing a different value to be chosen. Since `firestore.rules` now unconditionally requires `ownerId == request.auth.uid` on project create (closed at the rules layer, so no actual security hole), submitting a non-self owner through this older dialog will simply fail with a Firestore permission error — a real, user-facing bug, not a security gap. This dialog needs the same owner-field fix applied to the admin one.

This kind of drift (two UI implementations of the same underlying Firestore write, evolved at different times) is worth watching for elsewhere as the org/team/role model deepens in this phase.

## 3. Gap vs. the new spec's role model — the one decision that should be made before Phase B starts

The new instructions specify three roles: **ADMIN / PROJECT_MANAGER / TEAM_MEMBER**, with `managerId` on projects and `reviewerId` on tasks.

The current, already-working, already-rules-enforced system has a **different, already-multi-tenant** three-role model: **super_admin (platform owner) / admin (organization owner) / user (org member)**, with a separate, non-authorization `functionalRole` field (which already includes a "Project Manager" *label*), and no per-project manager assignment concept yet.

These are not the same shape, and reconciling them is the single highest-leverage decision for this phase, because it touches Firebase custom claims, `firestore.rules`, every route guard (`AdminRoute`/`SuperAdminRoute`), the invitation system's role field, and the bootstrap scripts. I have **not** guessed at an answer or started renaming anything. Two realistic paths, with a recommendation:

- **Option A (additive, lower-risk, recommended):** Keep the existing, working, tested `super_admin/admin/user` system-role tier exactly as-is (it already cleanly maps to the new spec's ADMIN tier plus a platform-owner tier the new spec doesn't explicitly ask for but doesn't forbid either). Add a **project-scoped** `managerId` field to `projects` (a specific `user` who gets elevated *project-scoped* permissions: manage that project's members/tasks/reviews) enforced via `firestore.rules` checking `resource.data.managerId == request.auth.uid` in addition to the existing org-admin check. This delivers everything PHASE 3/4/5's `PROJECT_MANAGER` capabilities ask for without renaming a single already-deployed custom claim or breaking the invitation/bootstrap/rules code that already works and is already tested.
- **Option B (rename, higher-risk):** Actually rename the system roles to `ADMIN/PROJECT_MANAGER/TEAM_MEMBER`, collapsing `super_admin` into `ADMIN` (losing the platform-wide multi-org oversight tier, unless kept as a fourth hidden role) and making `PROJECT_MANAGER` a genuine account-wide role rather than a per-project assignment. This is a bigger, riskier change: it invalidates already-issued custom claims (every existing user needs a claims migration), rewrites every rule and route guard, and removes the multi-organization Super Admin capability the new spec doesn't ask for but the current app already delivers and has tested.

I'd like your decision on this before Phase B, since it changes the shape of nearly everything downstream (rules, claims, invitation payload, UI labels).

## 4. Existing features (map to the new spec's phases)

| New spec phase | Status |
|---|---|
| Organization & team management (Phase 2) | **Mostly done.** Org CRUD (self-serve + Super Admin path), team CRUD, Team Lead, member add/remove, team workload view. Missing: dedicated "view team projects" panel (projects are filterable by team but no team-centric project list exists yet). |
| Roles & permissions (Phase 3) | **Different shape than requested — see §3.** Enforced via Firebase custom claims + Firestore rules already (not frontend-only), which matches the new spec's *requirement*, just not its exact role names. |
| Project management (Phase 4) | **Mostly done** except `managerId`, "Archived" as a distinct status (currently just an `archived: boolean` flag alongside status), project discussions, project files. |
| Task management (Phase 5) | **Partially done.** Missing: `Blocked` status, `reviewerId`, `estimatedHours`/`actualHours`, tags in UI, submit-for-review step, comments, attachments. |
| Subtasks (Phase 6) | **Not started.** |
| Kanban (Phase 7) | **Done and stable** — reliable status-change controls exist (`components/kanban/*`); confirm drag-and-drop stability before deciding whether to touch it. |
| My Tasks (Phase 8) | **Mostly done** (`(app)/tasks` — `components/tasks/task-management-view.tsx`) — filters/search/sort exist; confirm Today/Upcoming/Overdue groupings match the new spec exactly. |
| Comments (Phase 9) | **Not started.** |
| File attachments (Phase 10) | **Not started.** No Storage usage at all. |
| Notifications (Phase 11) | **Partially done** — collection/service/UI exist; trigger coverage is narrower than the new spec's list, mostly because comments/review don't exist yet. |
| Activity log (Phase 12) | **Done**, unified vocabulary already covers most of the requested action types. |
| Dashboard (Phase 13) | **Mostly done** at both org and platform scope. |
| Project health (Phase 14) | **Not started** — no Healthy/At Risk/Critical indicator exists yet. |
| Team productivity (Phase 15) | **Partially done** via existing analytics; dedicated workload-distribution/filter-by-team-and-date view not built. |
| Calendar (Phase 16) | **Not started.** |
| Meetings (Phase 17) | **Not started.** |
| Search (Phase 18) | **Basic version exists**, client-side only, no dedicated results page. |
| Settings (Phase 19) | **Mostly done** except notification preferences don't actually persist yet. |
| Responsive (Phase 20) | Not audited in this pass (needs a manual pass at 3 breakpoints — not something a repo read alone confirms). |
| Security (Phase 21) | **Rules already claims-based and tested** — no `if true` anti-pattern present. Needs extending as new collections (comments, subtasks, files, meetings) are added. |
| Indexes (Phase 22) | **Exists and current**, minor stale-index cleanup recommended. |

## 5. Broken / needs fixing now (independent of the new phases)

1. **Dual Project form dialogs** (§2) — the individual-contributor one still has a non-functional Owner selector.
2. **Notification preference toggles don't persist** (Settings page) — cosmetic-only today.
3. **`CLAUDE.md` is stale** relative to the actual architecture — should be rewritten as part of this phase so future sessions (and teammates) aren't misled the way this audit almost was.
4. **Stale Firestore indexes** from the pre-multi-tenant schema remain deployed (harmless, low-priority cleanup).
5. `labels[]` on tasks exists in the schema but isn't surfaced anywhere in the UI (dead field, not a bug, but worth deciding whether it becomes the new spec's "tags").

No TypeScript, lint, or build errors exist right now — `npm run lint` and `npm run build` both pass clean as of this audit.

## 6. Firestore changes required (once §3 is resolved)

New collections needed: `comments` (taskId|projectId, userId, content, createdAt, updatedAt), `subtasks` (parentTaskId, title, assigneeId, completed, createdAt), `attachments` (metadata only — projectId|taskId, fileName, storagePath, uploadedBy, size, createdAt; actual bytes in Firebase Storage), `meetings` (title, date, participants[], projectId, notes, actionItems[]).

Field additions to existing collections: `projects.managerId` (pending §3), `projects.status` gains `"Archived"`, `tasks.status` gains `"Blocked"`, `tasks.reviewerId`, `tasks.estimatedHours`/`actualHours`, `tasks.createdBy` (distinct from the existing `ownerId` if the new spec's "creator vs owner" distinction is wanted — otherwise `ownerId` already serves this).

Each new collection needs its own `firestore.rules` block (org-scoped read, creator-or-admin-scoped write, following the existing pattern already established for `activityLogs`) and, once real queries exist against them, corresponding composite indexes in `firestore.indexes.json` — added only as actual `FAILED_PRECONDITION` errors demand them, not speculatively, matching this repo's existing "no unnecessary indexes" discipline.

## 7. Security considerations

- The existing rules architecture (claims-only trust, `organizationId` as the hard multi-tenancy boundary, `onlyChangingFields` allow-lists on sensitive documents, Admin-SDK-only writes for privileged collections) is a solid foundation — new collections should follow the exact same pattern, not a new one.
- File attachments will need **Firebase Storage security rules** (not yet written at all — `storage.rules` doesn't exist in this repo) scoped the same way: a file path should encode `organizationId` and the rule should check the same custom claims Firestore already trusts.
- Comments need an "edit/delete own comment only" rule (`isSelf(resource.data.userId)`), mirroring the existing `notifications` pattern.
- Whatever §3's resolution is, a `PROJECT_MANAGER`-equivalent capability must be enforced in `firestore.rules`, not just hidden in the UI — consistent with this repo's existing practice and the new spec's own explicit requirement.

## 8. Recommended implementation order

Given how much is already built, I'd adjust the new spec's own suggested phase order slightly to avoid rework:

1. **Resolve §3** (role/manager model) — blocks everything else that touches permissions.
2. **Phase B-lite**: add `managerId` (or the agreed equivalent) to projects + rules + UI, fix the dual-dialog Owner bug, wire notification-preference persistence, rewrite `CLAUDE.md`.
3. **Phase C**: task schema additions (`Blocked` status, `reviewerId`, hours, tags-in-UI) — additive, low-risk, unlocks the review workflow.
4. **Phase D**: subtasks (lightweight, single collection, no dependency engine).
5. **Phase E**: comments (task + project) — needed before most of Phase 11's remaining notification triggers can exist at all.
6. **Phase F**: file attachments (Storage + rules + metadata collection) — the largest net-new infrastructure piece.
7. **Phase G**: notifications trigger expansion (now that comments/review exist) + project health indicator (pure rule-based calculation, no AI, straightforward once task/project fields above exist).
8. **Phase H**: team productivity/workload view, calendar, meetings, search page upgrade — all additive UI over data that will already exist by this point.
9. **Phase I**: responsive QA pass + Storage rules hardening + stale-index cleanup.

Each step ends with `npm run lint` + `npm run build` + a manual smoke check, per this repo's existing (and already-followed) development principle — not a new process, just continuing what's already been the practice throughout this project.

---

**Waiting for your approval before writing any code**, per your instructions — specifically your decision on §3 (role/manager model: Option A additive vs. Option B rename), and confirmation of the implementation order above.
