"use client";

import { useEffect, useState } from "react";
import { PublicKey } from "@solana/web3.js";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useProduct } from "@/lib/hooks/useProduct";
import { LegStatusList } from "@/components/leg-status-list";
import { useFinalizeProduct } from "@/lib/hooks/useSettlement";
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

  if (isLoading) {
    return <p className="p-6 text-sm text-muted-foreground">loading product…</p>;
  }
  if (isError || !data) {
    return <p className="p-6 text-sm text-status-false">product not found at {productAddress}</p>;
  }

  const now = Math.floor(Date.now() / 1000);
  const canSettle = data.status === "open" && now >= Number(data.closesAt);
  const allSettled = data.legResults.every((r) => r !== "unsettled");

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-6 py-12">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">01 Watch</h1>
        <p className="mt-1 font-mono text-sm text-muted-foreground">
          fixture {data.fixtureId.toString()} · product {productAddress.slice(0, 8)}…
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-3 font-mono text-xs">
        <span
          className={`h-1.5 w-1.5 rounded-full ${streamStatus?.live ? "bg-status-true" : "bg-status-pending"}`}
        />
        <span className="text-muted-foreground">
          {streamStatus?.live ? `live · seq ${streamStatus.lastSeq}` : "no live stream data for this fixture right now"}
        </span>
        <span className="ml-auto text-muted-foreground">
          status <span className="text-foreground">{data.status}</span>
        </span>
      </div>

      <section className="space-y-3">
        <h2 className="font-mono text-sm text-muted-foreground">legs</h2>
        <LegStatusList
          product={product}
          legs={data.legs}
          legResults={data.legResults}
          closesAtUnixSeconds={Number(data.closesAt)}
          canSettle={canSettle}
        />
      </section>

      {data.status === "open" && allSettled && (
        <Button onClick={() => finalize.mutate(product)} disabled={finalize.isPending}>
          {finalize.isPending ? "finalizing…" : "Finalize product"}
        </Button>
      )}

      {data.status === "settled" && (
        <div className="rounded-lg border border-status-true/30 bg-status-true/5 p-4 font-mono text-sm">
          <p>
            settled · payout <span className="text-status-true">{(data.finalPayoutBps / 10000).toFixed(2)}x</span>
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
