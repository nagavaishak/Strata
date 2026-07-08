"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useWallet } from "@solana/wallet-adapter-react";
import BN from "bn.js";
import { ComputeBudgetProgram, PublicKey } from "@solana/web3.js";
import { configPda, writerPoolPda } from "@/lib/pdas";
import { TXORACLE_PROGRAM_ID } from "@/lib/constants";
import { useStrataProgram } from "./useStrataProgram";
import type { Leg } from "./useProduct";

function dailyScoresPda(minTimestampMs: number): PublicKey {
  const epochDay = Math.floor(minTimestampMs / 86400000);
  return PublicKey.findProgramAddressSync(
    [Buffer.from("daily_scores_roots"), new BN(epochDay).toArrayLike(Buffer, "le", 2)],
    TXORACLE_PROGRAM_ID
  )[0];
}

/**
 * Settles a single leg. Only single-stat legs (hasSecondStat = false) are wired —
 * binary (two-stat) legs need two coordinated proof fetches from the same sealed
 * batch, which isn't implemented yet. This mirrors exactly what's proven working
 * in scripts/live-buyer-flow.ts, not a guess at the untested binary-leg path.
 */
export function useSettleLeg() {
  const program = useStrataProgram();
  const { publicKey } = useWallet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      product,
      legIndex,
      leg,
      closesAtUnixSeconds,
    }: {
      product: PublicKey;
      legIndex: number;
      leg: Leg;
      closesAtUnixSeconds: number;
    }) => {
      if (!publicKey) throw new Error("connect a wallet first");
      if (leg.hasSecondStat) {
        throw new Error("binary (two-stat) leg settlement isn't wired in the UI yet");
      }

      const productAccount = await (program.account as any).product.fetch(product);
      const fixtureId = Number(productAccount.fixtureId.toString());
      const sinceMs = closesAtUnixSeconds * 1000;

      const res = await fetch(
        `/api/txline/proof?fixtureId=${fixtureId}&statKey=${leg.statKeyA}&sinceMs=${sinceMs}`
      );
      const data = await res.json();
      if (!data.found) {
        throw new Error("no fresh-enough sealed batch yet — try again in a few minutes");
      }
      const proof = data.proof;

      const computeBudgetIx = ComputeBudgetProgram.setComputeUnitLimit({ units: 1_400_000 });
      const sig = await program.methods
        .settleLeg(
          legIndex,
          new BN(proof.summary.updateStats.minTimestamp),
          {
            fixtureId: new BN(fixtureId),
            updateStats: {
              updateCount: proof.summary.updateStats.updateCount,
              minTimestamp: new BN(proof.summary.updateStats.minTimestamp),
              maxTimestamp: new BN(proof.summary.updateStats.maxTimestamp),
            },
            eventsSubTreeRoot: proof.summary.eventStatsSubTreeRoot,
          } as any,
          proof.subTreeProof,
          proof.mainTreeProof,
          { statToProve: proof.statToProve, eventStatRoot: proof.eventStatRoot, statProof: proof.statProof } as any,
          null
        )
        .accounts({
          product,
          config: configPda(),
          txoracleProgram: TXORACLE_PROGRAM_ID,
          dailyScoresMerkleRoots: dailyScoresPda(proof.summary.updateStats.minTimestamp),
        } as any)
        .preInstructions([computeBudgetIx])
        .rpc();

      return sig;
    },
    onSuccess: (_sig, variables) => {
      queryClient.invalidateQueries({ queryKey: ["product", variables.product.toBase58()] });
    },
  });
}

export function useFinalizeProduct() {
  const program = useStrataProgram();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (product: PublicKey) => {
      const productAccount = await (program.account as any).product.fetch(product);
      const writerPool = writerPoolPda(productAccount.writer as PublicKey);
      return program.methods.finalizeProduct().accounts({ product, writerPool } as any).rpc();
    },
    onSuccess: (_sig, product) => {
      queryClient.invalidateQueries({ queryKey: ["product", product.toBase58()] });
    },
  });
}

export function useClaim() {
  const program = useStrataProgram();
  const { publicKey } = useWallet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (product: PublicKey) => {
      if (!publicKey) throw new Error("connect a wallet first");
      const productAccount = await (program.account as any).product.fetch(product);
      const writer = productAccount.writer as PublicKey;
      const writerPool = writerPoolPda(writer);
      const { poolVaultPda, positionPda } = await import("@/lib/pdas");
      const poolVault = poolVaultPda(writer);
      const position = positionPda(product, publicKey);
      return program.methods
        .claim()
        .accounts({ product, position, poolVault, writerPool, user: publicKey } as any)
        .rpc();
    },
    onSuccess: (_sig, product) => {
      queryClient.invalidateQueries({ queryKey: ["product", product.toBase58()] });
    },
  });
}
