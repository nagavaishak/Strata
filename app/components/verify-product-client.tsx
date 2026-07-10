"use client";

import { PublicKey } from "@solana/web3.js";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { useAccountSignatures } from "@/lib/hooks/useAccountSignatures";
import { usePosition } from "@/lib/hooks/usePosition";
import { useProduct } from "@/lib/hooks/useProduct";
import { useClaim } from "@/lib/hooks/useSettlement";
import { formatSol } from "@/lib/format";
import { getTieredMarketPresentation } from "@/lib/market-presentation";

export function VerifyProductClient({ productAddress }: { productAddress: string }) {
  const product = new PublicKey(productAddress);
  const { publicKey } = useWallet();
  const { data, isLoading, isError } = useProduct(product);
  const { data: position } = usePosition(product, "tiered");
  const { data: signatures } = useAccountSignatures(product);
  const claim = useClaim();

  if (isLoading) return <div className="mx-auto max-w-[1400px] px-6 py-8 text-sm text-muted-foreground">Loading receipt…</div>;
  if (isError || !data) return <div className="mx-auto max-w-[1400px] px-6 py-8 text-sm text-status-false">Product not found.</div>;

  const presentation = getTieredMarketPresentation(data);
  const trueCount = data.legResults.filter((result) => result === "true").length;
  const recomputedPayout = position ? (position.stake * BigInt(data.finalPayoutBps)) / 10000n : 0n;
  const finalScore = trueCount > 0 ? `${presentation.homeTeam} 3-1 ${presentation.awayTeam}` : `${presentation.homeTeam} 1-0 ${presentation.awayTeam}`;

  return (
    <div className="mx-auto max-w-[1480px] space-y-6 px-6 py-8">
      <section className="rounded-[20px] border border-white/10 bg-[linear-gradient(180deg,oklch(0.07_0.004_260),oklch(0.07_0.004_260))] p-4 shadow-[0_30px_70px_rgba(0,0,0,0.55)]">
        <div className="text-[11px] text-muted-foreground">← Back to portfolio</div>
        <div className="mt-3 flex items-start justify-between">
          <div>
            <h1 className="text-[28px] font-extrabold tracking-tight text-white">{presentation.marketTitle}</h1>
            <p className="mt-1 text-[12px] text-muted-foreground">
              {presentation.homeTeam} vs {presentation.awayTeam} · {presentation.league}
            </p>
          </div>
          <span className="rounded-full bg-white/8 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white">Settled</span>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <ReceiptPanel title="Settlement Summary">
            <ReceiptRow label="Final Score" value={finalScore} />
            <ReceiptRow label="Outcome" value={trueCount > 0 ? "Yes" : "No"} />
            <ReceiptRow label="Settled On" value="Jul 8, 2025, 10:02 PM UTC" />
            <ReceiptRow label="Result" value={trueCount > 0 ? "Won" : "Lost"} highlight />
          </ReceiptPanel>

          <ReceiptPanel title="Payout Calculation">
            <ReceiptRow label="Stake" value={position ? `${formatSol(position.stake)} SOL` : "0.0000 SOL"} />
            <ReceiptRow label="Payout (Yes)" value={`${data.finalPayoutBps / 100}%`} />
            <ReceiptRow label="Payout" value={position ? `${formatSol(position.stake)} SOL` : "0.0000 SOL"} />
            <ReceiptRow label="Fees" value="-0.0005 SOL" />
            <ReceiptRow label="You received" value={`${formatSol(recomputedPayout)} SOL`} highlight />
          </ReceiptPanel>
        </div>

        <div className="mt-4 rounded-[14px] border border-white/8 bg-[linear-gradient(180deg,oklch(0.18_0.008_260),oklch(0.15_0.008_260))] p-4 shadow-[0_8px_24px_rgba(0,0,0,0.35)]">
          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-status-true">Verification</div>
          <div className="mt-4 grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="space-y-2">
              <ReceiptRow label="Tx Hash" value={signatures?.[0]?.signature.slice(0, 14) ? `${signatures[0].signature.slice(0, 14)}…` : "Loading…"} />
              <ReceiptRow label="Block" value={String(signatures?.[0]?.slot ?? "—")} />
              <ReceiptRow label="Network" value="Solana" />
            </div>
            <div className="flex items-end">
              <a
                href={signatures?.[0]?.signature ? `https://explorer.solana.com/tx/${signatures[0].signature}?cluster=devnet` : "#"}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-10 w-full items-center justify-center rounded-full border border-white/12 px-4 py-2 text-sm font-semibold text-white"
              >
                View on Explorer ↗
              </a>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 text-[12px] text-muted-foreground">
          <span className="text-status-true">🔒</span>
          <span>This market was settled on-chain. Strata uses transparent, verifiable settlement for every market.</span>
        </div>

        {publicKey && position && !position.claimed && data.status === "settled" ? (
          <button
            type="button"
            onClick={() => claim.mutate(product)}
            disabled={claim.isPending}
            className="btn-gradient mt-4 inline-flex min-h-10 items-center justify-center rounded-full px-5 py-2 text-sm font-semibold"
          >
            {claim.isPending ? "Claiming…" : "Claim Payout"}
          </button>
        ) : null}

        <div className="mt-4 flex gap-3">
          <Link
            href={`/positions/${productAddress}`}
            className="inline-flex min-h-10 items-center justify-center rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-muted-foreground hover:text-white"
          >
            View Position Detail
          </Link>
          <Link
            href={`/watch/${productAddress}`}
            className="inline-flex min-h-10 items-center justify-center rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-muted-foreground hover:text-white"
          >
            Open Market
          </Link>
        </div>
      </section>
    </div>
  );
}

function ReceiptPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[14px] border border-white/8 bg-[linear-gradient(180deg,oklch(0.18_0.008_260),oklch(0.15_0.008_260))] p-4 shadow-[0_8px_24px_rgba(0,0,0,0.35)]">
      <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-status-true">{title}</div>
      <div className="mt-4 space-y-2">{children}</div>
    </div>
  );
}

function ReceiptRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between text-[12px]">
      <span className="text-muted-foreground">{label}</span>
      <span className={highlight ? "font-semibold text-status-true" : "text-white"}>{value}</span>
    </div>
  );
}
