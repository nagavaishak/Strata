"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { bpsToMultiplier, formatSol } from "@/lib/format";
import type { MarketCard } from "@/lib/market-collections";

function topPayoutBps(card: MarketCard): number {
  return card.entry.kind === "tiered"
    ? card.entry.data.tiers.length
      ? Math.max(...card.entry.data.tiers.map((tier) => tier.payoutBps))
      : 0
    : card.entry.data.payoutBpsIfTrue;
}

function hrefFor(card: MarketCard): string {
  const address = card.entry.address.toBase58();
  const open = card.entry.data.status === "open";
  if (card.entry.kind === "tiered") return open ? `/watch/${address}` : `/verify/${address}`;
  return open ? `/watch/geo/${address}` : `/verify/geo/${address}`;
}

function RailRow({ card, metric }: { card: MarketCard; metric: string }) {
  return (
    <Link
      href={hrefFor(card)}
      className="flex items-center justify-between gap-3 rounded-xl border border-transparent px-2.5 py-2 transition-colors hover:border-border/60 hover:bg-card/40"
    >
      <div className="min-w-0">
        <p className="truncate text-[12px] font-semibold text-foreground">{card.presentation.marketTitle}</p>
        <p className="truncate text-[10px] text-muted-foreground">{card.presentation.shortScenario}</p>
      </div>
      <span className="shrink-0 font-mono text-[11px] font-semibold text-status-true">{metric}</span>
    </Link>
  );
}

export function SideRailModule({
  title,
  icon: Icon,
  cards,
  metric,
  emptyLabel,
}: {
  title: string;
  icon: LucideIcon;
  cards: MarketCard[];
  metric: (card: MarketCard) => string;
  emptyLabel: string;
}) {
  return (
    <div className="market-shell flex-1 rounded-[20px] border border-border/70 p-4">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        <Icon className="size-3.5 text-status-true" />
        {title}
      </div>
      <div className="mt-3 flex flex-col gap-0.5">
        {cards.length ? (
          cards.map((card) => <RailRow key={card.entry.address.toBase58()} card={card} metric={metric(card)} />)
        ) : (
          <p className="px-2.5 py-3 text-[11px] text-muted-foreground">{emptyLabel}</p>
        )}
      </div>
    </div>
  );
}

export function payoutMetric(card: MarketCard) {
  return `Up to ${bpsToMultiplier(topPayoutBps(card))}`;
}

export function poolMetric(card: MarketCard) {
  return `${formatSol(card.entry.data.totalStake, 2)} SOL`;
}

export function closingMetric(card: MarketCard) {
  const secondsToClose = Number(card.entry.data.closesAt) - Math.floor(Date.now() / 1000);
  if (secondsToClose <= 0) return "closing";
  const minutes = Math.floor(secondsToClose / 60);
  if (minutes < 60) return `${minutes}m left`;
  return `${Math.floor(minutes / 60)}h left`;
}

export function settledMetric(card: MarketCard) {
  return `${bpsToMultiplier(card.entry.data.finalPayoutBps)} paid`;
}
