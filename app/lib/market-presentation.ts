"use client";

import type { GeoProductListEntry, ProductListEntry } from "@/lib/hooks/useAllProducts";
import type { GeoProductState } from "@/lib/hooks/useGeoProduct";
import type { Leg, ProductState } from "@/lib/hooks/useProduct";
import { statLabel } from "@/lib/stat-labels";
import { getVerifiedFixture } from "@/lib/fixture-identity";

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
 * times exist anywhere upstream. A verified match (see fixture-identity.ts) gets
 * its real name; every other fixture gets the same honest fallback: the ID as
 * its own identity, never a guessed or invented match. */
export function getFixturePresentation(fixtureId: bigint | number | string): FixturePresentation {
  const id = fixtureId.toString();
  const verified = getVerifiedFixture(id);

  if (verified) {
    return {
      sport: "Football",
      marketTitle: `${verified.homeTeam} vs ${verified.awayTeam}`,
      context: `${verified.competition} · proof-backed settlement.`,
    };
  }

  return {
    sport: "Football",
    marketTitle: `Fixture ${id}`,
    context: "Tiered conditions built around real match stats and proof-backed settlement.",
  };
}

interface LiveIdentityLike {
  homeTeam: string;
  awayTeam: string;
  competition: string;
}

/** Overlays a live-fetched fixture identity (see useFixtureMetadata) onto an
 * already-built presentation — only when the static verified list didn't
 * already resolve this fixture (that list wins when both exist, since it's
 * manually confirmed rather than freshly fetched every page load). */
export function withLiveFixtureIdentity<T extends MarketPresentation>(
  presentation: T,
  fixtureId: bigint | number | string,
  live: LiveIdentityLike | null | undefined
): T {
  if (!live || getVerifiedFixture(fixtureId)) return presentation;
  const suffix = presentation.marketType === "geo" ? " · Exact" : "";
  return {
    ...presentation,
    marketTitle: `${live.homeTeam} vs ${live.awayTeam}${suffix}`,
    context: `${live.competition} · proof-backed settlement.`,
  };
}

function formatThreshold(value: number) {
  return Number.isInteger(value) ? value.toString() : value.toFixed(1);
}

function comparisonPrefix(comparison: Leg["comparison"]) {
  if (comparison === "greaterThan") return "over";
  if (comparison === "lessThan") return "under";
  return "exactly";
}

function humanizeSingleLeg(leg: Leg) {
  const threshold = formatThreshold(leg.threshold);

  if ((leg.statKeyA === 1 || leg.statKeyA === 2) && leg.comparison === "greaterThan" && leg.threshold === 0) {
    return `${statLabel(leg.statKeyA)} to happen`;
  }

  return `${statLabel(leg.statKeyA)} ${comparisonPrefix(leg.comparison)} ${threshold}`;
}

function humanizeCombinedLeg(leg: Leg) {
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
  return `${statLabel(leg.statKeyA)} ${operator} ${statLabel(leg.statKeyB)} ${comparisonPrefix(leg.comparison)} ${threshold}`;
}

export function describeLeg(leg: Leg): string {
  return leg.hasSecondStat ? humanizeCombinedLeg(leg) : humanizeSingleLeg(leg);
}

export function getConsumerLegLabel(leg: Leg, _fixtureId?: bigint | number | string) {
  return describeLeg(leg);
}

function toSentence(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function getGeoOutcomeLabels(data: GeoProductState) {
  return {
    yes: `${statLabel(data.statKeyA)} ${data.predictionA}, ${statLabel(data.statKeyB)} ${data.predictionB}`,
    no: "Any other outcome",
  };
}

export function getCreateStudioSummary(legs: Leg[], _fixtureId: bigint | number | string) {
  return legs.map((leg, index) => ({
    id: `${index}-${leg.statKeyA}-${leg.threshold}`,
    label: describeLeg(leg),
  }));
}

export function describeTier(minLegsTrue: number, numLegs: number) {
  if (minLegsTrue === 0) return "No conditions hit";
  if (minLegsTrue === numLegs) return "All conditions hit";
  return `${minLegsTrue}/${numLegs} conditions hit`;
}

function tieredScenario(data: ProductState) {
  const first = data.legs[0] ? describeLeg(data.legs[0]) : "multiple live conditions";
  const second = data.legs[1] ? describeLeg(data.legs[1]) : null;
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
