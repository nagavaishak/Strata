"use client";

import { useState } from "react";
import Link from "next/link";
import { PublicKey } from "@solana/web3.js";
import { useWallet } from "@solana/wallet-adapter-react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { usePosition } from "@/lib/hooks/usePosition";
import { useDeposit } from "@/lib/hooks/useProductActions";
import { useDepositGeo } from "@/lib/hooks/useGeoProductActions";
import { bpsToMultiplier, capacityFillFraction, formatSol } from "@/lib/format";
import type { LegResult, Tier } from "@/lib/hooks/useProduct";

const QUICK_AMOUNTS = [0.01, 0.05, 0.1, 0.5];

interface TieredProps {
  kind: "tiered";
  product: PublicKey;
  totalStake: bigint;
  maxCapacity: bigint;
  tiers: Tier[];
  numLegs: number;
  legResults: LegResult[];
  marketTitle: string;
  matchLabel: string;
}

interface GeoProps {
  kind: "geo";
  product: PublicKey;
  totalStake: bigint;
  maxCapacity: bigint;
  payoutBpsIfTrue: number;
  marketTitle: string;
  matchLabel: string;
}

function PayoutPreview({ amount, props }: { amount: number; props: TieredProps | GeoProps }) {
  if (!Number.isFinite(amount) || amount <= 0) {
    return <p className="text-xs text-muted-foreground">Enter an amount to preview the payout.</p>;
  }

  if (props.kind === "geo") {
    const payout = (amount * props.payoutBpsIfTrue) / 10000;
    return (
      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between rounded-2xl bg-status-true/10 px-3 py-2 text-status-true">
          <span>Exact outcome hits</span>
          <span className="font-mono font-semibold">{payout.toFixed(4)} SOL</span>
        </div>
        <div className="flex items-center justify-between rounded-2xl bg-background/40 px-3 py-2 text-muted-foreground">
          <span>Outcome misses</span>
          <span className="font-mono">0 SOL</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 text-sm">
      {props.tiers.map((tier) => {
        const payout = (amount * tier.payoutBps) / 10000;
        return (
          <div key={tier.minLegsTrue} className="flex items-center justify-between rounded-2xl bg-background/40 px-3 py-2 text-muted-foreground">
            <span>{tier.minLegsTrue}/{props.numLegs} conditions hit</span>
            <span className="font-mono">{payout.toFixed(4)} SOL</span>
          </div>
        );
      })}
    </div>
  );
}

export function TakePositionPanel(props: TieredProps | GeoProps) {
  const { publicKey } = useWallet();
  const { data: position } = usePosition(props.product, props.kind);
  const depositTiered = useDeposit();
  const depositGeo = useDepositGeo();
  const deposit = props.kind === "tiered" ? depositTiered : depositGeo;
  const [amount, setAmount] = useState("0.05");
  const [reviewOpen, setReviewOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);

  const fill = capacityFillFraction(props.totalStake, props.maxCapacity);
  const amountValue = Number(amount);
  const topPayout =
    props.kind === "tiered"
      ? Math.max(...props.tiers.map((tier) => tier.payoutBps))
      : props.payoutBpsIfTrue;

  const handleConfirm = () => {
    const amountSol = Number(amount);
    const mutation =
      props.kind === "tiered"
        ? depositTiered.mutateAsync({ product: props.product, amountSol })
        : depositGeo.mutateAsync({ geoProduct: props.product, amountSol });

    mutation
      .then(() => {
        setReviewOpen(false);
        setSuccessOpen(true);
      })
      .catch(() => undefined);
  };

  return (
    <>
      <div className="market-shell rounded-[30px] border border-border/80 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-status-true">Take a position</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">Buy into this market</h2>
          </div>
          <div className="rounded-full border border-border/70 bg-background/45 px-3 py-1 text-sm font-semibold text-foreground">
            {bpsToMultiplier(topPayout)} top tier
          </div>
        </div>

        <div className="mt-5 rounded-[24px] border border-border/70 bg-background/35 p-4">
          <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            <span>Capacity used</span>
            <span>{(fill * 100).toFixed(0)}%</span>
          </div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full transition-[width] duration-500"
              style={{
                width: `${fill * 100}%`,
                backgroundImage: "linear-gradient(90deg, var(--accent-from), var(--accent-to))",
              }}
            />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            {position
              ? `You already have ${formatSol(position.stake, 4)} SOL staked in this market.`
              : "Pick an amount and review the payout before you confirm in your wallet."}
          </p>
        </div>

        {!publicKey ? (
          <div className="mt-5 rounded-[24px] border border-border/70 bg-background/35 p-4 text-sm text-muted-foreground">
            Connect a wallet to review and buy this market.
          </div>
        ) : (
          <>
            <div className="mt-5 rounded-[24px] border border-border/70 bg-background/35 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Quick stake</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {QUICK_AMOUNTS.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setAmount(value.toString())}
                    className={`min-h-10 rounded-full border px-3 py-1 text-xs font-mono transition-colors ${
                      Number(amount) === value
                        ? "border-status-true bg-status-true/10 text-status-true"
                        : "border-border/80 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {value} SOL
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 rounded-[24px] border border-border/70 bg-background/35 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Your amount</p>
              <div className="mt-3 flex items-center gap-3">
                <Input
                  type="number"
                  step="0.0001"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  className="h-12 rounded-2xl border-border/80 bg-card/80 font-mono"
                />
                <span className="text-xs text-muted-foreground">SOL</span>
              </div>
            </div>

            <div className="mt-4 rounded-[24px] border border-border/70 bg-background/35 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Scenario preview</p>
              <div className="mt-3">
                <PayoutPreview amount={amountValue} props={props} />
              </div>
              <p className="mt-3 text-xs text-muted-foreground">Network fees are paid in SOL at wallet confirmation time.</p>
            </div>

            <Button
              onClick={() => setReviewOpen(true)}
              disabled={!Number.isFinite(amountValue) || amountValue <= 0 || deposit.isPending}
              className="mt-5 min-h-12 w-full rounded-full text-sm font-semibold"
            >
              Review order
            </Button>
          </>
        )}

        {deposit.isError && <p className="mt-3 text-xs text-status-false">{(deposit.error as Error).message}</p>}
      </div>

      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="max-w-lg rounded-[28px] border border-border/80 bg-card p-0 text-foreground">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle className="text-xl font-semibold">Review your order</DialogTitle>
            <DialogDescription className="text-sm leading-7">
              Check the market, stake, and best-case payout before confirming in your wallet.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 px-6 py-2">
            <div className="rounded-[24px] border border-border/70 bg-background/35 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-status-true">{props.marketTitle}</p>
              <p className="mt-2 text-sm text-muted-foreground">{props.matchLabel}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[22px] border border-border/70 bg-background/35 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Your stake</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">{amount} SOL</p>
              </div>
              <div className="rounded-[22px] border border-border/70 bg-background/35 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Top payout</p>
                <p className="mt-2 text-2xl font-semibold text-status-true">{bpsToMultiplier(topPayout)}</p>
              </div>
            </div>
          </div>

          <DialogFooter className="rounded-b-[28px] border-t border-border/70 bg-background/35 px-6 py-4">
            <Button variant="outline" onClick={() => setReviewOpen(false)} className="rounded-full">
              Back
            </Button>
            <Button onClick={handleConfirm} disabled={deposit.isPending} className="rounded-full">
              {deposit.isPending ? "Confirming…" : "Confirm in wallet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={successOpen} onOpenChange={setSuccessOpen}>
        <DialogContent className="max-w-md rounded-[30px] border border-border/80 bg-card p-0 text-foreground">
          <div className="px-6 py-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-status-true/25 bg-status-true/10">
              <CheckCircle2 className="size-8 text-status-true" />
            </div>
            <h3 className="mt-5 text-2xl font-semibold tracking-tight">Position created</h3>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              Your order is in. You now have exposure to <span className="text-foreground">{props.marketTitle}</span>.
            </p>

            <div className="mt-6 rounded-[24px] border border-border/70 bg-background/35 p-4 text-left">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Summary</p>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Stake</span>
                  <span className="font-mono text-foreground">{amount} SOL</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Top payout</span>
                  <span className="font-mono text-status-true">{bpsToMultiplier(topPayout)}</span>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3">
              <Link href="/positions" className="btn-gradient inline-flex min-h-11 items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold">
                View portfolio
              </Link>
              <button
                type="button"
                onClick={() => setSuccessOpen(false)}
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-border/70 px-5 py-2.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
              >
                Back to market
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
