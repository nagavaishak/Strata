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
        <span>{presentation.league}</span>
        <span>{presentation.kickoffLabel}</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            {presentation.homeTeam} vs {presentation.awayTeam}
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            {presentation.marketTitle}
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-muted-foreground">{presentation.context}</p>
        </div>

        <div className="grid min-w-[340px] gap-4 rounded-[26px] border border-border/70 bg-background/40 px-5 py-5">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center text-center">
            <div className="flex flex-col items-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full border border-border/70 bg-card/75 text-lg font-semibold text-foreground">
                {presentation.homeTeam.slice(0, 2)}
              </div>
              <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{presentation.sport}</p>
              <p className="mt-1 text-2xl font-semibold text-foreground">{presentation.homeTeam}</p>
            </div>
            <span className="px-4 text-sm text-muted-foreground">vs</span>
            <div className="flex flex-col items-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full border border-border/70 bg-card/75 text-lg font-semibold text-foreground">
                {presentation.awayTeam.slice(0, 2)}
              </div>
              <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{presentation.category}</p>
              <p className="mt-1 text-2xl font-semibold text-foreground">{presentation.awayTeam}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
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
