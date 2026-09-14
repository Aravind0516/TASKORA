# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

TASKORA is a real multi-tenant internal company project/task management platform, being upgraded incrementally (see `TASKORA_AUDIT.md` for the current gap analysis and phase plan) toward the fuller company-workflow spec. Firebase is fully wired: Authentication (email/password + an invitation-based onboarding flow) and Firestore (`organizations`, `users`, `teams`, `projects`, `tasks`, `invitations`, `notifications`, `activityLogs` collections), all scoped by `organizationId` and enforced by claims-based, default-deny Firestore rules — not a mock-data prototype. Every module reads/writes real Firestore data live via `onSnapshot`. `lib/mock-data/*` remains in the repo as inert reference/history and is not imported by any live view **except** `lib/mock-data/deliverables.ts` (the project detail page's "Deliverables" tab — deliverables aren't part of the Firestore schema yet) and `lib/mock-data/platform-data.ts`'s `systemServices` export (imported by `components/platform/platform-provider.tsx` and shown, unchanged, on the Super Admin `system`/`analytics`/`overview` views as a static platform-service-status display — there is no real infrastructure-monitoring integration behind it). Read `AGENTS.md` before touching Next.js APIs/conventions — it is auto-maintained by `next dev` and flags breaking changes versus older Next.js knowledge; commit it along with your other changes.

## Locked technology stack

Do not change without asking the user first:

- **Frontend:** Next.js (App Router) + TypeScript
- **UI:** Tailwind CSS + shadcn/ui + Lucide React icons
- **Backend:** Next.js Route Handlers + server-side service files
- **Database:** Firebase Cloud Firestore
- **Auth:** Firebase Authentication
- **Storage:** Firebase Cloud Storage (not yet used — see `TASKORA_AUDIT.md`)
- **Email:** Resend (transactional invitation email)
- **Forms/validation:** React Hook Form + Zod
- **Charts:** Recharts
- **Deployment:** Vercel

## Development principles

1. Build incrementally, in controlled phases (see `TASKORA_AUDIT.md` for the current sequence) — never a single massive rewrite.
2. No unnecessary code, abstractions, or dependencies.
3. Favor reusable components; strict TypeScript (no implicit `any`).
4. All Firebase reads/writes live in dedicated service files (`lib/services/*`) — never call Firestore/Auth directly from components. Privileged, Admin-SDK-only operations (organization bootstrap, invitations) live in `lib/server/*` behind Route Handlers, never in a client service file.
5. Never expose secret keys client-side. `FIREBASE_ADMIN_*` and `RESEND_API_KEY` are server-only env vars, read only from files carrying the `"server-only"` import.
6. Validate all external input with Zod (forms and route handlers) — a Route Handler must still validate even when the corresponding client form already does, since the client is never trusted.
7. Authorization is enforced in `firestore.rules` from Firebase custom claims, never from a client-editable Firestore field and never from frontend hiding alone. A UI affordance that a rule doesn't also allow is a bug, not a nice-to-have.
8. Don't break existing functionality — run `npm run lint` + `npm run build` + a manual smoke check after each phase, and report modified files plus any required rules/index changes.
9. Before major implementation work, state which files will be created/modified, and flag any decision that changes shared architecture (roles, claims, rules shape) for explicit approval rather than assuming.

## Commands

