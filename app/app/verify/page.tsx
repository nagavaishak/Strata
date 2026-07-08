"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAllProducts, useAllGeoProducts } from "@/lib/hooks/useAllProducts";
import { TieredProductCard, GeoProductCard } from "@/components/product-card";

export default function VerifyIndexPage() {
  const [address, setAddress] = useState("");
  const router = useRouter();
  const { data: tiered, isLoading: loadingTiered } = useAllProducts();
  const { data: geo, isLoading: loadingGeo } = useAllGeoProducts();

  const settledTiered = (tiered ?? []).filter((e) => e.data.status === "settled");
  const settledGeo = (geo ?? []).filter((e) => e.data.status === "settled");
  const hasSettled = settledTiered.length + settledGeo.length > 0;
  const isLoading = loadingTiered || loadingGeo;

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-6 py-12">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">02 Verify a settlement</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick a settled product below to re-derive its payout straight from Solana RPC, or
          paste an address directly — nothing here requires trusting us.
        </p>
      </div>

      {isLoading && <p className="font-mono text-sm text-muted-foreground">loading…</p>}

      {!isLoading && hasSettled && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {settledTiered.map((entry) => (
            <TieredProductCard key={entry.address.toBase58()} entry={entry} />
          ))}
          {settledGeo.map((entry) => (
            <GeoProductCard key={entry.address.toBase58()} entry={entry} />
          ))}
        </div>
      )}

      {!isLoading && !hasSettled && (
        <p className="font-mono text-sm text-muted-foreground">
          No settled products yet — watch one settle first.
        </p>
      )}

      <div className="border-t border-border pt-6">
        <p className="mb-2 font-mono text-xs text-muted-foreground">
          or paste a product address directly
        </p>
        <div className="flex gap-2">
          <Input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="product address"
            className="font-mono"
          />
          <Button onClick={() => address && router.push(`/verify/${address}`)}>Go</Button>
        </div>
      </div>
    </div>
  );
}
