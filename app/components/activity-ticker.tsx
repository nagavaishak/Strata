"use client";

import { useMemo, useState } from "react";
import { useAllGeoProducts, useAllProducts } from "@/lib/hooks/useAllProducts";
import { useLiveFixtures } from "@/lib/hooks/useLiveFixtures";
import { buildTickerFeed, deriveRealTickerItems, TICKER_TYPE_COLOR, type TickerItem } from "@/lib/ticker-items";

function TickerEntry({ item }: { item: TickerItem }) {
  const color = TICKER_TYPE_COLOR[item.type];
  return (
    <div className="flex shrink-0 items-center gap-2 px-6 text-[12px] whitespace-nowrap">
      <span className={`size-1.5 rounded-full bg-current ${color}`} />
      <span className={`font-semibold tracking-[0.08em] ${color}`}>{item.status}</span>
      <span className="text-border">·</span>
      <span className="text-foreground/85">{item.match}</span>
      {item.scenario && (
        <>
          <span className="text-border">·</span>
          <span className="text-muted-foreground">{item.scenario}</span>
        </>
      )}
      <span className="text-border">·</span>
      <span className={`font-medium ${color}`}>{item.detail}</span>
    </div>
  );
}

/**
 * Slim top activity rail — a continuously scrolling marquee of real (and, where
 * devnet data is too sparse for a given status bucket, a small curated set of)
 * structured football market activity. See lib/ticker-items.ts for the honesty
 * boundary between the two.
 */
export function ActivityTicker() {
  const { data: tiered } = useAllProducts();
  const { data: geo } = useAllGeoProducts();
  const [paused, setPaused] = useState(false);

  const fixtureIds = useMemo(() => {
    const ids = new Set<number>();
    tiered?.forEach((entry) => ids.add(Number(entry.data.fixtureId)));
    geo?.forEach((entry) => ids.add(Number(entry.data.fixtureId)));
    return [...ids];
  }, [tiered, geo]);

  const liveState = useLiveFixtures(fixtureIds);

  const feed = useMemo(() => {
    const liveByFixture = Object.fromEntries(Object.entries(liveState).map(([id, s]) => [Number(id), s.live]));
    const real = deriveRealTickerItems(tiered ?? [], geo ?? [], liveByFixture);
    return buildTickerFeed(real);
  }, [tiered, geo, liveState]);

  if (feed.length === 0) return null;

  return (
    <div
      className="overflow-hidden border-b border-border/40 bg-background/98 py-2"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className={`flex w-max animate-ticker ${paused ? "[animation-play-state:paused]" : ""}`}>
        {feed.map((item, index) => (
          <TickerEntry key={`${item.id}-${index}`} item={item} />
        ))}
      </div>
    </div>
  );
}
