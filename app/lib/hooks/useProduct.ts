"use client";

import { useQuery } from "@tanstack/react-query";
import { PublicKey } from "@solana/web3.js";
import { useStrataProgram } from "./useStrataProgram";
import { productPda as sharedProductPda } from "@/lib/pdas";

export type LegResult = "unsettled" | "true" | "false";
export type ProductStatus = "open" | "settled";

export interface Leg {
  statKeyA: number;
  statKeyB: number;
  hasSecondStat: boolean;
  op: "add" | "subtract";
  threshold: number;
  comparison: "greaterThan" | "lessThan" | "equalTo";
}

export interface Tier {
  minLegsTrue: number;
  payoutBps: number;
}

export interface ProductState {
  fixtureId: bigint;
  nonce: number;
  numLegs: number;
  legs: Leg[];
  numTiers: number;
  tiers: Tier[];
  legResults: LegResult[];
  status: ProductStatus;
  closesAt: bigint;
  settleDeadline: bigint;
  totalStake: bigint;
  finalPayoutBps: number;
  writer: PublicKey;
  writerPool: PublicKey;
  maxCapacity: bigint;
  collateralLocked: bigint;
}

export const productPda = sharedProductPda;

export function decodeEnumKey<T extends string>(value: Record<string, unknown>): T {
  return Object.keys(value)[0] as T;
}

/** Shared decode — used by both the single-fetch hook below and useAllProducts' list fetch. */
export function decodeProduct(account: any): ProductState {
  return {
    fixtureId: BigInt(account.fixtureId.toString()),
    nonce: account.nonce,
    numLegs: account.numLegs,
    legs: (account.legs as any[]).slice(0, account.numLegs).map((leg) => ({
      statKeyA: leg.statKeyA,
      statKeyB: leg.statKeyB,
      hasSecondStat: leg.hasSecondStat,
      op: decodeEnumKey(leg.op),
      threshold: leg.threshold,
      comparison: decodeEnumKey(leg.comparison),
    })),
    numTiers: account.numTiers,
    tiers: (account.tiers as any[]).slice(0, account.numTiers).map((tier) => ({
      minLegsTrue: tier.minLegsTrue,
      payoutBps: tier.payoutBps,
    })),
    legResults: (account.legResults as any[])
      .slice(0, account.numLegs)
      .map((r) => decodeEnumKey<LegResult>(r)),
    status: decodeEnumKey<ProductStatus>(account.status),
    closesAt: BigInt(account.closesAt.toString()),
    settleDeadline: BigInt(account.settleDeadline.toString()),
    totalStake: BigInt(account.totalStake.toString()),
    finalPayoutBps: account.finalPayoutBps,
    writer: account.writer as PublicKey,
    writerPool: account.writerPool as PublicKey,
    maxCapacity: BigInt(account.maxCapacity.toString()),
    collateralLocked: BigInt(account.collateralLocked.toString()),
  };
}

export function useProduct(productAddress: PublicKey | null) {
  const program = useStrataProgram();

  return useQuery<ProductState | null>({
    queryKey: ["product", productAddress?.toBase58()],
    enabled: productAddress != null,
    queryFn: async () => {
      if (!productAddress) return null;
      const account = await (program.account as any).product.fetch(productAddress);
      return decodeProduct(account);
    },
  });
}
