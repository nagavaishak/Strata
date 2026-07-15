"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { Clock3, Flame, Search } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { GeoProductCard, TieredProductCard, type CardSize } from "@/components/product-card";
import { FeaturedShowcaseHero } from "@/components/featured-showcase-hero";
import { SideRailModule, closingMetric, payoutMetric } from "@/components/side-rail-module";
import { HighestPayoutBoard, MostActiveBoard, RecentlySettledBoard } from "@/components/market-collection-boards";
import { ScenarioBubbleRow } from "@/components/scenario-bubble-row";
import { MarketsEmptyState } from "@/components/markets-empty-state";
import { useAllGeoProducts, useAllProducts } from "@/lib/hooks/useAllProducts";
import { useLiveFixtures } from "@/lib/hooks/useLiveFixtures";
import { useFixtureMetadata } from "@/lib/hooks/useFixtureMetadata";
import {
  pickClosingSoon,
  pickHighestPayout,
  pickLiveNow,
  pickMostActive,
  pickPopularScenarios,
  pickRecentlySettled,
  toMarketCards,
  type MarketCard,
} from "@/lib/market-collections";
import { isVerifiedPlay } from "@/lib/verified-plays";
import { getVerifiedFixture } from "@/lib/fixture-identity";
import { withLiveFixtureIdentity } from "@/lib/market-presentation";

type StatusFilter = "trending" | "live" | "open" | "settled";
type CategoryFilter = "all" | "football" | "structured" | "exact";

/** Row rhythm for the real market grid: large, then medium x2, then compact x2,
 * then medium — repeats over however many real cards exist, per group of 5. */
const GROUP_PATTERN: CardSize[] = ["large", "medium", "medium", "compact", "compact"];

function sizeForIndex(index: number): CardSize {
  return GROUP_PATTERN[index % GROUP_PATTERN.length];
}

