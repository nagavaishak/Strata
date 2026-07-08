"use client";

import Link from "next/link";
import { statLabel } from "@/lib/stat-labels";
import { formatSol, capacityFillFraction, bpsToMultiplier } from "@/lib/format";
import { useCountdown } from "@/lib/hooks/useCountdown";
import { RollingNumber } from "@/components/rolling-number";
import { TierLadder } from "@/components/tier-ladder";
import type { ProductListEntry, GeoProductListEntry } from "@/lib/hooks/useAllProducts";

function legLine(leg: {
  statKeyA: number;
  statKeyB: number;
  hasSecondStat: boolean;
  op: "add" | "subtract";
  threshold: number;
  comparison: "greaterThan" | "lessThan" | "equalTo";
}): string {
  const cmp = leg.comparison === "greaterThan" ? ">" : leg.comparison === "lessThan" ? "<" : "=";
  if (leg.hasSecondStat) {
    const op = leg.op === "add" ? "+" : "−";
    return `${statLabel(leg.statKeyA)} ${op} ${statLabel(leg.statKeyB)} ${cmp} ${leg.threshold}`;
  }
  return `${statLabel(leg.statKeyA)} ${cmp} ${leg.threshold}`;
}

function CapacityBar({ fraction }: { fraction: number }) {
  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-secondary">
      <div
        className="h-full rounded-full transition-[width] duration-500"
        style={{
          width: `${fraction * 100}%`,
          backgroundImage: "linear-gradient(90deg, var(--accent-from), var(--accent-to))",
        }}
      />
    </div>
  );
}

function CardShell({
  href,
  live,
  children,
}: {
  href: string;
  live?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group relative flex flex-col gap-2.5 overflow-hidden rounded-lg border border-border bg-card p-3 transition-colors hover:border-foreground/30"
    >
      {live && (
        <span className="glow-dot absolute right-3 top-3 h-1.5 w-1.5 rounded-full bg-status-true" />
      )}
      {children}
    </Link>
  );
}

export function TieredProductCard({
  entry,
  live,
}: {
  entry: ProductListEntry;
  live?: boolean;
}) {
  const { address, data } = entry;
  const secondsLeft = useCountdown(Number(data.closesAt));
  const isOpen = data.status === "open";
  const href = isOpen ? `/watch/${address.toBase58()}` : `/verify/${address.toBase58()}`;
  const fill = capacityFillFraction(data.totalStake, data.maxCapacity);

  return (
    <CardShell href={href} live={live}>
      <div className="flex items-center gap-2 font-mono text-[10px] text-muted-foreground">
        <span className="rounded-full border border-border px-2 py-0.5 text-status-true">tiered</span>
        <span>fixture {data.fixtureId.toString()}</span>
      </div>

      <div className="flex flex-col gap-1 font-mono text-xs text-foreground">
        {data.legs.slice(0, 3).map((leg, i) => (
          <div key={i} className="flex items-center gap-1.5 truncate">
            <span
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                data.legResults[i] === "true"
                  ? "bg-status-true"
                  : data.legResults[i] === "false"
                    ? "bg-status-false"
                    : "bg-status-pending"
              }`}
            />
            <span className="truncate">{legLine(leg)}</span>
          </div>
        ))}
        {data.legs.length > 3 && (
          <span className="text-[10px] text-muted-foreground">+{data.legs.length - 3} more</span>
        )}
      </div>

      <TierLadder tiers={data.tiers} numLegs={data.numLegs} legResults={data.legResults} compact />

      <div className="mt-auto flex flex-col gap-1.5">
        <div className="flex items-center justify-between font-mono text-[10px] text-muted-foreground">
          <span>capacity</span>
          <RollingNumber value={fill * 100} format={(n) => `${n.toFixed(0)}%`} />
        </div>
        <CapacityBar fraction={fill} />
        <div className="flex items-center justify-between font-mono text-[10px]">
          <span className="text-status-true">{formatSol(data.totalStake)} SOL staked</span>
          <span className="text-muted-foreground">
            {isOpen
              ? secondsLeft > 0
                ? `closes in ${Math.ceil(secondsLeft / 60)}m`
                : "awaiting settlement"
              : `settled · ${bpsToMultiplier(data.finalPayoutBps)}`}
          </span>
        </div>
      </div>
    </CardShell>
  );
}

export function GeoProductCard({
  entry,
  live,
}: {
  entry: GeoProductListEntry;
  live?: boolean;
}) {
  const { address, data } = entry;
  const secondsLeft = useCountdown(Number(data.closesAt));
  const isOpen = data.status === "open";
  const href = isOpen ? `/watch/geo/${address.toBase58()}` : `/verify/geo/${address.toBase58()}`;
  const fill = capacityFillFraction(data.totalStake, data.maxCapacity);

  return (
    <CardShell href={href} live={live}>
      <div className="flex items-center gap-2 font-mono text-[10px] text-muted-foreground">
        <span className="rounded-full border border-border px-2 py-0.5 text-status-pending">
          exact-outcome
        </span>
        <span>fixture {data.fixtureId.toString()}</span>
      </div>

      <p className="font-mono text-xs text-foreground">
        predict {statLabel(data.statKeyA)} = {data.predictionA}, {statLabel(data.statKeyB)} ={" "}
        {data.predictionB}
      </p>

      <div className="mt-auto flex flex-col gap-1.5">
        <div className="flex items-center justify-between font-mono text-[10px] text-muted-foreground">
          <span>capacity</span>
          <RollingNumber value={fill * 100} format={(n) => `${n.toFixed(0)}%`} />
        </div>
        <CapacityBar fraction={fill} />
        <div className="flex items-center justify-between font-mono text-[10px]">
          <span className="text-status-true">{formatSol(data.totalStake)} SOL staked</span>
          <span className="text-muted-foreground">
            {isOpen
              ? secondsLeft > 0
                ? `closes in ${Math.ceil(secondsLeft / 60)}m`
                : "awaiting settlement"
              : `settled · ${data.finalPayoutBps > 0 ? bpsToMultiplier(data.finalPayoutBps) : "0x"}`}
          </span>
        </div>
      </div>
    </CardShell>
  );
}
