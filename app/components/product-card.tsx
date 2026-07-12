"use client";

import Link from "next/link";
import { bpsToMultiplier, capacityFillFraction, formatSeconds, formatSol } from "@/lib/format";
import { deriveMarketStatus, MARKET_STATUS_LABEL, type MarketStatus } from "@/lib/market-status";
import type { GeoProductListEntry, ProductListEntry } from "@/lib/hooks/useAllProducts";
import { getGeoMarketPresentation, getTieredMarketPresentation, type MarketPresentation } from "@/lib/market-presentation";
import { useCountdown } from "@/lib/hooks/useCountdown";
import { MarketBadge } from "@/components/market-badge";

export type CardSize = "large" | "medium" | "compact";

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

const STATUS_BORDER: Record<MarketStatus, string> = {
  open: "border-l-border",
  "closing-soon": "border-l-status-pending/70",
  live: "border-l-status-true/70",
  settling: "border-l-status-pending/70",
  settled: "border-l-border",
};

function CardShell({
  href,
  size,
  status,
  children,
}: {
  href: string;
  size: CardSize;
  status?: MarketStatus;
  children: React.ReactNode;
}) {
  const minHeight = size === "large" ? "min-h-[380px]" : size === "compact" ? "min-h-[132px]" : "min-h-[218px]";
  const padding = size === "large" ? "p-5" : "p-3";
  const compactAccent = size === "compact" && status ? `border-l-2 ${STATUS_BORDER[status]}` : "";
  return (
    <Link
      href={href}
      className={`market-shell group relative flex ${minHeight} flex-col overflow-hidden rounded-[18px] border border-border/80 ${padding} ${compactAccent} transition-all duration-200 hover:-translate-y-0.5 hover:border-status-true/35`}
    >
      {size === "large" && (
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, transparent 0 34px, currentColor 34px 35px), repeating-linear-gradient(90deg, transparent 0 34px, currentColor 34px 35px)",
          }}
        />
      )}
      <div className="relative flex h-full flex-col">{children}</div>
    </Link>
  );
}

function MarketCardHeader({
  sport,
  marketLabel,
  title,
  status,
}: {
  sport: string;
  marketLabel: string;
  title: string;
  status: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{sport}</p>
        <p className="mt-2 text-[13px] font-semibold tracking-tight text-foreground">{title}</p>
        <h3 className="mt-1 text-[12px] font-medium tracking-tight text-muted-foreground">{marketLabel}</h3>
      </div>
      <span className="rounded-full border border-border/70 bg-background/45 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-status-true">
        {status}
      </span>
    </div>
  );
}

function MarketCardFooter({ fill, scenario }: { fill: number; scenario: string }) {
  return (
    <div className="mt-3 rounded-[18px] border border-border/70 bg-background/35 p-3">
      <div className="flex items-center justify-between text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        <span>Pool depth</span>
        <span>{(fill * 100).toFixed(0)}%</span>
      </div>
      <div className="mt-3">
        <CapacityBar fraction={fill} />
      </div>
      <div className="mt-2 line-clamp-2 text-[10px] leading-4.5 text-muted-foreground">{scenario}</div>
    </div>
  );
}

interface CardData {
  presentation: MarketPresentation;
  status: MarketStatus;
  topPayoutBps: number;
  fill: number;
  totalStakeLabel: string;
  tierRows?: { label: string; payout: string }[];
  secondsLeftLabel: string;
}

