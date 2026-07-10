"use client";

import Link from "next/link";
import { ArrowRight, ShieldCheck, TimerReset, Trophy } from "lucide-react";
import { HowItWorksDialog } from "@/components/how-it-works-dialog";
import { GeoProductCard, TieredProductCard } from "@/components/product-card";
import { useAllGeoProducts, useAllProducts } from "@/lib/hooks/useAllProducts";
import { dedupeByFixture } from "@/lib/dedupe-by-fixture";
import { bpsToMultiplier, formatSol } from "@/lib/format";
import { getFixturePresentation, getGeoMarketPresentation, getTieredMarketPresentation } from "@/lib/market-presentation";

const VALUE_PROPS = [
  {
    icon: Trophy,
    title: "Structured payouts",
    body: "Read the match, compare the setup, and understand the payout before you commit capital.",
  },
  {
    icon: ShieldCheck,
    title: "Proof-backed settlement",
    body: "Every result still resolves through Strata's on-chain engine without making the front-end feel technical.",
  },
  {
    icon: TimerReset,
    title: "Football-first UX",
    body: "The product leads with match identity, scenario, timing, and market shape instead of protocol jargon.",
  },
];

function MiniCard({
  title,
  subtitle,
  yesLabel,
  noLabel,
  volume,
  href,
}: {
  title: string;
  subtitle: string;
  yesLabel: string;
  noLabel: string;
  volume: string;
  href: string;
}) {
  return (
    <Link href={href} className="market-shell rounded-[16px] border border-border/80 p-3 transition-colors hover:border-status-true/35">
      <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{subtitle}</p>
      <p className="mt-2 text-[13px] font-semibold tracking-tight text-foreground">{title}</p>
      <div className="mt-3 flex gap-2 text-[10px]">
        <span className="rounded-full border border-status-true/25 bg-status-true/10 px-2 py-1 font-semibold text-status-true">{yesLabel}</span>
        <span className="rounded-full border border-border/70 bg-background/40 px-2 py-1 font-semibold text-muted-foreground">{noLabel}</span>
      </div>
      <p className="mt-3 text-[9px] text-muted-foreground">{volume}</p>
    </Link>
  );
}

