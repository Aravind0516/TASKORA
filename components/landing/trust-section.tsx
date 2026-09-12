import { Reveal } from "@/components/landing/shared/reveal";

const PLACEHOLDER_MARKS = ["NORTHPEAK", "VELOCITY LABS", "ORBIT & CO", "STRATA", "FORGEWORKS", "ARCLIGHT"];

export function TrustSection() {
  return (
    <section id="trust" className="relative border-y border-white/5 py-14 sm:py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal className="text-center">
          <p className="text-sm font-medium text-muted-foreground">
            Built for teams that refuse to lose momentum.
          </p>
        </Reveal>

        <div className="mt-9 flex flex-wrap items-center justify-center gap-x-12 gap-y-6 opacity-70 grayscale sm:gap-x-16">
          {PLACEHOLDER_MARKS.map((mark, i) => (
            <Reveal key={mark} delay={i * 80}>
              <span className="text-sm font-semibold tracking-[0.2em] text-foreground/50 select-none">{mark}</span>
            </Reveal>
          ))}
        </div>
        <p className="mt-6 text-center text-[11px] text-muted-foreground/50">
          Illustrative placeholder marks — not real customer endorsements.
        </p>
      </div>
    </section>
  );
}
