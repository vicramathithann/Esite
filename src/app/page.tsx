"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import MobileCard from "@/components/MobileCard";
import { MobileProductData } from "@/lib/types";
import { DEFAULT_PRODUCTS } from "@/lib/catalogData";
import { 
  Smartphone, 
  ShieldCheck, 
  BellRing, 
  Search,
  SlidersHorizontal,
  Check,
  X,
  RotateCcw,
  Sparkles
} from "lucide-react";
import { useApp } from "@/context/AppContext";

// All real famous mobile brands requested
const FAMOUS_BRANDS = [
  "All Mobiles",
  "Apple",
  "Samsung",
  "Google Pixel",
  "OnePlus",
  "Xiaomi",
  "Redmi",
  "Realme",
  "Vivo",
  "Oppo",
  "Motorola",
  "Nothing",
  "Sony",
  "Asus",
  "iQOO",
  "Nokia"
];

const RAM_OPTIONS = ["All", "4GB", "6GB", "8GB", "12GB", "16GB"];
const STORAGE_OPTIONS = ["All", "128GB", "256GB", "512GB", "1TB"];
const OS_OPTIONS = ["All", "iOS", "Android", "OxygenOS", "HyperOS", "Nothing OS", "ColorOS", "Funtouch OS"];
const SCREEN_SIZE_OPTIONS = [
  { label: "All Sizes", value: "All" },
  { label: "Compact (< 6.4\")", value: "compact" },
  { label: "Standard (6.4\" - 6.7\")", value: "standard" },
  { label: "Large Display (> 6.7\")", value: "large" }
];

function MarketplaceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchParamQuery = searchParams.get("search") || "";
  const brandParam = searchParams.get("brand") || "All Mobiles";

  const { setIsSmsDrawerOpen, unreadSmsCount } = useApp();

  const [products, setProducts] = useState<MobileProductData[]>(DEFAULT_PRODUCTS);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Filter States
  const [selectedBrand, setSelectedBrand] = useState(brandParam === "All Mobiles" ? "All Mobiles" : brandParam);
  const [priceRange, setPriceRange] = useState<number>(200000); // Max price slider: ₹10,000 -> ₹2,00,000
  const [minPrice] = useState<number>(10000);
  const [selectedRam, setSelectedRam] = useState<string>("All");
  const [selectedStorage, setSelectedStorage] = useState<string>("All");
  const [selectedOS, setSelectedOS] = useState<string>("All");
  const [selectedScreenSize, setSelectedScreenSize] = useState<string>("All");
  const [sortBy, setSortBy] = useState("featured");
  const [searchQuery, setSearchQuery] = useState(searchParamQuery);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  useEffect(() => {
    setSearchQuery(searchParamQuery);
  }, [searchParamQuery]);

  useEffect(() => {
    if (brandParam && brandParam !== "All Mobiles") {
      setSelectedBrand(brandParam);
    } else {
      setSelectedBrand("All Mobiles");
    }
  }, [brandParam]);

  // Fetch products from SQL Database via REST API
  useEffect(() => {
    async function fetchProducts() {
      setLoading(true);
      setFetchError(null);
      try {
        const res = await fetch("/api/products");
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const data = await res.json();
        if (data.success && Array.isArray(data.products) && data.products.length > 0) {
          setProducts(data.products);
        } else {
          setProducts(DEFAULT_PRODUCTS);
        }
      } catch (err: any) {
        console.warn("Using fallback local dataset:", err.message);
        setProducts(DEFAULT_PRODUCTS);
      } finally {
        setLoading(false);
      }
    }
    fetchProducts();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push(`/`);
    }
  };

  const handleResetFilters = () => {
    setSelectedBrand("All Mobiles");
    setPriceRange(200000);
    setSelectedRam("All");
    setSelectedStorage("All");
    setSelectedOS("All");
    setSelectedScreenSize("All");
    setSearchQuery("");
    router.push("/");
  };

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    return (products || [])
      .filter((p) => {
        if (!p) return false;

        // 1. Brand Filter
        if (selectedBrand !== "All Mobiles") {
          const brandNormalized = (p.brand || "").toLowerCase();
          const targetBrand = selectedBrand.toLowerCase();
          if (targetBrand === "google pixel" || targetBrand === "google") {
            if (!brandNormalized.includes("google") && !brandNormalized.includes("pixel")) return false;
          } else if (brandNormalized !== targetBrand) {
            return false;
          }
        }

        // 2. Price Range Slider (Up to priceRange)
        if ((p.basePrice || 0) > priceRange) {
          return false;
        }

        // 3. RAM Filter
        if (selectedRam !== "All") {
          if (!(p.ram || "").toLowerCase().includes(selectedRam.toLowerCase())) {
            return false;
          }
        }

        // 4. Storage Filter
        if (selectedStorage !== "All") {
          const storageList = Array.isArray(p.storageOptions) ? p.storageOptions : [];
          const hasMatchingStorage = storageList.some((s) =>
            (s?.size || "").toLowerCase().includes(selectedStorage.toLowerCase())
          );
          if (!hasMatchingStorage) return false;
        }

        // 5. Operating System Filter
        if (selectedOS !== "All") {
          if (!(p.os || "").toLowerCase().includes(selectedOS.toLowerCase())) {
            return false;
          }
        }

        // 6. Screen Size Filter
        if (selectedScreenSize !== "All") {
          const match = (p.display || "").match(/(\d+\.?\d*)\s*"/);
          if (match) {
            const size = parseFloat(match[1]);
            if (selectedScreenSize === "compact" && size >= 6.4) return false;
            if (selectedScreenSize === "standard" && (size < 6.4 || size > 6.7)) return false;
            if (selectedScreenSize === "large" && size <= 6.7) return false;
          }
        }

        // 7. Search query (supports "brand + model" search e.g. "iPhone 16 Pro", "Samsung S24 Ultra", "OnePlus 13")
        if (searchQuery.trim()) {
          const terms = searchQuery.toLowerCase().trim().split(/\s+/);
          const searchableText = `${p.brand || ""} ${p.name || ""} ${p.series || ""} ${p.processor || ""} ${p.tagline || ""}`.toLowerCase();
          const matchesAllTerms = terms.every((t) => searchableText.includes(t));
          if (!matchesAllTerms) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "price-asc") return (a.basePrice || 0) - (b.basePrice || 0);
        if (sortBy === "price-desc") return (b.basePrice || 0) - (a.basePrice || 0);
        if (sortBy === "rating") return (b.rating || 0) - (a.rating || 0);
        if (sortBy === "newest") return ((b.id || "") > (a.id || "") ? 1 : -1);
        return (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0);
      });
  }, [products, selectedBrand, priceRange, selectedRam, selectedStorage, selectedOS, selectedScreenSize, searchQuery, sortBy]);

  const activeFilterCount = (selectedBrand !== "All Mobiles" ? 1 : 0) +
    (priceRange < 200000 ? 1 : 0) +
    (selectedRam !== "All" ? 1 : 0) +
    (selectedStorage !== "All" ? 1 : 0) +
    (selectedOS !== "All" ? 1 : 0) +
    (selectedScreenSize !== "All" ? 1 : 0) +
    (searchQuery ? 1 : 0);

  return (
    <div className="min-h-screen pb-20 bg-[#eaeded]">
      {/* Amazon Hero Banner Section */}
      <section className="relative w-full max-w-[1500px] mx-auto overflow-hidden">
        {/* Banner Graphic with Amazon Fade Gradient */}
        <div className="relative h-[250px] sm:h-[350px] md:h-[400px] w-full bg-gradient-to-r from-[#1c2c3e] via-[#233549] to-[#0e1724]">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#eaeded] pointer-events-none" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex flex-col justify-center text-white relative z-10 pt-4 pb-16">
            <div className="max-w-xl space-y-3">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xs bg-[#cc0c39] text-white text-xs font-bold uppercase tracking-wider">
                Official Real Flagships &bull; ₹10,000 to ₹2,00,000
              </span>
              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight text-white drop-shadow-sm">
                VM Mobiles Marketplace. <br />
                <span className="text-[#febd69]">Genuine Smartphones. Verified Alerts.</span>
              </h1>
              <p className="text-xs sm:text-sm text-gray-200 leading-relaxed font-normal">
                Discover 100% authentic physical smartphones from Apple, Samsung, Google Pixel, OnePlus, Xiaomi, and more with SQL-backed live inventory and automated SMS warranty notifications.
              </p>
            </div>
          </div>
        </div>

        {/* Amazon 4-Card Promo Quadrant (Overlapping Banner with REAL PHOTOS) */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-20 sm:-mt-32 relative z-20 mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Apple Store */}
            <div className="bg-white p-4 rounded-xs shadow-md flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-lg text-[#0f1111] mb-2 leading-snug">
                  Apple iPhone 16 Series
                </h3>
                <div className="relative aspect-video w-full mb-3 bg-white border border-gray-100 rounded-xs overflow-hidden p-2">
                  <Image
                    src="/phones/iphone-16.jpg"
                    alt="Apple iPhone 16"
                    fill
                    unoptimized
                    className="object-contain hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <p className="text-xs text-gray-600">iPhone 16 Pro Max & 16 with A18 Pro chip</p>
              </div>
              <button
                onClick={() => setSelectedBrand("Apple")}
                className="text-xs text-[#007185] hover:text-[#c7511f] font-medium pt-3 text-left cursor-pointer"
              >
                See all Apple devices &gt;
              </button>
            </div>

            {/* Card 2: Samsung Galaxy AI */}
            <div className="bg-white p-4 rounded-xs shadow-md flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-lg text-[#0f1111] mb-2 leading-snug">
                  Samsung Galaxy AI
                </h3>
                <div className="relative aspect-video w-full mb-3 bg-white border border-gray-100 rounded-xs overflow-hidden p-2">
                  <Image
                    src="/phones/samsung-galaxy-s24-ultra.jpg"
                    alt="Samsung Galaxy S24 Ultra"
                    fill
                    unoptimized
                    className="object-contain hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <p className="text-xs text-gray-600">Galaxy S24 Ultra, Z Fold 6 & A55 5G</p>
              </div>
              <button
                onClick={() => setSelectedBrand("Samsung")}
                className="text-xs text-[#007185] hover:text-[#c7511f] font-medium pt-3 text-left cursor-pointer"
              >
                Explore Samsung store &gt;
              </button>
            </div>

            {/* Card 3: OnePlus Flagships */}
            <div className="bg-white p-4 rounded-xs shadow-md flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-lg text-[#0f1111] mb-2 leading-snug">
                  OnePlus 13 & 12 Series
                </h3>
                <div className="relative aspect-video w-full mb-3 bg-white border border-gray-100 rounded-xs overflow-hidden p-2">
                  <Image
                    src="/phones/oneplus-12.jpg"
                    alt="OnePlus 12"
                    fill
                    unoptimized
                    className="object-contain hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <p className="text-xs text-gray-600">Snapdragon 8 Elite / 8 Gen 3 with 100W charge</p>
              </div>
              <button
                onClick={() => setSelectedBrand("OnePlus")}
                className="text-xs text-[#007185] hover:text-[#c7511f] font-medium pt-3 text-left cursor-pointer"
              >
                Shop OnePlus flagships &gt;
              </button>
            </div>

            {/* Card 4: Signature Feature: Pre-Expiry SMS Alerts */}
            <div className="bg-white p-4 rounded-xs shadow-md flex flex-col justify-between border-t-4 border-[#febd69]">
              <div>
                <div className="flex items-center gap-1.5 text-xs text-[#c7511f] font-bold mb-1">
                  <BellRing className="w-4 h-4 text-[#e67a00]" />
                  <span>VM MOBILES EXCLUSIVE</span>
                </div>
                <h3 className="font-bold text-lg text-[#0f1111] mb-2 leading-snug">
                  Pre-Expiry SMS Alerts
                </h3>
                <p className="text-xs text-gray-600 leading-relaxed mb-3">
                  Every mobile purchase sends an instant SMS with your IMEI, and sends automatic warning alerts <strong>7 days & 24 hours</strong> before warranty expiration!
                </p>
                <div className="p-2.5 bg-[#fef8f2] border border-[#fbd8b4] rounded-xs text-[11px] text-[#703800] font-medium">
                  ✓ Verified Phone OTP Security <br />
                  ✓ 100% Genuine Brand Warranty
                </div>
              </div>
              <button
                onClick={() => setIsSmsDrawerOpen(true)}
                className="btn-amazon-yellow py-1.5 px-3 text-xs font-bold text-center mt-3 block w-full"
              >
                Open Buyer SMS Inbox ({unreadSmsCount})
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Main Amazon Catalog Container with Sidebar & Product Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Results Bar */}
        <div className="bg-white border border-gray-200 rounded-sm p-3 mb-4 flex flex-wrap items-center justify-between gap-3 text-sm">
          <div className="text-gray-700 text-xs sm:text-sm flex items-center gap-2 flex-wrap">
            <span>Showing </span>
            <span className="font-bold text-[#c7511f]">1-{filteredProducts.length}</span>
            <span> of </span>
            <span className="font-bold text-[#c7511f]">{filteredProducts.length} smartphones</span>
            {selectedBrand !== "All Mobiles" && (
              <span className="bg-gray-100 text-gray-800 text-xs font-semibold px-2 py-0.5 rounded border border-gray-300">
                Brand: {selectedBrand}
              </span>
            )}
            {priceRange < 200000 && (
              <span className="bg-gray-100 text-gray-800 text-xs font-semibold px-2 py-0.5 rounded border border-gray-300">
                Max ₹{priceRange.toLocaleString("en-IN")}
              </span>
            )}
            {searchQuery && (
              <span className="bg-[#fef8f2] text-[#c7511f] text-xs font-semibold px-2 py-0.5 rounded border border-[#fbd8b4]">
                &quot;{searchQuery}&quot;
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Mobile Filter Button */}
            <button
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className="lg:hidden flex items-center gap-1.5 px-3 py-1 bg-gray-100 border border-gray-300 rounded text-xs font-medium text-gray-800"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Filters ({activeFilterCount})
            </button>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-gray-500 font-medium">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-[#f0f2f2] hover:bg-[#e3e6e6] border border-[#d5d9d9] rounded-md px-2.5 py-1 text-xs text-[#0f1111] focus:outline-none focus:ring-2 focus:ring-[#e77600] cursor-pointer"
              >
                <option value="featured">Featured</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="rating">Avg. Customer Review</option>
                <option value="newest">Newest Arrivals</option>
              </select>
            </div>
          </div>
        </div>

        {/* 2-Column Marketplace Grid: Left Sidebar (Filters) + Right Content (Products) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Filter Sidebar (3 cols on Desktop) */}
          <aside
            className={`lg:col-span-3 bg-white border border-gray-200 rounded-sm p-4 space-y-6 ${
              showMobileFilters ? "block" : "hidden lg:block"
            }`}
          >
            {/* Filter Header with Reset */}
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <div className="flex items-center gap-1.5 font-bold text-sm text-[#0f1111]">
                <SlidersHorizontal className="w-4 h-4 text-[#e67a00]" />
                <span>Filter Smartphones</span>
              </div>
              {activeFilterCount > 0 && (
                <button
                  onClick={handleResetFilters}
                  className="text-xs text-[#007185] hover:text-[#c7511f] font-semibold flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" /> Reset
                </button>
              )}
            </div>

            {/* 1. Price Range Slider (₹10,000 -> ₹2,00,000) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#0f1111]">Price Budget:</span>
                <span className="text-xs font-bold text-[#b12704]">
                  Up to ₹{priceRange.toLocaleString("en-IN")}
                </span>
              </div>
              <input
                type="range"
                min="10000"
                max="200000"
                step="5000"
                value={priceRange}
                onChange={(e) => setPriceRange(Number(e.target.value))}
                className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#e77600]"
              />
              <div className="flex justify-between text-[11px] text-gray-500 font-medium">
                <span>₹10,000</span>
                <span>₹1,00,000</span>
                <span>₹2,00,000</span>
              </div>
              {/* Quick Budget Buttons */}
              <div className="flex flex-wrap gap-1 pt-1">
                {[
                  { label: "< 15K", max: 15000 },
                  { label: "< 30K", max: 30000 },
                  { label: "< 60K", max: 60000 },
                  { label: "< 1L", max: 100000 },
                  { label: "All", max: 200000 },
                ].map((tier) => (
                  <button
                    key={tier.label}
                    onClick={() => setPriceRange(tier.max)}
                    className={`px-2 py-0.5 text-[10px] rounded border transition-colors ${
                      priceRange === tier.max
                        ? "bg-[#0f1111] text-white font-bold border-[#0f1111]"
                        : "bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100"
                    }`}
                  >
                    {tier.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Real Famous Brands Filter */}
            <div className="space-y-2 pt-2 border-t border-gray-100">
              <span className="text-xs font-bold text-[#0f1111] block">Famous Brands:</span>
              <div className="space-y-1 max-h-56 overflow-y-auto pr-1 scrollbar-thin">
                {FAMOUS_BRANDS.map((brand) => (
                  <button
                    key={brand}
                    onClick={() => setSelectedBrand(brand)}
                    className={`w-full text-left px-2 py-1 rounded text-xs transition-colors flex items-center justify-between ${
                      selectedBrand === brand
                        ? "bg-[#fef8f2] text-[#c7511f] font-bold border-l-3 border-[#e77600]"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <span>{brand}</span>
                    {selectedBrand === brand && (
                      <Check className="w-3.5 h-3.5 text-[#e77600]" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. RAM Filter */}
            <div className="space-y-2 pt-2 border-t border-gray-100">
              <span className="text-xs font-bold text-[#0f1111] block">RAM:</span>
              <div className="flex flex-wrap gap-1.5">
                {RAM_OPTIONS.map((ram) => (
                  <button
                    key={ram}
                    onClick={() => setSelectedRam(ram)}
                    className={`px-2.5 py-1 text-xs rounded border transition-colors ${
                      selectedRam === ram
                        ? "bg-[#007185] text-white font-bold border-[#007185]"
                        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    {ram}
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Internal Storage Filter */}
            <div className="space-y-2 pt-2 border-t border-gray-100">
              <span className="text-xs font-bold text-[#0f1111] block">Internal Storage:</span>
              <div className="flex flex-wrap gap-1.5">
                {STORAGE_OPTIONS.map((storage) => (
                  <button
                    key={storage}
                    onClick={() => setSelectedStorage(storage)}
                    className={`px-2.5 py-1 text-xs rounded border transition-colors ${
                      selectedStorage === storage
                        ? "bg-[#007185] text-white font-bold border-[#007185]"
                        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    {storage}
                  </button>
                ))}
              </div>
            </div>

            {/* 5. Operating System Filter */}
            <div className="space-y-2 pt-2 border-t border-gray-100">
              <span className="text-xs font-bold text-[#0f1111] block">Operating System:</span>
              <div className="flex flex-wrap gap-1.5">
                {OS_OPTIONS.map((os) => (
                  <button
                    key={os}
                    onClick={() => setSelectedOS(os)}
                    className={`px-2 py-0.5 text-xs rounded border transition-colors ${
                      selectedOS === os
                        ? "bg-[#007185] text-white font-bold border-[#007185]"
                        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    {os}
                  </button>
                ))}
              </div>
            </div>

            {/* 6. Display Screen Size Filter */}
            <div className="space-y-2 pt-2 border-t border-gray-100">
              <span className="text-xs font-bold text-[#0f1111] block">Screen Size:</span>
              <div className="space-y-1">
                {SCREEN_SIZE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setSelectedScreenSize(opt.value)}
                    className={`w-full text-left px-2 py-1 rounded text-xs transition-colors flex items-center justify-between ${
                      selectedScreenSize === opt.value
                        ? "bg-[#fef8f2] text-[#c7511f] font-bold"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <span>{opt.label}</span>
                    {selectedScreenSize === opt.value && (
                      <Check className="w-3.5 h-3.5 text-[#e77600]" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          {/* Right Column: Products Grid (9 cols on Desktop) */}
          <main className="lg:col-span-9 space-y-4">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <div key={n} className="h-[480px] bg-white border border-gray-200 rounded-sm animate-pulse p-4" />
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-sm p-12 text-center text-gray-600 space-y-3">
                <Smartphone className="w-12 h-12 mx-auto text-gray-400" />
                <h3 className="text-lg font-bold text-[#0f1111]">No Smartphones Match Your Filter</h3>
                <p className="text-xs text-gray-500">
                  Try adjusting the price slider, clearing brand filters, or searching for a different model.
                </p>
                <button
                  onClick={handleResetFilters}
                  className="btn-amazon-yellow py-2 px-6 text-xs font-bold"
                >
                  Clear All Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredProducts.map((product) => (
                  <MobileCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </main>
        </div>
      </section>

      {/* Bottom Feature Explanation Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
        <div className="bg-white border border-gray-200 rounded-sm p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-2 text-[#e67a00]">
            <ShieldCheck className="w-6 h-6" />
            <h2 className="text-xl font-bold text-[#0f1111]">
              Why Buy on VM Mobiles.in?
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-gray-600 leading-relaxed max-w-3xl mb-4">
            VM Mobiles is India&apos;s specialized online smartphone marketplace. We pair official manufacturer hardware with verified phone security and automated SMS reminders so you never forget your warranty deadline or lose accidental damage coverage.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-xs">
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-sm space-y-1">
              <span className="font-bold text-[#0f1111] block">1. Verified Phone SMS OTP</span>
              <p className="text-gray-600">Every buyer authenticates their number via a 6-digit OTP before purchasing.</p>
            </div>

            <div className="p-3 bg-gray-50 border border-gray-200 rounded-sm space-y-1">
              <span className="font-bold text-[#0f1111] block">2. Instant Purchase SMS</span>
              <p className="text-gray-600">Device IMEI and 12-month validity date are immediately transmitted to your phone.</p>
            </div>

            <div className="p-3 bg-gray-50 border border-gray-200 rounded-sm space-y-1">
              <span className="font-bold text-[#0f1111] block">3. Pre-Expiry SMS Warnings</span>
              <p className="text-gray-600">Automatic SMS sent 7 days & 24h prior to expiration to extend or claim servicing.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function MarketplaceHome() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-700 font-bold">Loading VM Mobiles...</div>}>
      <MarketplaceContent />
    </Suspense>
  );
}