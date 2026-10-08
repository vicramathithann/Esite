"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { MobileProductData } from "@/lib/types";
import { DEFAULT_PRODUCTS } from "@/lib/catalogData";
import ProductCatalog, { FAMOUS_BRANDS } from "@/components/ProductCatalog";
import { 
  ShieldCheck, 
  RotateCcw, 
  FileText, 
  CreditCard, 
  Layers,
  ChevronRight,
  Zap,
} from "lucide-react";

function MarketplaceContent() {
  const searchParams = useSearchParams();
  const brandParam = searchParams.get("brand") || "All Mobiles";

  const [products, setProducts] = useState<MobileProductData[]>(DEFAULT_PRODUCTS);
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

  // Fetch products for Flagship Hero showcase
  useEffect(() => {
    async function fetchProducts() {
      try {
        const res = await fetch("/api/products");
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const data = await res.json();
        if (data.success && Array.isArray(data.products) && data.products.length > 0) {
          setProducts(data.products);
        } else {
          setProducts(DEFAULT_PRODUCTS);
        }
      } catch {
        setProducts(DEFAULT_PRODUCTS);
      }
    }
    fetchProducts();
  }, []);

  // Flagship Hero Phone
  const heroProduct = useMemo(() => {
    return products.find((p) => p.id === "iphone-16-pro-max") || products[0] || DEFAULT_PRODUCTS[0];
  }, [products]);

  return (
    <div className="min-h-screen pb-16 bg-background text-foreground transition-colors duration-200">
      {/* 2. Hero Section: Dark Showcase Stage with Soft Radial Gradient Glow behind Phone */}
      <section className="relative w-full bg-[#0B0B0C] text-white overflow-hidden py-14 lg:py-24 border-b border-[#2C2C2E]/40">
        {/* Soft Radial Gradient Glow behind Phone */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(circle 500px at 70% 50%, rgba(41, 151, 255, 0.22), transparent 70%), radial-gradient(circle 350px at 30% 30%, rgba(255, 255, 255, 0.03), transparent 60%)"
          }}
        />

        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <span className="inline-block text-xs uppercase tracking-widest font-semibold text-[#86868B]">
                {heroProduct.brand} Flagship
              </span>

              {/* Headline 48-72px bold */}
              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white leading-[1.08]">
                {heroProduct.name}
              </h1>

              <p className="text-base sm:text-lg text-[#86868B] max-w-xl mx-auto lg:mx-0 leading-relaxed font-normal">
                {heroProduct.tagline || "Forged in titanium with aerospace-grade endurance, groundbreaking cameras, and intelligent performance."}
              </p>

              {/* Price */}
              <div className="pt-1 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-2 text-sm">
                <span className="text-2xl sm:text-3xl font-bold text-white">
                  From ₹{heroProduct.basePrice.toLocaleString("en-IN")}
                </span>
                <span className="text-[#86868B]">
                  or ₹{Math.round(heroProduct.basePrice / 24).toLocaleString("en-IN")}/mo. for 24 mo.
                </span>
              </div>

              {/* Action Buttons: Buy Now & Compare */}
              <div className="pt-2 flex flex-wrap items-center justify-center lg:justify-start gap-3">
                <Link
                  href={`/mobile/${heroProduct.id}`}
                  className="px-8 py-3.5 rounded-full bg-[#C9A66B] hover:bg-[#B8914A] active:bg-[#A67C3D] text-[#FFFCFA] text-sm font-semibold transition-all duration-200 shadow-md flex items-center gap-2 cursor-pointer"
                >
                  <span>Buy Now</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>

                <Link
                  href="/compare"
                  className="px-8 py-3.5 rounded-full bg-[#C9A66B]/20 hover:bg-[#C9A66B]/30 text-[#FFFCFA] border border-[#C9A66B]/50 text-sm font-medium transition-all duration-200 flex items-center gap-2 cursor-pointer"
                >
                  <Layers className="w-4 h-4" />
                  <span>Compare</span>
                </Link>
              </div>
            </div>

            {/* Right Phone Stage with Ambient Backlight */}
            <div className="lg:col-span-5 flex items-center justify-center relative">
              <div className="absolute w-72 h-72 sm:w-96 sm:h-96 rounded-full bg-[#C9A66B]/20 blur-3xl pointer-events-none" />

              <div className="relative aspect-square w-full max-w-[420px] p-6 flex items-center justify-center">
                <Image
                  src={heroProduct.imageUrl}
                  alt={heroProduct.name}
                  fill
                  priority
                  unoptimized
                  className="object-contain drop-shadow-[0_20px_50px_rgba(201,166,107,0.3)] hover:scale-105 transition-transform duration-200 ease-out"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Brand Logos Strip under the Hero */}
      <section className="bg-card border-b border-border py-5 transition-colors duration-200">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-2 overflow-x-auto scrollbar-none py-1">
            {FAMOUS_BRANDS.map((brand) => (
              <button
                key={brand}
                type="button"
                onClick={() => setSelectedBrand(brand)}
                className={`px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200 cursor-pointer ${
                  selectedBrand === brand
                    ? "bg-[#C9A66B] dark:bg-[#D4B483] text-[#FFFCFA] shadow-xs font-semibold"
                    : "bg-[#C9A66B]/10 hover:bg-[#C9A66B]/20 text-[#8C6226] dark:text-[#E2C799] border border-[#C9A66B]/30"
                }`}
              >
                {brand}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 8. Trust Strip: Genuine Product, GST Invoice, Warranty, Easy Returns, COD/UPI */}
      <section className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 pt-10 sm:pt-14">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
          <div className="bg-card border border-border rounded-[20px] p-4 text-center shadow-xs flex flex-col items-center justify-center transition-all duration-200 hover:-translate-y-1">
            <ShieldCheck className="w-5 h-5 text-accent mb-2" />
            <h4 className="text-xs font-bold text-foreground">Genuine Product</h4>
            <p className="text-[11px] text-muted mt-0.5">100% Authorized</p>
          </div>

          <div className="bg-card border border-border rounded-[20px] p-4 text-center shadow-xs flex flex-col items-center justify-center transition-all duration-200 hover:-translate-y-1">
            <FileText className="w-5 h-5 text-accent mb-2" />
            <h4 className="text-xs font-bold text-foreground">GST Invoice</h4>
            <p className="text-[11px] text-muted mt-0.5">Official Tax Bill</p>
          </div>

          <div className="bg-card border border-border rounded-[20px] p-4 text-center shadow-xs flex flex-col items-center justify-center transition-all duration-200 hover:-translate-y-1">
            <Zap className="w-5 h-5 text-accent mb-2" />
            <h4 className="text-xs font-bold text-foreground">1-Year Warranty</h4>
            <p className="text-[11px] text-muted mt-0.5">SMS Expiry Alerts</p>
          </div>

          <div className="bg-card border border-border rounded-[20px] p-4 text-center shadow-xs flex flex-col items-center justify-center transition-all duration-200 hover:-translate-y-1">
            <RotateCcw className="w-5 h-5 text-accent mb-2" />
            <h4 className="text-xs font-bold text-foreground">Easy Returns</h4>
            <p className="text-[11px] text-muted mt-0.5">7-Day Replacement</p>
          </div>

          <div className="col-span-2 md:col-span-1 bg-card border border-border rounded-[20px] p-4 text-center shadow-xs flex flex-col items-center justify-center transition-all duration-200 hover:-translate-y-1">
            <CreditCard className="w-5 h-5 text-accent mb-2" />
            <h4 className="text-xs font-bold text-foreground">COD & UPI</h4>
            <p className="text-[11px] text-muted mt-0.5">Instant Payments</p>
          </div>
        </div>
      </section>

      {/* Main Storefront: Shared Product Catalog (Filters Sidebar + 4-Column Product Grid) */}
      <section className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
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