"use client";

import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { useMyPositions } from "@/lib/hooks/useAllProducts";

export default function PositionsPage() {
  const { publicKey } = useWallet();
  const { data: positions, isLoading } = useMyPositions();

  return (
    <div className="mx-auto max-w-3xl px-6 py-24">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Positions</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every stake you&rsquo;ve made across every Strata product, read directly off-chain.
        </p>
      </div>

      {!publicKey && (
        <p className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
          Connect a wallet to view your positions.
        </p>
      )}

      {publicKey && isLoading && (
        <p className="font-mono text-sm text-muted-foreground">loading…</p>
      )}

      {publicKey && !isLoading && positions?.length === 0 && (
        <p className="font-mono text-sm text-muted-foreground">
          no positions yet —{" "}
          <Link href="/markets" className="underline">
            browse markets
          </Link>
          .
        </p>
      )}

      <div className="flex flex-col gap-2">
        {positions?.map((pos) => (
          <Link
            key={pos.address.toBase58()}
            href={`/verify/${pos.product.toBase58()}`}
            className="group flex items-center justify-between rounded-lg border border-border bg-card p-4 font-mono text-sm transition-colors hover:border-foreground/30"
          >
            <span className="text-muted-foreground group-hover:text-foreground group-hover:underline">
              {pos.product.toBase58().slice(0, 8)}…
            </span>
            <span>{(Number(pos.stake) / 1e9).toFixed(6)} SOL</span>
            <span className={pos.claimed ? "text-status-true" : "text-status-pending"}>
              {pos.claimed ? "claimed" : "unclaimed"}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
