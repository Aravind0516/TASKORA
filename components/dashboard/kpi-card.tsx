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
    <Card>
      <CardContent className="flex items-start justify-between gap-4 px-5 py-5">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1.5 text-3xl font-semibold tracking-tight text-foreground">{value}</p>
          {helperText && (
            <p
              className={cn(
                "mt-1.5 text-xs",
                accent === "critical" ? "text-[#d03b3b]" : "text-muted-foreground"
              )}
            >
              {helperText}
            </p>
          )}
        </div>
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-lg",
            accent === "critical"
              ? "bg-[#d03b3b]/10 text-[#d03b3b]"
              : "bg-primary/10 text-primary"
          )}
        >
          <Icon className="size-5" />
        </div>
      </CardContent>
    </Card>
  );
}
