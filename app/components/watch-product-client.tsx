"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PublicKey } from "@solana/web3.js";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MatchIdentity } from "@/components/market-identity";
import { LegStatusList } from "@/components/leg-status-list";
import { TakePositionPanel } from "@/components/take-position-panel";
import { TierLadder } from "@/components/tier-ladder";
import { useCountdown } from "@/lib/hooks/useCountdown";
import { useProduct } from "@/lib/hooks/useProduct";
import { useFinalizeProduct } from "@/lib/hooks/useSettlement";
import { bpsToMultiplier, formatSol } from "@/lib/format";
import { getTieredMarketPresentation } from "@/lib/market-presentation";

export function WatchProductClient({ productAddress }: { productAddress: string }) {
  const product = new PublicKey(productAddress);
  const { data, isLoading, isError } = useProduct(product);
  const finalize = useFinalizeProduct();
  const [streamStatus, setStreamStatus] = useState<{ live: boolean; lastSeq?: number } | null>(null);

  useEffect(() => {
    if (!data) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetch(`/api/txline/stream-status?fixtureId=${data.fixtureId}`);
        const json = await res.json();
        if (!cancelled) setStreamStatus(json);
      } catch {
        // keep the surface resilient to polling hiccups
      }
    };
    poll();
    const id = setInterval(poll, 4000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [data]);

  if (isLoading) {
    return <div className="mx-auto max-w-[1400px] px-6 py-12 text-sm text-muted-foreground">Loading market…</div>;
  }
  if (isError || !data) {
    return <div className="mx-auto max-w-[1400px] px-6 py-12 text-sm text-status-false">Market not found.</div>;
  }

  const presentation = getTieredMarketPresentation(data);
  const secondsToClose = useCountdown(Number(data.closesAt));
  const now = Math.floor(Date.now() / 1000);
  const canSettle = data.status === "open" && now >= Number(data.closesAt);
  const allSettled = data.legResults.every((result) => result !== "unsettled");
  const legsSettled = data.legResults.filter((result) => result !== "unsettled").length;
  const topPayout = Math.max(...data.tiers.map((tier) => tier.payoutBps));

  return (
    <div className="mx-auto max-w-[1400px] space-y-8 px-6 py-8">
      <Link href="/markets" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" />
        Back to markets
      </Link>

      <section className="market-shell rounded-[36px] border border-border/80 p-8">
        <MatchIdentity presentation={presentation} eyebrow="Structured market" />
      </section>

      <section className="market-shell flex flex-wrap items-center gap-3 rounded-[26px] border border-border/80 px-5 py-4">
        <span className={`h-2 w-2 rounded-full ${streamStatus?.live ? "glow-dot bg-status-true" : "bg-status-pending"}`} />
        <span className="text-sm text-muted-foreground">
          {streamStatus?.live ? "Live match data is flowing for this fixture." : "Match is listed and waiting for live proof updates."}
        </span>
        <span className="rounded-full border border-border/70 bg-background/35 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-foreground">
          {data.status === "open" ? `Closes in ${Math.max(0, Math.ceil(secondsToClose / 60))}m` : "Settled"}
        </span>
        <span className="rounded-full border border-status-true/25 bg-status-true/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-status-true">
          Up to {bpsToMultiplier(topPayout)}
        </span>
      </section>

      <section className="market-shell rounded-[24px] border border-border/80 p-3">
        <div className="flex flex-wrap gap-2">
          {["Market", "Rules", "Live", "Activity"].map((tab, index) => (
            <div
              key={tab}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                index === 0 ? "bg-card text-foreground" : "text-muted-foreground"
              }`}
            >
              {tab}
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="space-y-6">
          <div className="market-shell rounded-[30px] border border-border/80 p-6">
            <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-status-true">Market story</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{presentation.marketTitle}</h2>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">{presentation.scenario}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <div className="rounded-[24px] border border-border/70 bg-background/35 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Total staked</p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">{formatSol(data.totalStake)} SOL</p>
                </div>
                <div className="rounded-[24px] border border-border/70 bg-background/35 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Current status</p>
                  <p className="mt-2 text-2xl font-semibold text-status-true">
                    {streamStatus?.live ? "Live" : data.status === "open" ? "Open" : "Settled"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_0.92fr]">
            <div className="market-shell rounded-[30px] border border-border/80 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-status-true">Conditions</p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">What has to happen</h2>
                </div>
                <span className="text-sm text-muted-foreground">{legsSettled}/{data.numLegs} settled</span>
              </div>
              <div className="mt-5 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                <div className="h-full rounded-full bg-status-true transition-[width] duration-500" style={{ width: `${(legsSettled / data.numLegs) * 100}%` }} />
              </div>
              <div className="mt-5">
                <LegStatusList
                  product={product}
                  legs={data.legs}
                  legResults={data.legResults}
                  closesAtUnixSeconds={Number(data.closesAt)}
                  canSettle={canSettle}
                />
              </div>

              {data.status === "open" && allSettled && (
                <Button onClick={() => finalize.mutate(product)} disabled={finalize.isPending} className="mt-5 rounded-full">
                  {finalize.isPending ? "Finalizing…" : "Finalize market"}
                </Button>
              )}
            </div>

            <div className="market-shell rounded-[30px] border border-border/80 p-6">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-status-true">Payout ladder</p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">How the return climbs</h2>
                </div>
                <span className="rounded-full border border-status-true/25 bg-status-true/10 px-3 py-1 text-xs font-semibold text-status-true">
                  Top tier {bpsToMultiplier(topPayout)}
                </span>
              </div>
              <div className="mt-5 rounded-[26px] border border-border/70 bg-background/35 p-4">
                <TierLadder tiers={data.tiers} numLegs={data.numLegs} legResults={data.legResults} />
              </div>
            </div>
          </div>

          <div className="market-shell rounded-[30px] border border-border/80 p-6">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl border border-status-true/25 bg-status-true/10 p-2">
                <ShieldCheck className="size-5 text-status-true" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-status-true">Settlement and trust</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">Proof-backed by design</h2>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  Buyers do not need to trust an operator to tell them what happened. The proof flow exists so the settlement page can be audited after the match without making the browsing experience feel technical.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4 xl:sticky xl:top-24 xl:self-start">
          <TakePositionPanel
            kind="tiered"
            product={product}
            totalStake={data.totalStake}
            maxCapacity={data.maxCapacity}
            tiers={data.tiers}
            numLegs={data.numLegs}
            legResults={data.legResults}
            marketTitle={presentation.marketTitle}
            matchLabel={`${presentation.homeTeam} vs ${presentation.awayTeam}`}
          />

          {data.status === "settled" && (
            <div className="market-shell rounded-[28px] border border-border/80 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-status-true">Market settled</p>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                This market already closed with a final payout of <span className="font-mono text-status-true">{bpsToMultiplier(data.finalPayoutBps)}</span>.
              </p>
              <Link href={`/verify/${productAddress}`} className="btn-gradient mt-5 inline-flex min-h-11 items-center rounded-full px-5 py-2.5 text-sm font-semibold">
                View receipt
              </Link>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
