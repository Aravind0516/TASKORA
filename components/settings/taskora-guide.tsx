import type { LucideIcon } from "lucide-react";
import {
  Bell,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Crown,
  FileText,
  FolderKanban,
  GraduationCap,
  Kanban,
  ListChecks,
  Lock,
  Search,
  ShieldCheck,
  Trophy,
  UserCog,
  Users,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NXTWISE_LEGAL_LINE, NXTWISE_PRIMARY_LINE } from "@/components/shared/product-branding";
import { TRIAL_DURATION_DAYS } from "@/lib/access-control";
import { EVIDENCE_TYPES, EVIDENCE_TYPE_LABELS } from "@/lib/validation/daily-work-update.schema";
import { CREDIT_CATEGORIES, CREDIT_CATEGORY_LABELS, DEFAULT_CREDIT_WEIGHTS } from "@/types/credit";
import { TASK_STATUSES } from "@/types/task";

// Product documentation for the Settings "TASKORA Guide" tab. Every statement
// here describes behavior that exists in this codebase today — where a value
// can change (task stages, evidence types, credit categories and their
// default weights, trial length) it is read from the same constant the app
// itself uses, so the guide can't drift out of date silently.

interface Role {
  icon: LucideIcon;
  name: string;
  summary: string;
  points: string[];
}

const ROLES: Role[] = [
  {
    icon: Crown,
    name: "Super Admin",
    summary: "Runs the TASKORA platform itself.",
    points: ["Reviews and approves new organization registrations", "Approves subscription plan requests", "Oversees every organization, user and project"],
  },
  {
    icon: Building2,
    name: "Organization Admin",
    summary: "Owns and manages one organization.",
    points: ["Invites people and organizes them into teams", "Creates projects and assigns members and a manager", "Reviews work, manages credits and the organization's plan"],
  },
  {
    icon: UserCog,
    name: "Project Manager",
    summary: "Any member assigned to manage a specific project.",
    points: ["Updates that project's status, members and requirements", "Creates and assigns the project's tasks", "Reviews the project's daily work updates"],
  },
  {
    icon: Users,
    name: "Employee",
    summary: "A member working on assigned projects.",
    points: ["Sees only the projects they are assigned to", "Moves their tasks through the workflow", "Submits daily work updates with evidence"],
  },
  {
    icon: GraduationCap,
    name: "Intern",
    summary: "A member in an internship program.",
    points: ["Works on assigned projects and tasks like an employee", "Submits daily updates for verification", "Earns credits and appears on the leaderboard"],
  },
];

const WORKFLOW = [
  { title: "Organization", text: "Your company's private workspace" },
  { title: "Teams", text: "Groups of people with an optional lead" },
  { title: "Projects", text: "Scoped work with members and a manager" },
  { title: "Tasks", text: "Assigned, prioritized units of work" },
  { title: "Daily updates", text: "What was done, with evidence" },
  { title: "Review", text: "An admin or the project manager checks it" },
  { title: "Verified work", text: "A recorded, reviewed outcome" },
  { title: "Credits & performance", text: "Progress you can measure" },
];

interface Capability {
  icon: LucideIcon;
  title: string;
  points: string[];
}

