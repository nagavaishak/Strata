import Link from "next/link";
import { GeoProductCard, TieredProductCard } from "@/components/product-card";
import { dedupeByFixture } from "@/lib/dedupe-by-fixture";
import type { GeoProductListEntry, ProductListEntry } from "@/lib/hooks/useAllProducts";

export function FeaturedMarketsRail({
  tiered,
  geo,
}: {
  tiered: ProductListEntry[];
  geo: GeoProductListEntry[];
}) {
  const featuredTiered = dedupeByFixture(tiered)
    .sort((a, b) => Number(b.data.totalStake - a.data.totalStake))
    .slice(0, 4);
  const featuredGeo = dedupeByFixture(geo).slice(0, 4 - featuredTiered.length);

  return (
    <section>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-status-true">Live now</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">Featured football markets</h2>
        </div>
        <Link href="/markets" className="text-sm font-semibold text-muted-foreground hover:text-foreground">
          View all
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {featuredTiered.map((entry) => (
          <TieredProductCard key={entry.address.toBase58()} entry={entry} />
        ))}
        {featuredGeo.map((entry) => (
          <GeoProductCard key={entry.address.toBase58()} entry={entry} />
        ))}
      </div>
    </section>
  );
}
