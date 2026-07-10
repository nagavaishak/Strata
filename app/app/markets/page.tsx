"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { GeoProductCard, TieredProductCard } from "@/components/product-card";
import { useAllGeoProducts, useAllProducts } from "@/lib/hooks/useAllProducts";
import { useLiveFixtures } from "@/lib/hooks/useLiveFixtures";
import { getListEntryPresentation } from "@/lib/market-presentation";

type StatusFilter = "trending" | "live" | "open" | "settled";
type CategoryFilter = "all" | "football" | "structured" | "exact";

function MarketsInner() {
  const searchParams = useSearchParams();
  const { data: tiered, isLoading: tieredLoading } = useAllProducts();
  const { data: geo, isLoading: geoLoading } = useAllGeoProducts();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("trending");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    const nextFilter = searchParams.get("filter");
    const nextCategory = searchParams.get("category");
    const nextQuery = searchParams.get("q");

    setStatusFilter(
      nextFilter === "live" || nextFilter === "open" || nextFilter === "settled" ? nextFilter : "trending"
    );
    setCategoryFilter(
      nextCategory === "football" || nextCategory === "structured" || nextCategory === "exact" ? nextCategory : "all"
    );
    setQuery(nextQuery ?? "");
  }, [searchParams]);

  const fixtureIds = useMemo(() => {
    const ids = new Set<number>();
    tiered?.forEach((entry) => entry.data.status === "open" && ids.add(Number(entry.data.fixtureId)));
    geo?.forEach((entry) => entry.data.status === "open" && ids.add(Number(entry.data.fixtureId)));
    return [...ids];
  }, [tiered, geo]);

  const liveFixtures = useLiveFixtures(fixtureIds);
  const cards = useMemo(() => {
    const merged = [...(tiered ?? []), ...(geo ?? [])];
    return merged
      .map((entry) => ({ entry, presentation: getListEntryPresentation(entry) }))
      .sort((a, b) => Number(b.entry.data.totalStake - a.entry.data.totalStake));
  }, [geo, tiered]);

  const filtered = cards.filter(({ entry, presentation }) => {
    const live = !!liveFixtures[Number(entry.data.fixtureId)]?.live;
    const matchesStatus =
      statusFilter === "trending"
        ? true
        : statusFilter === "live"
          ? entry.data.status === "open" && live
          : entry.data.status === statusFilter;

    const matchesCategory =
      categoryFilter === "all"
        ? true
        : categoryFilter === "football"
          ? presentation.sport === "Football"
          : categoryFilter === "structured"
            ? entry.kind === "tiered"
            : entry.kind === "geo";

    const haystack = [presentation.marketTitle, presentation.sport, presentation.scenario]
      .join(" ")
      .toLowerCase();
    const matchesQuery = query.trim() ? haystack.includes(query.toLowerCase()) : true;

    return matchesStatus && matchesCategory && matchesQuery;
  });

  const isLoading = tieredLoading || geoLoading;

  return (
    <div className="mx-auto max-w-[1480px] px-4 py-6">
      <section className="market-shell overflow-hidden rounded-[20px] border border-border/80">
        <div className="border-b border-border/60 px-4 py-2 text-[11px] font-semibold">
          <div className="flex gap-5">
            {(["trending", "live", "open", "settled"] as StatusFilter[]).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setStatusFilter(item)}
                className={statusFilter === item ? "text-foreground" : "text-muted-foreground"}
              >
                {item === "trending" ? "Trending" : item.charAt(0).toUpperCase() + item.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="border-b border-border/60 px-4 py-3">
          <div className="flex flex-wrap gap-2">
            <label className="flex min-w-[220px] flex-1 items-center gap-2 rounded-xl border border-border/80 bg-card/55 px-3 py-2">
              <Search className="size-3.5 text-muted-foreground" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="w-full bg-transparent text-[11px] text-foreground outline-none placeholder:text-muted-foreground"
                placeholder="Search markets..."
              />
            </label>

            {([
              ["football", "Football"],
              ["all", "All Leagues"],
              ["structured", "Market Type"],
              ["open", "Status: Open"],
            ] as const).map(([value, label]) => (
              <button
                key={`${value}-${label}`}
                type="button"
                onClick={() => {
                  if (value === "football" || value === "structured") setCategoryFilter(value);
                  if (value === "all") setCategoryFilter("all");
                  if (value === "open") setStatusFilter("open");
                }}
                className="rounded-xl border border-border/80 bg-card/45 px-3 py-2 text-[11px] font-semibold text-foreground"
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 p-4 xl:grid-cols-3">
          {isLoading ? (
            Array.from({ length: 9 }).map((_, index) => (
              <div key={index} className="h-[218px] animate-pulse rounded-[18px] border border-border/70 bg-card/60" />
            ))
          ) : filtered.length ? (
            filtered.map(({ entry }) =>
              entry.kind === "tiered" ? (
                <TieredProductCard
                  key={entry.address.toBase58()}
                  entry={entry}
                  live={liveFixtures[Number(entry.data.fixtureId)]?.live}
                />
              ) : (
                <GeoProductCard
                  key={entry.address.toBase58()}
                  entry={entry}
                  live={liveFixtures[Number(entry.data.fixtureId)]?.live}
                />
              )
            )
          ) : (
            <div className="col-span-full rounded-[18px] border border-border/70 bg-background/35 p-10 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-status-true">No markets</p>
              <p className="mt-3 text-[14px] font-semibold text-foreground">Try another search or switch the filters.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default function MarketsPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-[1480px] px-4 py-6 text-sm text-muted-foreground">Loading markets…</div>}>
      <MarketsInner />
    </Suspense>
  );
}
