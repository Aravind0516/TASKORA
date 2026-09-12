"use client";

import { GlassCard } from "@/components/landing/shared/glass-card";
import { useReveal } from "@/lib/landing/use-reveal";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const MEMBERS = [
  { initials: "AW", task: "Reviewing design tokens", online: true },
  { initials: "NK", task: "Migrating billing events", online: true },
  { initials: "PR", task: "Planning mobile release", online: false },
  { initials: "DA", task: "Shipping nav shell", online: true },
];

export function TeamScene({ className }: { className?: string }) {
  const { ref, visible } = useReveal<HTMLDivElement>();

  return (
    <GlassCard ref={ref} className={cn("p-5 sm:p-6", className)}>
      <p className="mb-4 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Who&apos;s online</p>
      <div className="space-y-3">
        {MEMBERS.map((member, i) => (
          <div
            key={member.initials}
            className={cn(
              "flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 transition-all duration-700 ease-out",
              visible ? "translate-x-0 opacity-100" : "-translate-x-3 opacity-0"
            )}
            style={{ transitionDelay: `${i * 130}ms` }}
          >
            <div className="relative">
              <Avatar size="sm">
                <AvatarFallback className="bg-primary/15 text-primary">{member.initials}</AvatarFallback>
              </Avatar>
              <span
                className={cn(
                  "absolute -right-0.5 -bottom-0.5 size-2 rounded-full ring-2 ring-black/40",
                  member.online ? "bg-emerald-400" : "bg-muted-foreground/50"
                )}
              />
            </div>
            <p className="min-w-0 flex-1 truncate text-xs text-foreground/90">{member.task}</p>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}
