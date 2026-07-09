"use client";

import Link from "next/link";
import { ArrowRight, ShieldCheck, TimerReset, Trophy } from "lucide-react";
import { HowItWorksDialog } from "@/components/how-it-works-dialog";
import { GeoProductCard, TieredProductCard } from "@/components/product-card";
import { useAllGeoProducts, useAllProducts } from "@/lib/hooks/useAllProducts";
import { dedupeByFixture } from "@/lib/dedupe-by-fixture";
import { bpsToMultiplier, capacityFillFraction, formatPercent, formatSol } from "@/lib/format";
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
  const spotlightStake = spotlightTiered?.data.totalStake ?? spotlightGeo?.data.totalStake ?? 0n;
  const spotlightCapacity = spotlightTiered?.data.maxCapacity ?? spotlightGeo?.data.maxCapacity ?? 0n;
  const spotlightCapacityUsed = formatPercent(capacityFillFraction(spotlightStake, spotlightCapacity));
  const spotlightStatus = spotlightTiered?.data.status ?? spotlightGeo?.data.status ?? "open";

  return (
    <div className="mx-auto flex max-w-[1480px] flex-col gap-14 px-6 py-8 sm:py-10">
      <section className="market-shell overflow-hidden rounded-[32px] border border-border/80">
        <div className="relative overflow-hidden p-8 sm:p-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(20,255,160,0.18),transparent_28%),radial-gradient(circle_at_75%_10%,rgba(89,225,255,0.12),transparent_32%)]" />
          <div className="hero-stadium-glow absolute inset-0 opacity-90" aria-hidden="true" />
          <div className="hero-pitch-lines absolute inset-x-8 bottom-8 top-24 rounded-[28px] opacity-70" aria-hidden="true" />

          <div className="relative flex h-full flex-col gap-10">
            <div className="grid gap-8 xl:grid-cols-[1.08fr_0.92fr] xl:items-end">
              <div className="relative z-10 max-w-[35rem]">
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

              <div className="relative min-h-[420px]">
                <div className="hero-player-wrap absolute inset-0 hidden lg:block" aria-hidden="true">
                  <div className="hero-player-shadow absolute bottom-0 left-[38%] h-10 w-56 -translate-x-1/2 rounded-full" />
                  <div className="hero-player absolute bottom-0 left-[38%] -translate-x-1/2">
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

                <div className="relative z-10 ml-auto flex max-w-[25rem] flex-col rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(7,15,20,0.78),rgba(6,13,18,0.92))] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.34)]">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Featured market</p>
                      <p className="mt-2 text-xs font-medium text-muted-foreground">{spotlightPresentation.league}</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${
                      spotlightStatus === "open"
                        ? "border border-status-true/25 bg-status-true/10 text-status-true"
                        : "border border-border/70 bg-background/35 text-foreground"
                    }`}>
                      {spotlightStatus}
                    </span>
                  </div>

                  <div className="mt-4 flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border/70 bg-card/70 text-sm font-semibold text-foreground">
                      {spotlightPresentation.homeTeam.slice(0, 2)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xl font-semibold tracking-tight text-foreground">
                        {spotlightPresentation.homeTeam}
                        <span className="px-2 text-muted-foreground">vs</span>
                        {spotlightPresentation.awayTeam}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">{spotlightPresentation.marketTitle}</p>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border/70 bg-card/70 text-sm font-semibold text-foreground">
                      {spotlightPresentation.awayTeam.slice(0, 2)}
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-3 gap-2">
                    <div className="rounded-[18px] border border-border/70 bg-background/35 p-3">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Payout</p>
                      <p className="mt-2 text-base font-semibold text-status-true">{spotlightTopPayout}</p>
                    </div>
                    <div className="rounded-[18px] border border-border/70 bg-background/35 p-3">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Pool</p>
                      <p className="mt-2 text-base font-semibold text-foreground">{formatSol(spotlightStake)} SOL</p>
                    </div>
                    <div className="rounded-[18px] border border-border/70 bg-background/35 p-3">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Capacity</p>
                      <p className="mt-2 text-base font-semibold text-foreground">{spotlightCapacityUsed}</p>
                    </div>
                  </div>

                  <div className="mt-5 rounded-[20px] border border-border/70 bg-background/30 p-4">
                    <p className="text-sm leading-7 text-muted-foreground">{spotlightPresentation.scenario}</p>
                  </div>

                  <div className="mt-5 rounded-[20px] border border-border/70 bg-background/30 p-4">
                    <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      <span>Capacity used</span>
                      <span>{spotlightCapacityUsed}</span>
                    </div>
                    <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: spotlightCapacityUsed,
                          backgroundImage: "linear-gradient(90deg, var(--accent-from), var(--accent-to))",
                        }}
                      />
                    </div>
                    <p className="mt-3 text-xs text-muted-foreground">
                      Strata shows structured payout upside and pool depth directly instead of pretending this market has a simple yes/no spot quote.
                    </p>
                  </div>

                  <Link href={spotlightHref} className="btn-gradient mt-5 inline-flex min-h-11 items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold">
                    Open market
                  </Link>
                </div>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
              <div className="grid gap-3 md:grid-cols-4">
                {featuredTiered.length ? (
                  featuredTiered.map((entry) => {
                    const card = getTieredMarketPresentation(entry.data);
                    const railPayout = bpsToMultiplier(Math.max(...entry.data.tiers.map((tier) => tier.payoutBps)));

                    return (
                      <Link
                        key={entry.address.toBase58()}
                        href={`/watch/${entry.address.toBase58()}`}
                        className="rounded-[24px] border border-border/70 bg-background/35 p-4 transition-colors hover:border-status-true/35"
                      >
                        <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{card.league}</p>
                        <p className="mt-2 text-sm font-semibold text-foreground">{card.homeTeam} vs {card.awayTeam}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{card.marketTitle}</p>
                        <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3 text-xs">
                          <span className="rounded-full border border-status-true/25 bg-status-true/10 px-2 py-1 font-semibold text-status-true">
                            Yes {railPayout}
                          </span>
                          <span className="text-muted-foreground">{formatSol(entry.data.totalStake)} SOL</span>
                        </div>
                      </Link>
                    );
                  })
                ) : (
                  featuredGeo.map((entry) => (
                    <GeoProductCard key={entry.address.toBase58()} entry={entry} />
                  ))
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                <div className="rounded-[24px] border border-border/70 bg-background/35 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Open markets</p>
                  <p className="mt-3 text-3xl font-semibold text-status-true">{openCount}</p>
                </div>
                <div className="rounded-[24px] border border-border/70 bg-background/35 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Settled</p>
                  <p className="mt-3 text-3xl font-semibold text-foreground">{settledCount}</p>
                </div>
                <div className="rounded-[24px] border border-border/70 bg-background/35 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Total staked</p>
                  <p className="mt-3 text-3xl font-semibold text-foreground">{formatSol(totalStaked)} SOL</p>
                </div>
              </div>
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
