"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { bpsToMultiplier } from "@/lib/format";
import type { ScenarioBubble } from "@/lib/market-collections";

/** A second visual rhythm below the collection boards — reads the marketplace
 * by condition instead of by fixture. Real leg-derived scenario text only. */
export function ScenarioBubbleRow({ scenarios }: { scenarios: ScenarioBubble[] }) {
  if (!scenarios.length) return null;

  return (
    <div className="market-shell rounded-[20px] border border-border/70 p-5">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        <Sparkles className="size-3.5 text-status-true" />
        Popular scenarios
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {scenarios.map((scenario) => (
          <Link
            key={scenario.id}
            href={scenario.href}
            className="group flex items-center gap-2 rounded-full border border-border/60 bg-background/40 py-2 pl-4 pr-2 text-[12px] transition-colors hover:border-status-true/40 hover:bg-status-true/5"
          >
            <span className="text-foreground/90">{scenario.label}</span>
            <span className="rounded-full bg-status-true/10 px-2 py-1 font-mono text-[11px] font-semibold text-status-true">
              {bpsToMultiplier(scenario.payoutBps)}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