- Install: `npm install`
- Env setup: copy `.env.example` to `.env.local` and fill in Firebase client config, `FIREBASE_ADMIN_*` (service account JSON from Firebase Console), and `RESEND_API_KEY` — see the comments in `.env.example` for what each var does and which are safe to leave unset in dev.
- Dev server: `npm run dev` (http://localhost:3000)
- Production build: `npm run build`
- Start built app: `npm run start`
- Lint: `npm run lint`
- Deploy Firestore rules/indexes: `firebase use taskora && firebase deploy --only firestore` (needs `firebase login` + the CLI — **not** run automatically by `npm run build`; a rules or index change in the repo does nothing live until this is run)
- Bootstrap the first Super Admin (one-off, local shell with Admin SDK env vars set): `node scripts/bootstrap-super-admin.mjs <email>` — the target email must already have a real Firebase Auth account (register through the app first).
- Bootstrap the first Admin of an org for local dev/testing, bypassing the invitation-email flow: `node scripts/bootstrap-admin.mjs <email> "<organization name>"` — same real-account prerequisite; reuses an existing org by exact name match or creates one.
- No test runner is configured yet.

## Architecture

- App Router, no `src/` directory — routes live directly under `app/`.
- Tailwind CSS v4 (via `@tailwindcss/postcss`), no `tailwind.config.*` file — theme config lives in CSS (`app/globals.css`).
- **shadcn/ui is on Base UI, not Radix** (style `base-nova`) — primitives use a `render` prop to swap the underlying element (e.g. `<DropdownMenuTrigger render={<Button />}>`), not Radix's `asChild`. Tooltip delay is set on `TooltipProvider` (wrapping the app in `app/layout.tsx`), not per-`Tooltip`. Components live in `components/ui/*` (added via `npx shadcn@latest add <name>`) — don't hand-edit; re-run the CLI to add more.
- Brand accent is an indigo/blue (`oklch(0.47 0.19 264)` light / `oklch(0.7 0.16 264)` dark) layered onto shadcn's neutral base in `app/globals.css`.

### Three route surfaces, one Firestore backend

- **`app/(app)/*`** — the individual-contributor shell (`/overview`, `/projects`, `/projects/[id]`, `/tasks`, `/kanban`, `/team`, `/analytics`, `/settings`), behind `ProtectedRoute` (any signed-in account) → `WorkspaceProvider` (`components/workspace/workspace-provider.tsx`) → `AppShell`.
- **`app/admin/*`** — the organization-admin console (`/admin`, `/admin/organization`, `/admin/users`, `/admin/teams`, `/admin/projects`, `/admin/tasks`, `/admin/analytics`, `/admin/activity`, `/admin/settings`), behind `AdminRoute` (role `admin` or `super_admin`) → `PlatformProvider` (`components/platform/platform-provider.tsx`).
- **`app/superadmin/*`** — the platform-wide console (org/admin/user/project/team/activity/analytics/system/settings), behind `SuperAdminRoute` (role `super_admin` only), reading across **all** organizations.

`WorkspaceProvider` and `PlatformProvider` both ultimately read the exact same Firestore collections through the exact same `lib/services/*` functions — the split is about *which slice/shape* of the data a shell needs (an individual's own scope vs. an org's full admin view vs. platform-wide), not two different backends. `WorkspaceProvider` maps Firestore documents into mock-data-era shapes (`TeamMember`, etc.) so older view components didn't need to change; `PlatformProvider` maps them into `types/platform.ts`'s display shapes for the same reason on the admin/superadmin side.

### Auth & roles

- `components/auth/auth-provider.tsx` holds the single app-wide `onAuthStateChanged` listener (mounted once in `app/layout.tsx`) and is the **only** place `role`/`organizationId` are ever read from the verified Firebase ID token's custom claims — never a Firestore field a client could have written, and every other shell/provider reads from here rather than re-deriving its own copy. `lib/services/auth.service.ts` wraps all `firebase/auth` calls; components never import `firebase/auth` directly.
- Three system roles, set exclusively server-side (Admin SDK — a client can never set its own claims): `super_admin` (platform owner, provisioned only via `scripts/bootstrap-super-admin.mjs`, never public registration), `admin` (an organization's owner — either the account that self-serve-created the org via `POST /api/organizations/self-serve`, or an invited admin), `user` (an org member, always arrives via accepting an invitation). A public "Get Started" self-registration always creates role `user` with `organizationId: null`, enforced by `firestore.rules`'s `users/{uid}` create rule regardless of what the client sends.
- A separate, **non-authorization** `functionalRole` field on `users` (`types/user.ts`'s `FUNCTIONAL_ROLES`) records what someone actually does (Frontend Developer, Backend Developer, QA/Tester, etc.) — assignable by an Admin, shown in rosters/selectors, and must never be confused with the system `role` above or checked by any security rule.
- A project-scoped **`managerId`** field on `projects` (not an account-wide role or custom claim) grants the assigned user elevated permissions on *that one project* — update its status/priority/progress/members/description/dueDate, and create/update tasks that belong to it — enforced in `firestore.rules` via `isManagerOfProject()`, a `get()` lookup against the project doc. This is deliberately additive rather than a fourth system role: see `TASKORA_AUDIT.md` §3 for why.
- The dev-only demo role switcher (`components/platform/demo-role-provider.tsx`) only ever changes which *shell renders*, gated by `isDemoModeEnabled = process.env.NODE_ENV !== "production"` — it can never grant real data access, since every Firestore read still goes through the real, claims-based rules regardless of the demo override.

### Multi-tenancy

- `organizationId` is the hard security boundary on every `projects`/`tasks`/`teams`/`invitations`/`activityLogs` document — checked in `firestore.rules`, never assumed client-side. `organizations` itself carries `ownerId`/`adminIds[]`/`memberIds[]`.
- **Project ownership**: `projects.ownerId` must equal the creator's uid on create, and — as important — **can never change on update either** (`firestore.rules`'s `projects` update rule pins `ownerId` unchanged for the admin branch, and the manager branch's `onlyChangingFields` allow-list simply omits it). A project create/edit dialog must never expose an editable Owner field; if you find one, it's a bug (this happened once — see the PROJECT OWNER fix history in `firestore.rules`'s comments — a client-editable Owner `<Select>` silently flowed an arbitrary uid into a plain `updateDoc` call that the rules at the time didn't block).
- **Teams**: `teams.leadUserId` (optional Team Lead, never required to create a team) and `teams.memberIds[]`, kept in sync bidirectionally with `users.teamIds[]` whenever an Admin assigns/reassigns someone from the Users page.
- **Invitations**: the only path a new `user` (or invited `admin`) ever joins an organization. `app/api/invitations/*` (Admin-SDK-only — `firestore.rules` denies all client writes to `invitations`) creates a secure random token (SHA-256-hashed, raw token never stored), validates org/team ownership and functional-role server-side, and on acceptance atomically creates the real Firebase Auth account, sets custom claims, and writes org/team membership. Never modify the accept flow (`POST /api/invitations/accept`, `GET /api/invitations/token/[token]`, `lib/server/invitations.ts`'s `acceptInvitation`) without re-verifying token security, expiry, intended-email binding, and organization association end-to-end against real Firebase — it has been.
- **Email**: Resend (`lib/server/email.ts`) is the only provider — do not add a second one. Invitation creation never fails just because email delivery does (`emailSent`/`emailError` are always reported honestly to the client, never faked). `EMAIL_DELIVERY_OPTIONAL=true` (set in this repo's dev `.env.local`, since the Resend account has no verified sending domain yet) skips the *automatic* send attempt at creation time and instead surfaces Copy-Invitation-Link + an explicit "Send Email" action (which always makes a real attempt, regardless of the flag). Set `EMAIL_DELIVERY_OPTIONAL=false` (or unset) once a domain is verified and `RESEND_FROM_EMAIL` is set, and invites will email out automatically again — no architecture change needed.

### Data access patterns

- `components/workspace/workspace-provider.tsx` — one `onSnapshot` listener per collection (`projects`, `tasks`, `teamMembers`→`users`, `teams`, `notifications`, `activityLogs`), scoped by the signed-in account's real `organizationId` from `useAuth()`. Exposes live arrays, mock-data-era lookup helpers (`getMemberById`, `getProjectById`, `getTasksByProjectId`, ...), per-collection `loaded`/`errors` state, `retry()`, and CRUD actions that call `lib/services/*` and best-effort log to `activityLogs`. Never call `onSnapshot`/Firestore directly from a view component — go through `useWorkspace()` or add a service function.
- `components/platform/platform-provider.tsx` — the admin/superadmin equivalent: real Firestore data mapped into `types/platform.ts`'s display shapes (Title-Case statuses, etc.) so the admin/superadmin view components (built against those shapes) didn't need to change when real Firestore replaced mock data.
- Firestore Timestamp fields are converted to ISO strings at the service boundary (`lib/firebase/timestamp.ts`) — app-level types (`types/*.ts`) stay plain ISO-string dates.
- Chart colors (`lib/chart-colors.ts`) come from the dataviz skill's validated categorical/status/sequential palette — reuse those constants. Recharts components live in `components/analytics/*`; completion-trend and other charts are computed client-side from real task/project data (`lib/analytics.ts`), never hardcoded.
- Every "directory" page (Projects, Team, My Tasks, Kanban) is a thin Server Component `page.tsx` (metadata only) rendering a `"use client"` view that reads from `useWorkspace()`/`usePlatform()`. Loading = per-collection `loaded` flags, empty = `EmptyState`, error = `ErrorState` with `retry()`.

### Forms

- Every form (`components/*/*.form-dialog.tsx`) follows: React Hook Form + a Zod schema in `lib/validation/*.schema.ts`, a shadcn `Dialog`, inline field errors, a top error banner for request-level errors, a submit calling a `useWorkspace()`/`usePlatform()` action.
- A dialog editing an existing record is rendered with `key={record?.id ?? "new"}` at its call site so switching records remounts it with fresh `defaultValues` — **not** a `useEffect` calling `reset()`/`setState`, since this repo's `react-hooks/set-state-in-effect` lint rule (hard error) forbids synchronous `setState` inside effect bodies.
- Where local state must mirror a slow-loading external value (Settings mirroring the auth user, or notification preferences, before edits), use the render-body "adjust state when a value changes" pattern (compare against a tracked previous value, `setState` directly in the render body) instead of an effect — see `components/settings/settings-view.tsx` for the canonical example (three separate instances of the pattern: display name, title, notification preferences).
- A `<Select>` item can never use an empty string as its value — every optional picker (Team Lead, Project Manager, Team, Functional Role) uses a `"none"` sentinel translated to/from `undefined`/`null` at the form boundary, never left as a raw empty string.
- Never `Date.now()`/`new Date()` directly in component bodies — build via `nowIso()` (`lib/format.ts`) in an event handler, or `lib/id.ts`'s `generateId()` for a non-Firestore-backed id (Firestore-backed records get their id from `doc(collection(db, ...))`).

### Error/not-found boundaries & metadata

- `app/global-error.tsx` (root, replaces `<html>`), `app/not-found.tsx` (root, unstyled shell), `app/(app)/{error,not-found}.tsx` (branded, inside the app shell — `error.tsx` is a Client Component per Next.js convention).
- Every page under `app/(app)/`, `app/(auth)/`, `app/admin/`, `app/superadmin/` exports `metadata` (or `generateMetadata` for dynamic routes) so browser tabs read "Page · TASKORA" — keep this when adding pages.

### Firestore rules & indexes

- `firestore.rules` (claims-based, org-scoped, default-deny) and `firestore.indexes.json` are the source of truth — **neither is auto-deployed**; run `firebase use taskora && firebase deploy --only firestore` after any change, and verify indexes actually reach `READY` (not just `BUILDING`) before assuming a query works. A rule or index committed to the repo but not deployed is exactly how the "missing composite index" and "stale single-tenant rules" incidents in this project's history happened — always deploy and verify live, don't assume the file alone is enough.
- New collections should follow the exact existing pattern (org-scoped read, creator-or-admin-scoped write, `onlyChangingFields` allow-lists on sensitive self-editable documents like `users`) rather than inventing a new authorization shape.
- Add a composite index only when a real query actually throws `FAILED_PRECONDITION` — never speculatively.
