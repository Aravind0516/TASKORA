import Link from "next/link";
import { LayoutGrid } from "lucide-react";

interface FooterLink {
  label: string;
  href?: string;
}

const COLUMNS: { heading: string; links: FooterLink[] }[] = [
  {
    heading: "Product",
    links: [
      { label: "Command Center", href: "#command-center" },
      { label: "Features", href: "#features" },
      { label: "Interactive Demo", href: "#demo" },
    ],
  },
  {
    heading: "Solutions",
    links: [{ label: "How it works", href: "#story" }, { label: "Workflow", href: "#workflow" }],
  },
  {
    heading: "Resources",
    links: [{ label: "Pricing", href: "#pricing" }, { label: "Customer stories", href: "#testimonials" }],
  },
  {
    heading: "Company",
    links: [{ label: "About" }, { label: "Careers" }, { label: "Contact" }],
  },
  {
    heading: "Legal",
    links: [{ label: "Privacy" }, { label: "Terms" }, { label: "Security" }],
  },
];

export function LandingFooter() {
  return (
    <footer id="footer" className="relative border-t border-white/5 py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-6">
          <div className="col-span-2 sm:col-span-3 lg:col-span-1">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <LayoutGrid className="size-4.5" />
              </div>
              <span className="text-sm font-semibold tracking-tight text-foreground">TASKORA</span>
            </div>
            <p className="mt-3 max-w-40 text-xs text-muted-foreground">The modern work OS for teams that move.</p>
          </div>

          {COLUMNS.map((column) => (
            <div key={column.heading}>
              <p className="text-xs font-medium tracking-wide text-foreground/70 uppercase">{column.heading}</p>
              <ul className="mt-3.5 space-y-2.5">
                {column.links.map((link) =>
                  link.href ? (
                    <li key={link.label}>
                      <Link href={link.href} className="text-sm text-muted-foreground hover:text-foreground">
                        {link.label}
                      </Link>
                    </li>
                  ) : (
                    <li key={link.label}>
                      <span className="text-sm text-muted-foreground/50">{link.label}</span>
                    </li>
                  )
                )}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center gap-3 border-t border-white/5 pt-8 text-xs text-muted-foreground/60 sm:flex-row sm:justify-between">
          <p>© 2026 TASKORA. All rights reserved.</p>
          <p>Built for teams that refuse to lose momentum.</p>
        </div>
      </div>
    </footer>
  );
}
