import { WatchGeoProductClient } from "@/components/watch-geo-product-client";

export default async function WatchGeoProductPage({
  params,
}: {
  params: Promise<{ product: string }>;
}) {
  const { product } = await params;
  return <WatchGeoProductClient productAddress={product} />;
}
