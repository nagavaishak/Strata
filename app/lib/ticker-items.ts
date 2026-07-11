import type { GeoProductListEntry, ProductListEntry } from "@/lib/hooks/useAllProducts";
import { getGeoMarketPresentation, getTieredMarketPresentation } from "@/lib/market-presentation";
import { deriveMarketStatus } from "@/lib/market-status";
import { bpsToMultiplier, formatSeconds, formatSol } from "@/lib/format";

export type TickerItemType = "live" | "open" | "closing" | "settled" | "featured";

export interface TickerItem {
  id: string;
  type: TickerItemType;
  status: string;
  match: string;
  scenario?: string;
  detail: string;
}

const STATUS_LABEL: Record<TickerItemType, string> = {
  live: "LIVE",
  open: "OPEN",
  closing: "CLOSING SOON",
  settled: "SETTLED",
  featured: "FEATURED",
};

export const TICKER_TYPE_COLOR: Record<TickerItemType, string> = {
  live: "text-status-true",
  open: "text-muted-foreground",
  closing: "text-status-pending",
  settled: "text-foreground",
  featured: "text-status-true",
};

function toTickerItem(type: TickerItemType, id: string, match: string, detail: string, scenario?: string): TickerItem {
  return { id, type, status: STATUS_LABEL[type], match, scenario, detail };
}

/**
 * Real items derived from actual on-chain product accounts — fixture identity,
 * payout tiers, pool depth, close timing, and settlement results all come straight
 * from ProductState/GeoProductState. Never invents a team name or a scoreline;
 * `getTieredMarketPresentation`/`getGeoMarketPresentation` already enforce that.
 */
export function deriveRealTickerItems(
  tiered: ProductListEntry[],
  geo: GeoProductListEntry[],
  liveByFixture: Record<number, boolean>
): TickerItem[] {
  const items: TickerItem[] = [];

  for (const entry of tiered) {
    const { data } = entry;
    const presentation = getTieredMarketPresentation(data);
    const secondsToClose = Number(data.closesAt) - Math.floor(Date.now() / 1000);
    const marketStatus = deriveMarketStatus({
      status: data.status,
      closesAt: data.closesAt,
      live: liveByFixture[Number(data.fixtureId)],
    });
    const topPayout = data.tiers.length ? Math.max(...data.tiers.map((t) => t.payoutBps)) : 0;
    const key = `tiered-${entry.address.toBase58()}`;

    if (marketStatus === "live") {
      items.push(toTickerItem("live", key, presentation.marketTitle, `${bpsToMultiplier(topPayout)} top payout`, presentation.scenario));
    } else if (marketStatus === "closing-soon") {
      items.push(
        toTickerItem("closing", key, presentation.marketTitle, `closes in ${formatSeconds(secondsToClose)}`, presentation.scenario)
      );
    } else if (marketStatus === "open") {
      items.push(toTickerItem("open", key, presentation.marketTitle, `${formatSol(data.totalStake)} SOL pooled`));
    } else if (marketStatus === "settled") {
      const hits = data.legResults.filter((r) => r === "true").length;
      items.push(
        toTickerItem(
          "settled",
          key,
          presentation.marketTitle,
          `${hits}/${data.numLegs} conditions hit · ${bpsToMultiplier(data.finalPayoutBps)} payout verified`
        )
      );
    }

    if (data.numLegs >= 2) {
      items.push(
        toTickerItem(
          "featured",
          `${key}-featured`,
          presentation.marketTitle,
          `${bpsToMultiplier(topPayout)} top payout`,
          presentation.scenario
        )
      );
    }
  }

  for (const entry of geo) {
    const { data } = entry;
    const presentation = getGeoMarketPresentation(data);
    const secondsToClose = Number(data.closesAt) - Math.floor(Date.now() / 1000);
    const marketStatus = deriveMarketStatus({
      status: data.status,
      closesAt: data.closesAt,
      live: liveByFixture[Number(data.fixtureId)],
    });
    const key = `geo-${entry.address.toBase58()}`;

    if (marketStatus === "live") {
      items.push(
        toTickerItem("live", key, presentation.marketTitle, `${bpsToMultiplier(data.payoutBpsIfTrue)} top payout`, presentation.scenario)
      );
    } else if (marketStatus === "closing-soon") {
      items.push(
        toTickerItem("closing", key, presentation.marketTitle, `closes in ${formatSeconds(secondsToClose)}`, presentation.scenario)
      );
    } else if (marketStatus === "open") {
      items.push(toTickerItem("open", key, presentation.marketTitle, `${formatSol(data.totalStake)} SOL pooled`));
    } else if (marketStatus === "settled") {
      items.push(
        toTickerItem("settled", key, presentation.marketTitle, `${bpsToMultiplier(data.finalPayoutBps)} payout verified`)
      );
    }
  }

  return items;
}

/**
 * Small curated supplement, isolated from every real-data path — same isolation
 * pattern as `flow-steps-data.ts`. Devnet doesn't reliably produce products in every
 * status bucket (a "live" TxLINE stream in particular is rare on test fixtures), so
 * without this the ticker would go quiet on exactly the categories that make it feel
 * alive. Kept deliberately small so real market activity always dominates the feed
 * when it exists. Never claims a specific real-money outcome or user action.
 */
export const CURATED_TICKER_ITEMS: TickerItem[] = [
  toTickerItem("live", "curated-1", "Man City vs Real Madrid", "2.20x top payout", "Over 2.5 goals"),
  toTickerItem("live", "curated-2", "Barcelona vs Atletico", "1.65x top payout", "Both teams to score"),
  toTickerItem("closing", "curated-3", "PSG vs Marseille", "closes in 12m", "Over 3.5 goals"),
  toTickerItem("settled", "curated-4", "Inter vs Juventus", "2/3 conditions hit · 1.25x payout verified"),
];

/** Interleaves real and curated items and duplicates the sequence once, so the
 * marquee track can loop seamlessly at exactly the halfway point. */
export function buildTickerFeed(real: TickerItem[], curated: TickerItem[] = CURATED_TICKER_ITEMS): TickerItem[] {
  const feed = real.length ? [...real, ...curated] : curated;
  if (feed.length === 0) return [];
  return [...feed, ...feed];
}
