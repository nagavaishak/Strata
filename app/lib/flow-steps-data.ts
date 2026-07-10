/**
 * Illustrative "how it works" walkthrough content for the homepage's guided
 * trade-flow module. Deliberately isolated from every real-data path
 * (market-presentation.ts, useAllProducts, etc.) — this is a self-contained
 * teaching aid, not a claim about any real fixture. Never import this into
 * anything that renders as a live market.
 */

export interface MatchMock {
  league: string;
  teams: string;
  badge: "Live" | "Open";
  scenarios: string[];
  volume: string;
}

export interface ScenarioRow {
  label: string;
  payout: string;
  highlighted?: boolean;
}

export interface ScenariosMock {
  matchTitle: string;
  rows: ScenarioRow[];
}

export interface BuyMock {
  scenarioTitle: string;
  matchTitle: string;
  amount: string;
  quickAmounts: string[];
  tiers: { label: string; payout: string }[];
}

export type ConditionState = "hit" | "live" | "pending" | "missed";

export interface ConditionMock {
  label: string;
  state: ConditionState;
  detail?: string;
}

export interface TrackingMock {
  matchTitle: string;
  statusLabel: string;
  conditions: ConditionMock[];
}

export interface ReceiptMock {
  matchTitle: string;
  conditionsHit: string;
  stake: string;
  multiplier: string;
  payout: string;
}

export type FlowStep =
  | { id: 1; eyebrow: string; title: string; description: string; mockType: "matches"; mock: MatchMock[] }
  | { id: 2; eyebrow: string; title: string; description: string; mockType: "scenarios"; mock: ScenariosMock }
  | { id: 3; eyebrow: string; title: string; description: string; mockType: "buy"; mock: BuyMock }
  | { id: 4; eyebrow: string; title: string; description: string; mockType: "tracking"; mock: TrackingMock }
  | { id: 5; eyebrow: string; title: string; description: string; mockType: "receipt"; mock: ReceiptMock };

export const FLOW_STEPS: FlowStep[] = [
  {
    id: 1,
    eyebrow: "Step 1",
    title: "Pick a match",
    description:
      "Start with a live or upcoming football match. Every market is built around a real fixture with clear scenarios you can trade.",
    mockType: "matches",
    mock: [
      {
        league: "Champions League",
        teams: "Man City vs Real Madrid",
        badge: "Live",
        scenarios: ["Over 2.5 goals", "Both teams to score"],
        volume: "12.4K SOL",
      },
      {
        league: "La Liga",
        teams: "Barcelona vs Atletico",
        badge: "Open",
        scenarios: ["Barcelona to win", "Under 2.5 goals"],
        volume: "8.1K SOL",
      },
      {
        league: "Premier League",
        teams: "Arsenal vs Liverpool",
        badge: "Open",
        scenarios: ["Over 3.5 goals", "Arsenal +1 handicap"],
        volume: "15.7K SOL",
      },
    ],
  },
  {
    id: 2,
    eyebrow: "Step 2",
    title: "Choose your scenario",
    description:
      "Each match has structured outcomes you can buy into, from simple results to stacked conditions with higher payout potential.",
    mockType: "scenarios",
    mock: {
      matchTitle: "Man City vs Real Madrid",
      rows: [
        { label: "Man City to win", payout: "1.85x" },
        { label: "Over 2.5 goals", payout: "2.10x", highlighted: true },
        { label: "Both teams to score", payout: "1.65x" },
        { label: "Man City win + Over 2.5 goals", payout: "3.40x" },
      ],
    },
  },
  {
    id: 3,
    eyebrow: "Step 3",
    title: "Buy your position",
    description:
      "Enter your stake, review the payout ladder, and see exactly what you can win before you confirm.",
    mockType: "buy",
    mock: {
      scenarioTitle: "Over 2.5 goals",
      matchTitle: "Man City vs Real Madrid",
      amount: "0.05",
      quickAmounts: ["0.01", "0.05", "0.1", "0.5"],
      tiers: [
        { label: "1/3 conditions hit", payout: "0.060 SOL" },
        { label: "2/3 conditions hit", payout: "0.090 SOL" },
        { label: "3/3 conditions hit", payout: "0.125 SOL" },
      ],
    },
  },
  {
    id: 4,
    eyebrow: "Step 4",
    title: "Track live conditions",
    description:
      "Watch the match progress in real time and see which conditions are already hit, still live, or no longer possible.",
    mockType: "tracking",
    mock: {
      matchTitle: "Man City vs Real Madrid",
      statusLabel: "63' · Live",
      conditions: [
        { label: "Man City to win", state: "live" },
        { label: "Over 2.5 goals", state: "hit", detail: "3 goals" },
        { label: "Both teams to score", state: "hit" },
        { label: "Under 1.5 goals", state: "missed" },
      ],
    },
  },
  {
    id: 5,
    eyebrow: "Step 5",
    title: "Verify and collect payout",
    description:
      "When the match settles, Strata shows exactly what resolved, how your payout was calculated, and lets you claim with confidence.",
    mockType: "receipt",
    mock: {
      matchTitle: "Man City vs Real Madrid — Final",
      conditionsHit: "2/3",
      stake: "0.05 SOL",
      multiplier: "1.25x",
      payout: "0.0625 SOL",
    },
  },
];
