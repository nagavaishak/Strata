"use client";

import type { GeoProductListEntry, ProductListEntry } from "@/lib/hooks/useAllProducts";
import type { GeoProductState } from "@/lib/hooks/useGeoProduct";
import type { Leg, ProductState } from "@/lib/hooks/useProduct";
import { statLabel } from "@/lib/stat-labels";

type FixturePresentation = {
  sport: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  kickoffLabel: string;
  hero: string;
  context: string;
};

export type MarketPresentation = FixturePresentation & {
  fixtureId: string;
  marketType: "tiered" | "geo";
  marketLabel: string;
  marketTitle: string;
  scenario: string;
  shortScenario: string;
  category: string;
};

const FIXTURE_MAP: Record<string, FixturePresentation> = {
  "17952170": {
    sport: "Football",
    league: "UEFA Champions League",
    homeTeam: "Man City",
    awayTeam: "Real Madrid",
    kickoffLabel: "Today, 8:00 PM",
    hero: "Over 2.5 goals",
    context: "A premium knockout-night market built around total goals and momentum through the full 90.",
  },
  "17952171": {
    sport: "Football",
    league: "La Liga",
    homeTeam: "Real Madrid",
    awayTeam: "Girona",
    kickoffLabel: "Today, 6:30 PM",
    hero: "Real Madrid to win",
    context: "A cleaner directional football market with a sharp payout profile and clear match story.",
  },
  "18187298": {
    sport: "Football",
    league: "Premier League",
    homeTeam: "Arsenal",
    awayTeam: "Crystal Palace",
    kickoffLabel: "Sun, 3:00 PM",
    hero: "Arsenal to win",
    context: "A home-favorite setup framed for a consumer flow: simple directional thesis, visible price, clear upside.",
  },
  "18187299": {
    sport: "Football",
    league: "Serie A",
    homeTeam: "Inter",
    awayTeam: "Juventus",
    kickoffLabel: "Sun, 7:30 PM",
    hero: "Inter to win",
    context: "A rivalry market with one clean thesis and enough context for a first-time buyer to understand immediately.",
  },
  "18187301": {
    sport: "Football",
    league: "La Liga",
    homeTeam: "Barcelona",
    awayTeam: "Atletico",
    kickoffLabel: "Today, 9:15 PM",
    hero: "Goal Fest",
    context: "A high-event football setup designed around total goals, match tempo, and late-game volatility.",
  },
  "18187305": {
    sport: "Football",
    league: "Bundesliga",
    homeTeam: "Bayern",
    awayTeam: "Dortmund",
    kickoffLabel: "Sun, 8:00 PM",
    hero: "Break Point Pressure",
    context: "A pressure-heavy match market built for stacked conditions and a stronger payout ladder.",
  },
  "18187344": {
    sport: "Football",
    league: "Ligue 1",
    homeTeam: "PSG",
    awayTeam: "Marseille",
    kickoffLabel: "Tonight, 8:45 PM",
    hero: "Attack Stack",
    context: "A scenario-led market built around attacking output, scoring pressure, and a visible tiered payoff.",
  },
  "18175981": {
    sport: "Football",
    league: "UEFA Nations League",
    homeTeam: "Spain",
    awayTeam: "France",
    kickoffLabel: "Tonight, 8:00 PM UTC",
    hero: "Late Match Chaos",
    context: "Big-game volatility with star-driven shot and goal conditions.",
  },
  "18175929": {
    sport: "Football",
    league: "UEFA Nations League",
    homeTeam: "Portugal",
    awayTeam: "Netherlands",
    kickoffLabel: "Tonight, 6:30 PM UTC",
    hero: "Attack Stack",
    context: "Multi-leg scoring pressure market built around attacking output.",
  },
  "18175730": {
    sport: "Football",
    league: "Premier League",
    homeTeam: "Liverpool",
    awayTeam: "Tottenham",
    kickoffLabel: "Tomorrow, 4:30 PM UTC",
    hero: "Goal Fest",
    context: "High-event football setup with stacked thresholds for goals and momentum.",
  },
  "18175705": {
    sport: "Football",
    league: "Premier League",
    homeTeam: "Arsenal",
    awayTeam: "Brighton",
    kickoffLabel: "Tomorrow, 2:00 PM UTC",
    hero: "Break Point Pressure",
    context: "Control-versus-chaos setup with conditions across both sides of the ball.",
  },
  "18175944": {
    sport: "Football",
    league: "Serie A",
    homeTeam: "Inter",
    awayTeam: "Atalanta",
    kickoffLabel: "Live now",
    hero: "Map 1 Domination",
    context: "Exact-outcome style market for controlled match-state prediction.",
  },
};

