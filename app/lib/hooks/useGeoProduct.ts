"use client";

import { useQuery } from "@tanstack/react-query";
import { PublicKey } from "@solana/web3.js";
import { useStrataProgram } from "./useStrataProgram";
import type { ProductStatus, Leg } from "./useProduct";

export type Comparison = Leg["comparison"];

export interface GeoProductState {
  fixtureId: bigint;
  nonce: number;
  statKeyA: number;
  statKeyB: number;
  predictionA: number;
  predictionB: number;
  distanceThreshold: number;
  distanceComparison: Comparison;
  payoutBpsIfTrue: number;
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

function decodeEnumKey<T extends string>(value: Record<string, unknown>): T {
  return Object.keys(value)[0] as T;
}

export function useGeoProduct(productAddress: PublicKey | null) {
  const program = useStrataProgram();

  return useQuery<GeoProductState | null>({
    queryKey: ["geoProduct", productAddress?.toBase58()],
    enabled: productAddress != null,
    queryFn: async () => {
      if (!productAddress) return null;
      const account = await (program.account as any).geoProduct.fetch(productAddress);
      return {
        fixtureId: BigInt(account.fixtureId.toString()),
        nonce: account.nonce,
        statKeyA: account.statKeyA,
        statKeyB: account.statKeyB,
        predictionA: account.predictionA,
        predictionB: account.predictionB,
        distanceThreshold: account.distanceThreshold,
        distanceComparison: decodeEnumKey<Comparison>(account.distanceComparison),
        payoutBpsIfTrue: account.payoutBpsIfTrue,
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
    },
  });
}
