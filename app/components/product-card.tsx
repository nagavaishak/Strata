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

function CardShell({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="market-shell group flex min-h-[248px] flex-col rounded-[22px] border border-border/80 p-4 transition-all duration-200 hover:-translate-y-1 hover:border-status-true/35"
    >
      {children}
    </Link>
  );
}

function MarketCardHeader({
  league,
  homeTeam,
  awayTeam,
  title,
  status,
}: {
  league: string;
  homeTeam: string;
  awayTeam: string;
  title: string;
  status: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{league}</p>
        <p className="mt-2 text-[15px] font-semibold tracking-tight text-foreground">
          {homeTeam} vs {awayTeam}
        </p>
        <h3 className="mt-1 text-lg font-semibold tracking-tight text-foreground">{title}</h3>
      </div>
      <span className="rounded-full border border-border/70 bg-background/45 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground">
        {status}
      </span>
    </div>
  );
}

function MarketCardFooter({
  fill,
  scenario,
}: {
  fill: number;
  scenario: string;
}) {
  return (
    <div className="mt-3 rounded-[18px] border border-border/70 bg-background/35 p-3">
      <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        <span>Capacity used</span>
        <span>{(fill * 100).toFixed(0)}%</span>
      </div>
      <div className="mt-3">
        <CapacityBar fraction={fill} />
      </div>
      <div className="mt-2 line-clamp-2 text-[11px] leading-5 text-muted-foreground">{scenario}</div>
    </div>
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
      <MarketCardHeader
        league={presentation.league}
        homeTeam={presentation.homeTeam}
        awayTeam={presentation.awayTeam}
        title={presentation.marketTitle}
        status={MARKET_STATUS_LABEL[status]}
      />

      <div className="mt-3 rounded-[18px] border border-border/70 bg-background/30 p-3">
        <p className="line-clamp-2 text-[11px] leading-5 text-muted-foreground">{presentation.scenario}</p>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <div className="rounded-[18px] border border-border/70 bg-background/35 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Yes</p>
          <p className="mt-1 text-base font-semibold text-status-true">{bpsToMultiplier(topPayout)}</p>
        </div>
        <div className="rounded-[18px] border border-border/70 bg-background/35 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Pool</p>
          <p className="mt-1 text-base font-semibold text-foreground">{formatSol(entry.data.totalStake)}</p>
        </div>
        <div className="rounded-[18px] border border-border/70 bg-background/35 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Close</p>
          <p className="mt-1 text-sm font-semibold text-foreground">{entry.data.status === "open" ? formatSeconds(secondsLeft) : "Settled"}</p>
        </div>
      </div>

      <MarketCardFooter fill={fill} scenario={presentation.shortScenario} />
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
      <MarketCardHeader
        league={presentation.league}
        homeTeam={presentation.homeTeam}
        awayTeam={presentation.awayTeam}
        title={presentation.marketTitle}
        status={MARKET_STATUS_LABEL[status]}
      />

      <div className="mt-3 rounded-[18px] border border-border/70 bg-background/30 p-3">
        <p className="line-clamp-2 text-[11px] leading-5 text-muted-foreground">{presentation.scenario}</p>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <div className="rounded-[18px] border border-border/70 bg-background/35 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Yes</p>
          <p className="mt-1 text-base font-semibold text-status-true">{bpsToMultiplier(entry.data.payoutBpsIfTrue)}</p>
        </div>
        <div className="rounded-[18px] border border-border/70 bg-background/35 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Pool</p>
          <p className="mt-1 text-base font-semibold text-foreground">{formatSol(entry.data.totalStake)}</p>
        </div>
        <div className="rounded-[18px] border border-border/70 bg-background/35 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Close</p>
          <p className="mt-1 text-sm font-semibold text-foreground">{entry.data.status === "open" ? formatSeconds(secondsLeft) : "Settled"}</p>
        </div>
      </div>

      <MarketCardFooter fill={fill} scenario={presentation.shortScenario} />
    </CardShell>
  );
}
