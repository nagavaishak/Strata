"use client";

import { useQuery } from "@tanstack/react-query";
import { PublicKey } from "@solana/web3.js";
import { useWallet } from "@solana/wallet-adapter-react";
import { useStrataProgram } from "./useStrataProgram";
import { positionPda, geoPositionPda } from "@/lib/pdas";

export interface PositionState {
  address: PublicKey;
  user: PublicKey;
  product: PublicKey;
  stake: bigint;
  claimed: boolean;
}

/** kind selects the PDA seed ("pos" for tiered products, "geo_pos" for geo products) — both resolve to the same Position account layout on-chain. */
export function usePosition(product: PublicKey | null, kind: "tiered" | "geo" = "tiered") {
  const program = useStrataProgram();
  const { publicKey } = useWallet();

  return useQuery<PositionState | null>({
    queryKey: ["position", product?.toBase58(), publicKey?.toBase58(), kind],
    enabled: product != null && publicKey != null,
    queryFn: async () => {
      if (!product || !publicKey) return null;
      const address = kind === "tiered" ? positionPda(product, publicKey) : geoPositionPda(product, publicKey);
      try {
        const account = await (program.account as any).position.fetch(address);
        return {
          address,
          user: account.user as PublicKey,
          product: account.product as PublicKey,
          stake: BigInt(account.stake.toString()),
          claimed: account.claimed,
        };
      } catch {
        return null; // no position for this wallet on this product
      }
    },
  });
}
