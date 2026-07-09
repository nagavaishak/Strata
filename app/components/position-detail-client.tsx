"use client";

import Link from "next/link";
import { PublicKey } from "@solana/web3.js";
import { useGeoProduct } from "@/lib/hooks/useGeoProduct";
import { usePosition } from "@/lib/hooks/usePosition";
import { useProduct } from "@/lib/hooks/useProduct";
import { TierLadder } from "@/components/tier-ladder";
import { LegStatusList } from "@/components/leg-status-list";
import { MatchIdentity } from "@/components/market-identity";
import { Button } from "@/components/ui/button";
import { bpsToMultiplier, formatSol } from "@/lib/format";
import { getGeoMarketPresentation, getTieredMarketPresentation } from "@/lib/market-presentation";
import { useClaim } from "@/lib/hooks/useSettlement";
import { useClaimGeo } from "@/lib/hooks/useGeoProductActions";

export function PositionDetailClient({ productAddress }: { productAddress: string }) {
  const product = new PublicKey(productAddress);
  const tiered = useProduct(product);
  const geo = useGeoProduct(product);
  const tieredPosition = usePosition(product, "tiered");
  const geoPosition = usePosition(product, "geo");
  const claim = useClaim();
  const claimGeo = useClaimGeo();

  const isTiered = !!tiered.data;
  const position = isTiered ? tieredPosition.data : geoPosition.data;

  if (tiered.isLoading || geo.isLoading) {
    return <div className="mx-auto max-w-[1400px] px-6 py-8 text-sm text-muted-foreground">Loading position…</div>;
  }

  if (!tiered.data && !geo.data) {
    return <div className="mx-auto max-w-[1400px] px-6 py-8 text-sm text-status-false">Position not found.</div>;
  }

  if (tiered.data) {
    const presentation = getTieredMarketPresentation(tiered.data);
    const topPayout = Math.max(...tiered.data.tiers.map((tier) => tier.payoutBps));
    const payout = position ? (position.stake * BigInt(tiered.data.finalPayoutBps || topPayout)) / 10000n : 0n;

    return (
      <div className="mx-auto max-w-[1400px] space-y-8 px-6 py-8">
        <Link href="/positions" className="text-sm font-semibold text-muted-foreground hover:text-foreground">
          Back to portfolio
        </Link>
        <section className="market-shell rounded-[34px] border border-border/80 p-8">
          <MatchIdentity presentation={presentation} eyebrow="Your position" />
        </section>
        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <section className="space-y-6">
            <div className="market-shell rounded-[30px] border border-border/80 p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-status-true">Your exposure</p>
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <div className="rounded-[22px] border border-border/70 bg-background/35 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Stake</p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">{position ? formatSol(position.stake) : "0.0000"} SOL</p>
                </div>
                <div className="rounded-[22px] border border-border/70 bg-background/35 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Best case</p>
                  <p className="mt-2 text-2xl font-semibold text-status-true">{bpsToMultiplier(topPayout)}</p>
                </div>
                <div className="rounded-[22px] border border-border/70 bg-background/35 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Current payout</p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">{position ? formatSol(payout) : "0.0000"} SOL</p>
                </div>
              </div>
            </div>

            <div className="market-shell rounded-[30px] border border-border/80 p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-status-true">Live progress</p>
              <div className="mt-4">
                <LegStatusList
                  product={product}
                  legs={tiered.data.legs}
                  legResults={tiered.data.legResults}
                  closesAtUnixSeconds={Number(tiered.data.closesAt)}
                  canSettle={false}
                />
              </div>
            </div>

            <div className="market-shell rounded-[30px] border border-border/80 p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-status-true">Payout ladder</p>
              <div className="mt-4 rounded-[24px] border border-border/70 bg-background/35 p-4">
                <TierLadder tiers={tiered.data.tiers} numLegs={tiered.data.numLegs} legResults={tiered.data.legResults} />
              </div>
            </div>
          </section>

          <section className="space-y-4 xl:sticky xl:top-24 xl:self-start">
            <div className="market-shell rounded-[30px] border border-border/80 p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-status-true">Actions</p>
              <div className="mt-4 flex flex-col gap-3">
                {tiered.data.status === "settled" && position && !position.claimed ? (
                  <Button onClick={() => claim.mutate(product)} disabled={claim.isPending} className="rounded-full">
                    {claim.isPending ? "Claiming…" : "Claim payout"}
                  </Button>
                ) : null}
                <Link href={`/watch/${productAddress}`} className="inline-flex min-h-11 items-center justify-center rounded-full border border-border/70 px-5 py-2.5 text-sm font-semibold text-muted-foreground hover:text-foreground">
                  Open market
                </Link>
                <Link href={`/verify/${productAddress}`} className="inline-flex min-h-11 items-center justify-center rounded-full border border-border/70 px-5 py-2.5 text-sm font-semibold text-muted-foreground hover:text-foreground">
                  View receipt
                </Link>
              </div>
            </div>
          </section>
        </div>
      </div>
    );
  }

  const geoData = geo.data!;
  const presentation = getGeoMarketPresentation(geoData);
  const payout = position ? (position.stake * BigInt(geoData.finalPayoutBps || geoData.payoutBpsIfTrue)) / 10000n : 0n;

  return (
    <div className="mx-auto max-w-[1400px] space-y-8 px-6 py-8">
      <Link href="/positions" className="text-sm font-semibold text-muted-foreground hover:text-foreground">
        Back to portfolio
      </Link>
      <section className="market-shell rounded-[34px] border border-border/80 p-8">
        <MatchIdentity presentation={presentation} eyebrow="Your exact-outcome position" />
      </section>
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="market-shell rounded-[30px] border border-border/80 p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-status-true">Your exposure</p>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div className="rounded-[22px] border border-border/70 bg-background/35 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Stake</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{position ? formatSol(position.stake) : "0.0000"} SOL</p>
            </div>
            <div className="rounded-[22px] border border-border/70 bg-background/35 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Exact payout</p>
              <p className="mt-2 text-2xl font-semibold text-status-true">{bpsToMultiplier(geoData.payoutBpsIfTrue)}</p>
            </div>
            <div className="rounded-[22px] border border-border/70 bg-background/35 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Current payout</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{position ? formatSol(payout) : "0.0000"} SOL</p>
            </div>
          </div>
        </section>

        <section className="market-shell rounded-[30px] border border-border/80 p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-status-true">Actions</p>
          <div className="mt-4 flex flex-col gap-3">
            {geoData.status === "settled" && position && !position.claimed ? (
              <Button onClick={() => claimGeo.mutate(product)} disabled={claimGeo.isPending} className="rounded-full">
                {claimGeo.isPending ? "Claiming…" : "Claim payout"}
              </Button>
            ) : null}
            <Link href={`/watch/geo/${productAddress}`} className="inline-flex min-h-11 items-center justify-center rounded-full border border-border/70 px-5 py-2.5 text-sm font-semibold text-muted-foreground hover:text-foreground">
              Open market
            </Link>
            <Link href={`/verify/geo/${productAddress}`} className="inline-flex min-h-11 items-center justify-center rounded-full border border-border/70 px-5 py-2.5 text-sm font-semibold text-muted-foreground hover:text-foreground">
              View receipt
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
