"use client";

import { useQuery } from "@tanstack/react-query";
import { PublicKey } from "@solana/web3.js";
import { useStrataProgram } from "./useStrataProgram";
import { DEMO_WRITER_POOL } from "@/lib/constants";

export interface WriterPoolState {
  writer: PublicKey;
  reserved: bigint;
  owed: bigint;
  bump: number;
  vaultBump: number;
}

/** Reads the shared demo writer pool — the same pool every devnet proof script writes against. */
export function useWriterPool(poolAddress: PublicKey = DEMO_WRITER_POOL) {
  const program = useStrataProgram();

  return useQuery<WriterPoolState>({
    queryKey: ["writerPool", poolAddress.toBase58()],
    queryFn: async () => {
      const account = await (program.account as any).writerPool.fetch(poolAddress);
      return {
        writer: account.writer as PublicKey,
        reserved: BigInt(account.reserved.toString()),
        owed: BigInt(account.owed.toString()),
        bump: account.bump,
        vaultBump: account.vaultBump,
      };
    },
  });
}
