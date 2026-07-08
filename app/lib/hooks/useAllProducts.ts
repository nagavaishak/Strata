"use client";

import { useQuery } from "@tanstack/react-query";
import { PublicKey } from "@solana/web3.js";
import { useWallet } from "@solana/wallet-adapter-react";
import { useStrataProgram } from "./useStrataProgram";
import { decodeProduct, type ProductState } from "./useProduct";
import { decodeGeoProduct, type GeoProductState } from "./useGeoProduct";

export interface ProductListEntry {
  address: PublicKey;
  kind: "tiered";
  data: ProductState;
}
export interface GeoProductListEntry {
  address: PublicKey;
  kind: "geo";
  data: GeoProductState;
}

/** program.account.product.all() wraps getProgramAccounts with automatic discriminator
 * filtering — no manual byte-offset filters needed to list every tiered product. */
export function useAllProducts() {
  const program = useStrataProgram();
  return useQuery<ProductListEntry[]>({
    queryKey: ["allProducts"],
    queryFn: async () => {
      const accounts = await (program.account as any).product.all();
      return accounts.map((a: any) => ({
        address: a.publicKey as PublicKey,
        kind: "tiered" as const,
        data: decodeProduct(a.account),
      }));
    },
  });
}

export function useAllGeoProducts() {
  const program = useStrataProgram();
  return useQuery<GeoProductListEntry[]>({
    queryKey: ["allGeoProducts"],
    queryFn: async () => {
      const accounts = await (program.account as any).geoProduct.all();
      return accounts.map((a: any) => ({
        address: a.publicKey as PublicKey,
        kind: "geo" as const,
        data: decodeGeoProduct(a.account),
      }));
    },
  });
}

export interface PositionEntry {
  address: PublicKey;
  product: PublicKey;
  stake: bigint;
  claimed: boolean;
}

/** Position layout: 8-byte discriminator, then `user: Pubkey` (32 bytes) as the first field —
 * memcmp at offset 8 filters to just the connected wallet's own positions server-side,
 * instead of fetching every Position account and filtering client-side. */
export function useMyPositions() {
  const program = useStrataProgram();
  const { publicKey } = useWallet();

  return useQuery<PositionEntry[]>({
    queryKey: ["myPositions", publicKey?.toBase58()],
    enabled: publicKey != null,
    queryFn: async () => {
      if (!publicKey) return [];
      const accounts = await (program.account as any).position.all([
        { memcmp: { offset: 8, bytes: publicKey.toBase58() } },
      ]);
      return accounts.map((a: any) => ({
        address: a.publicKey as PublicKey,
        product: a.account.product as PublicKey,
        stake: BigInt(a.account.stake.toString()),
        claimed: a.account.claimed as boolean,
      }));
    },
  });
}
