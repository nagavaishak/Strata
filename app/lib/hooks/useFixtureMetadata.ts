"use client";

import { useEffect, useState } from "react";

export interface LiveFixtureIdentity {
  homeTeam: string;
  awayTeam: string;
  competition: string;
}

/**
 * Batches live fixture-metadata lookups the same way useLiveFixtures batches
 * stream-status polling — one shared fetch pass across a set of fixtures
 * instead of one request per card. Team names/competition don't change, so
 * unlike useLiveFixtures this fetches once per fixtureId set rather than
 * polling on an interval.
 */
export function useFixtureMetadata(fixtureIds: number[]) {
  const [state, setState] = useState<Record<number, LiveFixtureIdentity | null>>({});
  const key = fixtureIds.join(",");

  useEffect(() => {
    if (!fixtureIds.length) return;
    let cancelled = false;

    (async () => {
      const results = await Promise.all(
        fixtureIds.map(async (id) => {
          try {
            const res = await fetch(`/api/txline/fixture-metadata?fixtureId=${id}`);
            const json = await res.json();
            return [id, json && json.homeTeam ? (json as LiveFixtureIdentity) : null] as const;
          } catch {
            return [id, null] as const;
          }
        })
      );
      if (!cancelled) setState(Object.fromEntries(results));
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return state;
}
