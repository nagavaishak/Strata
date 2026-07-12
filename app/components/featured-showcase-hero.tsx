"use client";

import { ArrowRight } from "lucide-react";
import { FEATURED_SHOWCASE } from "@/lib/featured-showcase-data";
import { MarketBadge } from "@/components/market-badge";

function TeamBadge({ initials, side }: { initials: string; side: "home" | "away" }) {
  return (
    <div
      className={`flex size-14 items-center justify-center rounded-2xl border text-lg font-bold tracking-tight ${
        side === "home"
          ? "border-status-true/30 bg-status-true/10 text-status-true"
          : "border-white/15 bg-white/5 text-white"
      }`}
    >
      {initials}
    </div>
  );
}

/** Showcase-only hero card — see lib/featured-showcase-data.ts for why this is the
 * one place on /markets allowed to show a match name. CTA scrolls to the real grid,
 * it never links into a specific (fake) product page. */
export function FeaturedShowcaseHero() {
  const data = FEATURED_SHOWCASE;

  const scrollToGrid = () => {
    document.getElementById("markets-grid")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-[24px] border border-border/70 p-6 sm:p-8">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(115deg, color-mix(in srgb, var(--accent-from) 20%, var(--background)) 0%, var(--background) 45%, color-mix(in srgb, var(--accent-to) 16%, var(--background)) 100%)",
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent 0 38px, currentColor 38px 39px), repeating-linear-gradient(90deg, transparent 0 38px, currentColor 38px 39px)",
        }}
      />

      <div className="relative flex items-center justify-between">
        <MarketBadge variant="featured" />
        <MarketBadge variant="live" />
      </div>

      <div className="relative mt-6 flex items-center gap-4">
        <TeamBadge initials={data.homeInitials} side="home" />
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {data.league}
          </span>
          <span className="mt-1 text-[11px] font-medium text-status-pending">{data.minute}</span>
        </div>
        <TeamBadge initials={data.awayInitials} side="away" />
      </div>

      <h2 className="relative mt-6 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
        {data.title}
      </h2>
      <p className="relative mt-2 text-sm font-medium text-status-true">{data.payoutHighlight}</p>

      <div className="relative mt-6 flex flex-1 flex-col gap-2">
        {data.scenarios.map((scenario) => (
          <div
            key={scenario.label}
            className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-sm transition-colors ${
              scenario.highlighted
                ? "border-status-true/40 bg-status-true/10 text-foreground"
                : "border-border/60 bg-background/40 text-muted-foreground"
            }`}
          >
            <span className={scenario.highlighted ? "font-semibold" : ""}>{scenario.label}</span>
            <span className={`font-mono ${scenario.highlighted ? "text-status-true" : "text-foreground"}`}>
              {scenario.odds}
            </span>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={scrollToGrid}
        className="btn-gradient relative mt-6 inline-flex w-fit items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold"
      >
        Browse live markets
        <ArrowRight className="size-4" />
      </button>
    </div>
  );
}
