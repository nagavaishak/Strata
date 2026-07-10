"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Tier } from "@/lib/hooks/useProduct";
import { MAX_TIERS } from "@/lib/constants";

export function defaultTiers(numLegs: number): Tier[] {
  if (numLegs <= 0) return [{ minLegsTrue: 0, payoutBps: 0 }];
  const tiers: Tier[] = [{ minLegsTrue: 0, payoutBps: 0 }];
  for (let i = 1; i <= numLegs; i++) {
    tiers.push({ minLegsTrue: i, payoutBps: Math.round((10000 * (i + 1)) / 2) });
  }
  return tiers;
}

export function TierEditor({
  tiers,
  numLegs,
  onChange,
}: {
  tiers: Tier[];
  numLegs: number;
  onChange: (tiers: Tier[]) => void;
}) {
  const update = (i: number, patch: Partial<Tier>) => {
    const next = tiers.slice();
    next[i] = { ...next[i], ...patch };
    onChange(next);
  };
  const remove = (i: number) => onChange(tiers.filter((_, idx) => idx !== i));
  const add = () => onChange([...tiers, { minLegsTrue: 0, payoutBps: 0 }]);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-[1.2fr_1fr_auto] gap-3 px-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        <span>Outcome tier</span>
        <span>Payout</span>
        <span />
      </div>
      {tiers.map((tier, i) => (
        <div key={i} className="grid grid-cols-[1.2fr_1fr_auto] items-center gap-3 rounded-[22px] border border-border/70 bg-background/35 p-3 font-mono text-sm">
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={0}
              max={numLegs}
              value={tier.minLegsTrue}
              onChange={(e) => update(i, { minLegsTrue: Number(e.target.value) })}
              className="h-11 rounded-2xl"
            />
            <span className="text-xs text-muted-foreground">of {numLegs}</span>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={0}
              value={tier.payoutBps}
              onChange={(e) => update(i, { payoutBps: Number(e.target.value) })}
              className="h-11 rounded-2xl"
            />
            <span className="whitespace-nowrap text-xs text-status-true">
              {(tier.payoutBps / 10000).toFixed(2)}x
            </span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="min-h-10 rounded-full px-3 text-status-false"
            onClick={() => remove(i)}
            disabled={tiers.length <= 1}
          >
            Remove
          </Button>
        </div>
      ))}
      {tiers.length < MAX_TIERS && (
        <Button type="button" variant="outline" size="sm" onClick={add} className="min-h-11 rounded-full px-5">
          Add payout tier
        </Button>
      )}
    </div>
  );
}
