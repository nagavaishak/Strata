"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useWallet } from "@solana/wallet-adapter-react";
import BN from "bn.js";
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { writerPoolPda, poolVaultPda, productPda, positionPda } from "@/lib/pdas";
import { useStrataProgram } from "./useStrataProgram";
import type { Leg, Tier } from "./useProduct";

export interface CreateProductArgs {
  fixtureId: bigint;
  nonce: number;
  legs: Leg[];
  tiers: Tier[];
  closesAtUnixSeconds: number;
  settleDeadlineUnixSeconds: number;
  maxCapacitySol: number;
}

function toChainLeg(leg: Leg) {
  return {
    statKeyA: leg.statKeyA,
    statKeyB: leg.statKeyB,
    hasSecondStat: leg.hasSecondStat,
    op: { [leg.op]: {} },
    threshold: leg.threshold,
    comparison: { [leg.comparison]: {} },
  };
}

function toChainTier(tier: Tier) {
  return { minLegsTrue: tier.minLegsTrue, payoutBps: tier.payoutBps };
}

export function useCreateProduct() {
  const program = useStrataProgram();
  const { publicKey } = useWallet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (args: CreateProductArgs) => {
      if (!publicKey) throw new Error("connect a wallet first");
      const writerPool = writerPoolPda(publicKey);
      const poolVault = poolVaultPda(publicKey);
      const product = productPda(args.fixtureId, args.nonce);

      const sig = await program.methods
        .createProduct(
          new BN(args.fixtureId.toString()),
          args.nonce,
          args.legs.map(toChainLeg) as any,
          args.tiers.map(toChainTier) as any,
          new BN(args.closesAtUnixSeconds),
          new BN(args.settleDeadlineUnixSeconds),
          new BN(Math.round(args.maxCapacitySol * LAMPORTS_PER_SOL))
        )
        .accounts({ product, writerPool, poolVault, payer: publicKey } as any)
        .rpc();

      return { sig, product };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myWriterPool", publicKey?.toBase58()] });
      queryClient.invalidateQueries({ queryKey: ["writerPool"] });
    },
  });
}

export function useDeposit() {
  const program = useStrataProgram();
  const { publicKey } = useWallet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ product, amountSol }: { product: PublicKey; amountSol: number }) => {
      if (!publicKey) throw new Error("connect a wallet first");
      const productAccount = await (program.account as any).product.fetch(product);
      const poolVault = poolVaultPda(productAccount.writer as PublicKey);
      const position = positionPda(product, publicKey);

      const sig = await program.methods
        .deposit(new BN(Math.round(amountSol * LAMPORTS_PER_SOL)))
        .accounts({ product, position, poolVault, user: publicKey } as any)
        .rpc();

      return { sig, position };
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["product", variables.product.toBase58()] });
    },
  });
}
