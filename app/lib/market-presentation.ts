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
  return {
    sport: "Football",
    league: "Featured Match",
    homeTeam: "Fixture",
    awayTeam: fixtureId,
    kickoffLabel: "Kickoff soon",
    hero: "Structured Match Market",
    context: "Tiered conditions designed around real match events and proof-backed settlement.",
  };
}

export function getFixturePresentation(fixtureId: bigint | number | string): FixturePresentation {
  const key = fixtureId.toString();
  return FIXTURE_MAP[key] ?? fallbackFixture(key);
}

export function describeLeg(leg: Leg): string {
  const comparison =
    leg.comparison === "greaterThan" ? "over" : leg.comparison === "lessThan" ? "under" : "exactly";

  if (leg.hasSecondStat) {
    const operator = leg.op === "add" ? "plus" : "minus";
    return `${statLabel(leg.statKeyA)} ${operator} ${statLabel(leg.statKeyB)} ${comparison} ${leg.threshold}`;
  }

  return `${statLabel(leg.statKeyA)} ${comparison} ${leg.threshold}`;
}

function tieredScenario(data: ProductState) {
  const first = data.legs[0] ? describeLeg(data.legs[0]) : "Multiple live conditions";
  const second = data.legs[1] ? describeLeg(data.legs[1]) : null;
  return second ? `${first}. Plus ${second}.` : `${first}.`;
}

function geoScenario(data: GeoProductState) {
  return `${statLabel(data.statKeyA)} must land on ${data.predictionA} and ${statLabel(data.statKeyB)} on ${data.predictionB}.`;
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
