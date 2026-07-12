"use client";

import Link from "next/link";
import { CheckCircle2, Flame, Trophy } from "lucide-react";
import { bpsToMultiplier, capacityFillFraction, formatSol } from "@/lib/format";
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

function BoardShell({
  title,
  icon,
  accent,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex-1 overflow-hidden rounded-[20px] border border-border/70 p-4">
      <div className="absolute inset-0" style={{ backgroundImage: accent }} />
      <div className="relative flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {icon}
        {title}
      </div>
      <div className="relative mt-3 flex flex-col gap-1.5">{children}</div>
    </div>
  );
}

/** Ranked, gold-toned board — rank badges + oversized payout numerals so the
 * highest-upside markets read as a leaderboard, not a plain list. */
export function HighestPayoutBoard({ cards }: { cards: MarketCard[] }) {
  return (
    <BoardShell
      title="Highest payout"
      icon={<Trophy className="size-3.5 text-status-pending" />}
      accent="radial-gradient(400px circle at 100% 0%, color-mix(in srgb, var(--status-pending) 10%, transparent), transparent 70%)"
    >
      {cards.length ? (
        cards.map((card, index) => (
          <Link
            key={card.entry.address.toBase58()}
            href={hrefFor(card)}
            className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-card/40"
          >
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-status-pending/40 bg-status-pending/10 text-[10px] font-bold text-status-pending">
              {index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-semibold text-foreground">{card.presentation.marketTitle}</p>
              <p className="truncate text-[10px] text-muted-foreground">{card.presentation.shortScenario}</p>
            </div>
            <span className="shrink-0 font-mono text-[15px] font-bold text-status-pending">
              {bpsToMultiplier(topPayoutBps(card))}
            </span>
          </Link>
        ))
      ) : (
        <p className="px-2 py-3 text-[11px] text-muted-foreground">No markets yet.</p>
      )}
    </BoardShell>
  );
}

/** Heat-toned board — each row carries its own pool-depth bar so "active" is
 * shown, not just claimed. */
export function MostActiveBoard({ cards }: { cards: MarketCard[] }) {
  return (
    <BoardShell
      title="Most active"
      icon={<Flame className="size-3.5 text-status-true" />}
      accent="radial-gradient(400px circle at 100% 0%, color-mix(in srgb, var(--status-true) 10%, transparent), transparent 70%)"
    >
      {cards.length ? (
        cards.map((card) => {
          const fill = capacityFillFraction(card.entry.data.totalStake, card.entry.data.maxCapacity);
          return (
            <Link
              key={card.entry.address.toBase58()}
              href={hrefFor(card)}
              className="rounded-xl px-2 py-2 transition-colors hover:bg-card/40"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="truncate text-[12px] font-semibold text-foreground">{card.presentation.marketTitle}</p>
                <span className="shrink-0 font-mono text-[11px] font-semibold text-status-true">
                  {formatSol(card.entry.data.totalStake, 2)} SOL
                </span>
              </div>
              <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${Math.max(6, fill * 100)}%`, backgroundImage: "linear-gradient(90deg, var(--accent-from), var(--accent-to))" }}
                />
              </div>
            </Link>
          );
        })
      ) : (
        <p className="px-2 py-3 text-[11px] text-muted-foreground">No markets yet.</p>
      )}
    </BoardShell>
  );
}

/** Quiet, verified-toned board — a checkmark stamp per row instead of a bare
 * "paid" figure, so settlement reads as proof, not just a number. */
export function RecentlySettledBoard({ cards }: { cards: MarketCard[] }) {
  return (
    <BoardShell
      title="Recently settled"
      icon={<CheckCircle2 className="size-3.5 text-muted-foreground" />}
      accent="radial-gradient(400px circle at 100% 0%, color-mix(in srgb, var(--foreground) 6%, transparent), transparent 70%)"
    >
      {cards.length ? (
        cards.map((card) => (
          <Link
            key={card.entry.address.toBase58()}
            href={hrefFor(card)}
            className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-card/40"
          >
            <CheckCircle2 className="size-4 shrink-0 text-status-true/70" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-semibold text-foreground">{card.presentation.marketTitle}</p>
              <p className="truncate text-[10px] text-muted-foreground">{card.presentation.shortScenario}</p>
            </div>
            <span className="shrink-0 rounded-full border border-border/60 bg-background/50 px-2 py-0.5 font-mono text-[10px] font-semibold text-foreground">
              {bpsToMultiplier(card.entry.data.finalPayoutBps)} paid
            </span>
          </Link>
        ))
      ) : (
        <p className="px-2 py-3 text-[11px] text-muted-foreground">Nothing settled yet.</p>
      )}
    </BoardShell>
  );
}
