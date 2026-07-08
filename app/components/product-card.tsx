"use client";

import Link from "next/link";
import { statLabel } from "@/lib/stat-labels";
import { formatSol, capacityFillFraction, bpsToMultiplier, formatSeconds } from "@/lib/format";
import { useCountdown } from "@/lib/hooks/useCountdown";
import { RollingNumber } from "@/components/rolling-number";
import { TierLadder } from "@/components/tier-ladder";
import { deriveMarketStatus, MARKET_STATUS_LABEL, MARKET_STATUS_COLOR } from "@/lib/market-status";
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
  statusLabel,
  statusColor,
  children,
}: {
  href: string;
  statusLabel: string;
  statusColor: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group relative flex flex-col gap-3 overflow-hidden rounded-lg border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-foreground/30"
    >
      <span className={`absolute right-4 top-4 text-[11px] font-medium ${statusColor}`}>{statusLabel}</span>
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
  const status = deriveMarketStatus({ status: data.status, closesAt: data.closesAt, live });
  const topPayoutBps = data.tiers.reduce((max, t) => Math.max(max, t.payoutBps), 0);

  return (
    <CardShell href={href} statusLabel={MARKET_STATUS_LABEL[status]} statusColor={MARKET_STATUS_COLOR[status]}>
      <div>
        <p className="text-sm font-semibold text-foreground">Fixture {data.fixtureId.toString()}</p>
        <p className="text-xs text-muted-foreground">Structured market · {data.numLegs} legs</p>
      </div>

      <p className="text-2xl font-semibold text-status-true">
        up to {bpsToMultiplier(topPayoutBps)}
      </p>

      <div className="flex flex-col gap-1 text-xs text-foreground">
        {data.legs.slice(0, 2).map((leg, i) => (
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
        {data.legs.length > 2 && (
          <span className="text-[10px] text-muted-foreground">+{data.legs.length - 2} more</span>
        )}
      </div>

      <TierLadder tiers={data.tiers} numLegs={data.numLegs} legResults={data.legResults} compact />

      <div className="mt-auto flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>capacity</span>
          <RollingNumber value={fill * 100} format={(n) => `${n.toFixed(0)}%`} className="font-mono" />
        </div>
        <CapacityBar fraction={fill} />
        <div className="flex items-center justify-between text-[10px]">
          <span className="font-mono text-status-true">{formatSol(data.totalStake)} SOL staked</span>
          <span className="text-muted-foreground">
            {isOpen
              ? secondsLeft > 0
                ? `closes in ${formatSeconds(secondsLeft)}`
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
  const status = deriveMarketStatus({ status: data.status, closesAt: data.closesAt, live });

  return (
    <CardShell href={href} statusLabel={MARKET_STATUS_LABEL[status]} statusColor={MARKET_STATUS_COLOR[status]}>
      <div>
        <p className="text-sm font-semibold text-foreground">Fixture {data.fixtureId.toString()}</p>
        <p className="text-xs text-muted-foreground">Exact-outcome market</p>
      </div>

      <p className="text-2xl font-semibold text-status-true">up to {bpsToMultiplier(data.payoutBpsIfTrue)}</p>

      <p className="text-xs text-foreground">
        predict {statLabel(data.statKeyA)} = {data.predictionA}, {statLabel(data.statKeyB)} ={" "}
        {data.predictionB}
      </p>

      <div className="mt-auto flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>capacity</span>
          <RollingNumber value={fill * 100} format={(n) => `${n.toFixed(0)}%`} className="font-mono" />
        </div>
        <CapacityBar fraction={fill} />
        <div className="flex items-center justify-between text-[10px]">
          <span className="font-mono text-status-true">{formatSol(data.totalStake)} SOL staked</span>
          <span className="text-muted-foreground">
            {isOpen
              ? secondsLeft > 0
                ? `closes in ${formatSeconds(secondsLeft)}`
                : "awaiting settlement"
              : `settled · ${data.finalPayoutBps > 0 ? bpsToMultiplier(data.finalPayoutBps) : "0x"}`}
          </span>
        </div>
      </div>
    </CardShell>
  );
}
