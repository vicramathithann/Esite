"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import MobileCard from "@/components/MobileCard";
import { MobileProductData } from "@/lib/types";
import { DEFAULT_PRODUCTS } from "@/lib/catalogData";
import { useApp } from "@/context/AppContext";
import {
  SlidersHorizontal,
  Check,
  X,
  RotateCcw,
  Smartphone,
  Headphones,
  Sparkles,
} from "lucide-react";

export const FAMOUS_BRANDS = [
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
  "Tecno",
  "Nokia",
];

const RAM_OPTIONS = ["All", "4GB", "6GB", "8GB", "12GB", "16GB"];
const STORAGE_OPTIONS = ["All", "128GB", "256GB", "512GB", "1TB"];
const OS_OPTIONS = ["All", "iOS", "Android", "OxygenOS", "HyperOS", "Nothing OS", "ColorOS"];
const BATTERY_OPTIONS = [
  { label: "All", value: "All" },
  { label: "< 4500 mAh", value: "under-4500" },
  { label: "4500 - 5000 mAh", value: "4500-5000" },
  { label: "5000+ mAh", value: "5000-plus" },
];
const NETWORK_OPTIONS = ["All", "5G Only"];

export interface ProductCatalogProps {
  initialBrand?: string;
  initialCategory?: string;
  initialSearch?: string;
  showHeaderBanner?: boolean;
  bannerTitle?: string;
  bannerSubtitle?: string;
  externalSelectedBrand?: string;
  onBrandChange?: (brand: string) => void;
}

let globalCatalogCache: MobileProductData[] | null = null;

export function getCachedProduct(id: string): MobileProductData | undefined {
  if (globalCatalogCache) {
    const found = globalCatalogCache.find((p) => p.id === id);
    if (found) return found;
  }
  return DEFAULT_PRODUCTS.find((p) => p.id === id);
}

