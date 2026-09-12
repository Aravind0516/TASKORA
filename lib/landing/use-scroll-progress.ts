"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Tracks 0..1 scroll progress of a tall container against the viewport —
 * the driver for sticky, scroll-linked storytelling sections.
 */
export function useScrollProgress<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    let frame: number | null = null;

    function update() {
      frame = null;
      const rect = node!.getBoundingClientRect();
      const vh = window.innerHeight;
      const total = rect.height - vh;
      const scrolled = -rect.top;
      const raw = total > 0 ? scrolled / total : 0;
      setProgress(Math.min(1, Math.max(0, raw)));
    }

    function onScroll() {
      if (frame == null) frame = requestAnimationFrame(update);
    }

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame != null) cancelAnimationFrame(frame);
    };
  }, []);

  return { ref, progress };
}
