"use client";

import { PublicKey } from "@solana/web3.js";
import { useWallet } from "@solana/wallet-adapter-react";
import { Button } from "@/components/ui/button";
import { useProduct } from "@/lib/hooks/useProduct";
import { usePosition } from "@/lib/hooks/usePosition";
import { useAccountSignatures } from "@/lib/hooks/useAccountSignatures";
import { useClaim } from "@/lib/hooks/useSettlement";
import { TierLadder } from "@/components/tier-ladder";
import { formatSol, bpsToMultiplier } from "@/lib/format";

export function VerifyProductClient({ productAddress }: { productAddress: string }) {
  const product = new PublicKey(productAddress);
  const { publicKey } = useWallet();
  const { data, isLoading, isError } = useProduct(product);
  const { data: position } = usePosition(product, "tiered");
  const { data: signatures } = useAccountSignatures(product);
  const claim = useClaim();

  if (isLoading) return <p className="p-6 text-sm text-muted-foreground">loading…</p>;
  if (isError || !data) return <p className="p-6 text-sm text-status-false">product not found</p>;

  // Recomputed client-side, from on-chain data alone — the whole point of a
  // verification page. Anyone can check this arithmetic matches without
  // trusting our backend at all.
  const recomputedPayout = position
    ? (position.stake * BigInt(data.finalPayoutBps)) / 10000n
    : null;

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-6 py-12">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">02 Verify</h1>
        <p className="mt-1 font-mono text-sm text-muted-foreground">
          fixture {data.fixtureId.toString()} · product {productAddress.slice(0, 8)}…
        </p>
      </div>

      <section className="space-y-3 rounded-lg border border-border bg-card p-4">
        <div className="flex items-center justify-between font-mono text-sm">
          <span>
            status <span className="text-foreground">{data.status}</span>
          </span>
          <span>
            legs true{" "}
            <span className="text-foreground">
              {data.legResults.filter((r) => r === "true").length} / {data.numLegs}
            </span>
          </span>
        </div>
        <div>
          <p className="mb-1 font-mono text-xs text-muted-foreground">payout tier table (achieved tier highlighted)</p>
          <TierLadder tiers={data.tiers} numLegs={data.numLegs} legResults={data.legResults} />
        </div>
      </section>

      {publicKey && (
        <section className="space-y-3 rounded-lg border border-border bg-card p-4 font-mono text-sm">
          <h2 className="text-muted-foreground">your position — recomputed, not trusted</h2>
          {position ? (
            <>
              <div className="space-y-1 rounded bg-secondary/50 p-3 text-xs">
                <p>
                  stake <span className="text-foreground">{formatSol(position.stake, 6)} SOL</span>
                </p>
                <p className="text-muted-foreground">×</p>
                <p>
                  final payout{" "}
                  <span className="text-foreground">{bpsToMultiplier(data.finalPayoutBps)}</span>{" "}
                  <span className="text-muted-foreground">({data.finalPayoutBps} bps)</span>
                </p>
                <p className="text-muted-foreground">=</p>
                <p>
                  recomputed payout{" "}
                  <span className="text-status-true">
                    {recomputedPayout != null ? formatSol(recomputedPayout, 6) : "—"} SOL
                  </span>
                </p>
              </div>
              <p>claimed {position.claimed ? "yes" : "no"}</p>
              {data.status === "settled" && !position.claimed && (
                <Button size="sm" onClick={() => claim.mutate(product)} disabled={claim.isPending}>
                  {claim.isPending ? "claiming…" : "Claim"}
                </Button>
              )}
              {claim.isError && <p className="text-status-false">{(claim.error as Error).message}</p>}
            </>
          ) : (
            <p className="text-muted-foreground">no position for this wallet on this product</p>
          )}
        </section>
      )}

      <section className="space-y-2">
        <h2 className="font-mono text-sm text-muted-foreground">on-chain transaction ledger</h2>
        <p className="text-xs text-muted-foreground">
          Pulled directly from Solana RPC (getSignaturesForAddress) — not from our servers.
          Re-derive this list yourself against the same account to check nothing was hidden.
        </p>
        <div className="divide-y divide-border rounded-lg border border-border font-mono text-xs">
          {signatures?.length ? (
            signatures.map((s) => (
              <a
                key={s.signature}
                href={`https://explorer.solana.com/tx/${s.signature}?cluster=devnet`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 truncate px-3 py-2 text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <span className={s.err ? "text-status-false" : "text-status-true"}>{s.err ? "✗" : "✓"}</span>
                <span className="truncate">{s.signature}</span>
              </a>
            ))
          ) : (
            <p className="p-3 text-muted-foreground">loading transaction history…</p>
          )}
        </div>
      </section>
    </div>
  );
}
