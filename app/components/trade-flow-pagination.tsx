"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

export function TradeFlowPagination({
  total,
  current,
  onChange,
}: {
  total: number;
  current: number;
  onChange: (index: number) => void;
}) {
  return (
    <div className="flex items-center justify-center gap-4">
      <button
        type="button"
        aria-label="Previous step"
        onClick={() => onChange((current - 1 + total) % total)}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-border/70 bg-card/60 text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
      </button>

      <div className="flex items-center gap-2">
        {Array.from({ length: total }).map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Go to step ${i + 1}`}
            onClick={() => onChange(i)}
            className={`h-1.5 rounded-full transition-all ${
              i === current ? "w-6 bg-status-true" : "w-1.5 bg-border hover:bg-muted-foreground"
            }`}
          />
        ))}
      </div>

      <button
        type="button"
        aria-label="Next step"
        onClick={() => onChange((current + 1) % total)}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-border/70 bg-card/60 text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronRight className="size-4" />
      </button>
    </div>
  );
}
