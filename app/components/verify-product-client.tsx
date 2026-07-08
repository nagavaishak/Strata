"use client";

import { PublicKey } from "@solana/web3.js";
import { useWallet } from "@solana/wallet-adapter-react";
import { Button } from "@/components/ui/button";
import { useProduct } from "@/lib/hooks/useProduct";
import { usePosition } from "@/lib/hooks/usePosition";
import { useAccountSignatures } from "@/lib/hooks/useAccountSignatures";
import { useClaim } from "@/lib/hooks/useSettlement";

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

      <section className="space-y-2 rounded-lg border border-border bg-card p-4 font-mono text-sm">
        <p>
          status <span className="text-foreground">{data.status}</span>
        </p>
        <p>
          legs true{" "}
          <span className="text-foreground">
            {data.legResults.filter((r) => r === "true").length} / {data.numLegs}
          </span>
        </p>
        <p>
          final payout <span className="text-status-true">{(data.finalPayoutBps / 10000).toFixed(2)}x</span>{" "}
          <span className="text-muted-foreground">({data.finalPayoutBps} bps — recomputable by anyone from this account alone)</span>
        </p>
      </section>

      {publicKey && (
        <section className="space-y-3 rounded-lg border border-border bg-card p-4 font-mono text-sm">
          <h2 className="text-muted-foreground">your position</h2>
          {position ? (
            <>
              <p>stake {(Number(position.stake) / 1e9).toFixed(6)} SOL</p>
              <p>
                recomputed payout{" "}
                <span className="text-status-true">
                  {recomputedPayout != null ? (Number(recomputedPayout) / 1e9).toFixed(6) : "—"} SOL
                </span>
              </p>
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
        <h2 className="font-mono text-sm text-muted-foreground">on-chain transaction history</h2>
        <p className="text-xs text-muted-foreground">
          Pulled directly from Solana RPC (getSignaturesForAddress) — not from our servers.
          Re-derive this list yourself against the same account to check nothing was hidden.
        </p>
        <div className="space-y-1 font-mono text-xs">
          {signatures?.length ? (
            signatures.map((s) => (
              <a
                key={s.signature}
                href={`https://explorer.solana.com/tx/${s.signature}?cluster=devnet`}
                target="_blank"
                rel="noreferrer"
                className="block truncate text-muted-foreground hover:text-foreground hover:underline"
              >
                {s.err ? "✗" : "✓"} {s.signature}
              </a>
            ))
          ) : (
            <p className="text-muted-foreground">loading transaction history…</p>
          )}
        </div>
      </section>
    </div>
  );
}
