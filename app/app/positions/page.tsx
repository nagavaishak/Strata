"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useAllGeoProducts, useAllProducts, useMyPositions } from "@/lib/hooks/useAllProducts";
import { formatSol } from "@/lib/format";
import { getGeoMarketPresentation, getTieredMarketPresentation } from "@/lib/market-presentation";

type PositionTab = "open" | "claimable" | "settled";

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
          return {
            address: position.address.toBase58(),
            productAddress: position.product.toBase58(),
            title: presentation.marketTitle,
            matchLabel: `${presentation.homeTeam} vs ${presentation.awayTeam}`,
            status: tieredMatch.data.status,
            claimed: position.claimed,
            stake: position.stake,
            topPayout: Math.max(...tieredMatch.data.tiers.map((tier) => tier.payoutBps)),
          };
        }

        const geoMatch = (geo ?? []).find((entry) => entry.address.equals(position.product));
        if (geoMatch) {
          const presentation = getGeoMarketPresentation(geoMatch.data);
          return {
            address: position.address.toBase58(),
            productAddress: position.product.toBase58(),
            title: presentation.marketTitle,
            matchLabel: `${presentation.homeTeam} vs ${presentation.awayTeam}`,
            status: geoMatch.data.status,
            claimed: position.claimed,
            stake: position.stake,
            topPayout: geoMatch.data.payoutBpsIfTrue,
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
    status: "open" | "settled";
    claimed: boolean;
    stake: bigint;
    topPayout: number;
  }>;

  const filtered = items.filter((item) => {
    if (tab === "open") return item.status === "open";
    if (tab === "claimable") return item.status === "settled" && !item.claimed;
    return item.status === "settled";
  });

  const totalStaked = items.reduce((sum, item) => sum + item.stake, 0n);
  const liveCount = items.filter((item) => item.status === "open").length;
  const claimableCount = items.filter((item) => item.status === "settled" && !item.claimed).length;

  return (
    <div className="mx-auto max-w-[1480px] space-y-8 px-6 py-8">
      <section className="market-shell rounded-[34px] border border-border/80 p-7">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-status-true">Portfolio</p>
        <div className="mt-4 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight text-foreground">Track what you own</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
              Open positions, pending settlements, and claimable receipts all live in one consumer-readable ownership surface.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-[24px] border border-border/70 bg-background/35 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Total balance</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{formatSol(totalStaked)} SOL</p>
            </div>
            <div className="rounded-[24px] border border-border/70 bg-background/35 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Open positions</p>
              <p className="mt-2 text-2xl font-semibold text-status-true">{liveCount}</p>
            </div>
            <div className="rounded-[24px] border border-border/70 bg-background/35 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Claimable</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{claimableCount}</p>
            </div>
          </div>
        </div>
      </section>

      {!publicKey ? (
        <section className="market-shell rounded-[30px] border border-border/80 p-8 text-center">
          <h2 className="text-2xl font-semibold text-foreground">Connect a wallet to view your portfolio</h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            Once connected, you’ll see open positions, settled outcomes, and receipt-ready claim states here.
          </p>
        </section>
      ) : (
        <>
          <section className="market-shell rounded-[30px] border border-border/80 p-4">
            <div className="flex flex-wrap gap-2">
              {(["open", "claimable", "settled"] as PositionTab[]).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTab(value)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                    tab === value ? "bg-card text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {value.charAt(0).toUpperCase() + value.slice(1)}
                </button>
              ))}
            </div>
          </section>

          {isLoading ? (
            <div className="market-shell rounded-[30px] border border-border/80 p-8 text-sm text-muted-foreground">Loading positions…</div>
          ) : filtered.length ? (
            <section className="market-shell overflow-hidden rounded-[30px] border border-border/80">
              <div className="hidden grid-cols-[1.6fr_1.1fr_0.8fr_0.8fr_0.8fr_0.6fr] gap-4 border-b border-border/70 px-6 py-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground md:grid">
                <span>Market</span>
                <span>Match</span>
                <span>Outcome</span>
                <span>Stake</span>
                <span>Potential payout</span>
                <span>Status</span>
              </div>
              <div className="divide-y divide-border/70">
                {filtered.map((item) => (
                  <div key={item.address} className="grid gap-4 px-6 py-5 md:grid-cols-[1.6fr_1.1fr_0.8fr_0.8fr_0.8fr_0.6fr] md:items-center">
                    <div>
                      <p className="text-base font-semibold text-foreground">{item.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">Structured market</p>
                    </div>
                    <p className="text-sm text-muted-foreground">{item.matchLabel}</p>
                    <p className="text-sm text-status-true">Yes</p>
                    <p className="font-mono text-sm text-foreground">{formatSol(item.stake)} SOL</p>
                    <p className="font-mono text-sm text-status-true">
                      {((item.topPayout / 10000) * Number(formatSol(item.stake))).toFixed(2)} SOL
                    </p>
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-sm ${item.status === "open" ? "text-status-true" : "text-muted-foreground"}`}>
                        {item.status === "open" ? "Open" : item.claimed ? "Claimed" : "Settled"}
                      </span>
                      <Link href={`/positions/${item.productAddress}`} className="text-sm font-semibold text-muted-foreground hover:text-foreground">
                        View
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : (
            <section className="market-shell rounded-[30px] border border-border/80 p-8 text-center">
              <h2 className="text-2xl font-semibold text-foreground">Nothing in this bucket yet</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                Try another portfolio tab or browse the marketplace to open your first position.
              </p>
              <Link href="/markets" className="btn-gradient mt-6 inline-flex min-h-11 items-center rounded-full px-5 py-2.5 text-sm font-semibold">
                Browse markets
              </Link>
            </section>
          )}
        </>
      )}
    </div>
  );
}