export default function ProductCatalog({
  initialBrand,
  initialCategory = "all",
  initialSearch = "",
  showHeaderBanner = false,
  bannerTitle,
  bannerSubtitle,
  externalSelectedBrand,
  onBrandChange,
}: ProductCatalogProps) {
  const searchParams = useSearchParams();
  const { siteSettings } = useApp();

  const urlBrand = searchParams.get("brand");
  const urlSearch = searchParams.get("search");
  const urlCategory = searchParams.get("category");

  const [products, setProducts] = useState<MobileProductData[]>(() => globalCatalogCache || DEFAULT_PRODUCTS);
  const [loading, setLoading] = useState(() => !globalCatalogCache);

  // Filter States
  const [selectedBrand, setSelectedBrand] = useState<string>(
    externalSelectedBrand || urlBrand || initialBrand || "All Mobiles"
  );
  const [selectedCategory, setSelectedCategory] = useState<string>(
    urlCategory || initialCategory || "all"
  );
  const [searchQuery, setSearchQuery] = useState<string>(
    urlSearch || initialSearch || ""
  );
  const [priceRange, setPriceRange] = useState<number>(200000);
  const [selectedRam, setSelectedRam] = useState<string>("All");
  const [selectedStorage, setSelectedStorage] = useState<string>("All");
  const [selectedOS, setSelectedOS] = useState<string>("All");
  const [selectedBattery, setSelectedBattery] = useState<string>("All");
  const [selected5G, setSelected5G] = useState<string>("All");
  const [inStockOnly, setInStockOnly] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<string>("featured");
  const [showMobileFilters, setShowMobileFilters] = useState<boolean>(false);

  // Sync externalSelectedBrand when controlled by parent
  useEffect(() => {
    if (externalSelectedBrand && externalSelectedBrand !== selectedBrand) {
      setSelectedBrand(externalSelectedBrand);
    }
  }, [externalSelectedBrand]);

  // Sync with URL query parameters
  useEffect(() => {
    if (urlBrand && urlBrand !== selectedBrand) {
      setSelectedBrand(urlBrand);
    }
  }, [urlBrand]);

  useEffect(() => {
    if (urlSearch !== null && urlSearch !== searchQuery) {
      setSearchQuery(urlSearch);
    }
  }, [urlSearch]);

  useEffect(() => {
    if (urlCategory && urlCategory !== selectedCategory) {
      setSelectedCategory(urlCategory);
    }
  }, [urlCategory]);

  // Fetch products from database API
  useEffect(() => {
    async function fetchProducts() {
      if (!globalCatalogCache) {
        setLoading(true);
      }
      try {
        const res = await fetch("/api/products");
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const data = await res.json();
        if (data.success && Array.isArray(data.products) && data.products.length > 0) {
          globalCatalogCache = data.products;
          setProducts(data.products);
        } else if (!globalCatalogCache) {
          setProducts(DEFAULT_PRODUCTS);
        }
      } catch {
        if (!globalCatalogCache) {
          setProducts(DEFAULT_PRODUCTS);
        }
      } finally {
        setLoading(false);
      }
    }
    fetchProducts();
  }, []);

  const handleBrandSelect = (brand: string) => {
    setSelectedBrand(brand);
    if (onBrandChange) {
      onBrandChange(brand);
    }
  };

  const handleResetFilters = () => {
    setSelectedBrand("All Mobiles");
    setSelectedCategory("all");
    setSearchQuery("");
    setPriceRange(200000);
    setSelectedRam("All");
    setSelectedStorage("All");
    setSelectedOS("All");
    setSelectedBattery("All");
    setSelected5G("All");
    setInStockOnly(false);
    setSortBy("featured");
    if (onBrandChange) {
      onBrandChange("All Mobiles");
    }
  };

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    return (products || [])
      .filter((p) => {
        if (!p) return false;

        // 1. Category Filter
        if (selectedCategory !== "all") {
          const prodCat = ((p as any).category || "SMARTPHONE").toUpperCase();
          if (prodCat !== selectedCategory.toUpperCase()) return false;
        }

        // 2. Brand Filter
        if (selectedBrand !== "All Mobiles") {
          const brandNormalized = (p.brand || "").toLowerCase();
          const targetBrand = selectedBrand.toLowerCase();
          if (targetBrand === "google pixel" || targetBrand === "google") {
            if (!brandNormalized.includes("google") && !brandNormalized.includes("pixel")) return false;
          } else if (brandNormalized !== targetBrand) {
            return false;
          }
        }

        // 3. Price Filter (up to priceRange)
        if ((p.basePrice || 0) > priceRange) {
          return false;
        }

        // 4. RAM Filter
        if (selectedRam !== "All") {
          if (!(p.ram || "").toLowerCase().includes(selectedRam.toLowerCase())) {
            return false;
          }
        }

        // 5. Storage Filter
        if (selectedStorage !== "All") {
          const storageList = Array.isArray(p.storageOptions) ? p.storageOptions : [];
          const hasMatchingStorage = storageList.some((s) =>
            (s?.size || "").toLowerCase().includes(selectedStorage.toLowerCase())
          );
          if (!hasMatchingStorage) return false;
        }

        // 6. OS Filter
        if (selectedOS !== "All") {
          if (!(p.os || "").toLowerCase().includes(selectedOS.toLowerCase())) {
            return false;
          }
        }

        // 7. Battery Filter
        if (selectedBattery !== "All") {
          const match = (p.battery || "").match(/(\d{4})/);
          if (match) {
            const capacity = parseInt(match[1]);
            if (selectedBattery === "under-4500" && capacity >= 4500) return false;
            if (selectedBattery === "4500-5000" && (capacity < 4500 || capacity > 5000)) return false;
            if (selectedBattery === "5000-plus" && capacity < 5000) return false;
          }
        }

        // 8. 5G Filter
        if (selected5G === "5G Only") {
          const is5G =
            (p.network5G || "").includes("5G") ||
            (p.name || "").includes("5G") ||
            (p.tagline || "").includes("5G");
          if (!is5G) return false;
        }

        // 9. In Stock Only Filter
        if (inStockOnly && !p.inStock) {
          return false;
        }

        // 10. Search Query Filter
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
        if (sortBy === "newest") return (b.id || "") > (a.id || "") ? 1 : -1;
        return (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0);
      });
  }, [
    products,
    selectedCategory,
    selectedBrand,
    priceRange,
    selectedRam,
    selectedStorage,
    selectedOS,
    selectedBattery,
    selected5G,
    inStockOnly,
    searchQuery,
    sortBy,
  ]);

  const activeFilterCount =
    (selectedBrand !== "All Mobiles" ? 1 : 0) +
    (selectedCategory !== "all" ? 1 : 0) +
    (priceRange < 200000 ? 1 : 0) +
    (selectedRam !== "All" ? 1 : 0) +
    (selectedStorage !== "All" ? 1 : 0) +
    (selectedOS !== "All" ? 1 : 0) +
    (selectedBattery !== "All" ? 1 : 0) +
    (selected5G !== "All" ? 1 : 0) +
    (inStockOnly ? 1 : 0) +
    (searchQuery ? 1 : 0);

  return (
    <div className="w-full text-foreground">
      {/* 5. Header Banner: uses bg-card and border-border */}
      {showHeaderBanner && (
        <div className="bg-card border border-border rounded-[20px] p-6 sm:p-8 mb-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6 transition-colors duration-200">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/10 text-accent text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>VN Mobiles Marketplace</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              {bannerTitle || (selectedBrand !== "All Mobiles" ? `${selectedBrand} Flagships` : "Smartphones & Mobile Devices")}
            </h1>
            <p className="text-xs sm:text-sm text-muted max-w-xl">
              {bannerSubtitle || "Explore authentic 5G smartphones and accessories with official 1-Year Device Shield warranty and PAN-India delivery."}
            </p>
          </div>

          {/* Clean Pill Style Category Toggle */}
          <div className="bg-tile p-1.5 rounded-full border border-border inline-flex items-center gap-1 self-start md:self-auto shrink-0 shadow-2xs">
            <button
              onClick={() => setSelectedCategory("all")}
              className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-all duration-200 cursor-pointer ${
                selectedCategory === "all"
                  ? "bg-[#C9A66B] dark:bg-[#D4B483] text-[#FFFCFA] shadow-xs font-semibold"
                  : "text-[#8C6226] dark:text-[#E2C799] hover:bg-[#C9A66B]/15 hover:text-foreground"
              }`}
            >
              All Items
            </button>
            <button
              onClick={() => setSelectedCategory("SMARTPHONE")}
              className={`px-4 py-1.5 text-xs font-semibold rounded-full flex items-center gap-1.5 transition-all duration-200 cursor-pointer ${
                selectedCategory === "SMARTPHONE"
                  ? "bg-[#C9A66B] dark:bg-[#D4B483] text-[#FFFCFA] shadow-xs font-semibold"
                  : "text-[#8C6226] dark:text-[#E2C799] hover:bg-[#C9A66B]/15 hover:text-foreground"
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Smartphones</span>
            </button>
            <button
              onClick={() => setSelectedCategory("ACCESSORY")}
              className={`px-4 py-1.5 text-xs font-semibold rounded-full flex items-center gap-1.5 transition-all duration-200 cursor-pointer ${
                selectedCategory === "ACCESSORY"
                  ? "bg-[#C9A66B] dark:bg-[#D4B483] text-[#FFFCFA] shadow-xs font-semibold"
                  : "text-[#8C6226] dark:text-[#E2C799] hover:bg-[#C9A66B]/15 hover:text-foreground"
              }`}
            >
              <Headphones className="w-3.5 h-3.5" />
              <span>Accessories</span>
            </button>
          </div>
        </div>
      )}

      {/* Promotional Deals & Savings Banner (Controllable via Admin Store Controls) */}
      {siteSettings.showDealsBanner === "true" && (
        <div className="bg-gradient-to-r from-[#C9A66B]/20 via-[#C9A66B]/10 to-card border border-[#C9A66B]/35 rounded-[20px] p-5 sm:p-6 mb-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all duration-200 animate-fade-in">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-[#C9A66B] dark:bg-[#D4B483] text-[#FFFCFA] flex items-center justify-center shrink-0 shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider bg-[#C9A66B] dark:bg-[#D4B483] text-[#FFFCFA] px-2.5 py-0.5 rounded-full shadow-2xs">
                  Flash Deals
                </span>
                <span className="text-xs font-semibold text-[#8C6226] dark:text-[#E5CBA2]">Special Festive Tech Savings</span>
              </div>
              <h3 className="text-sm sm:text-base font-bold text-foreground">
                Instant Bank Discounts up to ₹15,000 + 1-Year Official Brand Warranty
              </h3>
              <p className="text-xs text-muted">
                Zero-cost EMI plans and insured PAN-India express delivery on all flagship smartphones.
              </p>
            </div>
          </div>
          <div className="shrink-0 flex items-center gap-2">
            <span className="text-xs font-bold text-[#8C6226] dark:text-[#E5CBA2] bg-card border border-[#C9A66B]/30 px-3.5 py-1.5 rounded-full shadow-2xs">
              Promo: <strong className="text-foreground">VNMOBILE</strong>
            </span>
          </div>
        </div>
      )}

      {/* 3. Heading Bar: "Explore Smartphones (N devices)" with active brand chip & sort dropdown */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">
            Explore Smartphones
          </h2>
          <span className="text-xs text-muted ml-1">
            ({filteredProducts.length} devices)
          </span>

          {/* Active Brand Chip */}
          {selectedBrand !== "All Mobiles" && (
            <span className="bg-[#C9A66B] dark:bg-[#D4B483] text-[#FFFCFA] text-xs font-medium px-3 py-1 rounded-full flex items-center gap-1.5 ml-2 shadow-2xs animate-fade-in">
              <span>{selectedBrand}</span>
              <button
                type="button"
                onClick={() => handleBrandSelect("All Mobiles")}
                className="cursor-pointer hover:opacity-80 p-0.5"
                title="Clear brand filter"
              >
                <X className="w-3 h-3 text-[#FFFCFA]" />
              </button>
            </span>
          )}

          {/* Active Search Chip */}
          {searchQuery && (
            <span className="bg-[#C9A66B]/15 border border-[#C9A66B]/30 text-[#8C6226] dark:text-[#E2C799] text-xs font-medium px-3 py-1 rounded-full flex items-center gap-1.5 shadow-2xs animate-fade-in">
              <span>&quot;{searchQuery}&quot;</span>
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="cursor-pointer hover:text-rose-500 p-0.5"
                title="Clear search"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {/* Active Category Chip */}
          {selectedCategory !== "all" && (
            <span className="bg-[#C9A66B]/15 border border-[#C9A66B]/30 text-[#8C6226] dark:text-[#E2C799] text-xs font-medium px-3 py-1 rounded-full flex items-center gap-1.5 shadow-2xs animate-fade-in">
              <span>Category: {selectedCategory === "SMARTPHONE" ? "Smartphones" : "Accessories"}</span>
              <button
                type="button"
                onClick={() => setSelectedCategory("all")}
                className="cursor-pointer hover:text-rose-500 p-0.5"
                title="Clear category filter"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Mobile Filter Toggle */}
          <button
            type="button"
            onClick={() => setShowMobileFilters(!showMobileFilters)}
            className="lg:hidden flex items-center gap-1.5 px-4 py-2 bg-[#C9A66B]/15 border border-[#C9A66B]/40 hover:bg-[#C9A66B]/25 rounded-full text-xs font-medium text-[#8C6226] dark:text-[#E2C799] shadow-2xs cursor-pointer transition-colors"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#C9A66B] dark:text-[#D4B483]" />
            <span>Filters ({activeFilterCount})</span>
          </button>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted hidden sm:inline">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-card border border-[#C9A66B]/40 rounded-full px-4 py-2 text-xs text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-[#C9A66B]/25 focus:border-[#C9A66B] cursor-pointer shadow-2xs transition-colors"
            >
              <option value="featured">Featured First</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="rating">Top Rated</option>
              <option value="newest">New Releases</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Grid: Filters Sidebar (Col 3) + 4-Column Product Grid (Col 9) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Filter Sidebar */}
        <aside
          className={`lg:col-span-3 bg-card border border-border rounded-[20px] p-6 space-y-6 shadow-xs ${
            showMobileFilters ? "block" : "hidden lg:block"
          }`}
        >
          {/* Sidebar Header */}
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2 font-bold text-sm text-foreground">
              <SlidersHorizontal className="w-4 h-4 text-[#C9A66B] dark:text-[#D4B483]" />
              <span>Filters</span>
            </div>
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs text-[#8C6226] dark:text-[#D4B483] hover:text-[#B8914A] font-semibold flex items-center gap-1 cursor-pointer px-2.5 py-1 rounded-full bg-[#C9A66B]/15 hover:bg-[#C9A66B]/25 border border-[#C9A66B]/30 transition-all"
              >
                <RotateCcw className="w-3 h-3" /> Reset
              </button>
            )}
          </div>

          {/* Brand Filter */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-foreground block">Brand</span>
            <div className="space-y-1 max-h-52 overflow-y-auto pr-1 scrollbar-thin">
              {FAMOUS_BRANDS.map((brand) => (
                <button
                  key={brand}
                  type="button"
                  onClick={() => handleBrandSelect(brand)}
                  className={`w-full text-left px-3 py-1.5 rounded-full text-xs transition-all duration-200 flex items-center justify-between cursor-pointer ${
                    selectedBrand === brand
                      ? "bg-[#C9A66B] dark:bg-[#D4B483] text-[#FFFCFA] font-semibold shadow-xs"
                      : "text-muted hover:text-foreground hover:bg-[#C9A66B]/10"
                  }`}
                >
                  <span>{brand}</span>
                  {selectedBrand === brand && (
                    <Check className="w-3 h-3 text-[#FFFCFA] shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Price Slider */}
          <div className="space-y-2 pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground">Max Price</span>
              <span className="text-xs font-bold text-[#C9A66B] dark:text-[#D4B483]">
                ₹{priceRange.toLocaleString("en-IN")}
              </span>
            </div>
            <input
              type="range"
              min="10000"
              max="200000"
              step="5000"
              value={priceRange}
              onChange={(e) => setPriceRange(Number(e.target.value))}
              className="w-full h-1.5 bg-tile rounded-lg appearance-none cursor-pointer accent-[#C9A66B] dark:accent-[#D4B483]"
            />
            <div className="flex justify-between text-[11px] text-muted">
              <span>₹10,000</span>
              <span>₹1,00,000</span>
              <span>₹2,00,000</span>
            </div>
          </div>

          {/* RAM Filter */}
          <div className="space-y-2 pt-2 border-t border-border">
            <span className="text-xs font-bold text-foreground block">RAM</span>
            <div className="flex flex-wrap gap-1.5">
              {RAM_OPTIONS.map((ram) => (
                <button
                  key={ram}
                  type="button"
                  onClick={() => setSelectedRam(ram)}
                  className={`px-3 py-1 text-xs rounded-full font-medium transition-all duration-200 cursor-pointer ${
                    selectedRam === ram
                      ? "bg-[#C9A66B] dark:bg-[#D4B483] text-[#FFFCFA] font-semibold shadow-xs"
                      : "bg-[#C9A66B]/10 text-[#8C6226] dark:text-[#E2C799] hover:bg-[#C9A66B]/20 border border-[#C9A66B]/30"
                  }`}
                >
                  {ram}
                </button>
              ))}
            </div>
          </div>

          {/* Storage Filter */}
          <div className="space-y-2 pt-2 border-t border-border">
            <span className="text-xs font-bold text-foreground block">Storage</span>
            <div className="flex flex-wrap gap-1.5">
              {STORAGE_OPTIONS.map((storage) => (
                <button
                  key={storage}
                  type="button"
                  onClick={() => setSelectedStorage(storage)}
                  className={`px-3 py-1 text-xs rounded-full font-medium transition-all duration-200 cursor-pointer ${
                    selectedStorage === storage
                      ? "bg-[#C9A66B] dark:bg-[#D4B483] text-[#FFFCFA] font-semibold shadow-xs"
                      : "bg-[#C9A66B]/10 text-[#8C6226] dark:text-[#E2C799] hover:bg-[#C9A66B]/20 border border-[#C9A66B]/30"
                  }`}
                >
                  {storage}
                </button>
              ))}
            </div>
          </div>

          {/* OS Filter */}
          <div className="space-y-2 pt-2 border-t border-border">
            <span className="text-xs font-bold text-foreground block">Operating System</span>
            <div className="flex flex-wrap gap-1.5">
              {OS_OPTIONS.map((os) => (
                <button
                  key={os}
                  type="button"
                  onClick={() => setSelectedOS(os)}
                  className={`px-3 py-1 text-xs rounded-full font-medium transition-all duration-200 cursor-pointer ${
                    selectedOS === os
                      ? "bg-[#C9A66B] dark:bg-[#D4B483] text-[#FFFCFA] font-semibold shadow-xs"
                      : "bg-[#C9A66B]/10 text-[#8C6226] dark:text-[#E2C799] hover:bg-[#C9A66B]/20 border border-[#C9A66B]/30"
                  }`}
                >
                  {os}
                </button>
              ))}
            </div>
          </div>

          {/* Battery Filter */}
          <div className="space-y-2 pt-2 border-t border-border">
            <span className="text-xs font-bold text-foreground block">Battery Capacity</span>
            <div className="space-y-1">
              {BATTERY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSelectedBattery(opt.value)}
                  className={`w-full text-left px-3 py-1.5 rounded-full text-xs transition-all duration-200 flex items-center justify-between cursor-pointer ${
                    selectedBattery === opt.value
                      ? "bg-[#C9A66B] dark:bg-[#D4B483] text-[#FFFCFA] font-semibold shadow-xs"
                      : "text-muted hover:text-foreground hover:bg-[#C9A66B]/10"
                  }`}
                >
                  <span>{opt.label}</span>
                  {selectedBattery === opt.value && (
                    <Check className="w-3 h-3 text-[#FFFCFA] shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* 5G Support Filter */}
          <div className="space-y-2 pt-2 border-t border-border">
            <span className="text-xs font-bold text-foreground block">Network</span>
            <div className="flex gap-2">
              {NETWORK_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setSelected5G(opt)}
                  className={`flex-1 py-1.5 text-xs rounded-full font-medium transition-all duration-200 cursor-pointer text-center ${
                    selected5G === opt
                      ? "bg-[#C9A66B] dark:bg-[#D4B483] text-[#FFFCFA] font-semibold shadow-xs"
                      : "bg-[#C9A66B]/10 text-[#8C6226] dark:text-[#E2C799] hover:bg-[#C9A66B]/20 border border-[#C9A66B]/30"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* In Stock Only Filter */}
          <div className="pt-2 border-t border-border">
            <label className="flex items-center gap-2 text-xs text-muted hover:text-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(e) => setInStockOnly(e.target.checked)}
                className="rounded border-border text-[#C9A66B] focus:ring-[#C9A66B]"
              />
              <span>In Stock Devices Only</span>
            </label>
          </div>
        </aside>

        {/* 6. Product Grid: 4 columns desktop / 2 mobile */}
        <main className="lg:col-span-9 space-y-4">
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                <div
                  key={n}
                  className="h-80 bg-card border border-border rounded-[20px] animate-pulse p-4 shadow-xs"
                />
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="bg-card border border-border rounded-[20px] p-12 text-center text-muted space-y-3 shadow-xs">
              <Smartphone className="w-12 h-12 mx-auto text-muted/60" />
              <h3 className="text-lg font-bold text-foreground">
                No Smartphones Match Your Filter
              </h3>
              <p className="text-xs text-muted max-w-sm mx-auto">
                Try adjusting the price slider, battery capacity, or clearing brand filters.
              </p>
              <button
                type="button"
                onClick={handleResetFilters}
                className="py-2.5 px-6 rounded-full bg-[#C9A66B] dark:bg-[#D4B483] hover:bg-[#B8914A] dark:hover:bg-[#C49A5A] active:bg-[#A67C3D] text-[#FFFCFA] text-xs font-semibold cursor-pointer transition-all duration-200 shadow-xs"
              >
                Clear All Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 animate-fade-in">
              {filteredProducts.map((product) => (
                <MobileCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
