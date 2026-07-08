"use client";

import { useQuery } from "@tanstack/react-query";
import { useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";

/**
 * Pure on-chain read via getSignaturesForAddress — no backend, no indexer. Anyone
 * can independently re-derive this list straight from RPC, which is the point of
 * a verification page: don't ask a judge to trust us, let them check themselves.
 */
export function useAccountSignatures(address: PublicKey | null, limit = 10) {
  const { connection } = useConnection();

  return useQuery({
    queryKey: ["accountSignatures", address?.toBase58(), limit],
    enabled: address != null,
    queryFn: async () => {
      if (!address) return [];
      const sigs = await connection.getSignaturesForAddress(address, { limit });
      return sigs.map((s) => ({
        signature: s.signature,
        slot: s.slot,
        blockTime: s.blockTime,
        err: s.err,
      }));
    },
  });
}
