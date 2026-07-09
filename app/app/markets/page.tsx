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

const SIDEBAR_GROUPS = [
  {
    title: "Categories",
    items: ["All markets", "Popular", "Live", "Closing soon"],
  },
  {
    title: "Sports",
    items: ["Football", "Basketball", "Tennis", "eSports", "More"],
  },
  {
    title: "Market type",
    items: ["All", "Structured", "Exact outcome"],
  },
] as const;

function MarketsInner() {
  const searchParams = useSearchParams();
  const { data: tiered, isLoading: tieredLoading } = useAllProducts();
  const { data: geo, isLoading: geoLoading } = useAllGeoProducts();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("trending");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (searchParams.get("filter") === "live") setStatusFilter("live");
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

    const haystack = [
      presentation.marketTitle,
      presentation.homeTeam,
      presentation.awayTeam,
      presentation.league,
      presentation.scenario,
    ]
      .join(" ")
      .toLowerCase();
    const matchesQuery = query.trim() ? haystack.includes(query.toLowerCase()) : true;

    return matchesStatus && matchesCategory && matchesQuery;
  });

  const isLoading = tieredLoading || geoLoading;

  return (
    <div className="mx-auto max-w-[1400px] space-y-8 px-6 py-8">
      <section className="market-shell rounded-[34px] border border-border/80 p-7">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-status-true">Explore markets</p>
        <div className="mt-4 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight text-foreground">Browse football markets that feel buyable</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
              Scan the match, read the scenario, check the payout ladder, and move into a clear buy flow without digging through protocol details.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-[24px] border border-border/70 bg-background/35 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Markets</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{cards.length}</p>
            </div>
            <div className="rounded-[24px] border border-border/70 bg-background/35 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Live now</p>
              <p className="mt-2 text-2xl font-semibold text-status-true">
                {Object.values(liveFixtures).filter((fixture) => fixture.live).length}
              </p>
            </div>
            <div className="rounded-[24px] border border-border/70 bg-background/35 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Structured edge</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">Tiered</p>
            </div>
          </div>
        </div>
      </section>

      <section className="market-shell rounded-[30px] border border-border/80 p-5">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            {(["trending", "live", "open", "settled"] as StatusFilter[]).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setStatusFilter(item)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  statusFilter === item ? "bg-card text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {item === "trending" ? "Trending" : item.charAt(0).toUpperCase() + item.slice(1)}
              </button>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
            <label className="flex min-h-12 items-center gap-3 rounded-full border border-border/80 bg-background/35 px-4">
              <Search className="size-4 text-muted-foreground" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                placeholder="Search by match, league, or scenario"
              />
            </label>

            <div className="flex flex-wrap gap-2">
              {([
                ["all", "All markets"],
                ["football", "Football"],
                ["structured", "Structured"],
                ["exact", "Exact outcome"],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setCategoryFilter(value)}
                  className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                    categoryFilter === value
                      ? "border-status-true bg-status-true/10 text-status-true"
                      : "border-border/80 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[220px_1fr]">
        <aside className="market-shell hidden rounded-[30px] border border-border/80 p-5 xl:block">
          <div className="space-y-6">
            {SIDEBAR_GROUPS.map((group) => (
              <div key={group.title}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{group.title}</p>
                <div className="mt-3 space-y-1.5">
                  {group.items.map((item, index) => (
                    <div
                      key={item}
                      className={`rounded-full px-3 py-2 text-sm ${
                        index === 0 ? "bg-card text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </aside>

        <div>
          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="market-shell h-[300px] animate-pulse rounded-[30px] border border-border/80 bg-card/60" />
              ))}
            </div>
          ) : filtered.length ? (
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map(({ entry }) =>
                entry.kind === "tiered" ? (
                  <TieredProductCard key={entry.address.toBase58()} entry={entry} live={liveFixtures[Number(entry.data.fixtureId)]?.live} />
                ) : (
                  <GeoProductCard key={entry.address.toBase58()} entry={entry} live={liveFixtures[Number(entry.data.fixtureId)]?.live} />
                )
              )}
            </section>
          ) : (
            <section className="market-shell rounded-[32px] border border-border/80 p-10 text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-status-true">No matches found</p>
              <h2 className="mt-3 text-2xl font-semibold text-foreground">Try another angle</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                Clear the search, switch to trending, or jump back to all markets to find a match setup with the right payout profile.
              </p>
            </section>
          )}
        </div>
      </section>
    </div>
  );
}

export default function MarketsPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-[1400px] px-6 py-8 text-sm text-muted-foreground">Loading markets…</div>}>
      <MarketsInner />
    </Suspense>
  );
}
