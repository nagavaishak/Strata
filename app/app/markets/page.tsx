"use client";

import { Suspense, useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAllProducts, useAllGeoProducts } from "@/lib/hooks/useAllProducts";
import { useWriterPool } from "@/lib/hooks/useWriterPool";
import { useLiveFixtures } from "@/lib/hooks/useLiveFixtures";
import { RollingNumber } from "@/components/rolling-number";
import { TieredProductCard, GeoProductCard } from "@/components/product-card";
import { formatSol } from "@/lib/format";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ProductListEntry, GeoProductListEntry } from "@/lib/hooks/useAllProducts";

type StatusFilter = "all" | "live" | "open" | "settled";
type TypeFilter = "all" | "tiered" | "geo";

/** Curated, not raw account order — open-first, highest-stake first, same sort
 * already used for the homepage's featured strip. */
function curatedSort<T extends { data: { status: string; totalStake: bigint } }>(entries: T[]): T[] {
  return entries.slice().sort((a, b) => {
    if (a.data.status !== b.data.status) return a.data.status === "open" ? -1 : 1;
    return b.data.totalStake > a.data.totalStake ? 1 : -1;
  });
}

function MarketsPageInner() {
  const searchParams = useSearchParams();
  const { data: tiered, isLoading: loadingTiered } = useAllProducts();
  const { data: geo, isLoading: loadingGeo } = useAllGeoProducts();
  const { data: pool } = useWriterPool();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");

  useEffect(() => {
    if (searchParams.get("filter") === "live") setStatusFilter("live");
  }, [searchParams]);

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

  const isLive = (e: ProductListEntry | GeoProductListEntry) =>
    !!liveFixtures[Number(e.data.fixtureId)]?.live;

  const matchesStatus = (e: ProductListEntry | GeoProductListEntry) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "live") return e.data.status === "open" && isLive(e);
    return e.data.status === statusFilter;
  };

  const filteredTiered = curatedSort(
    (tiered ?? []).filter((e) => (typeFilter === "all" || typeFilter === "tiered") && matchesStatus(e))
  );
  const filteredGeo = curatedSort(
    (geo ?? []).filter((e) => (typeFilter === "all" || typeFilter === "geo") && matchesStatus(e))
  );

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Explore markets</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every structured sports market on Strata, fetched directly from devnet — nothing
          here is curated or hidden.
        </p>
      </div>

      {/* live stat strip — every number here is real, computed from already-fetched accounts */}
      <div className="mb-6 grid grid-cols-2 gap-3 rounded-lg border border-border bg-card p-4 sm:grid-cols-4">
        <div>
          <p className="text-[10px] text-muted-foreground">total staked</p>
          <p className="font-mono text-lg text-status-true">
            <RollingNumber value={Number(formatSol(totalStaked))} format={(n) => n.toFixed(4)} /> SOL
          </p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground">open markets</p>
          <p className="font-mono text-lg">
            <RollingNumber value={openCount} />
          </p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground">live now</p>
          <p className="font-mono text-lg text-status-true">
            <RollingNumber value={liveCount} />
          </p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground">pool reserved / owed</p>
          <p className="font-mono text-lg">
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
            <TabsTrigger value="live">Live</TabsTrigger>
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

      {isLoading && <p className="text-sm text-muted-foreground">loading…</p>}

      {!isLoading && total === 0 && (
        <p className="text-sm text-muted-foreground">
          No markets yet —{" "}
          <Link href="/create" className="underline">
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
            <TieredProductCard entry={entry} live={liveFixtures[Number(entry.data.fixtureId)]?.live} />
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

export default function MarketsPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-[1400px] px-6 py-8 text-sm text-muted-foreground">loading…</div>}>
      <MarketsPageInner />
    </Suspense>
  );
}
