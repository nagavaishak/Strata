"use client";

import { PublicKey } from "@solana/web3.js";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useGeoProduct } from "@/lib/hooks/useGeoProduct";
import { useSettleGeoProduct } from "@/lib/hooks/useGeoProductActions";
import { TakePositionPanel } from "@/components/take-position-panel";
import { truncateAddress } from "@/lib/format";
import { STRATA_PROGRAM_ID } from "@/lib/constants";

function comparisonSymbol(c: string) {
  return c === "greaterThan" ? ">" : c === "lessThan" ? "<" : "=";
}

export function WatchGeoProductClient({ productAddress }: { productAddress: string }) {
  const geoProduct = new PublicKey(productAddress);
  const { data, isLoading, isError } = useGeoProduct(geoProduct);
  const settle = useSettleGeoProduct();

  if (isLoading) {
    return <p className="p-6 text-sm text-muted-foreground">loading market…</p>;
  }
  if (isError || !data) {
    return <p className="p-6 text-sm text-status-false">market not found at {productAddress}</p>;
  }

  const now = Math.floor(Date.now() / 1000);
  const canSettle = data.status === "open" && now >= Number(data.closesAt);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-6 py-12">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Fixture {data.fixtureId.toString()}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Exact-outcome market · <span className="font-mono">{truncateAddress(productAddress)}</span>
        </p>
      </div>

      <div className="flex items-center justify-between rounded-lg border border-border bg-card p-3 text-xs">
        <span className="text-muted-foreground">
          status <span className="text-foreground">{data.status}</span>
        </span>
        {data.status === "open" && canSettle && (
          <Button size="sm" variant="outline" onClick={() => settle.mutate(geoProduct)} disabled={settle.isPending}>
            {settle.isPending ? "settling…" : "Settle now"}
          </Button>
        )}
      </div>

      {settle.isError && <p className="text-xs text-status-false">{(settle.error as Error).message}</p>}

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="space-y-6">
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground">Prediction</h2>
            <div className="rounded-lg border border-border bg-card p-4 text-sm">
              <p>
                Predicted stat {data.statKeyA} = {data.predictionA}, stat {data.statKeyB} = {data.predictionB}
              </p>
              <p className="mt-1 text-muted-foreground">
                Wins if distance {comparisonSymbol(data.distanceComparison)} {data.distanceThreshold}
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
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

        <section className="space-y-3 lg:sticky lg:top-6 lg:self-start">
          {data.status === "open" && (
            <TakePositionPanel
              kind="geo"
              product={geoProduct}
              totalStake={data.totalStake}
              maxCapacity={data.maxCapacity}
              payoutBpsIfTrue={data.payoutBpsIfTrue}
            />
          )}
        </section>
      </div>

      {data.status === "settled" && (
        <div
          className={`rounded-lg border p-4 text-sm ${
            data.finalPayoutBps > 0
              ? "border-status-true/30 bg-status-true/5"
              : "border-status-false/30 bg-status-false/5"
          }`}
        >
          <p>
            {data.finalPayoutBps > 0 ? "Exact outcome matched" : "Did not match"} · payout{" "}
            <span className={`font-mono ${data.finalPayoutBps > 0 ? "text-status-true" : "text-status-false"}`}>
              {(data.finalPayoutBps / 10000).toFixed(2)}x
            </span>
          </p>
          <Link href={`/verify/geo/${productAddress}`} className="mt-2 inline-block underline">
            Verify this settlement →
          </Link>
        </div>
      )}
    </div>
  );
}
