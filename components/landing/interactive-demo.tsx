"use client";

import { useState, type FormEvent } from "react";
import { CheckCircle2, MoreHorizontal, Plus, Sparkles } from "lucide-react";
import { SectionHeading } from "@/components/landing/shared/section-heading";
import { Reveal } from "@/components/landing/shared/reveal";
import { GlassCard } from "@/components/landing/shared/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/shared/status-badge";
import { PriorityBadge } from "@/components/shared/priority-badge";
import { generateId } from "@/lib/id";
import type { TaskPriority, TaskStatus } from "@/types/task";

interface DemoTask {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee: string;
}

const STATUSES: TaskStatus[] = ["Backlog", "To Do", "In Progress", "In Review", "Completed"];
const PRIORITIES: TaskPriority[] = ["Low", "Medium", "High", "Critical"];
const PEOPLE = ["Ava W.", "Noah K.", "Priya R.", "Diego A."];

function initialsOf(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

const SEED_TASKS: DemoTask[] = [
  { id: "demo-1", title: "Finalize onboarding flow", status: "In Progress", priority: "High", assignee: "Ava W." },
  { id: "demo-2", title: "Review Q3 velocity report", status: "To Do", priority: "Medium", assignee: "Noah K." },
  { id: "demo-3", title: "Ship pricing page copy", status: "In Review", priority: "Medium", assignee: "Priya R." },
  { id: "demo-4", title: "Fix Kanban drag regression", status: "Backlog", priority: "Critical", assignee: "Diego A." },
];

export function InteractiveDemo() {
  const [tasks, setTasks] = useState<DemoTask[]>(SEED_TASKS);
  const [title, setTitle] = useState("");

  function handleAdd(e: FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    setTasks((prev) => [
      { id: generateId("demo"), title: trimmed, status: "To Do", priority: "Medium", assignee: "Unassigned" },
      ...prev,
    ]);
    setTitle("");
  }

  function updateTask(id: string, patch: Partial<DemoTask>) {
    setTasks((prev) => prev.map((task) => (task.id === id ? { ...task, ...patch } : task)));
  }

  return (
    <section id="demo" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="Try it now"
          title="Don't just see it. Experience it."
          description="A live, local sandbox — create a task, reassign it, change its priority, move it through the workflow. Nothing here touches your account."
        />

        <Reveal className="mt-14">
          <GlassCard className="p-4 sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-muted-foreground">
                <Sparkles className="size-3 text-primary" />
                Live demo — nothing here is saved
              </span>
              <span className="text-xs text-muted-foreground">{tasks.length} tasks</span>
            </div>

            <form onSubmit={handleAdd} className="mb-4 flex gap-2">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Add a task, e.g. 'Draft launch email'"
                aria-label="New demo task title"
                className="border-white/10 bg-white/5"
              />
              <Button type="submit" size="default" disabled={!title.trim()}>
                <Plus />
                Add
              </Button>
            </form>

            <div className="space-y-2">
              {tasks.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  All tasks cleared. Add one above to keep exploring.
                </p>
              )}
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3 transition-colors hover:bg-white/[0.06]"
                >
                  <Avatar size="sm" className="shrink-0">
                    <AvatarFallback className="bg-primary/15 text-primary">
                      {task.assignee === "Unassigned" ? "—" : initialsOf(task.assignee)}
                    </AvatarFallback>
                  </Avatar>

                  <p
                    className={
                      task.status === "Completed"
                        ? "min-w-0 flex-1 truncate text-sm text-muted-foreground line-through"
                        : "min-w-0 flex-1 truncate text-sm text-foreground"
                    }
                  >
                    {task.title}
                  </p>

                  <StatusBadge status={task.status} />
                  <PriorityBadge priority={task.priority} className="hidden sm:flex" />

                  <div className="ml-auto flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Mark "${task.title}" complete`}
                      onClick={() => updateTask(task.id, { status: "Completed" })}
                    >
                      <CheckCircle2 className={task.status === "Completed" ? "text-primary" : undefined} />
                    </Button>

                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={<Button variant="ghost" size="icon-sm" aria-label={`Edit "${task.title}"`} />}
                      >
                        <MoreHorizontal />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuGroup>
                          <DropdownMenuLabel>Status</DropdownMenuLabel>
                          {STATUSES.map((status) => (
                            <DropdownMenuItem key={status} onClick={() => updateTask(task.id, { status })}>
                              {status}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator />
                        <DropdownMenuGroup>
                          <DropdownMenuLabel>Priority</DropdownMenuLabel>
                          {PRIORITIES.map((priority) => (
                            <DropdownMenuItem key={priority} onClick={() => updateTask(task.id, { priority })}>
                              {priority}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator />
                        <DropdownMenuGroup>
                          <DropdownMenuLabel>Assign to</DropdownMenuLabel>
                          {PEOPLE.map((person) => (
                            <DropdownMenuItem key={person} onClick={() => updateTask(task.id, { assignee: person })}>
                              {person}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </Reveal>
      </div>
    </section>
  );
}
