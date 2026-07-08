"use client";

import Link from "next/link";
import { useAllProducts, useAllGeoProducts } from "@/lib/hooks/useAllProducts";

function timeLeft(closesAt: bigint): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = Number(closesAt) - now;
  if (diff <= 0) return "closed";
  const mins = Math.floor(diff / 60);
  if (mins < 60) return `closes in ${mins}m`;
  return `closes in ${Math.floor(mins / 60)}h`;
}

export default function MarketsPage() {
  const { data: tiered, isLoading: loadingTiered } = useAllProducts();
  const { data: geo, isLoading: loadingGeo } = useAllGeoProducts();

  const isLoading = loadingTiered || loadingGeo;
  const total = (tiered?.length ?? 0) + (geo?.length ?? 0);

  return (
    <div className="mx-auto max-w-3xl px-6 py-24">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Markets</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every product created on Strata, tiered and exact-outcome, fetched directly from
          devnet — nothing here is curated or hidden.
        </p>
      </div>

      {isLoading && <p className="font-mono text-sm text-muted-foreground">loading…</p>}

      {!isLoading && total === 0 && (
        <p className="font-mono text-sm text-muted-foreground">
          no products yet —{" "}
          <Link href="/build" className="underline">
            create one
          </Link>
          .
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {tiered?.map((entry) => {
          const href =
            entry.data.status === "open"
              ? `/watch/${entry.address.toBase58()}`
              : `/verify/${entry.address.toBase58()}`;
          return (
            <Link
              key={entry.address.toBase58()}
              href={href}
              className="group flex flex-col gap-2 rounded-lg border border-border bg-card p-4 transition-colors hover:border-foreground/30"
            >
              <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
                <span className="rounded-full border border-border px-2 py-0.5 text-status-true">
                  tiered
                </span>
                <span>fixture {entry.data.fixtureId.toString()}</span>
              </div>
              <p className="text-sm font-medium text-foreground group-hover:underline">
                {entry.data.numLegs} legs · {entry.data.numTiers} tiers
              </p>
              <div className="flex items-center justify-between font-mono text-xs text-muted-foreground">
                <span>{entry.data.status === "open" ? timeLeft(entry.data.closesAt) : "settled"}</span>
                <span>{(Number(entry.data.totalStake) / 1e9).toFixed(4)} SOL staked</span>
              </div>
            </Link>
          );
        })}

        {geo?.map((entry) => {
          const href =
            entry.data.status === "open"
              ? `/watch/geo/${entry.address.toBase58()}`
              : `/verify/geo/${entry.address.toBase58()}`;
          return (
            <Link
              key={entry.address.toBase58()}
              href={href}
              className="group flex flex-col gap-2 rounded-lg border border-border bg-card p-4 transition-colors hover:border-foreground/30"
            >
              <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
                <span className="rounded-full border border-border px-2 py-0.5 text-status-pending">
                  exact-outcome
                </span>
                <span>fixture {entry.data.fixtureId.toString()}</span>
              </div>
              <p className="text-sm font-medium text-foreground group-hover:underline">
                predict {entry.data.statKeyA}={entry.data.predictionA}, {entry.data.statKeyB}=
                {entry.data.predictionB}
              </p>
              <div className="flex items-center justify-between font-mono text-xs text-muted-foreground">
                <span>{entry.data.status === "open" ? timeLeft(entry.data.closesAt) : "settled"}</span>
                <span>{(Number(entry.data.totalStake) / 1e9).toFixed(4)} SOL staked</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
