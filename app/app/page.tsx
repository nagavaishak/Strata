"use client";

import Link from "next/link";
import { STRATA_PROGRAM_ID, TXORACLE_PROGRAM_ID } from "@/lib/constants";
import { useAllProducts, useAllGeoProducts, type ProductListEntry, type GeoProductListEntry } from "@/lib/hooks/useAllProducts";
import { TieredProductCard, GeoProductCard } from "@/components/product-card";
import { HowItWorksDialog } from "@/components/how-it-works-dialog";
import { dedupeByFixture } from "@/lib/dedupe-by-fixture";
import { bpsToMultiplier, formatSol } from "@/lib/format";

const FACTS = [
  { label: "settlement", value: "on-chain CPI" },
  { label: "proof", value: "TxLINE Merkle" },
  { label: "legs", value: "up to 5, tiered" },
  { label: "geometric", value: "exact-outcome" },
];

const HOW_IT_WORKS = [
  {
    index: "01",
    title: "Pick a market",
    body: "Browse structured sports markets — up to 5 stat conditions bundled into one tiered payout table, or a single exact-outcome prediction.",
  },
  {
    index: "02",
    title: "Take a position",
    body: "Stake SOL against the payout ladder. Deposits close before anyone can know the outcome — no one has an edge.",
  },
  {
    index: "03",
    title: "Settle & claim",
    body: "Anyone can settle: a permissionless on-chain proof check against real match data, then claim your payout — no oracle to trust.",
  },
];

const WHY_POINTS = [
  {
    index: "01",
    title: "Tiered, multi-leg payouts — not a coin flip",
    body: "Every other submission on this track is a single-predicate yes/no bet. Strata bundles up to 5 stat conditions into one instrument with a real payout tier table, the way a structured note or parametric insurance product actually works.",
  },
  {
    index: "02",
    title: "Proof-backed settlement, not a trusted feeder",
    body: "Settlement calls TxLINE's own validate_stat / validate_stat_v2 program on-chain and verifies its Merkle proof. Nobody posts a result and asks you to trust them — the program checks the proof itself, permissionlessly, callable by anyone.",
  },
  {
    index: "03",
    title: "Proven live, not a historical replay",
    body: "A real buyer deposit was made before the underlying match data existed, then settled only once TxLINE sealed a fresh batch minutes later. The losing outcome is part of the proof — nothing was rigged to guarantee a win.",
  },
];

