"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useWallet } from "@solana/wallet-adapter-react";
import BN from "bn.js";
import { ComputeBudgetProgram, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { writerPoolPda, poolVaultPda, geoProductPda, geoPositionPda, configPda } from "@/lib/pdas";
import { TXORACLE_PROGRAM_ID } from "@/lib/constants";
import { useStrataProgram } from "./useStrataProgram";
import type { Comparison } from "./useGeoProduct";

function dailyScoresPda(minTimestampMs: number): PublicKey {
  const epochDay = Math.floor(minTimestampMs / 86400000);
  return PublicKey.findProgramAddressSync(
    [Buffer.from("daily_scores_roots"), new BN(epochDay).toArrayLike(Buffer, "le", 2)],
    TXORACLE_PROGRAM_ID
  )[0];
}

export interface CreateGeoProductArgs {
  fixtureId: bigint;
  nonce: number;
  statKeyA: number;
  statKeyB: number;
  predictionA: number;
  predictionB: number;
  distanceThreshold: number;
  distanceComparison: Comparison;
  payoutBpsIfTrue: number;
  closesAtUnixSeconds: number;
  settleDeadlineUnixSeconds: number;
  maxCapacitySol: number;
}

export function useCreateGeoProduct() {
  const program = useStrataProgram();
  const { publicKey } = useWallet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (args: CreateGeoProductArgs) => {
      if (!publicKey) throw new Error("connect a wallet first");
      const writerPool = writerPoolPda(publicKey);
      const poolVault = poolVaultPda(publicKey);
      const geoProduct = geoProductPda(args.fixtureId, args.nonce);

      const sig = await program.methods
        .createGeoProduct(
          new BN(args.fixtureId.toString()),
          args.nonce,
          args.statKeyA,
          args.statKeyB,
          args.predictionA,
          args.predictionB,
          args.distanceThreshold,
          { [args.distanceComparison]: {} },
          args.payoutBpsIfTrue,
          new BN(args.closesAtUnixSeconds),
          new BN(args.settleDeadlineUnixSeconds),
          new BN(Math.round(args.maxCapacitySol * LAMPORTS_PER_SOL))
        )
        .accounts({ geoProduct, writerPool, poolVault, payer: publicKey } as any)
        .rpc();

      return { sig, geoProduct };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myWriterPool", publicKey?.toBase58()] });
    },
  });
}

export function useDepositGeo() {
  const program = useStrataProgram();
  const { publicKey } = useWallet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ geoProduct, amountSol }: { geoProduct: PublicKey; amountSol: number }) => {
      if (!publicKey) throw new Error("connect a wallet first");
      const account = await (program.account as any).geoProduct.fetch(geoProduct);
      const poolVault = poolVaultPda(account.writer as PublicKey);
      const position = geoPositionPda(geoProduct, publicKey);

      const sig = await program.methods
        .depositGeo(new BN(Math.round(amountSol * LAMPORTS_PER_SOL)))
        .accounts({ geoProduct, position, poolVault, user: publicKey } as any)
        .rpc();

      return { sig, position };
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["geoProduct", variables.geoProduct.toBase58()] });
    },
  });
}

/** Settles + finalizes in one shot (matches settle_geo_product's on-chain design). */
export function useSettleGeoProduct() {
  const program = useStrataProgram();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (geoProduct: PublicKey) => {
      const account = await (program.account as any).geoProduct.fetch(geoProduct);
      const fixtureId = Number(account.fixtureId.toString());
      const statKeys = [account.statKeyA, account.statKeyB];
      const sinceMs = Number(account.closesAt.toString()) * 1000;

      const res = await fetch(
        `/api/txline/proof-v2?fixtureId=${fixtureId}&statKeys=${statKeys.join(",")}&sinceMs=${sinceMs}`
      );
      const data = await res.json();
      if (!data.found) {
        throw new Error("no fresh-enough sealed batch yet — try again in a few minutes");
      }
      const proof = data.proof;

      const stats = [
        { stat: proof.statsToProve[0], statProof: proof.statProofs[0] },
        { stat: proof.statsToProve[1], statProof: proof.statProofs[1] },
      ];

      const computeBudgetIx = ComputeBudgetProgram.setComputeUnitLimit({ units: 1_400_000 });
      const sig = await program.methods
        .settleGeoProduct(
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
          proof.eventStatRoot,
          stats as any
        )
        .accounts({
          geoProduct,
          writerPool: writerPoolPda(account.writer as PublicKey),
          config: configPda(),
          txoracleProgram: TXORACLE_PROGRAM_ID,
          dailyScoresMerkleRoots: dailyScoresPda(proof.summary.updateStats.minTimestamp),
        } as any)
        .preInstructions([computeBudgetIx])
        .rpc();

      return sig;
    },
    onSuccess: (_sig, geoProduct) => {
      queryClient.invalidateQueries({ queryKey: ["geoProduct", geoProduct.toBase58()] });
    },
  });
}

export function useClaimGeo() {
  const program = useStrataProgram();
  const { publicKey } = useWallet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (geoProduct: PublicKey) => {
      if (!publicKey) throw new Error("connect a wallet first");
      const account = await (program.account as any).geoProduct.fetch(geoProduct);
      const writer = account.writer as PublicKey;
      const writerPool = writerPoolPda(writer);
      const poolVault = poolVaultPda(writer);
      const position = geoPositionPda(geoProduct, publicKey);
      return program.methods
        .claimGeo()
        .accounts({ geoProduct, position, poolVault, writerPool, user: publicKey } as any)
        .rpc();
    },
    onSuccess: (_sig, geoProduct) => {
      queryClient.invalidateQueries({ queryKey: ["geoProduct", geoProduct.toBase58()] });
    },
  });
}
