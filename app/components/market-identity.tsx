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
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        <span className="text-status-true">{eyebrow ?? presentation.marketLabel}</span>
        <span>{presentation.sport}</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            {presentation.marketTitle}
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-muted-foreground">{presentation.context}</p>
        </div>

        <div className="grid min-w-[340px] gap-4 rounded-[26px] border border-border/70 bg-background/40 px-5 py-5">
          <div className="grid gap-3">
            <div className="rounded-[18px] border border-border/60 bg-card/55 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Market type</p>
              <p className="mt-2 text-sm font-semibold text-foreground">{presentation.marketLabel}</p>
            </div>
            <div className="rounded-[18px] border border-border/60 bg-card/55 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Scenario</p>
              <p className="mt-2 text-sm font-semibold text-foreground">{presentation.shortScenario}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