const CAPABILITIES: Capability[] = [
  {
    icon: Building2,
    title: "Organization & teams",
    points: [
      "People join by invitation and sign in with their email or Candidate ID",
      "Teams group members, each with an optional team lead",
      "Functional roles (e.g. Frontend Developer, QA / Tester) describe what someone does",
    ],
  },
  {
    icon: FolderKanban,
    title: "Projects",
    points: [
      "Status, priority, progress, start and due dates",
      "Written project requirements and tracked deliverables",
      "Discussion, activity history and a health indicator",
      "Submitting a finished project awards its members credits",
    ],
  },
  {
    icon: ListChecks,
    title: "Tasks",
    points: [
      "Assignee, reviewer, priority, due date and estimated/actual hours",
      "Subtask checklists, comments and file attachments",
      "Assignees update progress; admins and the project manager edit details",
    ],
  },
  {
    icon: Kanban,
    title: "Kanban board",
    points: [
      `Every task in its stage: ${TASK_STATUSES.join(", ")}`,
      "Move a task to another stage from its card menu",
      "Search and filter by project, priority or assignee",
    ],
  },
  {
    icon: CalendarDays,
    title: "Meetings & calendar",
    points: [
      "Admins and project managers schedule meetings with participants, a project and a meeting link",
      "The calendar shows task due dates, project deadlines and meetings",
      "Switch between month and week views, or jump back to today",
    ],
  },
  {
    icon: Bell,
    title: "Notifications",
    points: [
      "Assignments, status changes, comments, meetings, reviews and credit changes",
      "An unread count in the bell, plus a pop-up when something new arrives",
      "Choose which categories notify you in Settings → Notifications",
    ],
  },
  {
    icon: Search,
    title: "Search",
    points: [
      "Global search on your dashboard and Meetings finds projects, tasks, people and meetings",
      "Projects, My Tasks, Team and Kanban each have their own search for that page",
      "Search only ever returns what you already have access to",
    ],
  },
  {
    icon: Trophy,
    title: "Credits & performance",
    points: [
      "Credits are awarded for verified outcomes and recorded in a ledger",
      "My Credits, My Performance and a weekly/monthly leaderboard",
    ],
  },
];

const VERIFICATION_STEPS = ["Project requirement", "Task", "Daily update", "Evidence", "Review", "Result"];

const REVIEW_OUTCOMES = [
  { label: "Verified", text: "The work is confirmed." },
  { label: "Partially verified", text: "Some of it is confirmed; the reviewer explains what's missing." },
  { label: "Needs clarification", text: "The reviewer asks for more detail before verifying." },
];

const GETTING_STARTED = [
  { role: "Organization Admin", steps: ["Register your organization and wait for approval", "Create teams", "Invite your people", "Create a project and assign members and a manager", "Create and assign tasks", "Review daily updates and track progress"] },
  { role: "Project Manager", steps: ["Open the project you manage", "Keep its requirements and members current", "Create and assign tasks", "Review your team's daily updates"] },
  { role: "Employee / Intern", steps: ["Accept your invitation and sign in", "Open your assigned project and read its requirements", "Work through your tasks and update their status", "Submit a daily update with evidence", "Follow your reviews, credits and performance"] },
  { role: "Super Admin", steps: ["Review organization registration requests", "Approve subscription requests", "Monitor organizations, users and platform activity"] },
];

const PRINCIPLES = [
  { title: "Organized work", text: "Every task belongs to a project, and every project to an organization." },
  { title: "Visibility", text: "Status, progress and deadlines are visible to the people involved." },
  { title: "Accountability", text: "Each task has an owner, and each update has an author and a date." },
  { title: "Verification", text: "Work is reviewed against evidence rather than assumed." },
  { title: "Role-based access", text: "People see exactly what their role and assignments allow." },
  { title: "Measurable progress", text: "Credits and performance reflect verified outcomes." },
];

function SectionHeading({ id, eyebrow, title, description }: { id: string; eyebrow: string; title: string; description?: string }) {
  return (
    <div className="mb-4">
      <p className="text-xs font-semibold tracking-wide text-primary uppercase">{eyebrow}</p>
      <h2 id={id} className="mt-1 text-lg font-semibold tracking-tight text-foreground">
        {title}
      </h2>
      {description && <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{description}</p>}
    </div>
  );
}

