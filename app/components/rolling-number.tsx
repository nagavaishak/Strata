"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Animated counter — the "Robinhood trick": numbers visibly roll from the old
 * value to the new one instead of snapping, which is specifically what makes an
 * interface read as alive rather than a static spreadsheet. Pure requestAnimationFrame
 * interpolation, no new dependency.
 */
export function RollingNumber({
  value,
  format = (n: number) => n.toFixed(0),
  durationMs = 500,
  className,
}: {
  value: number;
  format?: (n: number) => string;
  durationMs?: number;
  className?: string;
}) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const from = fromRef.current;
    const to = value;
    if (from === to) return;

    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / durationMs);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (to - from) * eased);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, durationMs]);

  return <span className={`tabular-nums ${className ?? ""}`}>{format(display)}</span>;
}
