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
import { describeTier, getCreateStudioSummary, getFixturePresentation } from "@/lib/market-presentation";
import type { Leg, Tier } from "@/lib/hooks/useProduct";

const STEPS = ["1 Conditions", "2 Payout Ladder", "3 Details", "4 Review"];

export default function CreatePage() {
  const [fixtureId, setFixtureId] = useState("17952170");
  const [closesInMinutes, setClosesInMinutes] = useState("120");
  const [settleWindowMinutes, setSettleWindowMinutes] = useState("180");
  const [maxCapacity, setMaxCapacity] = useState("3");
  const [legs, setLegs] = useState<Leg[]>([
    { ...emptyLeg(), statKeyA: 1, threshold: 2.5, comparison: "greaterThan" },
  ]);
  const [tiers, setTiers] = useState<Tier[]>(defaultTiers(1));
  const [tiersTouched, setTiersTouched] = useState(false);
  const [depositAmount, setDepositAmount] = useState("0.05");

  const createProduct = useCreateProduct();
  const deposit = useDeposit();
  const fixture = useMemo(() => getFixturePresentation(fixtureId), [fixtureId]);
  const conditionSummary = useMemo(() => getCreateStudioSummary(legs, fixtureId), [fixtureId, legs]);

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
    <div className="mx-auto max-w-[1480px] space-y-6 px-6 py-8">
      <section className="rounded-[20px] border border-white/10 bg-[linear-gradient(180deg,oklch(0.07_0.004_260),oklch(0.07_0.004_260))] p-4 shadow-[0_30px_70px_rgba(0,0,0,0.55)]">
        <div className="grid gap-2 md:grid-cols-4">
          {STEPS.map((step, index) => (
            <div
              key={step}
              className={`pb-2 text-center text-[11px] font-bold ${
                index === 0 ? "border-b-2 border-status-true text-white" : "text-muted-foreground"
              }`}
            >
              {step}
            </div>
          ))}
        </div>

        <div className="mt-4">
          <WriterPoolPanel />
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <StudioPanel title="Market Conditions">
              <div className="mt-4 grid gap-4">
                <Field label="Market Type">
                  <Input value="Total Goals" readOnly className="border-white/10 bg-black/10 text-white" />
                </Field>
                <Field label="Fixture">
                  <Input value={fixture.marketTitle} readOnly className="border-white/10 bg-black/10 text-white" />
                </Field>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Fixture ID">
                    <Input value={fixtureId} onChange={(event) => setFixtureId(event.target.value)} className="border-white/10 bg-black/10 text-white" />
                  </Field>
                  <Field label="Max Capacity">
                    <Input value={maxCapacity} onChange={(event) => setMaxCapacity(event.target.value)} className="border-white/10 bg-black/10 text-white" />
                  </Field>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Closes In (min)">
                    <Input value={closesInMinutes} onChange={(event) => setClosesInMinutes(event.target.value)} className="border-white/10 bg-black/10 text-white" />
                  </Field>
                  <Field label="Settlement Window">
                    <Input value={settleWindowMinutes} onChange={(event) => setSettleWindowMinutes(event.target.value)} className="border-white/10 bg-black/10 text-white" />
                  </Field>
                </div>

                <div>
                  <Label className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Conditions</Label>
                  <div className="mt-3">
                    <LegEditor legs={legs} onChange={handleLegsChange} />
                  </div>
                </div>

                <div>
                  <Label className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Payout Ladder</Label>
                  <div className="mt-3">
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
              </div>
            </StudioPanel>

            <div className="mt-4 flex gap-3">
              <button
                type="button"
                className="inline-flex min-h-10 flex-1 items-center justify-center rounded-full border border-white/12 px-4 py-2 text-sm font-semibold text-muted-foreground"
              >
                Save Draft
              </button>
              <Button onClick={handleCreate} disabled={createProduct.isPending} className="btn-gradient min-h-10 flex-1 rounded-full px-4 py-2 text-sm font-semibold">
                {createProduct.isPending ? "Creating…" : "Continue"}
              </Button>
            </div>

            {createProduct.isSuccess ? (
              <div className="mt-4 rounded-[14px] border border-status-true/30 bg-status-true/5 p-4">
                <p className="text-sm font-semibold text-white">Market created successfully.</p>
                <div className="mt-3 flex flex-wrap gap-3">
                  <Input value={depositAmount} onChange={(event) => setDepositAmount(event.target.value)} className="max-w-40 border-white/10 bg-black/10 text-white" />
                  <Button
                    variant="outline"
                    onClick={() => deposit.mutate({ product: createProduct.data.product, amountSol: Number(depositAmount) })}
                    disabled={deposit.isPending}
                  >
                    {deposit.isPending ? "Depositing…" : "Seed with stake"}
                  </Button>
                  <Link href={`/watch/${createProduct.data.product.toBase58()}`} className="inline-flex min-h-10 items-center rounded-full border border-white/12 px-4 py-2 text-sm font-semibold text-muted-foreground">
                    Open created market
                  </Link>
                </div>
              </div>
            ) : null}

            {createProduct.isError ? (
              <p className="mt-4 rounded-[14px] border border-status-false/30 bg-status-false/5 p-4 text-sm text-status-false">
                {(createProduct.error as Error).message}
              </p>
            ) : null}
          </div>

          <div>
            <StudioPanel title="Live Preview">
              <div className="mt-4">
                <div className="text-[22px] font-extrabold tracking-tight text-white">{fixture.marketTitle}</div>
                <div className="mt-1 text-[12px] text-muted-foreground">{fixture.context}</div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <PreviewCard title="If conditions met" rows={[["Yes", "100c"]]} />
                <PreviewCard title="If not" rows={[["No", "100c"]]} />
              </div>

              <div className="mt-4 space-y-2">
                {conditionSummary.map((item) => (
                  <div key={item.id} className="rounded-[10px] border border-white/8 bg-black/10 px-3 py-2 text-sm text-white">
                    {item.label}
                  </div>
                ))}
              </div>

              <div className="mt-4 space-y-2">
                {tiers.map((tier, index) => (
                  <div key={`${tier.minLegsTrue}-${index}`} className="flex items-center justify-between rounded-[10px] border border-white/8 bg-black/10 px-3 py-2 text-sm">
                    <span className="text-white">{describeTier(tier.minLegsTrue, Math.max(1, legs.length))}</span>
                    <span className="font-mono text-status-true">{(tier.payoutBps / 10000).toFixed(2)}x</span>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex items-center justify-between text-[12px] text-muted-foreground">
                <span>Estimated Liquidity</span>
                <span className="text-white">High</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-[12px] text-muted-foreground">
                <span>Category</span>
                <span className="text-white">Total Goals</span>
              </div>
            </StudioPanel>
          </div>
        </div>
      </section>
    </div>
  );
}

function StudioPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[14px] border border-white/8 bg-[linear-gradient(180deg,oklch(0.18_0.008_260),oklch(0.15_0.008_260))] p-4 shadow-[0_8px_24px_rgba(0,0,0,0.35)]">
      <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-status-true">{title}</div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{label}</Label>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function PreviewCard({ title, rows }: { title: string; rows: Array<[string, string]> }) {
  return (
    <div className="rounded-[10px] border border-white/8 bg-black/10 p-3">
      <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{title}</div>
      <div className="mt-3 space-y-2">
        {rows.map(([left, right]) => (
          <div key={`${left}-${right}`} className="flex items-center justify-between text-sm">
            <span className="text-white">{left}</span>
            <span className="font-semibold text-white">{right}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
