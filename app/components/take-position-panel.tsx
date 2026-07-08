"use client";

import { useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { useWallet } from "@solana/wallet-adapter-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePosition } from "@/lib/hooks/usePosition";
import { useDeposit } from "@/lib/hooks/useProductActions";
import { useDepositGeo } from "@/lib/hooks/useGeoProductActions";
import { formatSol, capacityFillFraction } from "@/lib/format";
import type { Tier, LegResult } from "@/lib/hooks/useProduct";

const QUICK_AMOUNTS = [0.01, 0.05, 0.1, 0.5];

interface TieredProps {
  kind: "tiered";
  product: PublicKey;
  totalStake: bigint;
  maxCapacity: bigint;
  tiers: Tier[];
  numLegs: number;
  legResults: LegResult[];
}

interface GeoProps {
  kind: "geo";
  product: PublicKey;
  totalStake: bigint;
  maxCapacity: bigint;
  payoutBpsIfTrue: number;
}

function PayoutScenarios({ amount, ...props }: { amount: number } & (TieredProps | GeoProps)) {
  if (!Number.isFinite(amount) || amount <= 0) {
    return <p className="text-xs text-muted-foreground">Enter an amount to see potential payouts.</p>;
  }

  if (props.kind === "geo") {
    const win = (amount * props.payoutBpsIfTrue) / 10000;
    return (
      <div className="flex flex-col gap-1 text-xs">
        <div className="flex items-center justify-between rounded bg-status-true/10 px-2 py-1 text-status-true">
          <span>Exact match</span>
          <span className="font-mono font-semibold">{win.toFixed(4)} SOL</span>
        </div>
        <div className="flex items-center justify-between rounded px-2 py-1 text-muted-foreground">
          <span>Miss</span>
          <span className="font-mono">0 SOL</span>
        </div>
      </div>
    );
  }

  const legsTrue = props.legResults.filter((r) => r === "true").length;
  let achievedIndex = -1;
  props.tiers.forEach((tier, i) => {
    if (legsTrue >= tier.minLegsTrue) achievedIndex = i;
  });

  return (
    <div className="flex flex-col gap-1 text-xs">
      {props.tiers.map((tier, i) => {
        const payout = (amount * tier.payoutBps) / 10000;
        const achieved = i === achievedIndex;
        return (
          <div
            key={i}
            className={`flex items-center justify-between rounded px-2 py-1 ${
              achieved ? "bg-status-true/10 text-status-true" : "text-muted-foreground"
            }`}
          >
            <span>
              If {tier.minLegsTrue}/{props.numLegs} legs hit
            </span>
            <span className={`font-mono ${achieved ? "font-semibold" : ""}`}>{payout.toFixed(4)} SOL</span>
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
  const [amount, setAmount] = useState("0.01");

  const deposit = props.kind === "tiered" ? depositTiered : depositGeo;
  const fill = capacityFillFraction(props.totalStake, props.maxCapacity);
  const poolFull = fill >= 1;

  const handleDeposit = () => {
    const amountSol = Number(amount);
    if (props.kind === "tiered") {
      depositTiered.mutate({ product: props.product, amountSol });
    } else {
      depositGeo.mutate({ geoProduct: props.product, amountSol });
    }
  };

  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-4">
      <h2 className="text-sm font-semibold text-foreground">Take a position</h2>

      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span>capacity</span>
        <span className="font-mono">{(fill * 100).toFixed(0)}%</span>
      </div>
      <div className="h-1 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{
            width: `${fill * 100}%`,
            backgroundImage: "linear-gradient(90deg, var(--accent-from), var(--accent-to))",
          }}
        />
      </div>

      {position && (
        <p className="text-xs text-muted-foreground">
          You already have <span className="font-mono text-status-true">{formatSol(position.stake, 6)} SOL</span>{" "}
          staked here.
        </p>
      )}

      {!publicKey ? (
        <p className="rounded-lg border border-border bg-secondary/30 p-3 text-sm text-muted-foreground">
          Connect a wallet to take a position.
        </p>
      ) : poolFull ? (
        <p className="rounded-lg border border-border bg-secondary/30 p-3 text-sm text-muted-foreground">
          Pool full — this market can&rsquo;t accept more stake.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {QUICK_AMOUNTS.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setAmount(a.toString())}
                className={`rounded-full border px-3 py-1 text-xs font-mono transition-colors ${
                  Number(amount) === a
                    ? "border-status-true text-status-true"
                    : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                }`}
              >
                {a} SOL
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              step="0.0001"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-28 font-mono"
            />
            <span className="text-xs text-muted-foreground">SOL</span>
            <Button onClick={handleDeposit} disabled={deposit.isPending} className="ml-auto">
              {deposit.isPending ? "confirming…" : "Take position"}
            </Button>
          </div>

          <div className="border-t border-border pt-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground">If this market settles…</p>
            <PayoutScenarios amount={Number(amount)} {...props} />
          </div>
        </>
      )}

      {deposit.isSuccess && <p className="text-xs text-status-true">Position confirmed.</p>}
      {deposit.isError && <p className="text-xs text-status-false">{(deposit.error as Error).message}</p>}
    </div>
  );
}
