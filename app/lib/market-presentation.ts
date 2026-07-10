"use client";

import type { GeoProductListEntry, ProductListEntry } from "@/lib/hooks/useAllProducts";
import type { GeoProductState } from "@/lib/hooks/useGeoProduct";
import type { Leg, ProductState } from "@/lib/hooks/useProduct";
import { statLabel } from "@/lib/stat-labels";

type FixturePresentation = {
  sport: string;
  marketTitle: string;
  context: string;
};

export type MarketPresentation = FixturePresentation & {
  fixtureId: string;
  marketType: "tiered" | "geo";
  marketLabel: string;
  scenario: string;
  shortScenario: string;
  category: string;
};

/** TxLINE only ever exposes a raw fixtureId — no team names, leagues, or kickoff
 * times exist anywhere upstream. Every fixture gets the same honest treatment:
 * the ID as its own identity, never a guessed or invented match. */
export function getFixturePresentation(fixtureId: bigint | number | string): FixturePresentation {
  const id = fixtureId.toString();
  return {
    sport: "Football",
    marketTitle: `Fixture ${id}`,
    context: "Tiered conditions built around real match stats and proof-backed settlement.",
  };
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
    marketTitle: `${fixture.marketTitle} · Exact`,
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
