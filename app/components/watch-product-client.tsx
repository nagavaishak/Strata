"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PublicKey } from "@solana/web3.js";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LegStatusList } from "@/components/leg-status-list";
import { TakePositionPanel } from "@/components/take-position-panel";
import { TierLadder } from "@/components/tier-ladder";
import { useProduct } from "@/lib/hooks/useProduct";
import { useFinalizeProduct } from "@/lib/hooks/useSettlement";
import { getTieredMarketPresentation } from "@/lib/market-presentation";

function TeamBadge({ label }: { label: string }) {
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full border border-border/70 bg-card/65 text-[9px] font-bold text-foreground">
      {label.slice(0, 2)}
    </div>
  );
}

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
        return;
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
    return <div className="mx-auto max-w-[1480px] px-4 py-8 text-sm text-muted-foreground">Loading market…</div>;
  }

  if (isError || !data) {
    return <div className="mx-auto max-w-[1480px] px-4 py-8 text-sm text-status-false">Market not found.</div>;
  }

  const presentation = getTieredMarketPresentation(data);
  const allSettled = data.legResults.every((result) => result !== "unsettled");
  const now = Math.floor(Date.now() / 1000);
  const canSettle = data.status === "open" && now >= Number(data.closesAt);

  return (
    <div className="mx-auto max-w-[1480px] px-4 py-6">
      <section className="market-shell rounded-[20px] border border-border/80 p-4">
        <Link href="/markets" className="inline-flex items-center gap-2 text-[11px] text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" />
          Back to markets
        </Link>

        <div className="mt-4 flex items-center justify-between text-[10px] text-muted-foreground">
          <span>{presentation.league}</span>
          <span>{presentation.kickoffLabel}</span>
        </div>

        <div className="mt-3 flex items-center gap-3">
          <TeamBadge label={presentation.homeTeam} />
          <div className="text-[22px] font-semibold tracking-tight text-foreground">
            {presentation.homeTeam}
            <span className="px-2 text-[14px] font-medium text-muted-foreground">vs</span>
            {presentation.awayTeam}
          </div>
          <div className="ml-auto">
            <TeamBadge label={presentation.awayTeam} />
          </div>
        </div>

        <h1 className="mt-4 text-[34px] font-semibold tracking-tight text-foreground">{presentation.marketTitle}</h1>

        <div className="mt-4 flex gap-5 border-b border-border/60 pb-3 text-[11px] font-semibold text-muted-foreground">
          <span className="border-b-2 border-status-true pb-2 text-foreground">Market</span>
          <span>Rules</span>
          <span>Stats</span>
          <span>Chat</span>
          <span>Activity</span>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[1.06fr_0.94fr]">
          <div className="space-y-4">
            <div className="market-shell rounded-[18px] border border-border/80 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-status-true">Conditions</p>
              <div className="mt-4 space-y-3 text-[11px] text-muted-foreground">
                <div className="flex justify-between gap-4">
                  <span>Applies to</span>
                  <span className="text-right text-foreground">Full time only</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span>Includes</span>
                  <span className="text-right text-foreground">Regular goals only</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span>Excludes</span>
                  <span className="text-right text-foreground">Extra time and penalties</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span>Void if</span>
                  <span className="text-right text-foreground">Match not completed</span>
                </div>
              </div>
              <p className="mt-4 text-[10px] text-muted-foreground">All conditions must be met for the top payout tier.</p>
            </div>

            <div className="market-shell rounded-[18px] border border-border/80 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-status-true">Live conditions</p>
              <div className="mt-4">
                <LegStatusList
                  product={product}
                  legs={data.legs}
                  legResults={data.legResults}
                  closesAtUnixSeconds={Number(data.closesAt)}
                  canSettle={canSettle}
                />
              </div>

              {data.status === "open" && allSettled && (
                <Button onClick={() => finalize.mutate(product)} disabled={finalize.isPending} className="mt-4 rounded-full">
                  {finalize.isPending ? "Finalizing…" : "Finalize market"}
                </Button>
              )}
            </div>

            <div className="market-shell rounded-[18px] border border-border/80 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-status-true">Payout ladder</p>
              <div className="mt-4 rounded-[16px] border border-border/70 bg-background/35 p-4">
                <TierLadder tiers={data.tiers} numLegs={data.numLegs} legResults={data.legResults} />
              </div>
            </div>
          </div>

          <div className="xl:sticky xl:top-24 xl:self-start">
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

            <div className="mt-4 rounded-[18px] border border-border/80 bg-background/30 p-4 text-[10px] text-muted-foreground">
              {streamStatus?.live
                ? "Live proof updates are flowing for this fixture."
                : "This market stays readable on the front-end while still settling through Strata's proof flow."}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
