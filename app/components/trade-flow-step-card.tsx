"use client";

import { CheckCircle2, CircleDashed, ShieldCheck, XCircle } from "lucide-react";
import type { ConditionState, FlowStep } from "@/lib/flow-steps-data";

const CONDITION_STYLE: Record<ConditionState, { label: string; className: string; icon: React.ReactNode }> = {
  hit: { label: "Hit", className: "text-status-true", icon: <CheckCircle2 className="size-4" /> },
  live: { label: "Live", className: "text-status-pending", icon: <CircleDashed className="size-4 animate-pulse" /> },
  pending: { label: "Pending", className: "text-muted-foreground", icon: <CircleDashed className="size-4" /> },
  missed: { label: "Missed", className: "text-status-false", icon: <XCircle className="size-4" /> },
};

function StageRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-background/35 px-4 py-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold text-foreground">{value}</span>
    </div>
  );
}

function MatchesStage({ mock }: { mock: Extract<FlowStep, { mockType: "matches" }>["mock"] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {mock.map((match) => (
        <div key={match.teams} className="market-shell flex flex-col gap-3 rounded-2xl border border-border/70 p-4">
          <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            <span>{match.league}</span>
            <span
              className={`rounded-full px-2 py-0.5 ${
                match.badge === "Live" ? "bg-status-true/10 text-status-true" : "bg-border/40 text-muted-foreground"
              }`}
            >
              {match.badge}
            </span>
          </div>
          <p className="text-sm font-semibold text-foreground">{match.teams}</p>
          <div className="flex flex-col gap-1.5">
            {match.scenarios.map((scenario) => (
              <span key={scenario} className="text-xs text-muted-foreground">
                {scenario}
              </span>
            ))}
          </div>
          <span className="mt-auto text-[10px] text-muted-foreground">{match.volume} pool</span>
        </div>
      ))}
    </div>
  );
}

function ScenariosStage({ mock }: { mock: Extract<FlowStep, { mockType: "scenarios" }>["mock"] }) {
  return (
    <div className="market-shell rounded-2xl border border-border/70 p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-status-true">{mock.matchTitle}</p>
      <div className="mt-4 flex flex-col gap-2">
        {mock.rows.map((row) => (
          <div
            key={row.label}
            className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-sm transition-colors ${
              row.highlighted
                ? "border-status-true/40 bg-status-true/10 text-foreground"
                : "border-border/60 bg-background/30 text-muted-foreground"
            }`}
          >
            <span className={row.highlighted ? "font-semibold" : ""}>{row.label}</span>
            <span className={`font-mono ${row.highlighted ? "text-status-true" : "text-foreground"}`}>
              {row.payout}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BuyStage({ mock }: { mock: Extract<FlowStep, { mockType: "buy" }>["mock"] }) {
  return (
    <div className="market-shell rounded-2xl border border-border/70 p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-status-true">{mock.matchTitle}</p>
      <p className="mt-1 text-sm font-semibold text-foreground">{mock.scenarioTitle}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {mock.quickAmounts.map((amount) => (
          <span
            key={amount}
            className={`rounded-full border px-3 py-1 text-xs font-mono ${
              amount === mock.amount
                ? "border-status-true text-status-true"
                : "border-border/70 text-muted-foreground"
            }`}
          >
            {amount} SOL
          </span>
        ))}
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {mock.tiers.map((tier) => (
          <StageRow key={tier.label} label={tier.label} value={tier.payout} />
        ))}
      </div>
    </div>
  );
}

function TrackingStage({ mock }: { mock: Extract<FlowStep, { mockType: "tracking" }>["mock"] }) {
  return (
    <div className="market-shell rounded-2xl border border-border/70 p-5">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-status-true">{mock.matchTitle}</p>
        <span className="text-xs font-semibold text-status-pending">{mock.statusLabel}</span>
      </div>
      <div className="mt-4 flex flex-col gap-2">
        {mock.conditions.map((condition) => {
          const style = CONDITION_STYLE[condition.state];
          return (
            <div
              key={condition.label}
              className="flex items-center justify-between rounded-2xl border border-border/60 bg-background/30 px-4 py-3 text-sm"
            >
              <span className="text-foreground">{condition.label}</span>
              <span className={`flex items-center gap-1.5 text-xs font-semibold ${style.className}`}>
                {style.icon}
                {style.label}
                {condition.detail ? ` · ${condition.detail}` : ""}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ReceiptStage({ mock }: { mock: Extract<FlowStep, { mockType: "receipt" }>["mock"] }) {
  return (
    <div className="market-shell rounded-2xl border border-border/70 p-5">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-status-true">{mock.matchTitle}</p>
        <span className="flex items-center gap-1 rounded-full border border-status-true/30 bg-status-true/10 px-2.5 py-1 text-[10px] font-semibold text-status-true">
          <ShieldCheck className="size-3" />
          Verified settlement
        </span>
      </div>
      <div className="mt-4 flex flex-col gap-2">
        <StageRow label="Conditions hit" value={mock.conditionsHit} />
        <StageRow label="Stake" value={mock.stake} />
        <StageRow label="Payout multiplier" value={mock.multiplier} />
      </div>
      <div className="mt-3 rounded-2xl border border-status-true/30 bg-status-true/10 px-4 py-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">You receive</span>
          <span className="text-lg font-semibold text-status-true">{mock.payout}</span>
        </div>
      </div>
    </div>
  );
}

export function TradeFlowStepCard({ step }: { step: FlowStep }) {
  return (
    <div className="mx-auto flex min-h-[420px] w-full max-w-2xl flex-col justify-center px-2 py-6">
      {step.mockType === "matches" && <MatchesStage mock={step.mock} />}
      {step.mockType === "scenarios" && <ScenariosStage mock={step.mock} />}
      {step.mockType === "buy" && <BuyStage mock={step.mock} />}
      {step.mockType === "tracking" && <TrackingStage mock={step.mock} />}
      {step.mockType === "receipt" && <ReceiptStage mock={step.mock} />}
    </div>
  );
}
