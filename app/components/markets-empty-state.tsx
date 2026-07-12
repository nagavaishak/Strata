"use client";

import { SearchX } from "lucide-react";

export function MarketsEmptyState({
  onShowTrending,
  onClearSearch,
  hasQuery,
}: {
  onShowTrending: () => void;
  onClearSearch: () => void;
  hasQuery: boolean;
}) {
  return (
    <div className="market-shell relative overflow-hidden rounded-[20px] border border-border/70 px-8 py-14 text-center">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent 0 38px, currentColor 38px 39px), repeating-linear-gradient(90deg, transparent 0 38px, currentColor 38px 39px)",
        }}
      />
      <div className="relative mx-auto flex size-12 items-center justify-center rounded-2xl border border-border/70 bg-background/50">
        <SearchX className="size-5 text-muted-foreground" />
      </div>
      <p className="relative mt-5 text-base font-semibold text-foreground">No markets match that yet</p>
      <p className="relative mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
        Try a different search, or jump back into everything that's trending right now.
      </p>
      <div className="relative mt-6 flex flex-wrap items-center justify-center gap-2">
        {hasQuery && (
          <button
            type="button"
            onClick={onClearSearch}
            className="rounded-full border border-border/60 px-4 py-2 text-xs font-semibold text-foreground transition-colors hover:border-status-true/40"
          >
            Clear search
          </button>
        )}
        <button
          type="button"
          onClick={onShowTrending}
          className="btn-gradient rounded-full px-4 py-2 text-xs font-semibold"
        >
          Show trending markets
        </button>
      </div>
    </div>
  );
}
