"use client";

import { PublicKey } from "@solana/web3.js";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useGeoProduct } from "@/lib/hooks/useGeoProduct";
import { useSettleGeoProduct } from "@/lib/hooks/useGeoProductActions";
import { TakePositionPanel } from "@/components/take-position-panel";
import { STRATA_PROGRAM_ID } from "@/lib/constants";

function comparisonSymbol(c: string) {
  return c === "greaterThan" ? ">" : c === "lessThan" ? "<" : "=";
}

export function WatchGeoProductClient({ productAddress }: { productAddress: string }) {
  const geoProduct = new PublicKey(productAddress);
  const { data, isLoading, isError } = useGeoProduct(geoProduct);
  const settle = useSettleGeoProduct();

  if (isLoading) {
    return <p className="p-6 text-sm text-muted-foreground">loading product…</p>;
  }
  if (isError || !data) {
    return <p className="p-6 text-sm text-status-false">product not found at {productAddress}</p>;
  }

  const now = Math.floor(Date.now() / 1000);
  const canSettle = data.status === "open" && now >= Number(data.closesAt);

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-6 py-12">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">01 Watch — exact outcome</h1>
        <p className="mt-1 font-mono text-sm text-muted-foreground">
          fixture {data.fixtureId.toString()} · product {productAddress.slice(0, 8)}…
        </p>
      </div>

      <div className="rounded-lg border border-border bg-card p-4 font-mono text-sm">
        <p>
          predicted stat {data.statKeyA} = {data.predictionA}, stat {data.statKeyB} = {data.predictionB}
        </p>
        <p className="mt-1 text-muted-foreground">
          wins if distance {comparisonSymbol(data.distanceComparison)} {data.distanceThreshold}
        </p>
      </div>

      <div className="flex items-center justify-between rounded-lg border border-border bg-card p-3 font-mono text-xs">
        <span>
          status <span className="text-foreground">{data.status}</span>
        </span>
        {data.status === "open" && canSettle && (
          <Button size="sm" variant="outline" onClick={() => settle.mutate(geoProduct)} disabled={settle.isPending}>
            {settle.isPending ? "settling…" : "Settle now"}
          </Button>
        )}
      </div>

      {settle.isError && <p className="font-mono text-xs text-status-false">{(settle.error as Error).message}</p>}

      {data.status === "open" && (
        <TakePositionPanel
          kind="geo"
          product={geoProduct}
          totalStake={data.totalStake}
          maxCapacity={data.maxCapacity}
          payoutBpsIfTrue={data.payoutBpsIfTrue}
        />
      )}

      {data.status === "settled" && (
        <div
          className={`rounded-lg border p-4 font-mono text-sm ${
            data.finalPayoutBps > 0
              ? "border-status-true/30 bg-status-true/5"
              : "border-status-false/30 bg-status-false/5"
          }`}
        >
          <p>
            {data.finalPayoutBps > 0 ? "exact outcome matched" : "did not match"} · payout{" "}
            <span className={data.finalPayoutBps > 0 ? "text-status-true" : "text-status-false"}>
              {(data.finalPayoutBps / 10000).toFixed(2)}x
            </span>
          </p>
          <Link href={`/verify/geo/${productAddress}`} className="mt-2 inline-block underline">
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
