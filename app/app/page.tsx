"use client";

import Link from "next/link";
import { STRATA_PROGRAM_ID, TXORACLE_PROGRAM_ID } from "@/lib/constants";
import { useAllProducts, useAllGeoProducts } from "@/lib/hooks/useAllProducts";
import { TieredProductCard, GeoProductCard } from "@/components/product-card";
import { HowItWorksDialog } from "@/components/how-it-works-dialog";
import { dedupeByFixture } from "@/lib/dedupe-by-fixture";

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

export default function Home() {
  const { data: tiered } = useAllProducts();
  const { data: geo } = useAllGeoProducts();

  const featuredTiered = dedupeByFixture(tiered ?? [])
    .sort((a, b) => (a.data.status === "open" ? -1 : 1) - (b.data.status === "open" ? -1 : 1))
    .slice(0, 3);
  const featuredGeo = dedupeByFixture(geo ?? []).slice(0, 4 - featuredTiered.length);
  const hasFeatured = featuredTiered.length + featuredGeo.length > 0;

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
    <div className="relative mx-auto flex max-w-[1400px] flex-1 flex-col gap-16 px-6 py-14">
      {/* hero */}
      <div className="relative grid gap-12 lg:grid-cols-[1.15fr_1fr] lg:items-center">
        <div className="bg-hero-glow pointer-events-none absolute -inset-x-24 -top-24 -z-10 h-[36rem]" />

        <div className="flex flex-col gap-6">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-border px-3 py-1 text-xs font-mono text-muted-foreground">
            <span className="glow-dot h-1.5 w-1.5 rounded-full bg-status-true" />
            structured sports markets · not a coin flip
          </div>

          <h1 className="text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
            Predict the match,
            <br />
            <span className="text-gradient">not just the winner.</span>
          </h1>

          <p className="max-w-xl text-lg leading-relaxed text-muted-foreground">
            Buy structured sports positions with tiered payouts and proof-backed
            settlement. The more conditions come true, the higher the payout —
            no oracle to trust, no self-attested results.
          </p>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/markets"
              className="btn-gradient inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium"
            >
              Explore Markets →
            </Link>
            <HowItWorksDialog
              trigger={
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-medium hover:bg-accent"
                >
                  How It Works
                </button>
              }
            />
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-1 border-t border-border pt-4 font-mono text-xs text-muted-foreground">
            {FACTS.map((fact) => (
              <span key={fact.label}>
                {fact.label} <span className="text-status-true">{fact.value}</span>
              </span>
            ))}
          </div>
        </div>

        {/* right half of the hero — real live numbers, not decoration */}
        <div className="rounded-xl border border-border bg-card/60 p-6 text-sm backdrop-blur-sm">
          <p className="mb-4 text-xs text-muted-foreground">Live on devnet</p>
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
          <p className="mt-5 border-t border-border pt-4 text-xs text-muted-foreground">
            every number here is a live account read — nothing is seeded or mocked.
          </p>
        </div>
      </div>

      {/* featured markets */}
      {hasFeatured && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Featured markets</h2>
            <Link href="/markets" className="text-xs text-muted-foreground hover:text-foreground hover:underline">
              View all →
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {featuredTiered.map((entry) => (
              <TieredProductCard key={entry.address.toBase58()} entry={entry} />
            ))}
            {featuredGeo.map((entry) => (
              <GeoProductCard key={entry.address.toBase58()} entry={entry} />
            ))}
          </div>
        </div>
      )}

      {/* how it works */}
      <div className="flex flex-col gap-8">
        <h2 className="text-sm font-semibold text-foreground">How It Works</h2>
        <div className="grid gap-6 sm:grid-cols-3">
          {HOW_IT_WORKS.map((step) => (
            <div key={step.index} className="flex flex-col gap-2">
              <span className="font-mono text-xs text-border">{step.index}</span>
              <h3 className="text-sm font-medium leading-snug">{step.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{step.body}</p>
            </div>
          ))}
        </div>
      </div>

      {/* why strata */}
      <div id="why" className="flex scroll-mt-20 flex-col gap-8">
        <h2 className="text-sm font-semibold text-foreground">Why Strata</h2>
        <div className="grid gap-6 sm:grid-cols-3">
          {WHY_POINTS.map((point) => (
            <div key={point.index} className="flex flex-col gap-2">
              <span className="font-mono text-xs text-border">{point.index}</span>
              <h3 className="text-sm font-medium leading-snug">{point.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{point.body}</p>
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
