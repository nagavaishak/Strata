"use client";

import type { MarketPresentation } from "@/lib/market-presentation";

export function MatchIdentity({
  presentation,
  eyebrow,
}: {
  presentation: MarketPresentation;
  eyebrow?: string;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        <span className="text-status-true">{eyebrow ?? presentation.marketLabel}</span>
        <span>{presentation.sport}</span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            {presentation.marketTitle}
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground">{presentation.context}</p>
        </div>

        <div className="inline-flex w-fit flex-col rounded-[28px] border border-border/70 bg-background/40 px-5 py-4 text-right">
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {presentation.marketLabel}
          </span>
          <span className="mt-2 text-2xl font-semibold text-foreground">{presentation.sport}</span>
        </div>
      </div>
    </div>
  );
}
