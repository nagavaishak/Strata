"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMyWriterPool } from "@/lib/hooks/useMyWriterPool";
import { useInitializeWriterPool, useFundPool } from "@/lib/hooks/useWriterPoolActions";

/**
 * create_product's seeds tie the writer pool to whichever wallet signs as payer —
 * the connected wallet IS the writer. So every writer needs their own initialized
 * + funded pool before the leg/tier builder below is usable.
 */
export function WriterPoolPanel() {
  const { publicKey } = useWallet();
  const { data: pool, isLoading } = useMyWriterPool();
  const init = useInitializeWriterPool();
  const fund = useFundPool();
  const [fundAmount, setFundAmount] = useState("0.1");

  if (!publicKey) {
    return (
      <p className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
        Connect a wallet to create your own writer pool and build a product.
      </p>
    );
  }

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">checking writer pool…</p>;
  }

  if (!pool?.exists) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-4">
        <p className="flex-1 text-sm text-muted-foreground">
          No writer pool yet for this wallet — one is required before creating a product
          (it backs the worst-case payout on every product you create).
        </p>
        <Button onClick={() => init.mutate()} disabled={init.isPending}>
          {init.isPending ? "initializing…" : "Initialize pool"}
        </Button>
      </div>
    );
  }

  const freeCapital = pool.vaultBalance - pool.reserved - pool.owed;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-4 font-mono text-sm">
      <span className="text-muted-foreground">your pool</span>
      <span>
        free <span className="text-status-true">{(Number(freeCapital) / 1e9).toFixed(4)} SOL</span>
      </span>
      <span className="text-border">·</span>
      <span>reserved {(Number(pool.reserved) / 1e9).toFixed(4)}</span>
      <span className="text-border">·</span>
      <span>owed {(Number(pool.owed) / 1e9).toFixed(4)}</span>
      <div className="ml-auto flex items-center gap-2">
        <Input
          type="number"
          step="0.01"
          value={fundAmount}
          onChange={(e) => setFundAmount(e.target.value)}
          className="w-24"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => fund.mutate(Number(fundAmount))}
          disabled={fund.isPending}
        >
          {fund.isPending ? "funding…" : "Fund pool"}
        </Button>
      </div>
    </div>
  );
}
