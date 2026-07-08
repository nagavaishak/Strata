"use client";

import { Button } from "@/components/ui/button";
import type { Leg, LegResult } from "@/lib/hooks/useProduct";
import { useSettleLeg } from "@/lib/hooks/useSettlement";
import { PublicKey } from "@solana/web3.js";
import { statLabel } from "@/lib/stat-labels";

const RESULT_LABEL: Record<LegResult, string> = {
  unsettled: "pending",
  true: "true",
  false: "false",
};

function describeLeg(leg: Leg): string {
  const cmp = leg.comparison === "greaterThan" ? ">" : leg.comparison === "lessThan" ? "<" : "=";
  if (leg.hasSecondStat) {
    const op = leg.op === "add" ? "+" : "−";
    return `${statLabel(leg.statKeyA)} ${op} ${statLabel(leg.statKeyB)} ${cmp} ${leg.threshold}`;
  }
  return `${statLabel(leg.statKeyA)} ${cmp} ${leg.threshold}`;
}

export function LegStatusList({
  product,
  legs,
  legResults,
  closesAtUnixSeconds,
  canSettle,
}: {
  product: PublicKey;
  legs: Leg[];
  legResults: LegResult[];
  closesAtUnixSeconds: number;
  canSettle: boolean;
}) {
  const settleLeg = useSettleLeg();

  return (
    <div className="space-y-2">
      {legs.map((leg, i) => {
        const result = legResults[i] ?? "unsettled";
        return (
          <div
            key={i}
            className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 font-mono text-sm"
          >
            <span
              className={`h-2 w-2 rounded-full ${
                result === "true"
                  ? "bg-status-true"
                  : result === "false"
                    ? "bg-status-false"
                    : "bg-status-pending"
              }`}
            />
            <span className="text-muted-foreground">leg {i}</span>
            <span>{describeLeg(leg)}</span>
            <span
              className={`ml-2 ${
                result === "true"
                  ? "text-status-true"
                  : result === "false"
                    ? "text-status-false"
                    : "text-status-pending"
              }`}
            >
              {RESULT_LABEL[result]}
            </span>
            {result === "unsettled" && canSettle && (
              <Button
                size="sm"
                variant="outline"
                className="ml-auto"
                disabled={settleLeg.isPending}
                onClick={() =>
                  settleLeg.mutate({ product, legIndex: i, leg, closesAtUnixSeconds })
                }
              >
                {leg.hasSecondStat
                  ? "binary leg — use scripts to settle"
                  : settleLeg.isPending
                    ? "settling…"
                    : "Settle now"}
              </Button>
            )}
          </div>
        );
      })}
      {settleLeg.isError && (
        <p className="font-mono text-xs text-status-false">{(settleLeg.error as Error).message}</p>
      )}
    </div>
  );
}
