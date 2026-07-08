"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function WatchIndexPage() {
  const [address, setAddress] = useState("");
  const router = useRouter();

  return (
    <div className="mx-auto max-w-md space-y-4 px-6 py-24">
      <h1 className="text-2xl font-semibold tracking-tight">01 Watch a product</h1>
      <p className="text-sm text-muted-foreground">
        Paste a product address to watch its legs settle in real time, or create one on
        the build screen first.
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
  );
}