export function TaskoraGuide() {
  return (
    <div className="space-y-10">
      {/* Hero */}
      <section aria-labelledby="guide-hero" className="overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-6 sm:p-8">
        <Badge variant="secondary">TASKORA Guide</Badge>
        <h2 id="guide-hero" className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          TASKORA
        </h2>
        <p className="mt-1 text-lg font-medium text-primary">Work. Verify. Grow.</p>
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          TASKORA is one workspace for organized, measurable work. It connects your organization&apos;s people, teams, projects and tasks with
          the daily updates that show what was actually done, so work can be reviewed, verified and recognized in one place.
        </p>
      </section>

      {/* What is TASKORA */}
      <section aria-labelledby="guide-what">
        <SectionHeading id="guide-what" eyebrow="Overview" title="What is TASKORA?" />
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardContent className="space-y-2 text-sm leading-relaxed text-muted-foreground">
              <p className="font-medium text-foreground">The problem it solves</p>
              <p>
                When projects, task lists, progress reports and performance records live in separate tools, it is hard to see what is really
                happening, and harder to recognize good work fairly.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="space-y-2 text-sm leading-relaxed text-muted-foreground">
              <p className="font-medium text-foreground">How TASKORA helps</p>
              <p>
                Projects, tasks, daily updates, reviews and credits share one workspace. Each person sees the work that concerns them, and
                managers can check progress against real evidence.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Roles */}
      <section aria-labelledby="guide-roles">
        <SectionHeading
          id="guide-roles"
          eyebrow="People"
          title="Who uses TASKORA?"
          description="Project Manager is assigned per project, not across the whole organization: any member can manage one project and work as a regular member on another."
        />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {ROLES.map((role) => (
            <Card key={role.name}>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <role.icon className="size-4.5" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-foreground">{role.name}</h3>
                    <p className="text-xs text-muted-foreground">{role.summary}</p>
                  </div>
                </div>
                <ul className="space-y-1.5 text-sm text-muted-foreground">
                  {role.points.map((point) => (
                    <li key={point} className="flex gap-2">
                      <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-success" aria-hidden />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Workflow */}
      <section aria-labelledby="guide-workflow">
        <SectionHeading id="guide-workflow" eyebrow="The flow" title="How TASKORA works" description="From an organization down to measurable results, every step builds on the previous one." />
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {WORKFLOW.map((step, index) => (
            <li key={step.title} className="relative flex gap-3 rounded-xl border border-border bg-card p-4">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground" aria-hidden>
                {index + 1}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">{step.title}</p>
                <p className="text-xs text-muted-foreground">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Capabilities */}
      <section aria-labelledby="guide-capabilities">
        <SectionHeading id="guide-capabilities" eyebrow="Features" title="Core capabilities" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {CAPABILITIES.map((capability) => (
            <Card key={capability.title}>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2.5">
                  <capability.icon className="size-4.5 shrink-0 text-primary" aria-hidden />
                  <h3 className="text-sm font-semibold text-foreground">{capability.title}</h3>
                </div>
                <ul className="list-disc space-y-1.5 pl-4 text-sm text-muted-foreground marker:text-muted-foreground/50">
                  {capability.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Work verification */}
      <section aria-labelledby="guide-verification">
        <SectionHeading
          id="guide-verification"
          eyebrow="Work verification"
          title="Daily updates and review"
          description="On projects with work verification enabled, members submit one update per project per day. They can edit it on the same day until it has been reviewed."
        />
        <Card>
          <CardContent className="space-y-6">
            <ol className="flex flex-wrap items-center gap-2" aria-label="Verification flow">
              {VERIFICATION_STEPS.map((step, index) => (
                <li key={step} className="flex items-center gap-2">
                  <span className="rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-sm font-medium text-foreground">{step}</span>
                  {index < VERIFICATION_STEPS.length - 1 && (
                    <span className="text-muted-foreground" aria-hidden>
                      →
                    </span>
                  )}
                </li>
              ))}
            </ol>

            <div className="grid gap-6 lg:grid-cols-3">
              <div>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <FileText className="size-4 text-primary" aria-hidden /> What an update contains
                </h3>
                <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-muted-foreground">
                  <li>A summary of the day&apos;s work</li>
                  <li>What was completed</li>
                  <li>Any blockers</li>
                  <li>The plan for tomorrow</li>
                  <li>Optionally, the specific task it relates to</li>
                </ul>
              </div>
              <div>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <ClipboardCheck className="size-4 text-primary" aria-hidden /> Evidence you can attach
                </h3>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {EVIDENCE_TYPES.map((type) => (
                    <Badge key={type} variant="outline">
                      {EVIDENCE_TYPE_LABELS[type]}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <ShieldCheck className="size-4 text-primary" aria-hidden /> Review outcomes
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">An Organization Admin or the project&apos;s manager reviews each update:</p>
                <dl className="mt-2 space-y-1.5 text-sm">
                  {REVIEW_OUTCOMES.map((outcome) => (
                    <div key={outcome.label}>
                      <dt className="inline font-medium text-foreground">{outcome.label}: </dt>
                      <dd className="inline text-muted-foreground">{outcome.text}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Credits */}
      <section aria-labelledby="guide-credits">
        <SectionHeading
          id="guide-credits"
          eyebrow="Credits & performance"
          title="How credits work"
          description="Credits recognize verified outcomes. Each change is a permanent ledger entry with an amount, a reason and who made it, so your balance always equals your history."
        />
        <div className="grid gap-4 lg:grid-cols-5">
          <Card className="lg:col-span-3">
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">Awarded automatically</span> when a project is submitted: its members receive
                Project Submission credits, plus On-Time Submission credits if it was submitted by the due date.
              </p>
              <p>
                <span className="font-medium text-foreground">Adjusted by an admin</span>: an Organization Admin can award or deduct credits,
                and must give a reason each time. Deductions appear in your history as negative entries.
              </p>
              <p>
                <span className="font-medium text-foreground">Tracked for you</span> in My Credits (balance, category breakdown and full
                history), My Performance, and the weekly and monthly leaderboard. The leaderboard shows only first names and last initials.
              </p>
            </CardContent>
          </Card>
          <Card className="lg:col-span-2">
            <CardContent>
              <h3 className="text-sm font-semibold text-foreground">Default credit categories</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">Admins can adjust these weights for their organization.</p>
              <dl className="mt-3 divide-y divide-border text-sm">
                {CREDIT_CATEGORIES.map((category) => (
                  <div key={category} className="flex items-center justify-between gap-3 py-1.5">
                    <dt className="text-muted-foreground">{CREDIT_CATEGORY_LABELS[category]}</dt>
                    <dd className="font-medium tabular-nums text-foreground">{DEFAULT_CREDIT_WEIGHTS[category]}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Access */}
      <section aria-labelledby="guide-access">
        <SectionHeading id="guide-access" eyebrow="Privacy" title="Role-based access" />
        <Card>
          <CardContent className="flex gap-3 text-sm text-muted-foreground">
            <Lock className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            <p>
              You only see what your role and assignments allow. Members see the projects they belong to, and those projects&apos; tasks,
              discussions and updates. Organization Admins see their whole organization. Organizations are always separate from one another.
              These limits are enforced by TASKORA&apos;s data security rules, not just hidden in the interface.
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Getting started */}
      <section aria-labelledby="guide-start">
        <SectionHeading id="guide-start" eyebrow="Getting started" title="Your first steps" />
        <div className="grid gap-4 md:grid-cols-2">
          {GETTING_STARTED.map((path) => (
            <Card key={path.role}>
              <CardContent>
                <h3 className="text-sm font-semibold text-foreground">{path.role}</h3>
                <ol className="mt-3 space-y-2">
                  {path.steps.map((step, index) => (
                    <li key={step} className="flex gap-2.5 text-sm text-muted-foreground">
                      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-foreground" aria-hidden>
                        {index + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          New organizations start with a {TRIAL_DURATION_DAYS}-day free trial. Admins can request a plan from Billing, and a Super Admin approves
          it.
        </p>
      </section>

      {/* Principles */}
      <section aria-labelledby="guide-principles">
        <SectionHeading id="guide-principles" eyebrow="Principles" title="What TASKORA is built on" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PRINCIPLES.map((principle) => (
            <div key={principle.title} className="rounded-xl border border-border bg-card p-4">
              <p className="text-sm font-semibold text-foreground">{principle.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{principle.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* About */}
      <section aria-labelledby="guide-about" className="rounded-2xl border border-border bg-muted/30 p-6 text-center">
        <h2 id="guide-about" className="text-lg font-semibold tracking-tight text-foreground">
          TASKORA
        </h2>
        <p className="text-sm font-medium text-primary">An NxtWise Product</p>
        <p className="mt-2 text-sm text-muted-foreground">{NXTWISE_PRIMARY_LINE}</p>
        <p className="mt-1 text-xs text-muted-foreground/80">{NXTWISE_LEGAL_LINE}</p>
      </section>
    </div>
  );
}
