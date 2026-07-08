const CLOSING_SOON_SECONDS = 30 * 60;

export type MarketStatus = "open" | "closing-soon" | "live" | "settling" | "settled";

interface MarketStatusInput {
  status: "open" | "settled";
  closesAt: bigint;
  live?: boolean;
}

/** Single source of truth for the status a card/detail page should show — derives
 * finer-grained states (closing-soon, live, settling) from the two on-chain statuses
 * ("open" | "settled") plus timestamps already present on every product. */
export function deriveMarketStatus({ status, closesAt, live }: MarketStatusInput): MarketStatus {
  if (status === "settled") return "settled";

  const now = Math.floor(Date.now() / 1000);
  const secondsToClose = Number(closesAt) - now;

  if (secondsToClose <= 0) return "settling";
  if (live) return "live";
  if (secondsToClose < CLOSING_SOON_SECONDS) return "closing-soon";
  return "open";
}

export const MARKET_STATUS_LABEL: Record<MarketStatus, string> = {
  open: "Open",
  "closing-soon": "Closing soon",
  live: "Live",
  settling: "Settling",
  settled: "Settled",
};

export const MARKET_STATUS_COLOR: Record<MarketStatus, string> = {
  open: "text-muted-foreground",
  "closing-soon": "text-status-pending",
  live: "text-status-true",
  settling: "text-status-pending",
  settled: "text-foreground",
};
