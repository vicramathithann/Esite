"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import ProductCatalog from "@/components/ProductCatalog";
function MarketplaceContent() {
  const searchParams = useSearchParams();
  const brandParam = searchParams.get("brand") || "All Mobiles";

  const [selectedBrand, setSelectedBrand] = useState(
    brandParam === "All Mobiles" ? "All Mobiles" : brandParam
  );

  useEffect(() => {
    if (brandParam && brandParam !== "All Mobiles") {
      setSelectedBrand(brandParam);
    } else {
      setSelectedBrand("All Mobiles");
    }
  }, [brandParam]);

  return (
    <div className="min-h-screen pb-16 bg-background text-foreground transition-colors duration-200">
      {/* Main Storefront: Shared Product Catalog (Filters Sidebar + 4-Column Product Grid) */}
      <section className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <ProductCatalog
          externalSelectedBrand={selectedBrand}
          onBrandChange={setSelectedBrand}
        />
      </section>
    </div>
  );
}

export default function MarketplaceHome() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-foreground font-medium bg-background">Loading VM Mobiles...</div>}>
      <MarketplaceContent />
    </Suspense>
  );
}