"use client";

import { useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { useWallet } from "@solana/wallet-adapter-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TierLadder } from "@/components/tier-ladder";
import { usePosition } from "@/lib/hooks/usePosition";
import { useDeposit } from "@/lib/hooks/useProductActions";
import { useDepositGeo } from "@/lib/hooks/useGeoProductActions";
import { formatSol, bpsToMultiplier, capacityFillFraction } from "@/lib/format";
import type { Tier, LegResult } from "@/lib/hooks/useProduct";

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

export function TakePositionPanel(props: TieredProps | GeoProps) {
  const { publicKey } = useWallet();
  const { data: position } = usePosition(props.product, props.kind);
  const depositTiered = useDeposit();
  const depositGeo = useDepositGeo();
  const [amount, setAmount] = useState("0.001");

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
    <div className="space-y-3 rounded-lg border border-border bg-card p-4">
      <h2 className="font-mono text-sm text-muted-foreground">take a position</h2>

      {props.kind === "tiered" ? (
        <TierLadder tiers={props.tiers} numLegs={props.numLegs} legResults={props.legResults} />
      ) : (
        <p className="font-mono text-xs text-muted-foreground">
          pays <span className="text-status-true">{bpsToMultiplier(props.payoutBpsIfTrue)}</span> if
          the exact outcome matches
        </p>
      )}

      <div className="flex items-center justify-between font-mono text-[10px] text-muted-foreground">
        <span>capacity</span>
        <span>{(fill * 100).toFixed(0)}%</span>
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
        <p className="font-mono text-xs text-muted-foreground">
          you already have <span className="text-status-true">{formatSol(position.stake, 6)} SOL</span>{" "}
          staked here
        </p>
      )}

      {!publicKey ? (
        <p className="rounded-lg border border-border bg-secondary/30 p-3 text-sm text-muted-foreground">
          Connect a wallet to take a position.
        </p>
      ) : poolFull ? (
        <p className="rounded-lg border border-border bg-secondary/30 p-3 text-sm text-muted-foreground">
          Pool full — this product can&rsquo;t accept more stake.
        </p>
      ) : (
        <div className="flex items-center gap-2">
          <Input
            type="number"
            step="0.0001"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-28 font-mono"
          />
          <Button onClick={handleDeposit} disabled={deposit.isPending}>
            {deposit.isPending ? "confirming…" : "Take position"}
          </Button>
        </div>
      )}

      {deposit.isSuccess && (
        <p className="font-mono text-xs text-status-true">position confirmed</p>
      )}
      {deposit.isError && (
        <p className="font-mono text-xs text-status-false">{(deposit.error as Error).message}</p>
      )}
    </div>
  );
}