export default function HomePage() {
  const { data: tiered } = useAllProducts();
  const { data: geo } = useAllGeoProducts();

  const featuredTiered = dedupeByFixture(tiered ?? [])
    .sort((a, b) => Number(b.data.totalStake - a.data.totalStake))
    .slice(0, 4);
  const featuredGeo = dedupeByFixture(geo ?? []).slice(0, 2);
  const spotlightTiered = featuredTiered[0];
  const spotlightGeo = !spotlightTiered ? featuredGeo[0] : null;

  const fallbackFixture = getFixturePresentation("17952170");
  const spotlightPresentation = spotlightTiered
    ? getTieredMarketPresentation(spotlightTiered.data)
    : spotlightGeo
      ? getGeoMarketPresentation(spotlightGeo.data)
      : {
          ...fallbackFixture,
          scenario: fallbackFixture.context,
        };

  const spotlightHref = spotlightTiered
    ? `/watch/${spotlightTiered.address.toBase58()}`
    : spotlightGeo
      ? `/watch/geo/${spotlightGeo.address.toBase58()}`
      : "/markets";

  const spotlightTopPayout = spotlightTiered
    ? bpsToMultiplier(Math.max(...spotlightTiered.data.tiers.map((tier) => tier.payoutBps)))
    : spotlightGeo
      ? bpsToMultiplier(spotlightGeo.data.payoutBpsIfTrue)
      : "—";

  const spotlightPool = spotlightTiered?.data.totalStake ?? spotlightGeo?.data.totalStake ?? 0n;

  return (
    <div className="mx-auto flex max-w-[1480px] flex-col gap-8 px-4 py-6">
      <section className="market-shell overflow-hidden rounded-[20px] border border-border/80">
        <div className="relative overflow-hidden bg-[linear-gradient(180deg,rgba(10,35,26,0.96),rgba(6,11,16,1)_62%)] px-4 py-5">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(87,255,167,0.18),transparent_28%),radial-gradient(circle_at_80%_16%,rgba(97,210,255,0.14),transparent_24%)]" />
          <div className="relative grid gap-4 xl:grid-cols-[1.18fr_0.82fr]">
            <div className="relative min-h-[260px] overflow-hidden rounded-[18px] border border-white/6 bg-[linear-gradient(180deg,rgba(9,19,23,0.32),rgba(5,11,15,0.1))] p-6">
              <div className="absolute bottom-0 right-12 top-6 hidden w-[190px] lg:block">
                <div className="absolute bottom-5 left-1/2 h-3 w-28 -translate-x-1/2 rounded-full bg-black/35 blur-lg" />
                <div className="absolute bottom-0 left-1/2 h-[205px] w-[112px] -translate-x-1/2 opacity-95">
                  <div className="absolute left-1/2 top-0 h-6 w-6 -translate-x-1/2 rounded-full bg-[linear-gradient(180deg,#1a2723,#090e0d)]" />
                  <div className="absolute left-1/2 top-5 flex h-20 w-16 -translate-x-1/2 items-center justify-center rounded-[18px_18px_12px_12px] border border-status-true/20 bg-[linear-gradient(180deg,rgba(35,85,65,0.95),rgba(10,26,20,0.95))]">
                    <span className="text-[30px] font-extrabold text-status-true/75">7</span>
                  </div>
                  <div className="absolute left-[8px] top-8 h-16 w-3 rounded-full bg-[linear-gradient(180deg,#101917,#090d0d)] rotate-[14deg]" />
                  <div className="absolute right-[8px] top-8 h-16 w-3 rounded-full bg-[linear-gradient(180deg,#101917,#090d0d)] -rotate-[14deg]" />
                  <div className="absolute left-[34px] top-[88px] h-[100px] w-4 rounded-full bg-[linear-gradient(180deg,#101917,#090d0d)] rotate-[6deg]" />
                  <div className="absolute right-[34px] top-[88px] h-[100px] w-4 rounded-full bg-[linear-gradient(180deg,#101917,#090d0d)] -rotate-[5deg]" />
                </div>
              </div>

              <div className="relative z-10 max-w-[320px]">
                <h1 className="text-[42px] font-semibold leading-[0.98] tracking-tight text-white">
                  Predict football
                  <br />
                  outcomes.
                  <span className="text-gradient"> Not just
                    <br />
                    the winners.</span>
                </h1>
                <p className="mt-4 max-w-[240px] text-[12px] leading-6 text-zinc-300">
                  Real markets. Real stakes. Real-time. Back your edge on every match and scenario.
                </p>
                <div className="mt-5 flex gap-2">
                  <Link href="/markets" className="btn-gradient inline-flex min-h-9 items-center rounded-full px-4 text-[11px] font-semibold">
                    Explore markets
                  </Link>
                  <HowItWorksDialog
                    trigger={
                      <button
                        type="button"
                        className="inline-flex min-h-9 items-center rounded-full border border-border/80 bg-card/60 px-4 text-[11px] font-semibold text-foreground"
                      >
                        How it works
                      </button>
                    }
                  />
                </div>
              </div>
            </div>

            <div className="market-shell relative rounded-[18px] border border-white/10 bg-[linear-gradient(180deg,rgba(7,15,20,0.8),rgba(5,11,16,0.94))] p-4">
              <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Featured market</p>
              <p className="mt-1 text-[10px] text-muted-foreground">{spotlightPresentation.sport}</p>
              <div className="mt-4 text-[16px] font-semibold leading-tight text-foreground">
                {spotlightPresentation.marketTitle}
              </div>
              <div className="mt-2 text-[12px] leading-6 text-muted-foreground">{spotlightPresentation.scenario}</div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-[14px] border border-status-true/25 bg-status-true/10 p-3 text-center">
                  <p className="text-[8px] font-semibold uppercase tracking-[0.18em] text-status-true">Yes</p>
                  <p className="mt-1 text-[16px] font-semibold text-foreground">{spotlightTopPayout}</p>
                </div>
                <div className="rounded-[14px] border border-border/70 bg-background/35 p-3 text-center">
                  <p className="text-[8px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Pool</p>
                  <p className="mt-1 text-[16px] font-semibold text-foreground">{formatSol(spotlightPool)}</p>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between text-[10px] text-muted-foreground">
                <span>{formatSol(spotlightPool)} SOL volume</span>
                <span className="text-status-true">Live</span>
              </div>
              <Link href={spotlightHref} className="btn-gradient mt-4 inline-flex min-h-10 w-full items-center justify-center rounded-[14px] px-4 text-[12px] font-semibold">
                Open market
              </Link>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between">
            <p className="text-[13px] font-semibold text-foreground">Featured Markets</p>
            <Link href="/markets" className="text-[10px] text-muted-foreground hover:text-foreground">
              View all
            </Link>
          </div>
          <div className="mt-3 grid gap-3 xl:grid-cols-4">
            {featuredTiered.length
              ? featuredTiered.slice(0, 4).map((entry) => {
                  const presentation = getTieredMarketPresentation(entry.data);
                  const payout = bpsToMultiplier(Math.max(...entry.data.tiers.map((tier) => tier.payoutBps)));
                  return (
                    <MiniCard
                      key={entry.address.toBase58()}
                      href={`/watch/${entry.address.toBase58()}`}
                      subtitle={presentation.sport}
                      title={presentation.marketTitle}
                      yesLabel={`YES ${payout}`}
                      noLabel={`POOL ${formatSol(entry.data.totalStake)}`}
                      volume={`${formatSol(entry.data.totalStake)} SOL Vol`}
                    />
                  );
                })
              : featuredGeo.slice(0, 4).map((entry) => {
                  const presentation = getGeoMarketPresentation(entry.data);
                  return (
                    <MiniCard
                      key={entry.address.toBase58()}
                      href={`/watch/geo/${entry.address.toBase58()}`}
                      subtitle={presentation.sport}
                      title={presentation.marketTitle}
                      yesLabel={`YES ${bpsToMultiplier(entry.data.payoutBpsIfTrue)}`}
                      noLabel={`POOL ${formatSol(entry.data.totalStake)}`}
                      volume={`${formatSol(entry.data.totalStake)} SOL Vol`}
                    />
                  );
                })}
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="market-shell rounded-[18px] border border-border/80 p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-status-true">Why Strata</p>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {VALUE_PROPS.map((item) => (
              <div key={item.title} className="rounded-[16px] border border-border/70 bg-background/30 p-4">
                <item.icon className="size-4 text-status-true" />
                <h2 className="mt-3 text-[15px] font-semibold text-foreground">{item.title}</h2>
                <p className="mt-2 text-[11px] leading-6 text-muted-foreground">{item.body}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="market-shell rounded-[18px] border border-border/80 p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-status-true">Next step</p>
          <h2 className="mt-3 text-[24px] font-semibold tracking-tight text-foreground">Browse the live board like a real marketplace</h2>
          <p className="mt-3 text-[12px] leading-6 text-muted-foreground">
            Go straight into the explore grid, compare football setups, and move into the market page with full payout clarity.
          </p>
          <Link href="/markets" className="btn-gradient mt-5 inline-flex min-h-10 items-center gap-2 rounded-full px-4 text-[12px] font-semibold">
            Start exploring
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-4">
        {featuredTiered.slice(0, 4).map((entry) => (
          <TieredProductCard key={entry.address.toBase58()} entry={entry} />
        ))}
        {!featuredTiered.length &&
          featuredGeo.slice(0, 4).map((entry) => (
            <GeoProductCard key={entry.address.toBase58()} entry={entry} />
          ))}
      </section>
    </div>
  );
}
