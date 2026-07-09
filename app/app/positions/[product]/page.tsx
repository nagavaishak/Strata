import { PositionDetailClient } from "@/components/position-detail-client";

export default async function PositionDetailPage({
  params,
}: {
  params: Promise<{ product: string }>;
}) {
  const { product } = await params;
  return <PositionDetailClient productAddress={product} />;
}
