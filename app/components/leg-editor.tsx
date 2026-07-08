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
          className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-3 font-mono text-sm"
        >
          <span className="text-muted-foreground">leg {i}</span>
          <Label className="sr-only">stat key A</Label>
          <Input
            type="number"
            value={leg.statKeyA}
            onChange={(e) => update(i, { statKeyA: Number(e.target.value) })}
            className="w-20"
            placeholder="stat A"
          />
          {leg.hasSecondStat && (
            <>
              <Select value={leg.op} onValueChange={(v) => update(i, { op: v as Leg["op"] })}>
                <SelectTrigger className="w-16">
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
              <Input
                type="number"
                value={leg.statKeyB}
                onChange={(e) => update(i, { statKeyB: Number(e.target.value) })}
                className="w-20"
                placeholder="stat B"
              />
            </>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => update(i, { hasSecondStat: !leg.hasSecondStat })}
          >
            {leg.hasSecondStat ? "− 2nd stat" : "+ 2nd stat"}
          </Button>
          <Select
            value={leg.comparison}
            onValueChange={(v) => update(i, { comparison: v as Leg["comparison"] })}
          >
            <SelectTrigger className="w-16">
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
          <Input
            type="number"
            value={leg.threshold}
            onChange={(e) => update(i, { threshold: Number(e.target.value) })}
            className="w-20"
            placeholder="threshold"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="ml-auto text-status-false"
            onClick={() => remove(i)}
          >
            remove
          </Button>
        </div>
      ))}
      {legs.length < MAX_LEGS && (
        <Button type="button" variant="outline" size="sm" onClick={add}>
          + add leg ({legs.length}/{MAX_LEGS})
        </Button>
      )}
    </div>
  );
}
