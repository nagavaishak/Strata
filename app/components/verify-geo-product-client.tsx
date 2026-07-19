"use client";

import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { MatchIdentity } from "@/components/market-identity";
import { Button } from "@/components/ui/button";
import { useAccountSignatures } from "@/lib/hooks/useAccountSignatures";
import { useFixtureMetadata } from "@/lib/hooks/useFixtureMetadata";
import { useGeoProduct } from "@/lib/hooks/useGeoProduct";
import { useClaimGeo } from "@/lib/hooks/useGeoProductActions";
import { usePosition } from "@/lib/hooks/usePosition";
import { explorerTxUrl } from "@/lib/explorer";
import { bpsToMultiplier, formatSol } from "@/lib/format";
import { getGeoMarketPresentation, withLiveFixtureIdentity } from "@/lib/market-presentation";
import { parsePublicKey } from "@/lib/solana-address";

export function VerifyGeoProductClient({ productAddress }: { productAddress: string }) {
  const geoProduct = parsePublicKey(productAddress);
  const { publicKey } = useWallet();
  const { data, isLoading, isError } = useGeoProduct(geoProduct);
  const { data: position } = usePosition(geoProduct, "geo");
  const { data: signatures, isLoading: signaturesLoading } = useAccountSignatures(geoProduct);
  const claim = useClaimGeo();
  const liveIdentity = useFixtureMetadata(data ? [Number(data.fixtureId)] : []);

  if (isLoading) return <div className="mx-auto max-w-[1400px] px-6 py-8 text-sm text-muted-foreground">Loading receipt…</div>;
  if (isError || !data || !geoProduct) return <div className="mx-auto max-w-[1400px] px-6 py-8 text-sm text-status-false">Product not found.</div>;

  const presentation = withLiveFixtureIdentity(
    getGeoMarketPresentation(data),
    data.fixtureId,
    liveIdentity[Number(data.fixtureId)]
  );
  const signaturesExpired = !signaturesLoading && (signatures?.length ?? 0) === 0;
  const recomputedPayout = position ? (position.stake * BigInt(data.finalPayoutBps)) / 10000n : 0n;
  const matched = data.finalPayoutBps > 0;

  return (
    <div className="mx-auto max-w-[1400px] space-y-8 px-6 py-8">
      <Link href="/positions" className="text-sm font-semibold text-muted-foreground hover:text-foreground">
        Back to portfolio
      </Link>

      <section className="market-shell rounded-[34px] border border-border/80 p-8">
        <MatchIdentity presentation={presentation} eyebrow="Exact-outcome receipt" />
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="space-y-6">
          <div className="market-shell rounded-[30px] border border-border/80 p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-status-true">Receipt summary</p>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <div className="rounded-[22px] border border-border/70 bg-background/35 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Outcome</p>
                <p className={`mt-2 text-2xl font-semibold ${matched ? "text-status-true" : "text-foreground"}`}>
                  {matched ? "Exact hit" : "Missed"}
                </p>
              </div>
              <div className="rounded-[22px] border border-border/70 bg-background/35 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Final payout</p>
                <p className={`mt-2 text-2xl font-semibold ${matched ? "text-status-true" : "text-foreground"}`}>
                  {bpsToMultiplier(data.finalPayoutBps)}
                </p>
              </div>
              <div className="rounded-[22px] border border-border/70 bg-background/35 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Status</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">{data.status}</p>
              </div>
            </div>
          </div>

          <div className="market-shell rounded-[30px] border border-border/80 p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-status-true">Exact result</p>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              This market paid out only if the exact prediction landed. The result below tells the user in plain English whether the outcome matched before any chain-level audit details.
            </p>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <div className="rounded-[24px] border border-border/70 bg-background/35 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Predicted outcome</p>
                <p className="mt-2 text-sm leading-7 text-foreground">{presentation.scenario}</p>
              </div>
              <div className="rounded-[24px] border border-border/70 bg-background/35 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Settlement result</p>
                <p className={`mt-2 text-sm leading-7 ${matched ? "text-status-true" : "text-muted-foreground"}`}>
                  {matched
                    ? "The exact combination landed, so the premium payout tier was activated."
                    : "The exact combination did not land, so the payout resolved to zero."}
                </p>
              </div>
            </div>
          </div>

          <div className="market-shell rounded-[30px] border border-border/80 p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-status-true">On-chain receipt trail</p>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              Explorer links stay visible for auditability, but they sit below the human-readable settlement explanation instead of replacing it.
            </p>
            <div className="mt-5 divide-y divide-border/70 rounded-[24px] border border-border/70 bg-background/35">
              {signatures?.length ? (
                signatures.map((signature) => (
                  <a
                    key={signature.signature}
                    href={explorerTxUrl(signature.signature)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 px-4 py-3 text-sm text-muted-foreground hover:bg-background/40 hover:text-foreground"
                  >
                    <span className={signature.err ? "text-status-false" : "text-status-true"}>
                      {signature.err ? "Failed" : "Confirmed"}
                    </span>
                    <span className="truncate font-mono">{signature.signature}</span>
                  </a>
                ))
              ) : (
                <div className="px-4 py-3 text-sm text-muted-foreground">
                  {signaturesExpired
                    ? "This product's transaction history has aged out of the public devnet RPC's retention window. The settlement is still real and on-chain -- see the recorded signatures in DEVNET.md."
                    : "Loading transaction history…"}
                </div>
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
                    <span className={`font-mono ${matched ? "text-status-true" : "text-foreground"}`}>
                      {formatSol(recomputedPayout)} SOL
                    </span>
                  </div>
                </div>
                {!position.claimed && data.status === "settled" ? (
                  <Button onClick={() => claim.mutate(geoProduct)} disabled={claim.isPending} className="w-full rounded-full">
                    {claim.isPending ? "Claiming…" : "Claim payout"}
                  </Button>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {position.claimed ? "This payout has already been claimed." : "Waiting for settlement."}
                  </p>
                )}
              </div>
            ) : (
              <p className="mt-4 text-sm leading-7 text-muted-foreground">
                Connect the wallet that bought this market to see the personal payout receipt and claim state here.
              </p>
            )}

            <div className="mt-5 flex flex-col gap-3">
              <Link href={`/watch/geo/${productAddress}`} className="inline-flex min-h-11 items-center justify-center rounded-full border border-border/70 px-5 py-2.5 text-sm font-semibold text-muted-foreground hover:text-foreground">
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
