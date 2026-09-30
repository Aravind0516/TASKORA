import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type KpiTone = "indigo" | "violet" | "emerald" | "amber" | "sky" | "rose";

interface KpiCardProps {
  label: string;
  value: string;
  helperText?: string;
  icon: LucideIcon;
  /** "critical" switches the card to the rose tone and colours the helper text — for numbers that need attention. */
  accent?: "default" | "critical";
  /** Accent colour for the icon tile and corner glow (see .tone-* in globals.css). */
  tone?: KpiTone;
}

export function KpiCard({ label, value, helperText, icon: Icon, accent = "default", tone = "indigo" }: KpiCardProps) {
  const critical = accent === "critical";
  return (
    <Card className={cn("taskora-lift relative h-full overflow-hidden", critical ? "tone-rose" : `tone-${tone}`)}>
      <div aria-hidden className="taskora-tone-glow pointer-events-none absolute inset-0" />
      <CardContent className="relative flex items-start justify-between gap-4 px-5 py-5">
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground tabular-nums">{value}</p>
          {helperText && (
            <p className={cn("mt-1.5 text-xs", critical ? "font-medium text-danger" : "text-muted-foreground")}>{helperText}</p>
          )}
        </div>
        <div className="taskora-tone-tile flex size-11 shrink-0 items-center justify-center rounded-xl text-white">
          <Icon className="size-5" />
        </div>
      </CardContent>
    </Card>
  );
}
