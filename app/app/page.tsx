"use client";

import Link from "next/link";
import { ArrowRight, ShieldCheck, TimerReset, Trophy } from "lucide-react";
import { HowItWorksDialog } from "@/components/how-it-works-dialog";
import { GeoProductCard, TieredProductCard } from "@/components/product-card";
import { useAllGeoProducts, useAllProducts } from "@/lib/hooks/useAllProducts";
import { dedupeByFixture } from "@/lib/dedupe-by-fixture";
import { formatSol } from "@/lib/format";
import { getFixturePresentation, getGeoMarketPresentation, getTieredMarketPresentation, type MarketPresentation } from "@/lib/market-presentation";

const VALUE_PROPS = [
  {
    icon: Trophy,
    title: "Structured payouts",
    body: "Buy one market with multiple match conditions and a real payout ladder instead of a simple yes-or-no bet.",
  },
  {
    icon: ShieldCheck,
    title: "Proof-backed settlement",
    body: "Results are verified on-chain against TxLINE proofs, so the product feels trustworthy even for a first-time buyer.",
  },
  {
    icon: TimerReset,
    title: "Live match context",
    body: "Every featured market is presented with the real fixture, live status, and scenario framing first — no invented match details.",
  },
];

function FootballVisualCard({
  title,
  subtitle,
  metric,
  caption,
}: {
  title: string;
  subtitle: string;
  metric: string;
  caption: string;
}) {
  return (
    <div className="market-shell relative overflow-hidden rounded-[34px] border border-border/80 p-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(20,255,160,0.14),transparent_28%),radial-gradient(circle_at_80%_0%,rgba(89,225,255,0.14),transparent_30%)]" />
      <div className="relative flex min-h-[420px] flex-col justify-between">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-status-true">Featured spotlight</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">{title}</h2>
            <p className="mt-3 max-w-md text-sm leading-7 text-muted-foreground">{subtitle}</p>
          </div>
          <div className="rounded-full border border-status-true/25 bg-status-true/10 px-4 py-2 text-sm font-semibold text-status-true">
            {metric}
          </div>
        </div>

        <div className="pointer-events-none relative mx-auto mt-8 flex h-56 w-56 items-center justify-center rounded-full border border-white/10 bg-[radial-gradient(circle,rgba(255,255,255,0.07),transparent_65%)]">
          <div className="absolute h-40 w-40 rounded-full border border-status-true/30" />
          <div className="absolute h-28 w-28 rounded-full border border-status-true/20" />
          <div className="absolute h-56 w-56 rounded-full border border-white/5" />
          <div className="absolute h-72 w-72 rounded-full border border-white/5" />
          <div className="relative h-24 w-24 rounded-full border border-status-true/35 bg-[radial-gradient(circle,rgba(20,255,160,0.2),rgba(13,16,24,0.9))] shadow-[0_0_80px_rgba(20,255,160,0.18)]" />
        </div>

        <div className="relative rounded-[28px] border border-border/70 bg-background/40 p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Why this works</p>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">{caption}</p>
        </div>
      </div>
    </div>
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
          scenario: fallbackFixture.context,
          shortScenario: "Curated structured market",
          category: "Featured football",
        };

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-16 px-6 py-8 sm:py-10">
      <section className="grid gap-8 xl:grid-cols-[1.1fr_0.9fr] xl:items-stretch">
        <div className="relative overflow-hidden rounded-[40px] border border-border/80 bg-[linear-gradient(180deg,rgba(12,15,22,0.92),rgba(16,20,30,0.82))] p-8 sm:p-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(20,255,160,0.18),transparent_28%),radial-gradient(circle_at_75%_10%,rgba(89,225,255,0.12),transparent_32%)]" />
          <div className="relative flex h-full flex-col justify-between gap-10">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-card/70 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-status-true">
                Consumer marketplace
              </div>
              <h1 className="mt-6 max-w-4xl text-5xl font-semibold leading-[1.02] tracking-tight text-white sm:text-6xl">
                Buy the match
                <br />
                <span className="text-gradient">with structure, not guesswork.</span>
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-8 text-zinc-300">
                Strata turns football markets into clear, tiered products. You see the conditions, the payout ladder,
                and the settlement path before you ever connect a wallet.
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

        <FootballVisualCard
          title={spotlightPresentation.marketTitle}
          subtitle={`${spotlightPresentation.marketLabel} live now with clear scenario framing and tiered payouts.`}
          metric={spotlightTiered ? "Tiered payout live" : "Exact outcome live"}
          caption={spotlightPresentation.scenario}
        />
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {VALUE_PROPS.map((item) => (
          <div key={item.title} className="market-shell rounded-[28px] border border-border/80 p-5">
            <item.icon className="size-5 text-status-true" />
            <h3 className="mt-4 text-lg font-semibold text-foreground">{item.title}</h3>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">{item.body}</p>
          </div>
        ))}
      </section>

      <section>
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-status-true">Explore now</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">Markets worth opening first</h2>
          </div>
          <Link href="/markets" className="text-sm font-semibold text-muted-foreground hover:text-foreground">
            View all markets
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

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="market-shell rounded-[32px] border border-border/80 p-6 lg:col-span-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-status-true">Why Strata feels different</p>
          <div className="mt-6 grid gap-6 md:grid-cols-3">
            <div>
              <h3 className="text-lg font-semibold text-foreground">You buy a scenario</h3>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                Instead of asking only who wins, Strata lets you buy a richer match story with stacked conditions and a payout ladder.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">You see the ladder</h3>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                Best-case payout is always visible. The app keeps the math legible for new users rather than hiding it behind contract jargon.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">You can verify the ending</h3>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                Settlement remains on-chain and auditable, but it is framed as reassurance instead of the only thing the product talks about.
              </p>
            </div>
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
