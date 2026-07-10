"use client";

import { bpsToMultiplier } from "@/lib/format";
import type { GeoProductListEntry, ProductListEntry } from "@/lib/hooks/useAllProducts";

interface BackdropTile {
  key: string;
  fixtureId: string;
  payout: string;
  open: boolean;
}

function toTiles(tiered: ProductListEntry[], geo: GeoProductListEntry[]): BackdropTile[] {
  const tieredTiles = tiered.slice(0, 10).map((entry) => ({
    key: entry.address.toBase58(),
    fixtureId: entry.data.fixtureId.toString(),
    payout: bpsToMultiplier(Math.max(...entry.data.tiers.map((t) => t.payoutBps), 0)),
    open: entry.data.status === "open",
  }));
  const geoTiles = geo.slice(0, 6).map((entry) => ({
    key: entry.address.toBase58(),
    fixtureId: entry.data.fixtureId.toString(),
    payout: bpsToMultiplier(entry.data.payoutBpsIfTrue),
    open: entry.data.status === "open",
  }));
  return [...tieredTiles, ...geoTiles];
}

/** Atmospheric backdrop only — simplified tiles inspired by real fetched data,
 * not the foreground TieredProductCard/GeoProductCard components (too detailed,
 * too fragile as background texture). Falls back to the existing decorative
 * stadium/player glow when there's no real data yet. */
export function HeroBackdropBoard({
  tiered,
  geo,
}: {
  tiered: ProductListEntry[];
  geo: GeoProductListEntry[];
}) {
  const tiles = toTiles(tiered, geo);

  if (tiles.length === 0) {
    return <div className="hero-stadium-glow absolute inset-0" aria-hidden />;
  }

  const row = [...tiles, ...tiles].slice(0, 12);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="hero-stadium-glow absolute inset-0" />
      <div className="absolute inset-0 opacity-[0.35] blur-[2px]">
        <div className="grid h-full grid-cols-4 gap-3 p-6 sm:grid-cols-6">
          {row.map((tile, i) => (
            <div
              key={`${tile.key}-${i}`}
              className="market-chip flex flex-col justify-between rounded-2xl p-3 text-[10px]"
            >
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Fixture {tile.fixtureId}</span>
                {tile.open && <span className="h-1.5 w-1.5 rounded-full bg-status-true" />}
              </div>
              <span className="text-sm font-semibold text-status-true">{tile.payout}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(6,11,16,0.55)_0%,rgba(6,11,16,0.88)_70%,rgba(6,11,16,0.97)_100%)]" />
    </div>
  );
}
