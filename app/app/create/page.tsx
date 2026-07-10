"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LegEditor, emptyLeg } from "@/components/leg-editor";
import { TierEditor, defaultTiers } from "@/components/tier-editor";
import { WriterPoolPanel } from "@/components/writer-pool-panel";
import { useCreateProduct, useDeposit } from "@/lib/hooks/useProductActions";
import { getFixturePresentation } from "@/lib/market-presentation";
import type { Leg, Tier } from "@/lib/hooks/useProduct";

const STEPS = ["Match setup", "Conditions", "Payout ladder", "Review", "Create"];

export default function CreatePage() {
  const [fixtureId, setFixtureId] = useState("18175981");
  const [closesInMinutes, setClosesInMinutes] = useState("45");
  const [settleWindowMinutes, setSettleWindowMinutes] = useState("180");
  const [maxCapacity, setMaxCapacity] = useState("1");
  const [legs, setLegs] = useState<Leg[]>([emptyLeg()]);
  const [tiers, setTiers] = useState<Tier[]>(defaultTiers(1));
  const [tiersTouched, setTiersTouched] = useState(false);
  const [depositAmount, setDepositAmount] = useState("0.05");

  const createProduct = useCreateProduct();
  const deposit = useDeposit();
  const fixture = useMemo(() => getFixturePresentation(fixtureId), [fixtureId]);
  const topPayout = Math.max(...tiers.map((tier) => tier.payoutBps), 0);

  const handleLegsChange = (next: Leg[]) => {
    setLegs(next);
    if (!tiersTouched) setTiers(defaultTiers(next.length));
  };

  const handleCreate = () => {
    const now = Math.floor(Date.now() / 1000);
    createProduct.mutate({
      fixtureId: BigInt(fixtureId),
      nonce: now % 1_000_000,
      legs,
      tiers,
      closesAtUnixSeconds: now + Number(closesInMinutes) * 60,
      settleDeadlineUnixSeconds: now + Number(settleWindowMinutes) * 60,
      maxCapacitySol: Number(maxCapacity),
    });
  };

  return (
    <div className="mx-auto max-w-[1400px] space-y-8 px-6 py-8">
      <section className="market-shell rounded-[34px] border border-border/80 p-7">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-status-true">Create market studio</p>
        <div className="mt-4 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight text-foreground">Design a structured football market</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
              Keep the consumer surface clean while preserving Strata’s differentiator: creator-defined conditions with a transparent payout ladder.
            </p>
          </div>
          <Link href="/create/geo" className="rounded-full border border-border/70 px-4 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
            Create exact-outcome market
          </Link>
        </div>
      </section>

      <section className="market-shell rounded-[30px] border border-border/80 p-4">
        <div className="grid gap-3 md:grid-cols-5">
          {STEPS.map((step, index) => (
            <div key={step} className={`rounded-full px-4 py-2 text-sm font-semibold ${index === 0 ? "bg-card text-foreground" : "text-muted-foreground"}`}>
              {index + 1}. {step}
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="space-y-6">
          <WriterPoolPanel />

          <div className="market-shell rounded-[30px] border border-border/80 p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-status-true">1. Match setup</p>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div>
                <Label className="text-xs">Fixture ID</Label>
                <Input value={fixtureId} onChange={(event) => setFixtureId(event.target.value)} className="mt-2 font-mono" />
              </div>
              <div>
                <Label className="text-xs">Max capacity (SOL)</Label>
                <Input type="number" step="0.001" value={maxCapacity} onChange={(event) => setMaxCapacity(event.target.value)} className="mt-2 font-mono" />
              </div>
              <div>
                <Label className="text-xs">Closes in (minutes)</Label>
                <Input type="number" value={closesInMinutes} onChange={(event) => setClosesInMinutes(event.target.value)} className="mt-2 font-mono" />
              </div>
              <div>
                <Label className="text-xs">Settlement window (minutes)</Label>
                <Input type="number" value={settleWindowMinutes} onChange={(event) => setSettleWindowMinutes(event.target.value)} className="mt-2 font-mono" />
              </div>
            </div>
          </div>

          <div className="market-shell rounded-[30px] border border-border/80 p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-status-true">2. Conditions</p>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              Define the match conditions the buyer is really purchasing. Keep them understandable so the eventual consumer market stays easy to read.
            </p>
            <div className="mt-5">
              <LegEditor legs={legs} onChange={handleLegsChange} />
            </div>
          </div>

          <div className="market-shell rounded-[30px] border border-border/80 p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-status-true">3. Payout ladder</p>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              Make the ladder feel intentional: enough upside to be attractive, but simple enough that a first-time buyer can understand it immediately.
            </p>
            <div className="mt-5">
              <TierEditor
                tiers={tiers}
                numLegs={legs.length}
                onChange={(value) => {
                  setTiersTouched(true);
                  setTiers(value);
                }}
              />
            </div>
          </div>

          <div className="market-shell rounded-[30px] border border-border/80 p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-status-true">4. Review and create</p>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              This is still creator tooling, but the final artifact should look like something a retail user would confidently open on the homepage.
            </p>
            <Button onClick={handleCreate} disabled={createProduct.isPending} className="mt-5 min-h-12 rounded-full px-6">
              {createProduct.isPending ? "Creating…" : "Create market"}
            </Button>

            {createProduct.isSuccess ? (
              <div className="mt-5 rounded-[24px] border border-status-true/30 bg-status-true/5 p-4">
                <p className="text-sm font-semibold text-foreground">Market created successfully.</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Input type="number" step="0.0001" value={depositAmount} onChange={(event) => setDepositAmount(event.target.value)} className="max-w-40 font-mono" />
                  <Button
                    variant="outline"
                    onClick={() => deposit.mutate({ product: createProduct.data.product, amountSol: Number(depositAmount) })}
                    disabled={deposit.isPending}
                  >
                    {deposit.isPending ? "Depositing…" : "Seed with stake"}
                  </Button>
                  <Link href={`/watch/${createProduct.data.product.toBase58()}`} className="inline-flex min-h-10 items-center rounded-full border border-border/70 px-4 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
                    Open created market
                  </Link>
                </div>
              </div>
            ) : null}
          </div>
        </section>

        <section className="space-y-4 xl:sticky xl:top-24 xl:self-start">
          <div className="market-shell rounded-[30px] border border-border/80 p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-status-true">Preview rail</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">{fixture.marketTitle}</h2>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">{fixture.context}</p>

            <div className="mt-5 grid gap-3">
              <div className="rounded-[22px] border border-border/70 bg-background/35 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Closes in</p>
                <p className="mt-2 text-lg font-semibold text-foreground">{closesInMinutes}m</p>
              </div>
              <div className="rounded-[22px] border border-border/70 bg-background/35 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Conditions</p>
                <p className="mt-2 text-lg font-semibold text-foreground">{legs.length}</p>
              </div>
              <div className="rounded-[22px] border border-border/70 bg-background/35 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Top payout</p>
                <p className="mt-2 text-lg font-semibold text-status-true">{(topPayout / 10000).toFixed(2)}x</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