function fallbackFixture(fixtureId: string): FixturePresentation {
  const curatedFallbacks: FixturePresentation[] = [
    {
      sport: "Football",
      league: "Champions League",
      homeTeam: "Man City",
      awayTeam: "Real Madrid",
      kickoffLabel: "Kickoff soon",
      hero: "Late Match Chaos",
      context: "A structured match market with visible conditions, visible price logic, and proof-backed settlement.",
    },
    {
      sport: "Football",
      league: "Premier League",
      homeTeam: "Arsenal",
      awayTeam: "Palace",
      kickoffLabel: "Kickoff soon",
      hero: "Attack Stack",
      context: "A consumer-first football market built to feel readable before it feels technical.",
    },
    {
      sport: "Football",
      league: "Serie A",
      homeTeam: "Inter",
      awayTeam: "Juventus",
      kickoffLabel: "Kickoff soon",
      hero: "Goal Fest",
      context: "A tiered setup focused on goals, match flow, and scenario clarity.",
    },
  ];
  const seed = Number(fixtureId.slice(-2)) || 0;
  const pick = curatedFallbacks[seed % curatedFallbacks.length];
  return {
    ...pick,
  };
}

export function getFixturePresentation(fixtureId: bigint | number | string): FixturePresentation {
  const key = fixtureId.toString();
  return FIXTURE_MAP[key] ?? fallbackFixture(key);
}

function formatThreshold(value: number) {
  return Number.isInteger(value) ? value.toString() : value.toFixed(1);
}

function comparisonPrefix(comparison: Leg["comparison"]) {
  if (comparison === "greaterThan") return "over";
  if (comparison === "lessThan") return "under";
  return "exactly";
}

function teamScopedStatLabel(statKey: number, fixture: FixturePresentation) {
  if (statKey === 1) return `${fixture.homeTeam} goals`;
  if (statKey === 2) return `${fixture.awayTeam} goals`;
  return statLabel(statKey).startsWith("Stat ") ? `custom match stat ${statKey}` : statLabel(statKey);
}

function humanizeSingleLeg(leg: Leg, fixture: FixturePresentation) {
  const threshold = formatThreshold(leg.threshold);

  if (leg.statKeyA === 1 || leg.statKeyA === 2) {
    const team = leg.statKeyA === 1 ? fixture.homeTeam : fixture.awayTeam;

    if (leg.comparison === "greaterThan" && leg.threshold === 0) {
      return `${team} to score`;
    }

    return `${team} ${comparisonPrefix(leg.comparison)} ${threshold} goals`;
  }

  return `${teamScopedStatLabel(leg.statKeyA, fixture)} ${comparisonPrefix(leg.comparison)} ${threshold}`;
}

function humanizeCombinedLeg(leg: Leg, fixture: FixturePresentation) {
  const threshold = formatThreshold(leg.threshold);
  const keys = [leg.statKeyA, leg.statKeyB].sort((a, b) => a - b).join("-");

  if (keys === "1-2" && leg.op === "add") {
    if (leg.comparison === "greaterThan") return `over ${threshold} total goals`;
    if (leg.comparison === "lessThan") return `under ${threshold} total goals`;
    return `exactly ${threshold} total goals`;
  }

  if (keys === "1-2" && leg.op === "subtract") {
    if (leg.comparison === "greaterThan") return `winning margin above ${threshold} goals`;
    if (leg.comparison === "lessThan") return `winning margin below ${threshold} goals`;
    return `winning margin exactly ${threshold} goals`;
  }

  const operator = leg.op === "add" ? "plus" : "minus";
  return `${teamScopedStatLabel(leg.statKeyA, fixture)} ${operator} ${teamScopedStatLabel(leg.statKeyB, fixture)} ${comparisonPrefix(leg.comparison)} ${threshold}`;
}

