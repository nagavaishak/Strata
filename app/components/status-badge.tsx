"use client";

import { STRATA_PROGRAM_ID } from "@/lib/constants";
import { useWriterPool } from "@/lib/hooks/useWriterPool";

function truncate(address: string) {
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}

/**
 * Answers "is this real" in the first three seconds, the same job IOChain's
 * "DEVNET · LIVE" badge does — but backed by an actual live account read instead
 * of a static string, and showing our own solvency numbers, not a decorative dot.
 */
export function StatusBadge() {
  const { data: pool, isLoading, isError } = useWriterPool();

  return (
    <div className="hidden items-center gap-2 rounded-full border border-border/80 bg-card/85 px-3 py-2 text-xs font-mono xl:inline-flex">
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          isError
            ? "bg-status-false"
            : isLoading
              ? "bg-status-pending"
              : "glow-dot bg-status-true"
        }`}
      />
      <span className="text-muted-foreground">DEVNET</span>
      <span className="text-border">·</span>
      <a
        href={`https://explorer.solana.com/address/${STRATA_PROGRAM_ID.toBase58()}?cluster=devnet`}
        target="_blank"
        rel="noreferrer"
        className="hover:text-foreground"
      >
        {truncate(STRATA_PROGRAM_ID.toBase58())}
      </a>
      {pool && (
        <>
          <span className="text-border">·</span>
          <span title="pool reserved (open products' worst case)">
            res {(Number(pool.reserved) / 1e9).toFixed(3)}
          </span>
          <span className="text-border">/</span>
          <span title="pool owed (settled, unclaimed)">
            owed {(Number(pool.owed) / 1e9).toFixed(3)}
          </span>
        </>
      )}
    </div>
  );
}
