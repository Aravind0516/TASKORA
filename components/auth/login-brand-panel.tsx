import Link from "next/link";
import { LayoutGrid, CheckCircle2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarGroup, AvatarGroupCount } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/shared/status-badge";
import type { TaskStatus } from "@/types/task";

const PREVIEW_TASKS: { title: string; done: boolean; status: TaskStatus }[] = [
  { title: "Review Q3 roadmap", done: true, status: "Completed" },
  { title: "Ship pricing page", done: false, status: "In Progress" },
  { title: "Sync with design team", done: false, status: "To Do" },
];

/**
 * Desktop-only (lg+) brand/storytelling panel shown next to the login form —
 * a lightweight, restrained preview of the actual TASKORA product UI (built
 * from the same tokens/components the real app uses), not stock photography
 * or a marketing-site-style animated scene.
 */
export function LoginBrandPanel() {
  return (
    <div className="relative hidden w-1/2 shrink-0 flex-col justify-between overflow-hidden border-r border-border bg-gradient-to-br from-muted/70 via-background to-accent/20 px-12 py-10 lg:flex xl:px-16">
      <div aria-hidden className="pointer-events-none absolute -top-24 -right-24 size-96 rounded-full bg-primary/10 blur-3xl" />

      <Link href="/" className="relative flex items-center gap-2.5">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <LayoutGrid className="size-5" />
        </div>
        <div className="leading-tight">
          <p className="text-base font-semibold tracking-tight text-foreground">TASKORA</p>
          <p className="text-xs text-muted-foreground">Modern Work OS</p>
        </div>
      </Link>

      <div className="relative max-w-md">
        <h1 className="text-balance text-3xl font-semibold leading-[1.15] tracking-tight text-foreground xl:text-4xl">
          Work moves faster when everyone knows what matters next.
        </h1>
        <p className="mt-4 text-balance text-sm leading-relaxed text-muted-foreground xl:text-base">
          Manage projects, tasks, people and productivity from one intelligent workspace.
        </p>

        <div className="mt-10 rounded-2xl border border-border bg-card p-5 shadow-[0_20px_50px_-25px_rgba(0,0,0,0.25)]">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">Today</p>
            <span className="text-xs text-muted-foreground">{PREVIEW_TASKS.length} tasks</span>
          </div>

          <ul className="mt-4 space-y-3">
            {PREVIEW_TASKS.map((task) => (
              <li key={task.title} className="flex items-center gap-2.5">
                {task.done ? (
                  <CheckCircle2 className="size-4 shrink-0 text-primary" />
                ) : (
                  <Circle className="size-4 shrink-0 text-muted-foreground/40" />
                )}
                <span
                  className={cn(
                    "flex-1 truncate text-sm",
                    task.done ? "text-muted-foreground line-through" : "text-foreground"
                  )}
                >
                  {task.title}
                </span>
                <StatusBadge status={task.status} />
              </li>
            ))}
          </ul>

          <div className="mt-5 border-t border-border pt-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-foreground">Project progress</span>
              <span className="text-muted-foreground">68%</span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full w-[68%] rounded-full bg-primary" />
            </div>
          </div>

          <div className="mt-5 flex items-center gap-2.5">
            <AvatarGroup>
              <Avatar size="sm">
                <AvatarFallback>AK</AvatarFallback>
              </Avatar>
              <Avatar size="sm">
                <AvatarFallback>JL</AvatarFallback>
              </Avatar>
              <Avatar size="sm">
                <AvatarFallback>MR</AvatarFallback>
              </Avatar>
              <AvatarGroupCount className="size-6 text-[10px]">+1</AvatarGroupCount>
            </AvatarGroup>
            <span className="text-xs text-muted-foreground">4 people active now</span>
          </div>
        </div>
      </div>

      <p className="relative text-xs text-muted-foreground">© TASKORA. All rights reserved.</p>
    </div>
  );
}