function RenderCard({ card, size, live }: { card: MarketCard; size: CardSize; live?: boolean }) {
  return card.entry.kind === "tiered" ? (
    <TieredProductCard entry={card.entry} live={live} size={size} presentation={card.presentation} />
  ) : (
    <GeoProductCard entry={card.entry} live={live} size={size} presentation={card.presentation} />
  );
}

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
  const liveByFixture = useMemo(
    () => Object.fromEntries(Object.entries(liveFixtures).map(([id, s]) => [Number(id), s.live])),
    [liveFixtures]
  );

  const cards = useMemo(() => {
    const merged = toMarketCards(tiered ?? [], geo ?? []);
    const now = Math.floor(Date.now() / 1000);
    const curated = merged.filter(({ entry }) => {
      if (isVerifiedPlay(entry.address.toBase58())) return true;
      // "Upcoming" means still genuinely tradable — open on-chain AND not past
      // its close time. An open-but-expired account is unsettled test-script
      // leftover, not a real upcoming market, so it's excluded unless verified.
      return entry.data.status === "open" && Number(entry.data.closesAt) > now;
    });
    return curated.sort((a, b) => Number(b.entry.data.totalStake - a.entry.data.totalStake));
  }, [geo, tiered]);

  // Fixtures with no static verified identity (fixture-identity.ts) get a live
  // lookup against TxLINE's own fixtures-metadata API — see
  // lib/txline/session.ts's getFixtureMetadata. The static list still wins
  // when both exist.
  const unresolvedFixtureIds = useMemo(() => {
    const ids = new Set<number>();
    cards.forEach(({ entry }) => {
      if (!getVerifiedFixture(entry.data.fixtureId)) ids.add(Number(entry.data.fixtureId));
    });
    return [...ids];
  }, [cards]);
  const liveIdentity = useFixtureMetadata(unresolvedFixtureIds);

  const enrichedCards = useMemo(
    () =>
      cards.map((card) => ({
        ...card,
        presentation: withLiveFixtureIdentity(
          card.presentation,
          card.entry.data.fixtureId,
          liveIdentity[Number(card.entry.data.fixtureId)]
        ),
      })),
    [cards, liveIdentity]
  );

  const liveNow = useMemo(() => pickLiveNow(enrichedCards, liveByFixture), [enrichedCards, liveByFixture]);
  const closingSoon = useMemo(() => pickClosingSoon(enrichedCards), [enrichedCards]);
  const highestPayout = useMemo(() => pickHighestPayout(enrichedCards), [enrichedCards]);
  const mostActive = useMemo(() => pickMostActive(enrichedCards), [enrichedCards]);
  const recentlySettled = useMemo(() => pickRecentlySettled(enrichedCards), [enrichedCards]);
  const popularScenarios = useMemo(() => pickPopularScenarios(enrichedCards), [enrichedCards]);

  const filtered = enrichedCards.filter(({ entry, presentation }) => {
    const live = !!liveByFixture[Number(entry.data.fixtureId)];
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
    <div className="mx-auto flex max-w-[1480px] flex-col gap-10 px-4 py-6">
      {!isLoading && (
        <section className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <FeaturedShowcaseHero />
          </div>
          <div className="flex flex-col gap-4">
            <SideRailModule title="Live now" icon={Flame} cards={liveNow} metric={payoutMetric} emptyLabel="No live matches right now." />
            <SideRailModule title="Closing soon" icon={Clock3} cards={closingSoon} metric={closingMetric} emptyLabel="Nothing closing soon." />
          </div>
        </section>
      )}

      {!isLoading && cards.length > 0 && (
        <section className="grid gap-4 sm:grid-cols-3">
          <HighestPayoutBoard cards={highestPayout} />
          <MostActiveBoard cards={mostActive} />
          <RecentlySettledBoard cards={recentlySettled} />
        </section>
      )}

      {!isLoading && popularScenarios.length > 0 && <ScenarioBubbleRow scenarios={popularScenarios} />}

      <div className="border-t border-border/60" />

      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-5 text-[12px] font-semibold">
            {(["trending", "live", "open", "settled"] as StatusFilter[]).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setStatusFilter(item)}
                className={statusFilter === item ? "text-foreground" : "text-muted-foreground transition-colors hover:text-foreground"}
              >
                {item === "trending" ? "All football markets" : item.charAt(0).toUpperCase() + item.slice(1)}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="flex min-w-[180px] items-center gap-2 rounded-full border border-border/60 bg-transparent px-3 py-1.5">
              <Search className="size-3 text-muted-foreground" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="w-full bg-transparent text-[11px] text-foreground outline-none placeholder:text-muted-foreground"
                placeholder="Search markets..."
              />
            </label>
            {([
              ["football", "Football"],
              ["structured", "Structured only"],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setCategoryFilter((current) => (current === value ? "all" : value))}
                className={`rounded-full border px-3 py-1.5 text-[10px] font-medium transition-colors ${
                  categoryFilter === value
                    ? "border-status-true/40 bg-status-true/10 text-status-true"
                    : "border-border/50 text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div id="markets-grid" className="scroll-mt-24">
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="h-[218px] animate-pulse rounded-[18px] border border-border/70 bg-card/60" />
              ))}
            </div>
          ) : filtered.length ? (
            <div className="flex flex-col gap-4">
              {Array.from({ length: Math.ceil(filtered.length / GROUP_PATTERN.length) }).map((_, groupIndex) => {
                const group = filtered.slice(groupIndex * GROUP_PATTERN.length, groupIndex * GROUP_PATTERN.length + GROUP_PATTERN.length);
                return (
                  <div key={groupIndex} className="grid grid-cols-1 gap-4 md:grid-cols-4">
                    {group.map((card, i) => {
                      const size = sizeForIndex(i);
                      const spanClass = size === "compact" ? "md:col-span-1" : "md:col-span-2";
                      return (
                        <div key={card.entry.address.toBase58()} className={spanClass}>
                          <RenderCard card={card} size={size} live={liveByFixture[Number(card.entry.data.fixtureId)]} />
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ) : (
            <MarketsEmptyState
              hasQuery={query.trim().length > 0}
              onClearSearch={() => setQuery("")}
              onShowTrending={() => {
                setQuery("");
                setStatusFilter("trending");
                setCategoryFilter("all");
              }}
            />
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
