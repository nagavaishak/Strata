"use client";

import Link from "next/link";
import { STRATA_PROGRAM_ID, TXORACLE_PROGRAM_ID } from "@/lib/constants";
import { useAllProducts, useAllGeoProducts } from "@/lib/hooks/useAllProducts";
import { TieredProductCard, GeoProductCard } from "@/components/product-card";

const FACTS = [
  { label: "settlement", value: "on-chain CPI" },
  { label: "proof", value: "TxLINE Merkle" },
  { label: "legs", value: "up to 5, tiered" },
  { label: "geometric", value: "exact-outcome" },
];

const WHY_POINTS = [
  {
    index: "01",
    title: "Tiered, multi-leg payouts — not a coin flip",
    body: "Every other submission on this track is a single-predicate yes/no bet. Strata bundles up to 5 stat conditions into one instrument with a real payout tier table, the way a structured note or parametric insurance product actually works.",
  },
  {
    index: "02",
    title: "A real on-chain CPI, not a trusted feeder",
    body: "Settlement calls TxLINE's own validate_stat / validate_stat_v2 program on-chain and verifies its Merkle proof. Nobody posts a result and asks you to trust them — the program checks the proof itself, permissionlessly, callable by anyone.",
  },
  {
    index: "03",
    title: "Proven live, not a historical replay",
    body: "A real buyer deposit was made before the underlying match data existed, then settled only once TxLINE sealed a fresh batch minutes later. The losing outcome is part of the proof — nothing was rigged to guarantee a win.",
  },
];

const DESTINATIONS = [
  {
    index: "00",
    label: "Build",
    href: "/build",
    body: "Construct a tiered multi-leg product, or predict an exact outcome with the geometric engine.",
  },
  {
    index: "01",
    label: "Watch",
    href: "/watch",
    body: "See a product's legs settle live, one real on-chain proof at a time.",
  },
  {
    index: "02",
    label: "Verify",
    href: "/verify/6UNaWnAMpjHHxzC8KD78wYekjVwNNHKVMnm1rf5TiG9s",
    body: "Skip the setup — open a real settled product and re-derive its payout from on-chain data alone.",
  },
];

export default function Home() {
  const { data: tiered } = useAllProducts();
  const { data: geo } = useAllGeoProducts();

  const featuredTiered = (tiered ?? [])
    .slice()
    .sort((a, b) => (a.data.status === "open" ? -1 : 1) - (b.data.status === "open" ? -1 : 1))
    .slice(0, 3);
  const featuredGeo = (geo ?? []).slice(0, 4 - featuredTiered.length);
  const hasFeatured = featuredTiered.length + featuredGeo.length > 0;

  return (
    <div className="relative mx-auto flex max-w-3xl flex-1 flex-col gap-16 px-6 py-14">
      {/* what */}
      <div className="relative flex flex-col gap-6">
        <div className="bg-hero-glow pointer-events-none absolute -inset-x-24 -top-24 -z-10 h-[36rem]" />

        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-border px-3 py-1 text-xs font-mono text-muted-foreground">
          <span className="glow-dot h-1.5 w-1.5 rounded-full bg-status-true" />
          structured settlement · not a coin flip
        </div>

        <h1 className="text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
          Multi-leg, tiered payouts,
          <br />
          <span className="text-gradient">settled trustlessly on-chain.</span>
        </h1>

        <p className="max-w-xl text-lg leading-relaxed text-muted-foreground">
          Strata turns sports-stat conditions into structured, tiered payoffs.
          Settlement is a permissionless CPI into TxLINE&rsquo;s own on-chain proof
          verifier — no oracle to trust, no self-attested results.
        </p>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/build"
            className="btn-gradient inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium"
          >
            Build a product →
          </Link>
          <Link
            href="/verify/6UNaWnAMpjHHxzC8KD78wYekjVwNNHKVMnm1rf5TiG9s"
            className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-medium hover:bg-accent"
          >
            See real proof
          </Link>
        </div>

        <div className="flex flex-wrap gap-x-6 gap-y-1 border-t border-border pt-4 font-mono text-xs text-muted-foreground">
          {FACTS.map((fact) => (
            <span key={fact.label}>
              {fact.label} <span className="text-status-true">{fact.value}</span>
            </span>
          ))}
        </div>
      </div>

      {/* live markets strip — real accounts, not mockup cards */}
      {hasFeatured && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="font-mono text-sm text-muted-foreground">live on devnet, right now</h2>
            <Link href="/markets" className="font-mono text-xs text-muted-foreground hover:text-foreground hover:underline">
              all markets →
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {featuredTiered.map((entry) => (
              <TieredProductCard key={entry.address.toBase58()} entry={entry} />
            ))}
            {featuredGeo.map((entry) => (
              <GeoProductCard key={entry.address.toBase58()} entry={entry} />
            ))}
          </div>
        </div>
      )}

      {/* why */}
      <div id="why" className="flex scroll-mt-20 flex-col gap-8">
        <h2 className="font-mono text-sm text-muted-foreground">why this, not another prediction market</h2>
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

      {/* where to go */}
      <div className="flex flex-col gap-6">
        <h2 className="font-mono text-sm text-muted-foreground">where to go</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {DESTINATIONS.map((dest) => (
            <Link
              key={dest.href}
              href={dest.href}
              className="group flex flex-col gap-2 rounded-lg border border-border bg-card p-4 transition-colors hover:border-foreground/30"
            >
              <span className="font-mono text-xs text-muted-foreground">
                {dest.index} <span className="text-foreground group-hover:underline">{dest.label} →</span>
              </span>
              <p className="text-sm leading-relaxed text-muted-foreground">{dest.body}</p>
            </Link>
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
