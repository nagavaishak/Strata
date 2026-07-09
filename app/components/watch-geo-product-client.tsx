"use client";

import Link from "next/link";
import { PublicKey } from "@solana/web3.js";
import { ArrowLeft } from "lucide-react";
import { MatchIdentity } from "@/components/market-identity";
import { TakePositionPanel } from "@/components/take-position-panel";
import { Button } from "@/components/ui/button";
import { useGeoProduct } from "@/lib/hooks/useGeoProduct";
import { useSettleGeoProduct } from "@/lib/hooks/useGeoProductActions";
import { bpsToMultiplier, formatSol } from "@/lib/format";
import { getGeoMarketPresentation } from "@/lib/market-presentation";

export function WatchGeoProductClient({ productAddress }: { productAddress: string }) {
  const geoProduct = new PublicKey(productAddress);
  const { data, isLoading, isError } = useGeoProduct(geoProduct);
  const settle = useSettleGeoProduct();

  if (isLoading) return <div className="mx-auto max-w-[1400px] px-6 py-8 text-sm text-muted-foreground">Loading market…</div>;
  if (isError || !data) return <div className="mx-auto max-w-[1400px] px-6 py-8 text-sm text-status-false">Market not found.</div>;

  const presentation = getGeoMarketPresentation(data);
  const canSettle = data.status === "open" && Math.floor(Date.now() / 1000) >= Number(data.closesAt);

  return (
    <div className="mx-auto max-w-[1400px] space-y-8 px-6 py-8">
      <Link href="/markets" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" />
        Back to markets
      </Link>

      <section className="market-shell rounded-[36px] border border-border/80 p-8">
        <MatchIdentity presentation={presentation} eyebrow="Exact-outcome market" />
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="space-y-6">
          <div className="market-shell rounded-[30px] border border-border/80 p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-status-true">Market setup</p>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">{presentation.scenario}</p>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <div className="rounded-[22px] border border-border/70 bg-background/35 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Exact payout</p>
                <p className="mt-2 text-2xl font-semibold text-status-true">{bpsToMultiplier(data.payoutBpsIfTrue)}</p>
              </div>
              <div className="rounded-[22px] border border-border/70 bg-background/35 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Total staked</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">{formatSol(data.totalStake)} SOL</p>
              </div>
            </div>
            {canSettle ? (
              <Button onClick={() => settle.mutate(geoProduct)} disabled={settle.isPending} className="mt-5 rounded-full">
                {settle.isPending ? "Settling…" : "Settle exact-outcome market"}
              </Button>
            ) : null}
          </div>
        </section>

        <section className="space-y-4 xl:sticky xl:top-24 xl:self-start">
          {data.status === "open" ? (
            <TakePositionPanel
              kind="geo"
              product={geoProduct}
              totalStake={data.totalStake}
              maxCapacity={data.maxCapacity}
              payoutBpsIfTrue={data.payoutBpsIfTrue}
              marketTitle={presentation.marketTitle}
              matchLabel={`${presentation.homeTeam} vs ${presentation.awayTeam}`}
            />
          ) : (
            <div className="market-shell rounded-[30px] border border-border/80 p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-status-true">Settled market</p>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                This exact-outcome market is closed. Review the final receipt to see how the resolution played out.
              </p>
              <Link href={`/verify/geo/${productAddress}`} className="btn-gradient mt-5 inline-flex min-h-11 items-center rounded-full px-5 py-2.5 text-sm font-semibold">
                View receipt
              </Link>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
