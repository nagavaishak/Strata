"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useAllProducts, useAllGeoProducts } from "@/lib/hooks/useAllProducts";
import { useWriterPool } from "@/lib/hooks/useWriterPool";
import { useLiveFixtures } from "@/lib/hooks/useLiveFixtures";
import { RollingNumber } from "@/components/rolling-number";
import { TieredProductCard, GeoProductCard } from "@/components/product-card";
import { formatSol } from "@/lib/format";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type StatusFilter = "all" | "open" | "settled";
type TypeFilter = "all" | "tiered" | "geo";

export default function MarketsPage() {
  const { data: tiered, isLoading: loadingTiered } = useAllProducts();
  const { data: geo, isLoading: loadingGeo } = useAllGeoProducts();
  const { data: pool } = useWriterPool();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");

  const isLoading = loadingTiered || loadingGeo;

  const openFixtureIds = useMemo(() => {
    const ids = new Set<number>();
    tiered?.forEach((e) => e.data.status === "open" && ids.add(Number(e.data.fixtureId)));
    geo?.forEach((e) => e.data.status === "open" && ids.add(Number(e.data.fixtureId)));
    return [...ids];
  }, [tiered, geo]);
  const liveFixtures = useLiveFixtures(openFixtureIds);
  const liveCount = Object.values(liveFixtures).filter((f) => f.live).length;

  const totalStaked =
    (tiered?.reduce((sum, e) => sum + e.data.totalStake, 0n) ?? 0n) +
    (geo?.reduce((sum, e) => sum + e.data.totalStake, 0n) ?? 0n);
  const openCount =
    (tiered?.filter((e) => e.data.status === "open").length ?? 0) +
    (geo?.filter((e) => e.data.status === "open").length ?? 0);
  const total = (tiered?.length ?? 0) + (geo?.length ?? 0);

  const filteredTiered = (tiered ?? []).filter(
    (e) =>
      (typeFilter === "all" || typeFilter === "tiered") &&
      (statusFilter === "all" || e.data.status === statusFilter)
  );
  const filteredGeo = (geo ?? []).filter(
    (e) =>
      (typeFilter === "all" || typeFilter === "geo") &&
      (statusFilter === "all" || e.data.status === statusFilter)
  );

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Markets</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every product created on Strata, tiered and exact-outcome, fetched directly from
          devnet — nothing here is curated or hidden.
        </p>
      </div>

      {/* live stat strip — every number here is real, computed from already-fetched accounts */}
      <div className="mb-6 grid grid-cols-2 gap-3 rounded-lg border border-border bg-card p-4 font-mono sm:grid-cols-4">
        <div>
          <p className="text-[10px] text-muted-foreground">total staked</p>
          <p className="text-lg text-status-true">
            <RollingNumber value={Number(formatSol(totalStaked))} format={(n) => n.toFixed(4)} /> SOL
          </p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground">open markets</p>
          <p className="text-lg">
            <RollingNumber value={openCount} />
          </p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground">live now</p>
          <p className="text-lg text-status-true">
            <RollingNumber value={liveCount} />
          </p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground">pool reserved / owed</p>
          <p className="text-lg">
            {pool ? (
              <>
                {formatSol(pool.reserved)} / {formatSol(pool.owed)}
              </>
            ) : (
              "—"
            )}
          </p>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="open">Open</TabsTrigger>
            <TabsTrigger value="settled">Settled</TabsTrigger>
          </TabsList>
        </Tabs>
        <Tabs value={typeFilter} onValueChange={(v) => setTypeFilter(v as TypeFilter)}>
          <TabsList>
            <TabsTrigger value="all">All types</TabsTrigger>
            <TabsTrigger value="tiered">Tiered</TabsTrigger>
            <TabsTrigger value="geo">Exact</TabsTrigger>
          </TabsList>
        </Tabs>
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

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredTiered.map((entry, i) => (
          <div
            key={entry.address.toBase58()}
            className="animate-in fade-in slide-in-from-bottom-2 fill-mode-both"
            style={{ animationDelay: `${Math.min(i, 12) * 40}ms`, animationDuration: "400ms" }}
          >
            <TieredProductCard
              entry={entry}
              live={liveFixtures[Number(entry.data.fixtureId)]?.live}
            />
          </div>
        ))}
        {filteredGeo.map((entry, i) => (
          <div
            key={entry.address.toBase58()}
            className="animate-in fade-in slide-in-from-bottom-2 fill-mode-both"
            style={{
              animationDelay: `${Math.min(filteredTiered.length + i, 12) * 40}ms`,
              animationDuration: "400ms",
            }}
          >
            <GeoProductCard entry={entry} live={liveFixtures[Number(entry.data.fixtureId)]?.live} />
          </div>
        ))}
      </div>
    </div>
  );
}
