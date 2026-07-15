"use client";

import Link from "next/link";
import { useGeoProduct } from "@/lib/hooks/useGeoProduct";
import { usePosition } from "@/lib/hooks/usePosition";
import { useProduct } from "@/lib/hooks/useProduct";
import { TierLadder } from "@/components/tier-ladder";
import { LegStatusList } from "@/components/leg-status-list";
import { bpsToMultiplier, formatSol } from "@/lib/format";
import { getGeoMarketPresentation, getTieredMarketPresentation } from "@/lib/market-presentation";
import { useClaim } from "@/lib/hooks/useSettlement";
import { useClaimGeo } from "@/lib/hooks/useGeoProductActions";
import { parsePublicKey } from "@/lib/solana-address";

export function PositionDetailClient({ productAddress }: { productAddress: string }) {
  const product = parsePublicKey(productAddress);
  const tiered = useProduct(product);
  const geo = useGeoProduct(product);
  const tieredPosition = usePosition(product, "tiered");
  const geoPosition = usePosition(product, "geo");
  const claim = useClaim();
  const claimGeo = useClaimGeo();

  if (tiered.isLoading || geo.isLoading) {
    return <div className="mx-auto max-w-[1400px] px-6 py-8 text-sm text-muted-foreground">Loading position…</div>;
  }

  if (!product || (!tiered.data && !geo.data)) {
    return <div className="mx-auto max-w-[1400px] px-6 py-8 text-sm text-status-false">Position not found.</div>;
  }

  if (tiered.data) {
    const position = tieredPosition.data;
    const presentation = getTieredMarketPresentation(tiered.data);
    const topPayout = Math.max(...tiered.data.tiers.map((tier) => tier.payoutBps));
    const payout = position ? (position.stake * BigInt(tiered.data.finalPayoutBps || topPayout)) / 10000n : 0n;

    return (
      <div className="mx-auto max-w-[1480px] space-y-6 px-6 py-8">
        <section className="rounded-[20px] border border-white/10 bg-[linear-gradient(180deg,oklch(0.07_0.004_260),oklch(0.07_0.004_260))] p-4 shadow-[0_30px_70px_rgba(0,0,0,0.55)]">
          <Link href="/positions" className="text-[11px] text-muted-foreground hover:text-foreground">← Back to portfolio</Link>
          <div className="mt-3 flex items-start justify-between">
            <div>
              <h1 className="text-[28px] font-extrabold tracking-tight text-white">{presentation.marketTitle}</h1>
              <p className="mt-1 text-[12px] text-muted-foreground">
                {presentation.sport} · {presentation.marketLabel}
              </p>
            </div>
            <span className="rounded-full border border-status-true/35 bg-status-true/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-status-true">
              {tiered.data.status === "open" ? "Open" : "Settled"}
            </span>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <Metric label="Stake" value={position ? `${formatSol(position.stake)} SOL` : "0.0000 SOL"} />
            <Metric label="Price" value={bpsToMultiplier(topPayout)} />
            <Metric label="To win" value={position ? `${formatSol(payout - position.stake)} SOL` : "0.0000 SOL"} />
            <Metric label="Total payout" value={position ? `${formatSol(payout)} SOL` : "0.0000 SOL"} />
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <Panel title="Live Progress">
              <div className="mt-4">
                <LegStatusList
                  product={product}
                  legs={tiered.data.legs}
                  legResults={tiered.data.legResults}
                  closesAtUnixSeconds={Number(tiered.data.closesAt)}
                  canSettle={false}
                />
              </div>
            </Panel>

            <Panel title="Payout Ladder">
              <div className="mt-4 rounded-[12px] border border-white/8 bg-black/10 p-3">
                <TierLadder tiers={tiered.data.tiers} numLegs={tiered.data.numLegs} legResults={tiered.data.legResults} />
              </div>
              <div className="mt-4 space-y-2">
                {tiered.data.status === "settled" && position && !position.claimed ? (
                  <button
                    type="button"
                    onClick={() => claim.mutate(product)}
                    disabled={claim.isPending}
                    className="btn-gradient inline-flex min-h-10 w-full items-center justify-center rounded-full px-4 py-2 text-sm font-semibold"
                  >
                    {claim.isPending ? "Claiming…" : "Claim Payout"}
                  </button>
                ) : null}
                <Link
                  href={`/verify/${productAddress}`}
                  className="inline-flex min-h-10 w-full items-center justify-center rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-muted-foreground hover:text-white"
                >
                  View Receipt
                </Link>
              </div>
            </Panel>
          </div>

          <div className="mt-4 flex items-center justify-between text-[10px] text-muted-foreground">
            <span>Position ID #{position?.address.toBase58().slice(0, 8) ?? "—"}</span>
            <span>Updates live. Delays may occur. Market must be resolved to claim.</span>
          </div>
        </section>
      </div>
    );
  }

  const geoData = geo.data!;
  const geoPositionData = geoPosition.data;
  const presentation = getGeoMarketPresentation(geoData);
  const payout = geoPositionData ? (geoPositionData.stake * BigInt(geoData.finalPayoutBps || geoData.payoutBpsIfTrue)) / 10000n : 0n;

  return (
    <div className="mx-auto max-w-[1480px] space-y-6 px-6 py-8">
      <section className="rounded-[20px] border border-white/10 bg-[linear-gradient(180deg,oklch(0.07_0.004_260),oklch(0.07_0.004_260))] p-4 shadow-[0_30px_70px_rgba(0,0,0,0.55)]">
        <Link href="/positions" className="text-[11px] text-muted-foreground hover:text-foreground">← Back to portfolio</Link>
        <div className="mt-3 flex items-start justify-between">
          <div>
            <h1 className="text-[28px] font-extrabold tracking-tight text-white">{presentation.marketTitle}</h1>
            <p className="mt-1 text-[12px] text-muted-foreground">
              {presentation.sport} · {presentation.marketLabel}
            </p>
          </div>
          <span className="rounded-full border border-status-true/35 bg-status-true/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-status-true">
            {geoData.status === "open" ? "Open" : "Settled"}
          </span>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <Metric label="Stake" value={geoPositionData ? `${formatSol(geoPositionData.stake)} SOL` : "0.0000 SOL"} />
          <Metric label="Price" value={bpsToMultiplier(geoData.payoutBpsIfTrue)} />
          <Metric label="To win" value={geoPositionData ? `${formatSol(payout - geoPositionData.stake)} SOL` : "0.0000 SOL"} />
          <Metric label="Total payout" value={geoPositionData ? `${formatSol(payout)} SOL` : "0.0000 SOL"} />
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Panel title="Live Progress">
            <div className="mt-4 text-sm text-muted-foreground">
              Exact-outcome markets resolve into a single final result rather than a multi-step leg ladder.
            </div>
          </Panel>

          <Panel title="Actions">
            <div className="mt-4 space-y-2">
              {geoData.status === "settled" && geoPositionData && !geoPositionData.claimed ? (
                <button
                  type="button"
                  onClick={() => claimGeo.mutate(product)}
                  disabled={claimGeo.isPending}
                  className="btn-gradient inline-flex min-h-10 w-full items-center justify-center rounded-full px-4 py-2 text-sm font-semibold"
                >
                  {claimGeo.isPending ? "Claiming…" : "Claim Payout"}
                </button>
              ) : null}
              <Link
                href={`/verify/geo/${productAddress}`}
                className="inline-flex min-h-10 w-full items-center justify-center rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-muted-foreground hover:text-white"
              >
                View Receipt
              </Link>
            </div>
          </Panel>
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[12px] border border-white/8 bg-[linear-gradient(180deg,oklch(0.18_0.008_260),oklch(0.15_0.008_260))] px-3 py-3 shadow-[0_8px_24px_rgba(0,0,0,0.35)]">
      <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
      <div className="mt-2 text-[18px] font-bold text-white">{value}</div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[14px] border border-white/8 bg-[linear-gradient(180deg,oklch(0.18_0.008_260),oklch(0.15_0.008_260))] p-4 shadow-[0_8px_24px_rgba(0,0,0,0.35)]">
      <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-status-true">{title}</div>
      {children}
    </div>
  );
}
