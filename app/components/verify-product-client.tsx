"use client";

import { PublicKey } from "@solana/web3.js";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { MatchIdentity } from "@/components/market-identity";
import { TierLadder } from "@/components/tier-ladder";
import { Button } from "@/components/ui/button";
import { useAccountSignatures } from "@/lib/hooks/useAccountSignatures";
import { usePosition } from "@/lib/hooks/usePosition";
import { useProduct } from "@/lib/hooks/useProduct";
import { useClaim } from "@/lib/hooks/useSettlement";
import { bpsToMultiplier, formatSol } from "@/lib/format";
import { getTieredMarketPresentation } from "@/lib/market-presentation";

export function VerifyProductClient({ productAddress }: { productAddress: string }) {
  const product = new PublicKey(productAddress);
  const { publicKey } = useWallet();
  const { data, isLoading, isError } = useProduct(product);
  const { data: position } = usePosition(product, "tiered");
  const { data: signatures } = useAccountSignatures(product);
  const claim = useClaim();

  if (isLoading) return <div className="mx-auto max-w-[1400px] px-6 py-8 text-sm text-muted-foreground">Loading receipt…</div>;
  if (isError || !data) return <div className="mx-auto max-w-[1400px] px-6 py-8 text-sm text-status-false">Product not found.</div>;

  const presentation = getTieredMarketPresentation(data);
  const trueCount = data.legResults.filter((result) => result === "true").length;
  const recomputedPayout = position ? (position.stake * BigInt(data.finalPayoutBps)) / 10000n : 0n;
  const settlementLabel = trueCount === data.numLegs ? "Won at top tier" : trueCount > 0 ? "Partial tier hit" : "No conditions hit";

  return (
    <div className="mx-auto max-w-[1400px] space-y-8 px-6 py-8">
      <Link href="/positions" className="text-sm font-semibold text-muted-foreground hover:text-foreground">
        Back to portfolio
      </Link>

      <section className="market-shell rounded-[34px] border border-border/80 p-8">
        <MatchIdentity presentation={presentation} eyebrow="Verification receipt" />
      </section>

      <section className="market-shell rounded-[24px] border border-border/80 p-3">
        <div className="flex flex-wrap gap-2">
          {["Settlement", "Payout", "Verification"].map((tab, index) => (
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

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="space-y-6">
          <div className="market-shell rounded-[30px] border border-border/80 p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-status-true">Receipt summary</p>
            <div className="mt-4 grid gap-4 md:grid-cols-4">
              <div className="rounded-[22px] border border-border/70 bg-background/35 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Result</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">{trueCount}/{data.numLegs} conditions hit</p>
              </div>
              <div className="rounded-[22px] border border-border/70 bg-background/35 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Final payout</p>
                <p className="mt-2 text-2xl font-semibold text-status-true">{bpsToMultiplier(data.finalPayoutBps)}</p>
              </div>
              <div className="rounded-[22px] border border-border/70 bg-background/35 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Status</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">{data.status}</p>
              </div>
              <div className="rounded-[22px] border border-border/70 bg-background/35 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Outcome</p>
                <p className="mt-2 text-2xl font-semibold text-status-true">{settlementLabel}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_0.92fr]">
            <div className="market-shell rounded-[30px] border border-border/80 p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-status-true">Condition result</p>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                This market settled after {trueCount} of {data.numLegs} listed conditions were proven true. The payout ladder below shows exactly which tier that result unlocked.
              </p>
              <div className="mt-5 rounded-[24px] border border-border/70 bg-background/35 p-4">
                <TierLadder tiers={data.tiers} numLegs={data.numLegs} legResults={data.legResults} />
              </div>
            </div>

            <div className="market-shell rounded-[30px] border border-border/80 p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-status-true">Payout calculation</p>
              <div className="mt-4 rounded-[24px] border border-border/70 bg-background/35 p-4">
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Stake</span>
                    <span className="font-mono text-foreground">{position ? formatSol(position.stake) : "0.0000"} SOL</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Payout tier</span>
                    <span className="font-mono text-status-true">{bpsToMultiplier(data.finalPayoutBps)}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-border/70 pt-3">
                    <span className="text-muted-foreground">You received</span>
                    <span className="font-mono text-lg font-semibold text-status-true">{formatSol(recomputedPayout)} SOL</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="market-shell rounded-[30px] border border-border/80 p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-status-true">On-chain receipt trail</p>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              Explorer links are still here for auditability, but the product tells the outcome in human terms first.
            </p>
            <div className="mt-5 divide-y divide-border/70 rounded-[24px] border border-border/70 bg-background/35">
              {signatures?.length ? (
                signatures.map((signature) => (
                  <a
                    key={signature.signature}
                    href={`https://explorer.solana.com/tx/${signature.signature}?cluster=devnet`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 px-4 py-3 text-sm text-muted-foreground hover:bg-background/40 hover:text-foreground"
                  >
                    <span className={signature.err ? "text-status-false" : "text-status-true"}>{signature.err ? "Failed" : "Confirmed"}</span>
                    <span className="truncate font-mono">{signature.signature}</span>
                  </a>
                ))
              ) : (
                <div className="px-4 py-3 text-sm text-muted-foreground">Loading transaction history…</div>
              )}
            </div>
          </div>
        </section>

        <section className="space-y-4 xl:sticky xl:top-24 xl:self-start">
          <div className="market-shell rounded-[30px] border border-border/80 p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-status-true">Your receipt</p>
            {publicKey && position ? (
              <div className="mt-4 space-y-4">
                <div className="rounded-[24px] border border-border/70 bg-background/35 p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Stake</span>
                    <span className="font-mono text-foreground">{formatSol(position.stake)} SOL</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Recomputed payout</span>
                    <span className="font-mono text-status-true">{formatSol(recomputedPayout)} SOL</span>
                  </div>
                </div>
                {!position.claimed && data.status === "settled" ? (
                  <Button onClick={() => claim.mutate(product)} disabled={claim.isPending} className="w-full rounded-full">
                    {claim.isPending ? "Claiming…" : "Claim payout"}
                  </Button>
                ) : (
                  <p className="text-sm text-muted-foreground">{position.claimed ? "This payout has already been claimed." : "Waiting for settlement."}</p>
                )}
              </div>
            ) : (
              <p className="mt-4 text-sm leading-7 text-muted-foreground">
                Connect the wallet that bought this market to see a personal receipt and claim state here.
              </p>
            )}

            <div className="mt-5 flex flex-col gap-3">
              <Link href={`/watch/${productAddress}`} className="inline-flex min-h-11 items-center justify-center rounded-full border border-border/70 px-5 py-2.5 text-sm font-semibold text-muted-foreground hover:text-foreground">
                Open market
              </Link>
              <Link href={`/positions/${productAddress}`} className="inline-flex min-h-11 items-center justify-center rounded-full border border-border/70 px-5 py-2.5 text-sm font-semibold text-muted-foreground hover:text-foreground">
                View position detail
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
