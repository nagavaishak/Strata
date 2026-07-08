"use client";

import { useEffect, useState } from "react";

interface FixtureLiveState {
  live: boolean;
  lastSeq?: number;
}

/**
 * Batches stream-status polling across a set of fixtures behind one shared
 * interval, instead of one interval per card — polling N cards individually would
 * fire N concurrent requests against the shared TxLINE session every tick.
 */
export function useLiveFixtures(fixtureIds: number[]) {
  const [state, setState] = useState<Record<number, FixtureLiveState>>({});
  const key = fixtureIds.join(",");

  useEffect(() => {
    if (!fixtureIds.length) return;
    let cancelled = false;

    const poll = async () => {
      const results = await Promise.all(
        fixtureIds.map(async (id) => {
          try {
            const res = await fetch(`/api/txline/stream-status?fixtureId=${id}`);
            const json = await res.json();
            return [id, json] as const;
          } catch {
            return [id, { live: false }] as const;
          }
        })
      );
      if (cancelled) return;
      setState(Object.fromEntries(results));
    };

    poll();
    const id = setInterval(poll, 4000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return state;
}
