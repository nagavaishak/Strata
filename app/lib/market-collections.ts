import type { GeoProductListEntry, ProductListEntry } from "@/lib/hooks/useAllProducts";
import { deriveMarketStatus } from "@/lib/market-status";
import { getListEntryPresentation, type MarketPresentation } from "@/lib/market-presentation";

export type MarketEntry = ProductListEntry | GeoProductListEntry;

export interface MarketCard {
  entry: MarketEntry;
  presentation: MarketPresentation;
}

function topPayoutBps(entry: MarketEntry): number {
  return entry.kind === "tiered"
    ? entry.data.tiers.length
      ? Math.max(...entry.data.tiers.map((tier) => tier.payoutBps))
      : 0
    : entry.data.payoutBpsIfTrue;
}

export function toMarketCards(tiered: ProductListEntry[], geo: GeoProductListEntry[]): MarketCard[] {
  return [...tiered, ...geo].map((entry) => ({ entry, presentation: getListEntryPresentation(entry) }));
}

/** Real-data ranked collections for the /markets side-rail modules — every list
 * here is a sort/filter over actual on-chain product accounts, never invented. */

export function pickLiveNow(cards: MarketCard[], liveByFixture: Record<number, boolean>, limit = 4): MarketCard[] {
  return cards
    .filter(({ entry }) => entry.data.status === "open" && liveByFixture[Number(entry.data.fixtureId)])
    .slice(0, limit);
}

export function pickClosingSoon(cards: MarketCard[], limit = 4): MarketCard[] {
  const now = Math.floor(Date.now() / 1000);
  return cards
    .filter(({ entry }) => entry.data.status === "open" && Number(entry.data.closesAt) - now > 0)
    .sort((a, b) => Number(a.entry.data.closesAt) - Number(b.entry.data.closesAt))
    .slice(0, limit);
}

export function pickHighestPayout(cards: MarketCard[], limit = 4): MarketCard[] {
  return [...cards].sort((a, b) => topPayoutBps(b.entry) - topPayoutBps(a.entry)).slice(0, limit);
}

export function pickMostActive(cards: MarketCard[], limit = 4): MarketCard[] {
  return [...cards].sort((a, b) => Number(b.entry.data.totalStake - a.entry.data.totalStake)).slice(0, limit);
}

export function pickRecentlySettled(cards: MarketCard[], limit = 4): MarketCard[] {
  return cards
    .filter(({ entry }) => entry.data.status === "settled")
    .sort((a, b) => Number(b.entry.data.closesAt) - Number(a.entry.data.closesAt))
    .slice(0, limit);
}

export interface ScenarioBubble {
  id: string;
  label: string;
  payoutBps: number;
  href: string;
}

function hrefForEntry(entry: MarketEntry): string {
  const address = entry.address.toBase58();
  const open = entry.data.status === "open";
  if (entry.kind === "tiered") return open ? `/watch/${address}` : `/verify/${address}`;
  return open ? `/watch/geo/${address}` : `/verify/geo/${address}`;
}

/** Distinct scenario blurbs across every real market, ranked by payout — a
 * horizontal "popular scenarios" strip reads the marketplace by condition
 * rather than by fixture, without inventing anything: the label is the same
 * real leg-derived scenario text every card already shows. */
export function pickPopularScenarios(cards: MarketCard[], limit = 8): ScenarioBubble[] {
  const seen = new Set<string>();
  const bubbles: ScenarioBubble[] = [];

  for (const card of [...cards].sort((a, b) => topPayoutBps(b.entry) - topPayoutBps(a.entry))) {
    const label = card.presentation.scenario;
    if (seen.has(label)) continue;
    seen.add(label);
    bubbles.push({
      id: card.entry.address.toBase58(),
      label,
      payoutBps: topPayoutBps(card.entry),
      href: hrefForEntry(card.entry),
    });
    if (bubbles.length >= limit) break;
  }

  return bubbles;
}

export function cardStatus(card: MarketCard, liveByFixture: Record<number, boolean>) {
  return deriveMarketStatus({
    status: card.entry.data.status,
    closesAt: card.entry.data.closesAt,
    live: liveByFixture[Number(card.entry.data.fixtureId)],
  });
}
