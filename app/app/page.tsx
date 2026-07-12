"use client";

import { useAllGeoProducts, useAllProducts } from "@/lib/hooks/useAllProducts";
import { HeroLanding } from "@/components/hero-landing";
import { TradeFlowSection } from "@/components/trade-flow-section";
import { WhyStrataSection } from "@/components/why-strata-section";
import { FeaturedMarketsRail } from "@/components/featured-markets-rail";

const TRUST_POINTS = [
  "Real football fixtures",
  "Visible payout logic",
  "Live condition tracking",
  "Verified settlement receipts",
];

export default function HomePage() {
  const { data: tiered } = useAllProducts();
  const { data: geo } = useAllGeoProducts();

  return (
    <div className="mx-auto flex max-w-[1480px] flex-col gap-20 px-4 py-6">
      <HeroLanding />

      <TradeFlowSection />

      <WhyStrataSection />

      <FeaturedMarketsRail tiered={tiered ?? []} geo={geo ?? []} />

      <section className="market-shell rounded-2xl border border-border/70 p-6 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-status-true">
          Clear before you commit
        </p>
        <div className="mx-auto mt-4 flex max-w-2xl flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
          {TRUST_POINTS.map((point) => (
            <span key={point}>{point}</span>
          ))}
        </div>
      </section>
    </div>
  );
}
