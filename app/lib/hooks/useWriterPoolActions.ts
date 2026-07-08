"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useWallet } from "@solana/wallet-adapter-react";
import BN from "bn.js";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { writerPoolPda, poolVaultPda } from "@/lib/pdas";
import { useStrataProgram } from "./useStrataProgram";

export function useInitializeWriterPool() {
  const program = useStrataProgram();
  const { publicKey } = useWallet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!publicKey) throw new Error("connect a wallet first");
      const writerPool = writerPoolPda(publicKey);
      const poolVault = poolVaultPda(publicKey);
      return program.methods
        .initializeWriterPool()
        .accounts({ writerPool, poolVault, writer: publicKey } as any)
        .rpc();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myWriterPool", publicKey?.toBase58()] });
    },
  });
}

export function useFundPool() {
  const program = useStrataProgram();
  const { publicKey } = useWallet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (amountSol: number) => {
      if (!publicKey) throw new Error("connect a wallet first");
      const writerPool = writerPoolPda(publicKey);
      const poolVault = poolVaultPda(publicKey);
      const amountLamports = new BN(Math.round(amountSol * LAMPORTS_PER_SOL));
      return program.methods
        .fundPool(amountLamports)
        .accounts({ writerPool, poolVault, writer: publicKey } as any)
        .rpc();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myWriterPool", publicKey?.toBase58()] });
      queryClient.invalidateQueries({ queryKey: ["writerPool"] });
    },
  });
}
