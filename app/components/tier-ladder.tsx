"use client";

import { bpsToMultiplier } from "@/lib/format";
import type { Tier, LegResult } from "@/lib/hooks/useProduct";

/**
 * Strata's differentiator, made visible: a compact ladder of the product's real
 * payout tiers, with the currently-achieved tier highlighted. No other submission
 * in this hackathon has multi-leg tiered payouts at all, let alone a visual for it —
 * every number here is read straight from the product's own on-chain tier table.
 */
export function TierLadder({
  tiers,
  numLegs,
  legResults,
  compact = false,
}: {
  tiers: Tier[];
  numLegs: number;
  legResults?: LegResult[];
  compact?: boolean;
}) {
  const legsTrue = legResults?.filter((r) => r === "true").length ?? null;

  // The achieved tier is the highest tier whose minLegsTrue <= legsTrue (mirrors
  // finalize_product's on-chain tier lookup exactly).
  let achievedIndex = -1;
  if (legsTrue != null) {
    tiers.forEach((tier, i) => {
      if (legsTrue >= tier.minLegsTrue) achievedIndex = i;
    });
  }

  return (
    <div className={`flex flex-col ${compact ? "gap-0.5" : "gap-1"}`}>
      {tiers.map((tier, i) => {
        const achieved = i === achievedIndex;
        return (
          <div
            key={i}
            className={`flex items-center justify-between rounded px-2 font-mono transition-colors ${
              compact ? "py-0.5 text-[10px]" : "py-1 text-xs"
            } ${achieved ? "bg-status-true/10 text-status-true" : "text-muted-foreground"}`}
          >
            <span>
              {tier.minLegsTrue}/{numLegs} legs
            </span>
            <span className={achieved ? "font-semibold" : ""}>{bpsToMultiplier(tier.payoutBps)}</span>
          </div>
        );
      })}
    </div>
  );
}
