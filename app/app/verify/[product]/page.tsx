import { VerifyProductClient } from "@/components/verify-product-client";

export default async function VerifyProductPage({
  params,
}: {
  params: Promise<{ product: string }>;
}) {
  const { product } = await params;
  return <VerifyProductClient productAddress={product} />;
}
