"use client";

import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/lib/landing/use-reduced-motion";

export function usePointerParallax<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T | null>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const reduced = usePrefersReducedMotion();
  const frame = useRef<number | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node || reduced) return;

    function handleMove(e: PointerEvent) {
      if (frame.current != null) cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(() => {
        const rect = node!.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const y = ((e.clientY - rect.top) / rect.height) * 2 - 1;
        setPos({ x: Math.max(-1, Math.min(1, x)), y: Math.max(-1, Math.min(1, y)) });
      });
    }
    function handleLeave() {
      setPos({ x: 0, y: 0 });
    }

    node.addEventListener("pointermove", handleMove);
    node.addEventListener("pointerleave", handleLeave);
    return () => {
      node.removeEventListener("pointermove", handleMove);
      node.removeEventListener("pointerleave", handleLeave);
      if (frame.current != null) cancelAnimationFrame(frame.current);
    };
  }, [reduced]);

  return { ref, x: reduced ? 0 : pos.x, y: reduced ? 0 : pos.y };
}