function FeaturedTieredSpotlight({ entry }: { entry: ProductListEntry }) {
  const topTierBps = entry.data.tiers.reduce((max, tier) => Math.max(max, tier.payoutBps), 0);

  return (
    <div className="market-shell rounded-[28px] border border-border/80 p-7">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-status-true">Featured structured market</p>
          <h2 className="max-w-xl text-4xl font-semibold leading-tight tracking-tight text-foreground">
            Fixture {entry.data.fixtureId.toString()}
          </h2>
          <p className="mt-3 max-w-xl text-base text-muted-foreground">
            Multi-condition payout ladder with {entry.data.numLegs} live conditions and a creator-defined return profile.
          </p>
        </div>
        <div className="rounded-2xl border border-status-true/25 bg-status-true/8 px-4 py-3 text-right">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-status-true">Up to</p>
          <p className="mt-1 text-4xl font-semibold text-status-true">{bpsToMultiplier(topTierBps)}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-4">
          <div className="rounded-3xl border border-border/70 bg-background/35 p-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Payout ladder</p>
            <div className="space-y-3">
              {entry.data.tiers.map((tier) => (
                <div key={tier.minLegsTrue} className="flex items-center justify-between rounded-2xl bg-card/70 px-4 py-3">
                  <span className="text-sm text-foreground">
                    {tier.minLegsTrue}/{entry.data.numLegs} conditions hit
                  </span>
                  <span className="font-mono text-sm font-semibold text-status-true">{bpsToMultiplier(tier.payoutBps)}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-3xl border border-border/70 bg-background/35 p-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Why this market</p>
            <p className="text-sm leading-7 text-muted-foreground">
              Buyers get a richer view than simple yes/no. If more legs are correct, the payout climbs automatically — with proof-backed settlement at the end.
            </p>
          </div>
        </div>

        <div className="rounded-[28px] border border-border/70 bg-background/45 p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Live market snapshot</p>
              <p className="mt-2 text-lg font-semibold text-foreground">{formatSol(entry.data.totalStake)} SOL staked</p>
            </div>
            <Link href={`/watch/${entry.address.toBase58()}`} className="btn-gradient rounded-full px-5 py-2 text-sm font-semibold">
              Open market
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {entry.data.legs.map((leg, index) => (
              <div key={`${leg.statKeyA}-${index}`} className="rounded-2xl border border-border/70 bg-card/75 px-4 py-4">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Condition {index + 1}</p>
                <p className="text-sm leading-6 text-foreground">
                  {leg.hasSecondStat ? "Combined stat condition" : "Single-stat condition"} with threshold{" "}
                  <span className="font-mono">{leg.threshold}</span>
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function FeaturedGeoSpotlight({ entry }: { entry: GeoProductListEntry }) {
  return (
    <div className="market-shell rounded-[28px] border border-border/80 p-7">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-status-true">Featured exact-outcome market</p>
          <h2 className="max-w-xl text-4xl font-semibold leading-tight tracking-tight text-foreground">
            Fixture {entry.data.fixtureId.toString()}
          </h2>
          <p className="mt-3 max-w-xl text-base text-muted-foreground">
            One exact-outcome position with geometric verification and a single premium payout tier.
          </p>
        </div>
        <div className="rounded-2xl border border-status-true/25 bg-status-true/8 px-4 py-3 text-right">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-status-true">Exact hit</p>
          <p className="mt-1 text-4xl font-semibold text-status-true">{bpsToMultiplier(entry.data.payoutBpsIfTrue)}</p>
        </div>
      </div>
      <div className="grid gap-5 md:grid-cols-3">
        <div className="rounded-3xl border border-border/70 bg-background/35 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Prediction A</p>
          <p className="mt-2 font-mono text-2xl text-foreground">{entry.data.predictionA}</p>
        </div>
        <div className="rounded-3xl border border-border/70 bg-background/35 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Prediction B</p>
          <p className="mt-2 font-mono text-2xl text-foreground">{entry.data.predictionB}</p>
        </div>
        <div className="rounded-3xl border border-border/70 bg-background/35 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Position</p>
          <Link href={`/watch/geo/${entry.address.toBase58()}`} className="mt-3 inline-flex rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-card">
            Open exact market
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const { data: tiered } = useAllProducts();
  const { data: geo } = useAllGeoProducts();

  const featuredTiered = dedupeByFixture(tiered ?? [])
    .sort((a, b) => (a.data.status === "open" ? -1 : 1) - (b.data.status === "open" ? -1 : 1))
    .slice(0, 3);
  const featuredGeo = dedupeByFixture(geo ?? []).slice(0, 4 - featuredTiered.length);
  const hasFeatured = featuredTiered.length + featuredGeo.length > 0;
  const spotlightTiered = featuredTiered[0];
  const spotlightGeo = !spotlightTiered ? featuredGeo[0] : null;

  const allTiered = tiered ?? [];
  const allGeo = geo ?? [];
  const openCount =
    allTiered.filter((e) => e.data.status === "open").length +
    allGeo.filter((e) => e.data.status === "open").length;
  const settledCount =
    allTiered.filter((e) => e.data.status === "settled").length +
    allGeo.filter((e) => e.data.status === "settled").length;
  const totalStaked =
    allTiered.reduce((sum, e) => sum + e.data.totalStake, 0n) +
    allGeo.reduce((sum, e) => sum + e.data.totalStake, 0n);

  return (
    <div className="relative mx-auto flex max-w-[1400px] flex-1 flex-col gap-16 px-6 py-10">
      {/* hero */}
      <div className="relative grid gap-8 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="bg-hero-glow pointer-events-none absolute -inset-x-24 -top-20 -z-10 h-[36rem]" />

        <div className="flex flex-col gap-6">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-border/80 bg-card/75 px-3 py-1.5 text-xs font-medium text-muted-foreground">
            <span className="glow-dot h-1.5 w-1.5 rounded-full bg-status-true" />
            Structured sports markets
          </div>

          <h1 className="max-w-4xl text-5xl font-semibold leading-[1.02] tracking-tight sm:text-6xl">
            Predict the match,
            <br />
            <span className="text-gradient">not just the winner.</span>
          </h1>

          <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Buy structured sports positions with tiered payouts and proof-backed
            settlement. The more conditions come true, the higher the payout —
            no oracle to trust, no self-attested results.
          </p>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/markets"
              className="btn-gradient inline-flex min-h-11 items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold"
            >
              Explore Markets →
            </Link>
            <HowItWorksDialog
              trigger={
                <button
                  type="button"
                  className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border/80 bg-card/75 px-5 py-2.5 text-sm font-semibold hover:bg-accent"
                >
                  How It Works
                </button>
              }
            />
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-2 border-t border-border/70 pt-5 font-mono text-xs text-muted-foreground">
            {FACTS.map((fact) => (
              <span key={fact.label}>
                {fact.label} <span className="text-status-true">{fact.value}</span>
              </span>
            ))}
          </div>

          {spotlightTiered ? <FeaturedTieredSpotlight entry={spotlightTiered} /> : spotlightGeo ? <FeaturedGeoSpotlight entry={spotlightGeo} /> : null}
        </div>

        <div className="flex flex-col gap-4">
          <div className="market-shell rounded-[28px] border border-border/80 p-6 text-sm backdrop-blur-sm">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Live marketplace</p>
            <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] text-muted-foreground">open markets</p>
              <p className="font-mono text-2xl text-status-true">{openCount}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">settled</p>
              <p className="font-mono text-2xl">{settledCount}</p>
            </div>
            <div className="col-span-2">
              <p className="text-[10px] text-muted-foreground">total staked</p>
              <p className="font-mono text-2xl text-status-true">
                {(Number(totalStaked) / 1e9).toFixed(4)} <span className="text-sm text-muted-foreground">SOL</span>
              </p>
            </div>
            </div>
            <p className="mt-5 border-t border-border/70 pt-4 text-xs text-muted-foreground">
              Live account reads, not marketing filler. Every featured market routes straight into a real deposit and settlement flow.
            </p>
          </div>

          <div className="market-shell rounded-[28px] border border-border/80 p-6">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Why buyers care</p>
            <div className="space-y-4 text-sm text-muted-foreground">
              <div className="rounded-2xl border border-border/70 bg-background/35 px-4 py-4">
                <p className="font-semibold text-foreground">Partial wins are possible</p>
                <p className="mt-1 leading-6">Unlike yes/no markets, correct legs can still unlock real payout tiers.</p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/35 px-4 py-4">
                <p className="font-semibold text-foreground">Proof-backed settlement</p>
                <p className="mt-1 leading-6">TxLINE proofs settle the outcome. The payout ladder is deterministic and visible upfront.</p>
              </div>
            </div>
          </div>

          <div className="market-shell rounded-[28px] border border-border/80 p-6">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Competitions</p>
            <div className="space-y-3">
              {["World Cup Structured Markets", "Exact Outcome Ladder", "Live Match Props"].map((item) => (
                <div key={item} className="flex items-center justify-between rounded-2xl border border-border/70 bg-background/35 px-4 py-4">
                  <span className="text-sm font-medium text-foreground">{item}</span>
                  <span className="text-xs text-muted-foreground">Explore</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* featured markets */}
      {hasFeatured && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Featured markets</h2>
            <Link href="/markets" className="text-sm text-muted-foreground hover:text-foreground hover:underline">
              View all →
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featuredTiered.slice(1).map((entry) => (
              <TieredProductCard key={entry.address.toBase58()} entry={entry} />
            ))}
            {featuredGeo.slice(spotlightGeo ? 1 : 0).map((entry) => (
              <GeoProductCard key={entry.address.toBase58()} entry={entry} />
            ))}
          </div>
        </div>
      )}

      {/* how it works */}
      <div className="flex flex-col gap-8">
        <h2 className="text-lg font-semibold text-foreground">How it works</h2>
        <div className="grid gap-6 sm:grid-cols-3">
          {HOW_IT_WORKS.map((step) => (
            <div key={step.index} className="market-shell flex flex-col gap-3 rounded-[24px] border border-border/80 p-5">
              <span className="font-mono text-xs text-status-true">{step.index}</span>
              <h3 className="text-base font-semibold leading-snug">{step.title}</h3>
              <p className="text-sm leading-7 text-muted-foreground">{step.body}</p>
            </div>
          ))}
        </div>
      </div>

      {/* why strata */}
      <div id="why" className="flex scroll-mt-20 flex-col gap-8">
        <h2 className="text-lg font-semibold text-foreground">Why Strata</h2>
        <div className="grid gap-6 sm:grid-cols-3">
          {WHY_POINTS.map((point) => (
            <div key={point.index} className="market-shell flex flex-col gap-3 rounded-[24px] border border-border/80 p-5">
              <span className="font-mono text-xs text-status-true">{point.index}</span>
              <h3 className="text-base font-semibold leading-snug">{point.title}</h3>
              <p className="text-sm leading-7 text-muted-foreground">{point.body}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="font-mono text-xs text-muted-foreground">
        program{" "}
        <a
          href={`https://explorer.solana.com/address/${STRATA_PROGRAM_ID.toBase58()}?cluster=devnet`}
          target="_blank"
          rel="noreferrer"
          className="text-foreground hover:underline"
        >
          {STRATA_PROGRAM_ID.toBase58()}
        </a>{" "}
        · CPIs into txoracle{" "}
        <a
          href={`https://explorer.solana.com/address/${TXORACLE_PROGRAM_ID.toBase58()}?cluster=devnet`}
          target="_blank"
          rel="noreferrer"
          className="text-foreground hover:underline"
        >
          {TXORACLE_PROGRAM_ID.toBase58()}
        </a>
      </div>
    </div>
  );
}
