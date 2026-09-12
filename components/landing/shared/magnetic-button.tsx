"use client";

import { useRef, useState, type PointerEvent, type ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { usePrefersReducedMotion } from "@/lib/landing/use-reduced-motion";

interface MagneticButtonProps {
  /** Navigates when provided. Omit and pass `onClick` for an action button (e.g. opening a dialog). */
  href?: string;
  onClick?: () => void;
  children: ReactNode;
  variant?: "primary" | "ghost";
  className?: string;
}

const buttonClasses = (variant: "primary" | "ghost", className?: string) =>
  cn(
    "group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full px-7 py-3.5 text-sm font-semibold transition-[transform,box-shadow] duration-300 ease-out",
    variant === "primary"
      ? "bg-primary text-primary-foreground shadow-[0_0_0_1px_color-mix(in_oklch,var(--primary),transparent_40%),0_20px_50px_-15px_color-mix(in_oklch,var(--primary),transparent_15%)] hover:shadow-[0_0_0_1px_color-mix(in_oklch,var(--primary),transparent_15%),0_25px_60px_-12px_color-mix(in_oklch,var(--primary),transparent_5%)]"
      : "border border-white/15 bg-white/5 text-foreground backdrop-blur-sm hover:border-white/25 hover:bg-white/10",
    className
  );

function Sweep() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full"
    />
  );
}

export function MagneticButton({ href, onClick, children, variant = "primary", className }: MagneticButtonProps) {
  const linkRef = useRef<HTMLAnchorElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const reduced = usePrefersReducedMotion();

  function handleMove(e: PointerEvent<HTMLElement>) {
    if (reduced) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setOffset({
      x: (e.clientX - rect.left - rect.width / 2) * 0.25,
      y: (e.clientY - rect.top - rect.height / 2) * 0.25,
    });
  }

  function handleLeave() {
    setOffset({ x: 0, y: 0 });
  }

  const style = { transform: `translate3d(${offset.x}px, ${offset.y}px, 0)` };

  if (href) {
    return (
      <Link
        ref={linkRef}
        href={href}
        onPointerMove={handleMove}
        onPointerLeave={handleLeave}
        style={style}
        className={buttonClasses(variant, className)}
      >
        <span className="relative z-10">{children}</span>
        <Sweep />
      </Link>
    );
  }

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={onClick}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
      style={style}
      className={buttonClasses(variant, className)}
    >
      <span className="relative z-10">{children}</span>
      <Sweep />
    </button>
  );
}
