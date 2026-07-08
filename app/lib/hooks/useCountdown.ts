"use client";

import { useEffect, useState } from "react";

/** Live seconds-ticking countdown to a unix-seconds target. Re-renders every second. */
export function useCountdown(targetUnixSeconds: number): number {
  const [secondsLeft, setSecondsLeft] = useState(() =>
    Math.max(0, targetUnixSeconds - Math.floor(Date.now() / 1000))
  );

  useEffect(() => {
    const id = setInterval(() => {
      setSecondsLeft(Math.max(0, targetUnixSeconds - Math.floor(Date.now() / 1000)));
    }, 1000);
    return () => clearInterval(id);
  }, [targetUnixSeconds]);

  return secondsLeft;
}
