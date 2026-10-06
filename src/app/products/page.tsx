"use client";

import React, { Suspense } from "react";
import ProductCatalog from "@/components/ProductCatalog";

function ProductsCatalogContent() {
  return (
    <div className="min-h-screen bg-background text-foreground py-8 sm:py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
      <div className="max-w-[1280px] mx-auto">
        <ProductCatalog showHeaderBanner={true} />
      </div>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center text-foreground font-medium">
          Loading smartphones...
        </div>
      }
    >
      <ProductsCatalogContent />
    </Suspense>
  );
}
