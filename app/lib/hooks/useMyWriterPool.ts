"use client";

import { useQuery } from "@tanstack/react-query";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { writerPoolPda, poolVaultPda } from "@/lib/pdas";
import { useStrataProgram } from "./useStrataProgram";

/**
 * Unlike useWriterPool (reads a known pool address), this checks whether the
 * *connected* wallet has its own writer pool yet — create_product's seeds tie the
 * pool to whichever wallet signs as payer, so every writer needs their own
 * initialized + funded pool before they can create a product.
 */
export function useMyWriterPool() {
  const { publicKey } = useWallet();
  const { connection } = useConnection();
  const program = useStrataProgram();

  return useQuery({
    queryKey: ["myWriterPool", publicKey?.toBase58()],
    enabled: publicKey != null,
    queryFn: async () => {
      if (!publicKey) return null;
      const pool = writerPoolPda(publicKey);
      const vault = poolVaultPda(publicKey);
      const info = await connection.getAccountInfo(pool);
      if (!info) {
        return { exists: false as const, pool, vault, reserved: 0n, owed: 0n, vaultBalance: 0n };
      }
      const account = await (program.account as any).writerPool.fetch(pool);
      const vaultBalance = BigInt(await connection.getBalance(vault));
      return {
        exists: true as const,
        pool,
        vault,
        reserved: BigInt(account.reserved.toString()),
        owed: BigInt(account.owed.toString()),
        vaultBalance,
      };
    },
  });
}