function LargeCardBody({ data }: { data: CardData }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {data.presentation.sport} · {data.presentation.marketLabel}
          </p>
          <p className="mt-2 text-xl font-semibold tracking-tight text-foreground">{data.presentation.marketTitle}</p>
        </div>
        <MarketBadge variant={data.status} />
      </div>

      <p className="mt-3 text-sm leading-6 text-muted-foreground">{data.presentation.scenario}</p>

      <div className="mt-4 rounded-2xl border border-status-true/30 bg-status-true/10 px-4 py-3">
        <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-status-true/80">Top payout</p>
        <p className="mt-1 text-2xl font-semibold text-status-true">Up to {bpsToMultiplier(data.topPayoutBps)}</p>
      </div>

      {data.tierRows && (
        <div className="mt-3 flex flex-col gap-1.5">
          {data.tierRows.map((tier) => (
            <div
              key={tier.label}
              className="flex items-center justify-between rounded-xl border border-border/60 bg-background/35 px-3 py-2 text-[11px]"
            >
              <span className="text-muted-foreground">{tier.label}</span>
              <span className="font-mono font-semibold text-foreground">{tier.payout}</span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-auto flex items-center justify-between pt-4 text-[11px] text-muted-foreground">
        <span>{data.totalStakeLabel} pool</span>
        <span>{data.secondsLeftLabel}</span>
      </div>
      <div className="mt-2">
        <CapacityBar fraction={data.fill} />
      </div>
    </div>
  );
}

function CompactCardBody({ data }: { data: CardData }) {
  return (
    <div className="flex h-full flex-col justify-between">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[12px] font-semibold tracking-tight text-foreground">{data.presentation.marketTitle}</p>
        <MarketBadge variant={data.status} className="shrink-0" />
      </div>
      <div className="flex items-end justify-between">
        <span className="text-[13px] font-semibold text-status-true">Up to {bpsToMultiplier(data.topPayoutBps)}</span>
        <span className="text-[10px] text-muted-foreground">{data.secondsLeftLabel}</span>
      </div>
    </div>
  );
}

function MediumCardBody({
  entry,
  presentation,
  status,
  topPayoutBps,
  live,
  secondsLeft,
  fill,
}: {
  entry: ProductListEntry | GeoProductListEntry;
  presentation: MarketPresentation;
  status: MarketStatus;
  topPayoutBps: number;
  live?: boolean;
  secondsLeft: number;
  fill: number;
}) {
  return (
    <>
      <MarketCardHeader
        sport={presentation.sport}
        marketLabel={presentation.marketLabel}
        title={presentation.marketTitle}
        status={MARKET_STATUS_LABEL[status]}
      />

      <div className="mt-2 text-[10px] leading-5 text-muted-foreground">{presentation.scenario}</div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-[14px] border border-border/70 bg-background/35 p-2.5">
          <p className="text-[8px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Yes</p>
          <p className="mt-1 text-[13px] font-semibold text-status-true">Up to {bpsToMultiplier(topPayoutBps)}</p>
        </div>
        <div className="rounded-[14px] border border-border/70 bg-background/35 p-2.5">
          <p className="text-[8px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{live ? "Live" : "Close"}</p>
          <p className="mt-1 text-[12px] font-semibold text-foreground">
            {entry.data.status === "open" ? formatSeconds(secondsLeft) : "Settled"}
          </p>
        </div>
      </div>

      <div className="mt-2 text-[9px] text-muted-foreground">{formatSol(entry.data.totalStake)} SOL pool</div>

      <MarketCardFooter fill={fill} scenario={presentation.shortScenario} />
    </>
  );
}

export function TieredProductCard({
  entry,
  live,
  size = "medium",
}: {
  entry: ProductListEntry;
  live?: boolean;
  size?: CardSize;
}) {
  const presentation = getTieredMarketPresentation(entry.data);
  const secondsLeft = useCountdown(Number(entry.data.closesAt));
  const fill = capacityFillFraction(entry.data.totalStake, entry.data.maxCapacity);
  const topPayout = entry.data.tiers.length ? Math.max(...entry.data.tiers.map((tier) => tier.payoutBps)) : 0;
  const status = deriveMarketStatus({ status: entry.data.status, closesAt: entry.data.closesAt, live });
  const href = entry.data.status === "open" ? `/watch/${entry.address.toBase58()}` : `/verify/${entry.address.toBase58()}`;

  if (size === "large") {
    return (
      <CardShell href={href} size={size} status={status}>
        <LargeCardBody
          data={{
            presentation,
            status,
            topPayoutBps: topPayout,
            fill,
            totalStakeLabel: `${formatSol(entry.data.totalStake)} SOL`,
            secondsLeftLabel: entry.data.status === "open" ? formatSeconds(secondsLeft) : "Settled",
            tierRows: entry.data.tiers.map((tier) => ({
              label: `${tier.minLegsTrue}/${entry.data.numLegs} conditions hit`,
              payout: bpsToMultiplier(tier.payoutBps),
            })),
          }}
        />
      </CardShell>
    );
  }

  if (size === "compact") {
    return (
      <CardShell href={href} size={size} status={status}>
        <CompactCardBody
          data={{
            presentation,
            status,
            topPayoutBps: topPayout,
            fill,
            totalStakeLabel: `${formatSol(entry.data.totalStake)} SOL`,
            secondsLeftLabel: entry.data.status === "open" ? formatSeconds(secondsLeft) : "Settled",
          }}
        />
      </CardShell>
    );
  }

  return (
    <CardShell href={href} size={size} status={status}>
      <MediumCardBody
        entry={entry}
        presentation={presentation}
        status={status}
        topPayoutBps={topPayout}
        live={live}
        secondsLeft={secondsLeft}
        fill={fill}
      />
    </CardShell>
  );
}

export function GeoProductCard({
  entry,
  live,
  size = "medium",
}: {
  entry: GeoProductListEntry;
  live?: boolean;
  size?: CardSize;
}) {
  const presentation = getGeoMarketPresentation(entry.data);
  const secondsLeft = useCountdown(Number(entry.data.closesAt));
  const fill = capacityFillFraction(entry.data.totalStake, entry.data.maxCapacity);
  const status = deriveMarketStatus({ status: entry.data.status, closesAt: entry.data.closesAt, live });
  const href = entry.data.status === "open" ? `/watch/geo/${entry.address.toBase58()}` : `/verify/geo/${entry.address.toBase58()}`;

  if (size === "large") {
    return (
      <CardShell href={href} size={size} status={status}>
        <LargeCardBody
          data={{
            presentation,
            status,
            topPayoutBps: entry.data.payoutBpsIfTrue,
            fill,
            totalStakeLabel: `${formatSol(entry.data.totalStake)} SOL`,
            secondsLeftLabel: entry.data.status === "open" ? formatSeconds(secondsLeft) : "Settled",
          }}
        />
      </CardShell>
    );
  }

  if (size === "compact") {
    return (
      <CardShell href={href} size={size} status={status}>
        <CompactCardBody
          data={{
            presentation,
            status,
            topPayoutBps: entry.data.payoutBpsIfTrue,
            fill,
            totalStakeLabel: `${formatSol(entry.data.totalStake)} SOL`,
            secondsLeftLabel: entry.data.status === "open" ? formatSeconds(secondsLeft) : "Settled",
          }}
        />
      </CardShell>
    );
  }

  return (
    <CardShell href={href} size={size} status={status}>
      <MediumCardBody
        entry={entry}
        presentation={presentation}
        status={status}
        topPayoutBps={entry.data.payoutBpsIfTrue}
        live={live}
        secondsLeft={secondsLeft}
        fill={fill}
      />
    </CardShell>
  );
}
