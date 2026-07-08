import Link from "next/link";
import { STRATA_PROGRAM_ID, TXORACLE_PROGRAM_ID } from "@/lib/constants";

const FACTS = [
  { label: "settlement", value: "on-chain CPI" },
  { label: "proof", value: "TxLINE Merkle" },
  { label: "legs", value: "up to 5, tiered" },
  { label: "geometric", value: "exact-outcome" },
];

export default function Home() {
  return (
    <div className="mx-auto flex max-w-3xl flex-1 flex-col justify-center gap-10 px-6 py-24">
      <div className="inline-flex w-fit items-center gap-2 rounded-full border border-border px-3 py-1 text-xs font-mono text-muted-foreground">
        <span className="h-1.5 w-1.5 rounded-full bg-status-true" />
        structured settlement · not a coin flip
      </div>

      <h1 className="text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
        Multi-leg, tiered payouts,
        <br />
        <span className="text-muted-foreground">settled trustlessly on-chain.</span>
      </h1>

      <p className="max-w-xl text-lg leading-relaxed text-muted-foreground">
        Strata turns sports-stat conditions into structured, tiered payoffs.
        Settlement is a permissionless CPI into TxLINE&rsquo;s own on-chain proof
        verifier — no oracle to trust, no self-attested results.
      </p>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/build"
          className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
        >
          00 Build a product →
        </Link>
        <Link
          href="/verify"
          className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-medium hover:bg-accent"
        >
          02 Verify a settlement
        </Link>
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-1 border-t border-border pt-4 font-mono text-xs text-muted-foreground">
        {FACTS.map((fact) => (
          <span key={fact.label}>
            {fact.label} <span className="text-status-true">{fact.value}</span>
          </span>
        ))}
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
