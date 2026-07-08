import { VerifyGeoProductClient } from "@/components/verify-geo-product-client";

export default async function VerifyGeoProductPage({
  params,
}: {
  params: Promise<{ product: string }>;
}) {
  const { product } = await params;
  return <VerifyGeoProductClient productAddress={product} />;
}
