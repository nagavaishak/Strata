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
import { bpsToMultiplier, formatSol, truncateAddress } from "@/lib/format";
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
    return <p className="p-6 text-sm text-muted-foreground">loading market…</p>;
  }
  if (isError || !data) {
    return <p className="p-6 text-sm text-status-false">market not found at {productAddress}</p>;
  }

  const now = Math.floor(Date.now() / 1000);
  const canSettle = data.status === "open" && now >= Number(data.closesAt);
  const allSettled = data.legResults.every((r) => r !== "unsettled");
  const legsSettled = data.legResults.filter((r) => r !== "unsettled").length;

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 px-6 py-10">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-status-true">Structured market</p>
        <h1 className="text-4xl font-semibold tracking-tight">Fixture {data.fixtureId.toString()}</h1>
        <p className="mt-2 text-sm leading-7 text-muted-foreground">
          {data.numLegs} live conditions bundled into one payout ladder.{" "}
          <span className="font-mono">{truncateAddress(productAddress)}</span>
        </p>
      </div>

      <div className="market-shell flex flex-wrap items-center gap-3 rounded-[24px] border border-border/80 px-4 py-3 text-xs">
        <span
          className={`h-1.5 w-1.5 rounded-full ${streamStatus?.live ? "glow-dot bg-status-true" : "bg-status-pending"}`}
        />
        <span className="text-muted-foreground">
          {streamStatus?.live ? (
            <>
              live · seq <RollingNumber value={streamStatus.lastSeq ?? 0} durationMs={300} className="font-mono" />
            </>
          ) : (
            "no live stream data for this fixture right now"
          )}
        </span>
        <span className="ml-auto text-xs">
          {data.status === "open" && secondsToClose > 0 ? (
            <>closes in {Math.ceil(secondsToClose / 60)}m</>
          ) : (
            <span className="text-muted-foreground">
              status <span className="text-foreground">{data.status}</span>
            </span>
          )}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        {/* left: conditions + payout ladder + trust blurb */}
        <section className="space-y-6">
          <div className="market-shell space-y-4 rounded-[28px] border border-border/80 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground">Conditions</h2>
              <span className="text-xs text-muted-foreground">
                <RollingNumber value={legsSettled} durationMs={300} className="font-mono" />/{data.numLegs} settled
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
                {finalize.isPending ? "finalizing…" : "Finalize market"}
              </Button>
            )}
          </div>

          <div className="market-shell space-y-3 rounded-[28px] border border-border/80 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground">Payout ladder</h2>
              <span className="rounded-full border border-status-true/25 bg-status-true/10 px-3 py-1 text-xs font-semibold text-status-true">
                Top tier {bpsToMultiplier(Math.max(...data.tiers.map((tier) => tier.payoutBps)))}
              </span>
            </div>
            <div className="rounded-[24px] border border-border/70 bg-background/35 p-4">
              <TierLadder tiers={data.tiers} numLegs={data.numLegs} legResults={data.legResults} />
            </div>
          </div>

          <div className="market-shell rounded-[28px] border border-border/80 p-5 text-sm text-muted-foreground">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Proof-backed settlement</p>
            Settlement is a permissionless CPI into TxLINE&rsquo;s on-chain proof verifier — anyone can
            call it, no oracle to trust.{" "}
            <a
              href={`https://explorer.solana.com/address/${STRATA_PROGRAM_ID.toBase58()}?cluster=devnet`}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-foreground hover:underline"
            >
              {truncateAddress(STRATA_PROGRAM_ID.toBase58())}
            </a>
          </div>
        </section>

        {/* right: buy module for open markets, settled summary otherwise */}
        <section className="space-y-3 lg:sticky lg:top-6 lg:self-start">
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
            <div className="market-shell rounded-[28px] border border-border/80 p-5 text-sm text-muted-foreground">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Settled market</p>
              <p>
                total staked <span className="font-mono text-status-true">{formatSol(data.totalStake)} SOL</span>
              </p>
            </div>
          )}
        </section>
      </div>

      {data.status === "settled" && (
        <div className="rounded-lg border border-status-true/30 bg-status-true/5 p-4 text-sm">
          <p>
            Settled · payout <span className="font-mono text-status-true">{bpsToMultiplier(data.finalPayoutBps)}</span>
          </p>
          <Link href={`/verify/${productAddress}`} className="mt-2 inline-block underline">
            Verify this settlement →
          </Link>
        </div>
      )}
    </div>
  );
}
