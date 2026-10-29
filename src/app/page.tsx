"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, X } from "lucide-react";
import ProductCatalog from "@/components/ProductCatalog";

function MarketplaceContent() {
  const searchParams = useSearchParams();
  const brandParam = searchParams.get("brand") || "All Mobiles";

  const [selectedBrand, setSelectedBrand] = useState(
    brandParam === "All Mobiles" ? "All Mobiles" : brandParam
  );
  const [showDeletedToast, setShowDeletedToast] = useState(false);

  useEffect(() => {
    if (brandParam && brandParam !== "All Mobiles") {
      setSelectedBrand(brandParam);
    } else {
      setSelectedBrand("All Mobiles");
    }
  }, [brandParam]);

  useEffect(() => {
    if (searchParams.get("accountDeleted") === "true") {
      setShowDeletedToast(true);
      const timer = setTimeout(() => setShowDeletedToast(false), 8000);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen pb-16 bg-background text-foreground transition-colors duration-200 relative">
      {/* Account Deletion Success Toast */}
      {showDeletedToast && (
        <div 
          role="status"
          className="fixed top-20 right-4 sm:right-8 z-50 max-w-md bg-emerald-50 dark:bg-emerald-950/90 border border-emerald-500/40 text-emerald-900 dark:text-emerald-200 px-4 py-3 rounded-xl shadow-2xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-4 duration-300"
        >
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="text-xs font-semibold">Your account has been deleted successfully.</span>
          </div>
          <button
            onClick={() => setShowDeletedToast(false)}
            className="text-emerald-700 dark:text-emerald-300 hover:text-emerald-900 dark:hover:text-white p-1 rounded-md transition-colors cursor-pointer"
            aria-label="Close notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

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
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-foreground font-medium bg-background">Loading VN Mobiles...</div>}>
      <MarketplaceContent />
    </Suspense>
  );
}
