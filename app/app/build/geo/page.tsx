"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WriterPoolPanel } from "@/components/writer-pool-panel";
import { useCreateGeoProduct, useDepositGeo } from "@/lib/hooks/useGeoProductActions";
import type { Comparison } from "@/lib/hooks/useGeoProduct";

export default function BuildGeoPage() {
  const [fixtureId, setFixtureId] = useState("18175981");
  const [statKeyA, setStatKeyA] = useState("1");
  const [statKeyB, setStatKeyB] = useState("2");
  const [predictionA, setPredictionA] = useState("3");
  const [predictionB, setPredictionB] = useState("0");
  const [distanceThreshold, setDistanceThreshold] = useState("0");
  const [distanceComparison, setDistanceComparison] = useState<Comparison>("equalTo");
  const [payoutBps, setPayoutBps] = useState("30000");
  const [closesInMinutes, setClosesInMinutes] = useState("5");
  const [settleWindowMinutes, setSettleWindowMinutes] = useState("30");
  const [maxCapacity, setMaxCapacity] = useState("0.01");

  const createGeoProduct = useCreateGeoProduct();
  const deposit = useDepositGeo();
  const [depositAmount, setDepositAmount] = useState("0.001");

  const worstCaseCollateral = (Number(maxCapacity) * Number(payoutBps)) / 10000;

  const handleCreate = () => {
    const now = Math.floor(Date.now() / 1000);
    const nonce = now % 1_000_000;
    createGeoProduct.mutate({
      fixtureId: BigInt(fixtureId),
      nonce,
      statKeyA: Number(statKeyA),
      statKeyB: Number(statKeyB),
      predictionA: Number(predictionA),
      predictionB: Number(predictionB),
      distanceThreshold: Number(distanceThreshold),
      distanceComparison,
      payoutBpsIfTrue: Number(payoutBps),
      closesAtUnixSeconds: now + Number(closesInMinutes) * 60,
      settleDeadlineUnixSeconds: now + Number(settleWindowMinutes) * 60,
      maxCapacitySol: Number(maxCapacity),
    });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-6 py-12">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">00 Build — exact outcome</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Predict two stats exactly (e.g. the final scoreline) via TxLINE&rsquo;s new
          validate_stat_v2 geometric distance predicate — not a threshold bet, a real
          exact-outcome market.{" "}
          <Link href="/build" className="underline">
            Back to the tiered builder
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
            <Input type="number" value={closesInMinutes} onChange={(e) => setClosesInMinutes(e.target.value)} className="font-mono" />
          </div>
          <div>
            <Label className="text-xs">Settle window (min)</Label>
            <Input type="number" value={settleWindowMinutes} onChange={(e) => setSettleWindowMinutes(e.target.value)} className="font-mono" />
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-mono text-sm text-muted-foreground">prediction</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Stat A key</Label>
            <Input type="number" value={statKeyA} onChange={(e) => setStatKeyA(e.target.value)} className="font-mono" />
          </div>
          <div>
            <Label className="text-xs">Predicted value A</Label>
            <Input type="number" value={predictionA} onChange={(e) => setPredictionA(e.target.value)} className="font-mono" />
          </div>
          <div>
            <Label className="text-xs">Stat B key</Label>
            <Input type="number" value={statKeyB} onChange={(e) => setStatKeyB(e.target.value)} className="font-mono" />
          </div>
          <div>
            <Label className="text-xs">Predicted value B</Label>
            <Input type="number" value={predictionB} onChange={(e) => setPredictionB(e.target.value)} className="font-mono" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Distance comparison</Label>
            <Select value={distanceComparison} onValueChange={(v) => setDistanceComparison(v as Comparison)}>
              <SelectTrigger className="font-mono">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="equalTo">= (exact)</SelectItem>
                <SelectItem value="lessThan">&lt; (within tolerance)</SelectItem>
                <SelectItem value="greaterThan">&gt;</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Distance threshold</Label>
            <Input type="number" value={distanceThreshold} onChange={(e) => setDistanceThreshold(e.target.value)} className="font-mono" />
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-mono text-sm text-muted-foreground">payout</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Payout if exact (bps)</Label>
            <Input type="number" value={payoutBps} onChange={(e) => setPayoutBps(e.target.value)} className="font-mono" />
            <p className="mt-1 font-mono text-xs text-muted-foreground">
              = {(Number(payoutBps) / 10000).toFixed(2)}x
            </p>
          </div>
          <div>
            <Label className="text-xs">Max capacity (SOL)</Label>
            <Input type="number" step="0.001" value={maxCapacity} onChange={(e) => setMaxCapacity(e.target.value)} className="font-mono" />
          </div>
        </div>
        <p className="font-mono text-xs text-muted-foreground">
          worst-case collateral reserved from your pool:{" "}
          <span className="text-status-pending">{worstCaseCollateral.toFixed(5)} SOL</span>
        </p>
      </section>

      <Button onClick={handleCreate} disabled={createGeoProduct.isPending} className="w-full">
        {createGeoProduct.isPending ? "creating…" : "Create exact-outcome product"}
      </Button>

      {createGeoProduct.isError && (
        <p className="text-sm text-status-false">{(createGeoProduct.error as Error).message}</p>
      )}

      {createGeoProduct.isSuccess && (
        <div className="space-y-3 rounded-lg border border-status-true/30 bg-status-true/5 p-4">
          <p className="font-mono text-sm">
            product created ·{" "}
            <a
              href={`https://explorer.solana.com/tx/${createGeoProduct.data.sig}?cluster=devnet`}
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              {createGeoProduct.data.sig.slice(0, 12)}…
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
                deposit.mutate({ geoProduct: createGeoProduct.data!.geoProduct, amountSol: Number(depositAmount) })
              }
              disabled={deposit.isPending}
            >
              {deposit.isPending ? "depositing…" : "Deposit"}
            </Button>
          </div>
          {deposit.isSuccess && <p className="font-mono text-xs text-status-true">deposit confirmed</p>}
          <Link
            href={`/watch/geo/${createGeoProduct.data.geoProduct.toBase58()}`}
            className="inline-block text-sm underline"
          >
            01 Watch this product →
          </Link>
        </div>
      )}
    </div>
  );
}
