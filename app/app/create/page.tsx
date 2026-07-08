"use client";

import { useState } from "react";
import Link from "next/link";
import { PublicKey } from "@solana/web3.js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WriterPoolPanel } from "@/components/writer-pool-panel";
import { LegEditor, emptyLeg } from "@/components/leg-editor";
import { TierEditor, defaultTiers } from "@/components/tier-editor";
import { useCreateProduct, useDeposit } from "@/lib/hooks/useProductActions";
import type { Leg, Tier } from "@/lib/hooks/useProduct";

export default function BuildPage() {
  const [fixtureId, setFixtureId] = useState("18175981");
  const [closesInMinutes, setClosesInMinutes] = useState("5");
  const [settleWindowMinutes, setSettleWindowMinutes] = useState("30");
  const [maxCapacity, setMaxCapacity] = useState("0.01");
  const [legs, setLegs] = useState<Leg[]>([emptyLeg()]);
  const [tiers, setTiers] = useState<Tier[]>(defaultTiers(1));
  const [tiersTouched, setTiersTouched] = useState(false);

  const createProduct = useCreateProduct();
  const deposit = useDeposit();
  const [depositAmount, setDepositAmount] = useState("0.001");

  const handleLegsChange = (next: Leg[]) => {
    setLegs(next);
    if (!tiersTouched) setTiers(defaultTiers(next.length));
  };

  const worstCasePayoutBps = tiers.reduce((max, t) => Math.max(max, t.payoutBps), 0);
  const worstCaseCollateral = (Number(maxCapacity) * worstCasePayoutBps) / 10000;

  const handleCreate = () => {
    const now = Math.floor(Date.now() / 1000);
    const nonce = now % 1_000_000;
    createProduct.mutate({
      fixtureId: BigInt(fixtureId),
      nonce,
      legs,
      tiers,
      closesAtUnixSeconds: now + Number(closesInMinutes) * 60,
      settleDeadlineUnixSeconds: now + Number(settleWindowMinutes) * 60,
      maxCapacitySol: Number(maxCapacity),
    });
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-6 py-12">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Create a market</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Combine up to 5 stat conditions into a tiered payout table. Not a yes/no bet —
          the more legs come true, the higher the payout tier.{" "}
          <Link href="/create/geo" className="underline">
            Or predict an exact outcome →
          </Link>
        </p>
      </div>

      <WriterPoolPanel />

      <section className="space-y-3">
        <h2 className="font-mono text-sm text-muted-foreground">fixture &amp; window</h2>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label className="text-xs">Fixture ID</Label>
            <Input value={fixtureId} onChange={(e) => setFixtureId(e.target.value)} className="font-mono" />
          </div>
          <div>
            <Label className="text-xs">Closes in (min)</Label>
            <Input
              type="number"
              value={closesInMinutes}
              onChange={(e) => setClosesInMinutes(e.target.value)}
              className="font-mono"
            />
          </div>
          <div>
            <Label className="text-xs">Settle window (min)</Label>
            <Input
              type="number"
              value={settleWindowMinutes}
              onChange={(e) => setSettleWindowMinutes(e.target.value)}
              className="font-mono"
            />
          </div>
        </div>
        <div>
          <Label className="text-xs">Max capacity (SOL)</Label>
          <Input
            type="number"
            step="0.001"
            value={maxCapacity}
            onChange={(e) => setMaxCapacity(e.target.value)}
            className="w-40 font-mono"
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-mono text-sm text-muted-foreground">legs</h2>
        <LegEditor legs={legs} onChange={handleLegsChange} />
      </section>

      <section className="space-y-3">
        <h2 className="font-mono text-sm text-muted-foreground">payout tiers</h2>
        <TierEditor
          tiers={tiers}
          numLegs={legs.length}
          onChange={(t) => {
            setTiersTouched(true);
            setTiers(t);
          }}
        />
        <p className="font-mono text-xs text-muted-foreground">
          worst-case collateral reserved from your pool:{" "}
          <span className="text-status-pending">{worstCaseCollateral.toFixed(5)} SOL</span>
        </p>
      </section>

      <Button onClick={handleCreate} disabled={createProduct.isPending} className="w-full">
        {createProduct.isPending ? "creating…" : "Create product"}
      </Button>

      {createProduct.isError && (
        <p className="text-sm text-status-false">{(createProduct.error as Error).message}</p>
      )}

      {createProduct.isSuccess && (
        <div className="space-y-3 rounded-lg border border-status-true/30 bg-status-true/5 p-4">
          <p className="font-mono text-sm">
            product created ·{" "}
            <a
              href={`https://explorer.solana.com/tx/${createProduct.data.sig}?cluster=devnet`}
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              {createProduct.data.sig.slice(0, 12)}…
            </a>
          </p>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              step="0.0001"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              className="w-32 font-mono"
            />
            <Button
              variant="outline"
              onClick={() =>
                deposit.mutate({
                  product: createProduct.data!.product,
                  amountSol: Number(depositAmount),
                })
              }
              disabled={deposit.isPending}
            >
              {deposit.isPending ? "depositing…" : "Deposit"}
            </Button>
          </div>
          {deposit.isSuccess && (
            <p className="font-mono text-xs text-status-true">deposit confirmed</p>
          )}
          <Link
            href={`/watch/${createProduct.data.product.toBase58()}`}
            className="inline-block text-sm underline"
          >
            01 Watch this product →
          </Link>
        </div>
      )}
    </div>
  );
}
