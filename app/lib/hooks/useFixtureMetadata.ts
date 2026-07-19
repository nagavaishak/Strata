"use client";

import { useEffect, useState } from "react";

export interface LiveFixtureIdentity {
  homeTeam: string;
  awayTeam: string;
  competition: string;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchOne(id: number): Promise<LiveFixtureIdentity | null> {
  try {
    const res = await fetch(`/api/txline/fixture-metadata?fixtureId=${id}`);
    const json = await res.json();
    return json && json.homeTeam ? (json as LiveFixtureIdentity) : null;
  } catch {
    return null;
  }
}

/**
 * Batches live fixture-metadata lookups the same way useLiveFixtures batches
 * stream-status polling — one shared fetch pass across a set of fixtures
 * instead of one request per card. Team names/competition don't change, so
 * unlike useLiveFixtures this fetches once per fixtureId set rather than
 * polling on an interval.
 *
 * TxLINE's session token occasionally 403s on a cold serverless instance
 * (see DEVNET.md) -- a single failed attempt used to leave a fixture stuck
 * unresolved for the rest of that page load. Retries once after a short
 * delay before giving up.
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
          let identity = await fetchOne(id);
          if (!identity && !cancelled) {
            await sleep(1200);
            identity = await fetchOne(id);
          }
          return [id, identity] as const;
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
