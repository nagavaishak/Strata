"use client";

import { useEffect, useState } from "react";
import { PublicKey } from "@solana/web3.js";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useProduct } from "@/lib/hooks/useProduct";
import { LegStatusList } from "@/components/leg-status-list";
import { TierLadder } from "@/components/tier-ladder";
import { TakePositionPanel } from "@/components/take-position-panel";
import { RollingNumber } from "@/components/rolling-number";
import { useFinalizeProduct } from "@/lib/hooks/useSettlement";
import { useCountdown } from "@/lib/hooks/useCountdown";
import { bpsToMultiplier, formatSol } from "@/lib/format";
import { STRATA_PROGRAM_ID } from "@/lib/constants";

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
        // ignore transient poll failures
      }
    };
    poll();
    const id = setInterval(poll, 4000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [data]);

  const secondsToClose = useCountdown(data ? Number(data.closesAt) : 0);

  if (isLoading) {
    return <p className="p-6 text-sm text-muted-foreground">loading product…</p>;
  }
  if (isError || !data) {
    return <p className="p-6 text-sm text-status-false">product not found at {productAddress}</p>;
  }

  const now = Math.floor(Date.now() / 1000);
  const canSettle = data.status === "open" && now >= Number(data.closesAt);
  const allSettled = data.legResults.every((r) => r !== "unsettled");
  const legsSettled = data.legResults.filter((r) => r !== "unsettled").length;

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-6 py-12">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">01 Watch — settlement terminal</h1>
        <p className="mt-1 font-mono text-sm text-muted-foreground">
          fixture {data.fixtureId.toString()} · product {productAddress.slice(0, 8)}…
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-3 font-mono text-xs">
        <span
          className={`h-1.5 w-1.5 rounded-full ${streamStatus?.live ? "glow-dot bg-status-true" : "bg-status-pending"}`}
        />
        <span className="text-muted-foreground">
          {streamStatus?.live ? (
            <>
              live · seq <RollingNumber value={streamStatus.lastSeq ?? 0} durationMs={300} />
            </>
          ) : (
            "no live stream data for this fixture right now"
          )}
        </span>
        <span className="ml-auto font-mono text-xs">
          {data.status === "open" && secondsToClose > 0 ? (
            <>closes in {Math.ceil(secondsToClose / 60)}m</>
          ) : (
            <span className="text-muted-foreground">
              status <span className="text-foreground">{data.status}</span>
            </span>
          )}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* left: leg list */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-mono text-sm text-muted-foreground">legs</h2>
            <span className="font-mono text-xs text-muted-foreground">
              <RollingNumber value={legsSettled} durationMs={300} />/{data.numLegs} settled
            </span>
          </div>
          <div className="h-1 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-status-true transition-[width] duration-500"
              style={{ width: `${(legsSettled / Math.max(1, data.numLegs)) * 100}%` }}
            />
          </div>
          <LegStatusList
            product={product}
            legs={data.legs}
            legResults={data.legResults}
            closesAtUnixSeconds={Number(data.closesAt)}
            canSettle={canSettle}
          />

          {data.status === "open" && allSettled && (
            <Button onClick={() => finalize.mutate(product)} disabled={finalize.isPending}>
              {finalize.isPending ? "finalizing…" : "Finalize product"}
            </Button>
          )}
        </section>

        {/* right: live payout tier ladder — the money-shot: watch the highlighted tier climb
            as real legs settle */}
        <section className="space-y-3">
          {data.status === "open" ? (
            <TakePositionPanel
              kind="tiered"
              product={product}
              totalStake={data.totalStake}
              maxCapacity={data.maxCapacity}
              tiers={data.tiers}
              numLegs={data.numLegs}
              legResults={data.legResults}
            />
          ) : (
            <>
              <h2 className="font-mono text-sm text-muted-foreground">payout tiers</h2>
              <div className="rounded-lg border border-border bg-card p-3">
                <TierLadder tiers={data.tiers} numLegs={data.numLegs} legResults={data.legResults} />
              </div>
              <div className="rounded-lg border border-border bg-card p-3 font-mono text-xs text-muted-foreground">
                <p>
                  total staked <span className="text-status-true">{formatSol(data.totalStake)} SOL</span>
                </p>
              </div>
            </>
          )}
        </section>
      </div>

      {data.status === "settled" && (
        <div className="rounded-lg border border-status-true/30 bg-status-true/5 p-4 font-mono text-sm">
          <p>
            settled · payout <span className="text-status-true">{bpsToMultiplier(data.finalPayoutBps)}</span>
          </p>
          <Link href={`/verify/${productAddress}`} className="mt-2 inline-block underline">
            02 Verify this settlement →
          </Link>
        </div>
      )}

      <p className="font-mono text-xs text-muted-foreground">
        program{" "}
        <a
          href={`https://explorer.solana.com/address/${STRATA_PROGRAM_ID.toBase58()}?cluster=devnet`}
          target="_blank"
          rel="noreferrer"
          className="hover:underline"
        >
          {STRATA_PROGRAM_ID.toBase58()}
        </a>
      </p>
    </div>
  );
}
