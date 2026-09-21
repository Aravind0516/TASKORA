import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: string;
  helperText?: string;
  icon: LucideIcon;
  accent?: "default" | "critical";
}

export function KpiCard({ label, value, helperText, icon: Icon, accent = "default" }: KpiCardProps) {
  return (
    <Card
      className={cn(
        "relative overflow-hidden border-t-2 transition-shadow duration-150 hover:shadow-md",
        accent === "critical" ? "border-t-danger/50" : "border-t-primary/25"
      )}
    >
      <CardContent className="flex items-start justify-between gap-4 px-5 py-5">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1.5 text-3xl font-semibold tracking-tight text-foreground">{value}</p>
          {helperText && (
            <p
              className={cn(
                "mt-1.5 text-xs",
                accent === "critical" ? "text-danger" : "text-muted-foreground"
              )}
            >
              {helperText}
            </p>
          )}
        </div>
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-lg ring-1",
            accent === "critical"
              ? "bg-danger/10 text-danger ring-danger/15"
              : "bg-primary/10 text-primary ring-primary/15"
          )}
        >
          <Icon className="size-5" />
        </div>
      </CardContent>
    </Card>
  );
}
