"use client";

import Link from "next/link";
import { ArrowRight, ShieldCheck, TimerReset, Trophy } from "lucide-react";
import { HowItWorksDialog } from "@/components/how-it-works-dialog";
import { GeoProductCard, TieredProductCard } from "@/components/product-card";
import { useAllGeoProducts, useAllProducts } from "@/lib/hooks/useAllProducts";
import { dedupeByFixture } from "@/lib/dedupe-by-fixture";
import { bpsToMultiplier, formatSol } from "@/lib/format";
import {
  getFixturePresentation,
  getGeoMarketPresentation,
  getTieredMarketPresentation,
  type MarketPresentation,
} from "@/lib/market-presentation";

const VALUE_PROPS = [
  {
    icon: Trophy,
    title: "Structured payouts",
    body: "Buy one market with multiple match conditions and a visible payout ladder instead of a single bare outcome.",
  },
  {
    icon: ShieldCheck,
    title: "Proof-backed settlement",
    body: "Results are verified on-chain against TxLINE proofs, so the consumer surface feels trustworthy without becoming technical.",
  },
  {
    icon: TimerReset,
    title: "Live match context",
    body: "Every market is framed like a real football opportunity first: match, scenario, timing, and price before protocol detail.",
  },
];

export default function HomePage() {
  const { data: tiered } = useAllProducts();
  const { data: geo } = useAllGeoProducts();

  const featuredTiered = dedupeByFixture(tiered ?? [])
    .sort((a, b) => Number(b.data.totalStake - a.data.totalStake))
    .slice(0, 4);
  const featuredGeo = dedupeByFixture(geo ?? []).slice(0, 2);
  const spotlightTiered = featuredTiered[0];
  const spotlightGeo = !spotlightTiered ? featuredGeo[0] : null;

  const openCount =
    (tiered ?? []).filter((entry) => entry.data.status === "open").length +
    (geo ?? []).filter((entry) => entry.data.status === "open").length;
  const settledCount =
    (tiered ?? []).filter((entry) => entry.data.status === "settled").length +
    (geo ?? []).filter((entry) => entry.data.status === "settled").length;
  const totalStaked =
    (tiered ?? []).reduce((sum, entry) => sum + entry.data.totalStake, 0n) +
    (geo ?? []).reduce((sum, entry) => sum + entry.data.totalStake, 0n);

  const fallbackFixture = getFixturePresentation("18175981");
  const spotlightPresentation: MarketPresentation = spotlightTiered
    ? getTieredMarketPresentation(spotlightTiered.data)
    : spotlightGeo
      ? getGeoMarketPresentation(spotlightGeo.data)
      : {
          ...fallbackFixture,
          fixtureId: "18175981",
          marketType: "tiered",
          marketLabel: "Structured market",
          marketTitle: fallbackFixture.hero,
          scenario: fallbackFixture.context,
          shortScenario: "Curated structured market",
          category: "Featured football",
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
      : "1.00x";

  return (
    <div className="mx-auto flex max-w-[1480px] flex-col gap-14 px-6 py-8 sm:py-10">
      <section className="market-shell overflow-hidden rounded-[32px] border border-border/80">
        <div className="grid xl:grid-cols-[1.12fr_0.88fr]">
          <div className="relative overflow-hidden p-8 sm:p-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(20,255,160,0.18),transparent_28%),radial-gradient(circle_at_75%_10%,rgba(89,225,255,0.12),transparent_32%)]" />
            <div className="hero-stadium-glow absolute inset-0 opacity-90" aria-hidden="true" />
            <div className="hero-pitch-lines absolute inset-x-8 bottom-8 top-24 rounded-[28px] opacity-70" aria-hidden="true" />
            <div className="relative flex h-full flex-col justify-between gap-10">
              <div className="grid gap-8 lg:grid-cols-[1.02fr_0.98fr] lg:items-end">
                <div className="relative z-10">
                  <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-card/70 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-status-true">
                    Live football markets • structured payouts
                  </div>
                  <h1 className="mt-6 max-w-4xl text-5xl font-semibold leading-[1.02] tracking-tight text-white sm:text-6xl">
                    Predict football outcomes.
                    <br />
                    <span className="text-gradient">Not just the winners.</span>
                  </h1>
                  <p className="mt-6 max-w-2xl text-base leading-8 text-zinc-300">
                    Real markets. Real stakes. Real-time. Back your edge on every match and scenario with clear payout ladders before you buy.
                  </p>
                  <div className="mt-8 flex flex-wrap gap-3">
                    <Link href="/markets" className="btn-gradient inline-flex min-h-12 items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold">
                      Explore markets
                      <ArrowRight className="size-4" />
                    </Link>
                    <HowItWorksDialog
                      trigger={
                        <button
                          type="button"
                          className="inline-flex min-h-12 items-center rounded-full border border-border/80 bg-card/70 px-5 py-3 text-sm font-semibold text-foreground hover:bg-card"
                        >
                          How it works
                        </button>
                      }
                    />
                  </div>
                </div>

                <div className="relative hidden min-h-[360px] lg:block" aria-hidden="true">
                  <div className="hero-player-wrap absolute inset-0">
                    <div className="hero-player-shadow absolute bottom-0 left-1/2 h-10 w-52 -translate-x-1/2 rounded-full" />
                    <div className="hero-player absolute bottom-0 left-1/2 -translate-x-1/2">
                      <div className="hero-player-head absolute left-1/2 top-0 -translate-x-1/2" />
                      <div className="hero-player-torso absolute left-1/2 top-12 -translate-x-1/2">
                        <span className="hero-player-number">7</span>
                      </div>
                      <div className="hero-player-arm hero-player-arm-left absolute left-[calc(50%-104px)] top-[86px]" />
                      <div className="hero-player-arm hero-player-arm-right absolute left-[calc(50%+58px)] top-[86px]" />
                      <div className="hero-player-leg hero-player-leg-left absolute left-[calc(50%-64px)] top-[228px]" />
                      <div className="hero-player-leg hero-player-leg-right absolute left-[calc(50%+12px)] top-[228px]" />
                    </div>
                    <div className="hero-lights hero-lights-left absolute left-6 top-10 h-28 w-28 rounded-full" />
                    <div className="hero-lights hero-lights-right absolute right-8 top-5 h-32 w-32 rounded-full" />
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-[28px] border border-border/70 bg-background/35 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Open markets</p>
                  <p className="mt-3 text-3xl font-semibold text-status-true">{openCount}</p>
                </div>
                <div className="rounded-[28px] border border-border/70 bg-background/35 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Settled</p>
                  <p className="mt-3 text-3xl font-semibold text-foreground">{settledCount}</p>
                </div>
                <div className="rounded-[28px] border border-border/70 bg-background/35 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Total staked</p>
                  <p className="mt-3 text-3xl font-semibold text-foreground">{formatSol(totalStaked)} SOL</p>
                </div>
              </div>
            </div>
          </div>

          <div className="border-l border-border/70 p-8 sm:p-10">
            <div className="rounded-[28px] border border-border/80 bg-background/45 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Featured market</p>
              <p className="mt-4 text-sm text-muted-foreground">{spotlightPresentation.league}</p>
              <div className="mt-3 flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full border border-border/70 bg-card/80 text-sm font-semibold text-foreground">
                      {spotlightPresentation.homeTeam.slice(0, 2)}
                    </div>
                    <h2 className="text-3xl font-semibold tracking-tight text-foreground">
                      {spotlightPresentation.homeTeam}
                      <span className="px-3 text-muted-foreground">vs</span>
                      {spotlightPresentation.awayTeam}
                    </h2>
                    <div className="flex h-11 w-11 items-center justify-center rounded-full border border-border/70 bg-card/80 text-sm font-semibold text-foreground">
                      {spotlightPresentation.awayTeam.slice(0, 2)}
                    </div>
                  </div>
                  <p className="mt-2 text-base font-medium text-foreground">{spotlightPresentation.marketTitle}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{spotlightPresentation.kickoffLabel}</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Top tier</p>
                  <p className="mt-2 text-3xl font-semibold text-status-true">{spotlightTopPayout}</p>
                </div>
              </div>
              <div className="mt-6 grid grid-cols-3 gap-3">
                <div className="rounded-[18px] border border-border/70 bg-background/35 p-3">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Yes</p>
                  <p className="mt-2 text-lg font-semibold text-status-true">62c</p>
                </div>
                <div className="rounded-[18px] border border-border/70 bg-background/35 p-3">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">No</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">38c</p>
                </div>
                <div className="rounded-[18px] border border-border/70 bg-background/35 p-3">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Volume</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">$2.1M</p>
                </div>
              </div>
              <div className="mt-5 rounded-[20px] border border-border/70 bg-background/30 p-4">
                <p className="text-sm leading-7 text-muted-foreground">{spotlightPresentation.scenario}</p>
              </div>
              <div className="mt-5 rounded-[20px] border border-border/70 bg-background/30 p-4">
                <div className="flex items-end gap-2">
                  <div className="h-12 w-10 rounded-t-xl bg-status-true/25" />
                  <div className="h-18 w-10 rounded-t-xl bg-status-true/55" />
                  <div className="h-10 w-10 rounded-t-xl bg-cyan-400/30" />
                  <div className="h-24 w-10 rounded-t-xl bg-status-true/80" />
                  <div className="h-16 w-10 rounded-t-xl bg-cyan-400/45" />
                  <div className="h-14 w-10 rounded-t-xl bg-status-true/40" />
                </div>
                <p className="mt-3 text-xs text-muted-foreground">Live market pulse and payout movement preview.</p>
              </div>
              <Link href={spotlightHref} className="btn-gradient mt-5 inline-flex min-h-11 items-center rounded-full px-5 py-2.5 text-sm font-semibold">
                Open market
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-status-true">Featured markets</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">Markets worth opening first</h2>
          </div>
          <Link href="/markets" className="text-sm font-semibold text-muted-foreground hover:text-foreground">
            View all
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {featuredTiered.slice(0, 4).map((entry) => (
            <TieredProductCard key={entry.address.toBase58()} entry={entry} />
          ))}
          {!featuredTiered.length &&
            featuredGeo.slice(0, 4).map((entry) => (
              <GeoProductCard key={entry.address.toBase58()} entry={entry} />
            ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
        <div className="market-shell rounded-[32px] border border-border/80 p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-status-true">Why Strata feels different</p>
          <div className="mt-6 grid gap-6 md:grid-cols-3">
            {VALUE_PROPS.map((item) => (
              <div key={item.title}>
                <item.icon className="size-5 text-status-true" />
                <h3 className="mt-4 text-lg font-semibold text-foreground">{item.title}</h3>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">{item.body}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="market-shell rounded-[32px] border border-border/80 p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-status-true">Next step</p>
          <h3 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">Go from browse to buy</h3>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            The experience is built so a first-time visitor can scan the market, understand the payout, and move into a clear buy flow without feeling lost.
          </p>
          <Link href="/markets" className="btn-gradient mt-6 inline-flex min-h-11 items-center rounded-full px-5 py-2.5 text-sm font-semibold">
            Start in Explore
          </Link>
        </div>
      </section>
    </div>
  );
}
