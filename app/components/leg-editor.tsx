"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Leg } from "@/lib/hooks/useProduct";
import { MAX_LEGS } from "@/lib/constants";
import { statLabel } from "@/lib/stat-labels";

const COMPARISONS = [
  { value: "greaterThan", label: ">" },
  { value: "lessThan", label: "<" },
  { value: "equalTo", label: "=" },
] as const;

const OPS = [
  { value: "add", label: "+" },
  { value: "subtract", label: "−" },
] as const;

export function emptyLeg(): Leg {
  return {
    statKeyA: 1,
    statKeyB: 0,
    hasSecondStat: false,
    op: "add",
    threshold: 0,
    comparison: "greaterThan",
  };
}

export function LegEditor({
  legs,
  onChange,
}: {
  legs: Leg[];
  onChange: (legs: Leg[]) => void;
}) {
  const update = (i: number, patch: Partial<Leg>) => {
    const next = legs.slice();
    next[i] = { ...next[i], ...patch };
    onChange(next);
  };
  const remove = (i: number) => onChange(legs.filter((_, idx) => idx !== i));
  const add = () => onChange([...legs, emptyLeg()]);

  return (
    <div className="space-y-3">
      {legs.map((leg, i) => (
        <div
          key={i}
          className="rounded-[24px] border border-border/70 bg-background/35 p-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-status-true">Condition {i + 1}</p>
              <p className="mt-2 text-xs text-muted-foreground">Pick the stat keys and threshold that define this outcome.</p>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="min-h-10 rounded-full px-4"
                onClick={() => update(i, { hasSecondStat: !leg.hasSecondStat })}
              >
                {leg.hasSecondStat ? "Single stat" : "Add second stat"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="min-h-10 rounded-full px-4 text-status-false"
                onClick={() => remove(i)}
              >
                Remove
              </Button>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto_1fr_auto_1fr]">
            <div>
              <Label className="text-xs">Stat A key</Label>
              <Input
                type="number"
                value={leg.statKeyA}
                onChange={(e) => update(i, { statKeyA: Number(e.target.value) })}
                className="mt-2 h-11 rounded-2xl font-mono"
              />
              <p className="mt-1 text-[11px] text-status-true">{statLabel(leg.statKeyA)}</p>
            </div>
            {leg.hasSecondStat ? (
              <>
                <div>
                  <Label className="text-xs">Op</Label>
                  <Select value={leg.op} onValueChange={(v) => update(i, { op: v as Leg["op"] })}>
                    <SelectTrigger className="mt-2 h-11 w-20 rounded-2xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {OPS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Stat B key</Label>
                  <Input
                    type="number"
                    value={leg.statKeyB}
                    onChange={(e) => update(i, { statKeyB: Number(e.target.value) })}
                    className="mt-2 h-11 rounded-2xl font-mono"
                  />
                  <p className="mt-1 text-[11px] text-status-true">{statLabel(leg.statKeyB)}</p>
                </div>
              </>
            ) : (
              <div className="hidden md:block" />
            )}
            <div>
              <Label className="text-xs">Comparison</Label>
              <Select
                value={leg.comparison}
                onValueChange={(v) => update(i, { comparison: v as Leg["comparison"] })}
              >
                <SelectTrigger className="mt-2 h-11 w-24 rounded-2xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COMPARISONS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Threshold</Label>
              <Input
                type="number"
                value={leg.threshold}
                onChange={(e) => update(i, { threshold: Number(e.target.value) })}
                className="mt-2 h-11 rounded-2xl font-mono"
              />
            </div>
          </div>
        </div>
      ))}
      {legs.length < MAX_LEGS && (
        <Button type="button" variant="outline" size="sm" onClick={add} className="min-h-11 rounded-full px-5">
          Add condition ({legs.length}/{MAX_LEGS})
        </Button>
      )}
    </div>
  );
}
