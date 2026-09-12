"use client";

import { FolderKanban, ListChecks, TrendingUp, Bell, LayoutGrid, Search } from "lucide-react";
import { GlassCard } from "@/components/landing/shared/glass-card";
import { useReveal } from "@/lib/landing/use-reveal";
import { useCounter } from "@/lib/landing/use-counter";
import { StatusBadge } from "@/components/shared/status-badge";
import { Avatar, AvatarFallback, AvatarGroup } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const PROJECTS = [
  { name: "Customer Portal Redesign", status: "Active" as const, progress: 78 },
  { name: "Billing Platform Migration", status: "Active" as const, progress: 54 },
  { name: "API Security Hardening", status: "In Review" as const, progress: 91 },
];

const ACTIVITY = [
  { label: "Priya moved a task to In Review", time: "2m" },
  { label: "Design tokens finalized", time: "18m" },
  { label: "New project created", time: "1h" },
];

const AVATAR_LETTERS = ["AW", "NK", "PR", "DA"];

function KpiTile({
  icon: Icon,
  label,
  value,
  suffix = "",
  visible,
  delay = 0,
}: {
  icon: typeof FolderKanban;
  label: string;
  value: number;
  suffix?: string;
  visible: boolean;
  delay?: number;
}) {
  const count = useCounter(value, visible, 1200 + delay);
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground">{label}</span>
        <Icon className="size-3.5 text-primary" />
      </div>
      <p className="mt-1.5 text-xl font-semibold tabular-nums text-foreground">
        {count}
        {suffix}
      </p>
    </div>
  );
}

export function DashboardScene({ className }: { className?: string }) {
  const { ref, visible } = useReveal<HTMLDivElement>();

  return (
    <GlassCard ref={ref} className={cn("relative overflow-hidden", className)}>
      <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
        <div className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-rose-400/70" />
          <span className="size-2.5 rounded-full bg-amber-400/70" />
          <span className="size-2.5 rounded-full bg-emerald-400/70" />
        </div>
        <div className="ml-2 flex flex-1 items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-1.5 text-xs text-muted-foreground">
          <Search className="size-3.5" />
          <span className="hidden sm:inline">Search projects, tasks, people…</span>
          <span className="sm:hidden">Search…</span>
        </div>
        <Bell className="size-4 shrink-0 text-muted-foreground" />
        <Avatar size="sm">
          <AvatarFallback className="bg-primary/20 text-primary">AW</AvatarFallback>
        </Avatar>
      </div>

      <div className="flex">
        <aside className="hidden w-14 shrink-0 flex-col items-center gap-4 border-r border-white/10 py-5 sm:flex">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <LayoutGrid className="size-4" />
          </div>
          {[FolderKanban, ListChecks, TrendingUp].map((Icon, i) => (
            <div
              key={i}
              className={cn(
                "flex size-8 items-center justify-center rounded-lg text-muted-foreground",
                i === 0 && "bg-white/10 text-foreground"
              )}
            >
              <Icon className="size-4" />
            </div>
          ))}
        </aside>

        <div className="min-w-0 flex-1 p-4 sm:p-5">
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
            <KpiTile icon={FolderKanban} label="Active" value={12} visible={visible} />
            <KpiTile icon={ListChecks} label="Tasks" value={87} visible={visible} delay={120} />
            <KpiTile icon={TrendingUp} label="Momentum" value={94} suffix="%" visible={visible} delay={240} />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-5">
            <div className="space-y-3 lg:col-span-3">
              <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                Project progress
              </p>
              {PROJECTS.map((project, i) => (
                <div key={project.name} className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5">
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <span className="truncate text-xs font-medium text-foreground">{project.name}</span>
                    <StatusBadge status={project.status} className="shrink-0" />
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-violet-400 transition-[width] duration-1000 ease-out"
                      style={{
                        width: visible ? `${project.progress}%` : "0%",
                        transitionDelay: `${300 + i * 150}ms`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-3 lg:col-span-2">
              <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                Recent activity
              </p>
              <div className="space-y-2.5 rounded-lg border border-white/10 bg-white/[0.03] p-3">
                {ACTIVITY.map((item, i) => (
                  <div
                    key={item.label}
                    className={cn(
                      "flex items-start gap-2 text-xs transition-all duration-700 ease-out",
                      visible ? "translate-x-0 opacity-100" : "translate-x-2 opacity-0"
                    )}
                    style={{ transitionDelay: `${500 + i * 140}ms` }}
                  >
                    <span className="mt-1 size-1.5 shrink-0 rounded-full bg-primary" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-foreground/90">{item.label}</p>
                      <p className="text-muted-foreground/70">{item.time} ago</p>
                    </div>
                  </div>
                ))}
              </div>
              <AvatarGroup>
                {AVATAR_LETTERS.map((letters) => (
                  <Avatar key={letters} size="sm">
                    <AvatarFallback className="bg-primary/15 text-primary">{letters}</AvatarFallback>
                  </Avatar>
                ))}
              </AvatarGroup>
            </div>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}
