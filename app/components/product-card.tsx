"use client";

import Link from "next/link";
import { bpsToMultiplier, capacityFillFraction, formatSeconds, formatSol } from "@/lib/format";
import { deriveMarketStatus, MARKET_STATUS_LABEL } from "@/lib/market-status";
import type { GeoProductListEntry, ProductListEntry } from "@/lib/hooks/useAllProducts";
import { getGeoMarketPresentation, getTieredMarketPresentation } from "@/lib/market-presentation";
import { useCountdown } from "@/lib/hooks/useCountdown";

function CapacityBar({ fraction }: { fraction: number }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
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
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="market-shell group flex min-h-[360px] flex-col rounded-[30px] border border-border/80 p-5 transition-all duration-200 hover:-translate-y-1 hover:border-foreground/25"
    >
      {children}
    </Link>
  );
}

export function TieredProductCard({ entry, live }: { entry: ProductListEntry; live?: boolean }) {
  const presentation = getTieredMarketPresentation(entry.data);
  const secondsLeft = useCountdown(Number(entry.data.closesAt));
  const fill = capacityFillFraction(entry.data.totalStake, entry.data.maxCapacity);
  const topPayout = Math.max(...entry.data.tiers.map((tier) => tier.payoutBps));
  const status = deriveMarketStatus({ status: entry.data.status, closesAt: entry.data.closesAt, live });
  const href = entry.data.status === "open" ? `/watch/${entry.address.toBase58()}` : `/verify/${entry.address.toBase58()}`;

  return (
    <CardShell href={href}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-status-true">{presentation.league}</p>
          <h3 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">{presentation.marketTitle}</h3>
          <p className="mt-2 text-sm text-muted-foreground">{presentation.homeTeam} vs {presentation.awayTeam}</p>
        </div>
        <span className="rounded-full border border-border/70 bg-background/45 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground">
          {MARKET_STATUS_LABEL[status]}
        </span>
      </div>

      <div className="mt-6 rounded-[24px] border border-border/70 bg-background/35 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Scenario</p>
        <p className="mt-2 text-sm leading-7 text-muted-foreground">{presentation.scenario}</p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-[22px] border border-border/70 bg-background/35 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Top payout</p>
          <p className="mt-2 text-2xl font-semibold text-status-true">{bpsToMultiplier(topPayout)}</p>
        </div>
        <div className="rounded-[22px] border border-border/70 bg-background/35 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Stake pool</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{formatSol(entry.data.totalStake)} SOL</p>
        </div>
      </div>

      <div className="mt-4 rounded-[24px] border border-border/70 bg-background/35 p-4">
        <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          <span>Capacity used</span>
          <span>{(fill * 100).toFixed(0)}%</span>
        </div>
        <div className="mt-3">
          <CapacityBar fraction={fill} />
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          <span>{presentation.shortScenario}</span>
          <span>{entry.data.status === "open" ? formatSeconds(secondsLeft) : "Settled"}</span>
        </div>
      </div>
    </CardShell>
  );
}

export function GeoProductCard({ entry, live }: { entry: GeoProductListEntry; live?: boolean }) {
  const presentation = getGeoMarketPresentation(entry.data);
  const secondsLeft = useCountdown(Number(entry.data.closesAt));
  const fill = capacityFillFraction(entry.data.totalStake, entry.data.maxCapacity);
  const status = deriveMarketStatus({ status: entry.data.status, closesAt: entry.data.closesAt, live });
  const href = entry.data.status === "open" ? `/watch/geo/${entry.address.toBase58()}` : `/verify/geo/${entry.address.toBase58()}`;

  return (
    <CardShell href={href}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-status-true">{presentation.league}</p>
          <h3 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">{presentation.marketTitle}</h3>
          <p className="mt-2 text-sm text-muted-foreground">{presentation.homeTeam} vs {presentation.awayTeam}</p>
        </div>
        <span className="rounded-full border border-border/70 bg-background/45 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground">
          {MARKET_STATUS_LABEL[status]}
        </span>
      </div>

      <div className="mt-6 rounded-[24px] border border-border/70 bg-background/35 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Scenario</p>
        <p className="mt-2 text-sm leading-7 text-muted-foreground">{presentation.scenario}</p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-[22px] border border-border/70 bg-background/35 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Exact payout</p>
          <p className="mt-2 text-2xl font-semibold text-status-true">{bpsToMultiplier(entry.data.payoutBpsIfTrue)}</p>
        </div>
        <div className="rounded-[22px] border border-border/70 bg-background/35 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Stake pool</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{formatSol(entry.data.totalStake)} SOL</p>
        </div>
      </div>

      <div className="mt-4 rounded-[24px] border border-border/70 bg-background/35 p-4">
        <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          <span>Capacity used</span>
          <span>{(fill * 100).toFixed(0)}%</span>
        </div>
        <div className="mt-3">
          <CapacityBar fraction={fill} />
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          <span>{presentation.shortScenario}</span>
          <span>{entry.data.status === "open" ? formatSeconds(secondsLeft) : "Settled"}</span>
        </div>
      </div>
    </CardShell>
  );
}
