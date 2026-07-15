"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useAllGeoProducts, useAllProducts, useMyPositions } from "@/lib/hooks/useAllProducts";
import { formatSol } from "@/lib/format";
import { getGeoMarketPresentation, getTieredMarketPresentation } from "@/lib/market-presentation";

type PositionTab = "open" | "pending" | "settled" | "activity";

export default function PositionsPage() {
  const { publicKey } = useWallet();
  const { data: positions, isLoading } = useMyPositions();
  const { data: tiered } = useAllProducts();
  const { data: geo } = useAllGeoProducts();
  const [tab, setTab] = useState<PositionTab>("open");

  const items = useMemo(() => {
    return (positions ?? [])
      .map((position) => {
        const tieredMatch = (tiered ?? []).find((entry) => entry.address.equals(position.product));
        if (tieredMatch) {
          const presentation = getTieredMarketPresentation(tieredMatch.data);
          const topPayoutBps = Math.max(...tieredMatch.data.tiers.map((tier) => tier.payoutBps));
          // A settled product's real result is finalPayoutBps -- the top-tier
          // estimate only applies while the outcome is still undecided.
          const payoutBps = tieredMatch.data.status === "settled" ? tieredMatch.data.finalPayoutBps : topPayoutBps;
          const payout = (position.stake * BigInt(payoutBps)) / 10000n;

          return {
            address: position.address.toBase58(),
            productAddress: position.product.toBase58(),
            title: presentation.marketTitle,
            matchLabel: presentation.shortScenario,
            outcome: tieredMatch.data.status === "settled" ? (payoutBps > 0 ? "Yes" : "No") : "Pending",
            stake: position.stake,
            payout,
            status: tieredMatch.data.status,
            claimed: position.claimed,
          };
        }

        const geoMatch = (geo ?? []).find((entry) => entry.address.equals(position.product));
        if (geoMatch) {
          const presentation = getGeoMarketPresentation(geoMatch.data);
          // A settled product's real result is finalPayoutBps -- payoutBpsIfTrue
          // is only the estimate while the outcome is still undecided.
          const payoutBps = geoMatch.data.status === "settled" ? geoMatch.data.finalPayoutBps : geoMatch.data.payoutBpsIfTrue;
          const payout = (position.stake * BigInt(payoutBps)) / 10000n;

          return {
            address: position.address.toBase58(),
            productAddress: position.product.toBase58(),
            title: presentation.marketTitle,
            matchLabel: presentation.shortScenario,
            outcome: geoMatch.data.status === "settled" ? (payoutBps > 0 ? "Yes" : "No") : "Pending",
            stake: position.stake,
            payout,
            status: geoMatch.data.status,
            claimed: position.claimed,
          };
        }

        return null;
      })
      .filter(Boolean);
  }, [geo, positions, tiered]) as Array<{
    address: string;
    productAddress: string;
    title: string;
    matchLabel: string;
    outcome: string;
    stake: bigint;
    payout: bigint;
    status: "open" | "settled";
    claimed: boolean;
  }>;

  const openItems = items.filter((item) => item.status === "open");
  const pendingItems = items.filter((item) => item.status === "settled" && !item.claimed);
  const settledItems = items.filter((item) => item.status === "settled");
  const filtered =
    tab === "open" ? openItems : tab === "pending" ? pendingItems : tab === "settled" ? settledItems : items;

  const totalStaked = items.reduce((sum, item) => sum + item.stake, 0n);
  const totalPayout = items.reduce((sum, item) => sum + item.payout, 0n);
  const settledPnl = settledItems.reduce((sum, item) => sum + item.payout - item.stake, 0n);

  return (
    <div className="mx-auto max-w-[1480px] space-y-6 px-6 py-8">
      {!publicKey ? (
        <section className="market-shell rounded-[20px] border border-border/80 p-8 text-center">
          <h1 className="text-2xl font-semibold text-foreground">Connect a wallet to see your portfolio</h1>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            Once connected, your open positions, pending receipts, and settled outcomes will appear here.
          </p>
        </section>
      ) : (
        <section className="overflow-hidden rounded-[20px] border border-white/10 bg-[linear-gradient(180deg,oklch(0.08_0.004_260),oklch(0.07_0.004_260))] shadow-[0_30px_70px_rgba(0,0,0,0.55)]">
          <div className="flex items-center gap-2 border-b border-white/8 px-4 py-3">
            <span className="flex h-4 w-4 items-center justify-center rounded bg-status-true text-[8px] font-extrabold text-black">S</span>
            <span className="text-[10px] font-bold text-white">strata</span>
            <div className="ml-3 hidden gap-3 text-[7px] font-semibold text-muted-foreground md:flex">
              <span>Markets</span>
              <span className="text-white">Portfolio</span>
              <span>Create</span>
            </div>
          </div>

          <div className="grid gap-3 px-4 pt-4 md:grid-cols-4">
            <SummaryCard label="Total Balance" value={`${formatSol(totalStaked)} SOL`} />
            <SummaryCard label="Open Positions" value={`${openItems.length}`} sub={`${formatSol(totalStaked)} SOL at risk`} />
            <SummaryCard label="Potential Payout" value={`${formatSol(totalPayout)} SOL`} />
            <SummaryCard label="Settled P&L" value={`${settledPnl >= 0n ? "+" : ""}${formatSol(settledPnl)} SOL`} positive />
          </div>

          <div className="flex gap-4 px-4 pt-4 text-[11px] font-bold">
            {([
              ["open", `Open (${openItems.length})`],
              ["pending", `Pending (${pendingItems.length})`],
              ["settled", "Settled"],
              ["activity", "Activity"],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setTab(value)}
                className={`border-b-2 pb-2 transition-colors ${
                  tab === value ? "border-status-true text-white" : "border-transparent text-muted-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="px-4 pb-4 pt-3">
            {isLoading ? (
              <div className="rounded-[14px] border border-white/8 bg-[linear-gradient(180deg,oklch(0.18_0.008_260),oklch(0.15_0.008_260))] p-4 text-sm text-muted-foreground">
                Loading positions…
              </div>
            ) : filtered.length ? (
              <div className="overflow-hidden rounded-[14px] border border-white/8 bg-[linear-gradient(180deg,oklch(0.18_0.008_260),oklch(0.15_0.008_260))]">
                <div className="grid grid-cols-[1.5fr_1.25fr_0.7fr_0.8fr_0.9fr_0.8fr] gap-3 border-b border-white/7 px-4 py-3 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  <span>Market</span>
                  <span>Match</span>
                  <span>Out.</span>
                  <span>Stake</span>
                  <span>Payout</span>
                  <span>Status</span>
                </div>
                {filtered.map((item) => (
                  <Link
                    key={item.address}
                    href={`/positions/${item.productAddress}`}
                    className="grid grid-cols-[1.5fr_1.25fr_0.7fr_0.8fr_0.9fr_0.8fr] gap-3 border-b border-white/6 px-4 py-3 text-[12px] text-white transition-colors last:border-b-0 hover:bg-white/2"
                  >
                    <span className="font-semibold">{item.title}</span>
                    <span className="text-muted-foreground">{item.matchLabel}</span>
                    <span className="text-status-true">{item.outcome}</span>
                    <span className="font-mono">{formatSol(item.stake)} SOL</span>
                    <span className="font-mono">{formatSol(item.payout)} SOL</span>
                    <span className={item.status === "open" ? "text-status-true" : "text-muted-foreground"}>
                      {item.status === "open" ? "Open" : item.claimed ? "Claimed" : "Settled"}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="rounded-[14px] border border-white/8 bg-[linear-gradient(180deg,oklch(0.18_0.008_260),oklch(0.15_0.008_260))] p-6 text-center">
                <p className="text-sm font-semibold text-white">Nothing in this bucket yet</p>
                <p className="mt-2 text-sm text-muted-foreground">Browse markets to open your first position.</p>
                <Link href="/markets" className="btn-gradient mt-4 inline-flex rounded-full px-4 py-2 text-sm font-semibold">
                  Browse markets
                </Link>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  sub,
  positive,
}: {
  label: string;
  value: string;
  sub?: string;
  positive?: boolean;
}) {
  return (
    <div className="rounded-[12px] border border-white/8 bg-[linear-gradient(180deg,oklch(0.18_0.008_260),oklch(0.15_0.008_260))] px-3 py-3 shadow-[0_8px_24px_rgba(0,0,0,0.35)]">
      <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
      <div className={`mt-2 text-[18px] font-bold ${positive ? "text-status-true" : "text-white"}`}>{value}</div>
      {sub ? <div className="mt-1 text-[10px] text-muted-foreground">{sub}</div> : null}
    </div>
  );
}
