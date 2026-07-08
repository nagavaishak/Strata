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
    <div className="space-y-2">
      <div className="grid grid-cols-[1fr_1fr_auto] gap-2 font-mono text-xs text-muted-foreground">
        <span>legs true ≥</span>
        <span>payout</span>
        <span />
      </div>
      {tiers.map((tier, i) => (
        <div key={i} className="grid grid-cols-[1fr_1fr_auto] items-center gap-2 font-mono text-sm">
          <Input
            type="number"
            min={0}
            max={numLegs}
            value={tier.minLegsTrue}
            onChange={(e) => update(i, { minLegsTrue: Number(e.target.value) })}
          />
          <div className="flex items-center gap-1">
            <Input
              type="number"
              min={0}
              value={tier.payoutBps}
              onChange={(e) => update(i, { payoutBps: Number(e.target.value) })}
            />
            <span className="whitespace-nowrap text-xs text-muted-foreground">
              = {(tier.payoutBps / 10000).toFixed(2)}x
            </span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-status-false"
            onClick={() => remove(i)}
            disabled={tiers.length <= 1}
          >
            ×
          </Button>
        </div>
      ))}
      {tiers.length < MAX_TIERS && (
        <Button type="button" variant="outline" size="sm" onClick={add}>
          + add tier
        </Button>
      )}
    </div>
  );
}