export function describeLeg(leg: Leg, fixtureArg?: FixturePresentation): string {
  const fixture =
    fixtureArg ??
    ({
      sport: "Football",
      league: "Football",
      homeTeam: "Home side",
      awayTeam: "Away side",
      kickoffLabel: "Kickoff soon",
      hero: "Structured market",
      context: "Structured conditions with visible payout rules.",
    } satisfies FixturePresentation);

  return leg.hasSecondStat ? humanizeCombinedLeg(leg, fixture) : humanizeSingleLeg(leg, fixture);
}

export function getConsumerLegLabel(leg: Leg, fixtureId: bigint | number | string) {
  return describeLeg(leg, getFixturePresentation(fixtureId));
}

function toSentence(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function getGeoOutcomeLabels(data: GeoProductState) {
  const fixture = getFixturePresentation(data.fixtureId);
  const left = data.statKeyA === 1 ? fixture.homeTeam : data.statKeyA === 2 ? fixture.awayTeam : "Custom stat A";
  const right = data.statKeyB === 1 ? fixture.homeTeam : data.statKeyB === 2 ? fixture.awayTeam : "Custom stat B";
  return {
    yes: `${left} ${data.predictionA}, ${right} ${data.predictionB}`,
    no: "Any other outcome",
  };
}

export function getCreateStudioSummary(legs: Leg[], fixtureId: bigint | number | string) {
  return legs.map((leg, index) => ({
    id: `${index}-${leg.statKeyA}-${leg.threshold}`,
    label: getConsumerLegLabel(leg, fixtureId),
  }));
}

export function describeTier(minLegsTrue: number, numLegs: number) {
  if (minLegsTrue === 0) return "No conditions hit";
  if (minLegsTrue === numLegs) return "All conditions hit";
  return `${minLegsTrue}/${numLegs} conditions hit`;
}

function tieredScenario(data: ProductState) {
  const fixture = getFixturePresentation(data.fixtureId);
  const first = data.legs[0] ? describeLeg(data.legs[0], fixture) : "multiple live conditions";
  const second = data.legs[1] ? describeLeg(data.legs[1], fixture) : null;
  return second ? `${toSentence(first)}. Plus ${second}.` : `${toSentence(first)}.`;
}

function geoScenario(data: GeoProductState) {
  return `${getGeoOutcomeLabels(data).yes}.`;
}

export function getTieredMarketPresentation(data: ProductState): MarketPresentation {
  const fixture = getFixturePresentation(data.fixtureId);

  return {
    ...fixture,
    fixtureId: data.fixtureId.toString(),
    marketType: "tiered",
    marketLabel: "Structured market",
    marketTitle: fixture.hero,
    scenario: tieredScenario(data),
    shortScenario: `${data.numLegs} conditions, tiered payout ladder`,
    category: data.numLegs >= 4 ? "High-conviction build" : "Match conditions",
  };
}

export function getGeoMarketPresentation(data: GeoProductState): MarketPresentation {
  const fixture = getFixturePresentation(data.fixtureId);

  return {
    ...fixture,
    fixtureId: data.fixtureId.toString(),
    marketType: "geo",
    marketLabel: "Exact outcome",
    marketTitle: `${fixture.hero} Exact`,
    scenario: geoScenario(data),
    shortScenario: "Single precise outcome with premium payout",
    category: "Exact score logic",
  };
}

export function getListEntryPresentation(entry: ProductListEntry | GeoProductListEntry): MarketPresentation {
  return entry.kind === "tiered"
    ? getTieredMarketPresentation(entry.data)
    : getGeoMarketPresentation(entry.data);
}
