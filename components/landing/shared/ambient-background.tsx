import { cn } from "@/lib/utils";

export function AmbientBackground({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      <div className="landing-orb-a absolute -top-40 -left-40 size-[36rem] rounded-full bg-primary/25 blur-[120px]" />
      <div className="landing-orb-b absolute top-1/3 -right-32 size-[30rem] rounded-full bg-violet-500/20 blur-[130px]" />
      <div className="landing-orb-c absolute bottom-0 left-1/4 size-[26rem] rounded-full bg-primary/10 blur-[110px]" />
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage: "radial-gradient(ellipse 80% 60% at 50% 0%, black 40%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(ellipse 80% 60% at 50% 0%, black 40%, transparent 100%)",
        }}
      />
      <div className="landing-grain absolute inset-[-20%] opacity-[0.035] mix-blend-overlay" />
    </div>
  );
}
