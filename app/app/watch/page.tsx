"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAllProducts, useAllGeoProducts } from "@/lib/hooks/useAllProducts";
import { TieredProductCard, GeoProductCard } from "@/components/product-card";
import { dedupeByFixture } from "@/lib/dedupe-by-fixture";

export default function WatchIndexPage() {
  const [address, setAddress] = useState("");
  const router = useRouter();
  const { data: tiered, isLoading: loadingTiered } = useAllProducts();
  const { data: geo, isLoading: loadingGeo } = useAllGeoProducts();

  const openTiered = dedupeByFixture((tiered ?? []).filter((e) => e.data.status === "open"));
  const openGeo = dedupeByFixture((geo ?? []).filter((e) => e.data.status === "open"));
  const hasOpen = openTiered.length + openGeo.length > 0;
  const isLoading = loadingTiered || loadingGeo;

  return (
    <div className="mx-auto max-w-[1400px] space-y-8 px-6 py-12">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">01 Watch a product</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick an open product below to watch its legs settle in real time, or paste an
          address directly.
        </p>
      </div>

      {isLoading && <p className="font-mono text-sm text-muted-foreground">loading…</p>}

      {!isLoading && hasOpen && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {openTiered.map((entry) => (
            <TieredProductCard key={entry.address.toBase58()} entry={entry} />
          ))}
          {openGeo.map((entry) => (
            <GeoProductCard key={entry.address.toBase58()} entry={entry} />
          ))}
        </div>
      )}

      {!isLoading && !hasOpen && (
        <p className="font-mono text-sm text-muted-foreground">
          No open products right now — create one on the build screen first.
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
          <Button onClick={() => address && router.push(`/watch/${address}`)}>Go</Button>
        </div>
      </div>
    </div>
  );
}
