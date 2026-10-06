"use client";

import MobileDetailPage from "@/app/mobile/[id]/page";

export default function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <MobileDetailPage params={params} />;
}
