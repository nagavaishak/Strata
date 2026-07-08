import { WatchProductClient } from "@/components/watch-product-client";

export default async function WatchProductPage({
  params,
}: {
  params: Promise<{ product: string }>;
}) {
  const { product } = await params;
  return <WatchProductClient productAddress={product} />;
}
