import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function GlassCard({ className, children, ref, ...props }: ComponentProps<"div">) {
  return (
    <div
      ref={ref}
      className={cn(
        "rounded-2xl border border-white/10 bg-white/[0.04] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_30px_60px_-30px_rgba(0,0,0,0.6)] backdrop-blur-xl",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
