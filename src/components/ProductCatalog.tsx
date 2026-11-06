"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
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
  ChevronDown,
  ChevronRight,
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

const QUICK_BRANDS = [
  "Apple",
  "Samsung",
  "Google Pixel",
  "OnePlus",
  "Xiaomi",
  "Nothing",
  "Motorola",
  "Realme",
  "Vivo",
  "Oppo",
];

const BRAND_BADGES: Record<string, string> = {
  "Apple": "A",
  "Samsung": "S",
  "Google Pixel": "G",
  "OnePlus": "1+",
  "Xiaomi": "Mi",
  "Redmi": "R",
  "Realme": "R",
  "Vivo": "V",
  "Oppo": "O",
  "Motorola": "M",
  "Nothing": "N",
  "Sony": "S",
  "Asus": "A",
  "iQOO": "Q",
  "Tecno": "T",
  "Nokia": "N",
};

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

  // Popovers & Drawer State
  const [openPopover, setOpenPopover] = useState<"brand" | "price" | "ram" | "more" | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const filterBarRef = useRef<HTMLDivElement>(null);

  // Close popover on outside click and Esc key
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filterBarRef.current && !filterBarRef.current.contains(e.target as Node)) {
        setOpenPopover(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpenPopover(null);
        setIsDrawerOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

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

  const selectedBrandList = useMemo(() => {
    if (!selectedBrand || selectedBrand === "All Mobiles") return [];
    return selectedBrand.split(",").map((s) => s.trim()).filter(Boolean);
  }, [selectedBrand]);

  const handleBrandToggle = (brand: string) => {
    if (brand === "All Mobiles") {
      handleBrandSelect("All Mobiles");
      return;
    }
    const current = selectedBrand === "All Mobiles" 
      ? [] 
      : selectedBrand.split(",").map((s) => s.trim()).filter(Boolean);
    const exists = current.some((b) => b.toLowerCase() === brand.toLowerCase());
    let nextList: string[];
    if (exists) {
      nextList = current.filter((b) => b.toLowerCase() !== brand.toLowerCase());
    } else {
      nextList = [...current, brand];
    }
    const nextVal = nextList.length === 0 ? "All Mobiles" : nextList.join(", ");
    handleBrandSelect(nextVal);
  };

  const selectedRamList = useMemo(() => {
    if (!selectedRam || selectedRam === "All") return [];
    return selectedRam.split(",").map((s) => s.trim()).filter(Boolean);
  }, [selectedRam]);

  const handleRamToggle = (ram: string) => {
    if (ram === "All") {
      setSelectedRam("All");
      return;
    }
    const current = selectedRam === "All"
      ? []
      : selectedRam.split(",").map((s) => s.trim()).filter(Boolean);
    const exists = current.some((r) => r.toLowerCase() === ram.toLowerCase());
    let nextList: string[];
    if (exists) {
      nextList = current.filter((r) => r.toLowerCase() !== ram.toLowerCase());
    } else {
      nextList = [...current, ram];
    }
    const nextVal = nextList.length === 0 ? "All" : nextList.join(", ");
    setSelectedRam(nextVal);
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
    setOpenPopover(null);
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

        // 2. Brand Filter (supports single and multi-select)
        if (selectedBrand !== "All Mobiles") {
          const brandNormalized = (p.brand || "").toLowerCase();
          const targetBrands = selectedBrand.split(",").map((b) => b.trim().toLowerCase());
          const matches = targetBrands.some((targetBrand) => {
            if (targetBrand === "google pixel" || targetBrand === "google") {
              return brandNormalized.includes("google") || brandNormalized.includes("pixel");
            }
            return brandNormalized === targetBrand;
          });
          if (!matches) return false;
        }

        // 3. Price Filter (up to priceRange)
        if ((p.basePrice || 0) > priceRange) {
          return false;
        }

        // 4. RAM Filter (supports single and multi-select)
        if (selectedRam !== "All") {
          const targetRams = selectedRam.split(",").map((r) => r.trim().toLowerCase());
          const prodRam = (p.ram || "").toLowerCase();
          const matches = targetRams.some((targetRam) => prodRam.includes(targetRam));
          if (!matches) return false;
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

  const isBrandActive = selectedBrand !== "All Mobiles";
  const isPriceActive = priceRange < 200000;
  const isRamActive = selectedRam !== "All";
  const isStorageActive = selectedStorage !== "All";
  const isOSActive = selectedOS !== "All";
  const isBatteryActive = selectedBattery !== "All";
  const is5GActive = selected5G !== "All";
  const isInStockActive = inStockOnly;
  const isCategoryActive = selectedCategory !== "all";
  const isSearchActive = Boolean(searchQuery.trim());

  const moreFiltersCount =
    (isStorageActive ? 1 : 0) +
    (isOSActive ? 1 : 0) +
    (isBatteryActive ? 1 : 0) +
    (is5GActive ? 1 : 0) +
    (isInStockActive ? 1 : 0);

  const activeFilterCount =
    (isBrandActive ? 1 : 0) +
    (isPriceActive ? 1 : 0) +
    (isRamActive ? 1 : 0) +
    (isStorageActive ? 1 : 0) +
    (isOSActive ? 1 : 0) +
    (isBatteryActive ? 1 : 0) +
    (is5GActive ? 1 : 0) +
    (isInStockActive ? 1 : 0) +
    (isCategoryActive ? 1 : 0) +
    (isSearchActive ? 1 : 0);

  // Dynamic Chip Labels
  const brandChipLabel = useMemo(() => {
    if (selectedBrandList.length === 0) return "Brand";
    if (selectedBrandList.length === 1) return `Brand (${selectedBrandList[0]})`;
    return `Brand (${selectedBrandList.length})`;
  }, [selectedBrandList]);

  const ramChipLabel = useMemo(() => {
    if (selectedRamList.length === 0) return "RAM";
    if (selectedRamList.length === 1) return `RAM: ${selectedRamList[0]}`;
    return `RAM (${selectedRamList.length})`;
  }, [selectedRamList]);

  const priceChipLabel = isPriceActive
    ? `Under ₹${priceRange.toLocaleString("en-IN")}`
    : "Price: Under ₹2,00,000";

  return (
    <div className="w-full text-foreground">
      {/* 1. Header Banner */}
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

      {/* 2. Promotional Deals Banner (Controllable via Admin) */}
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

      {/* 3. Heading Row: "Explore Smartphones (N devices)" + Active Filter Tags + Sort Dropdown */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">
            Explore Smartphones
          </h2>
          <span className="text-xs text-muted font-medium ml-0.5">
            ({filteredProducts.length} devices)
          </span>

          {/* Active Tags */}
          {selectedBrandList.map((brand) => (
            <span
              key={brand}
              className="bg-[#C9A66B] dark:bg-[#D4B483] text-[#FFFCFA] text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-2xs animate-fade-in"
            >
              <span>{brand}</span>
              <button
                type="button"
                onClick={() => handleBrandToggle(brand)}
                className="cursor-pointer hover:opacity-75 p-0.5"
                title={`Remove ${brand} filter`}
                aria-label={`Remove ${brand} filter`}
              >
                <X className="w-3 h-3 text-[#FFFCFA]" />
              </button>
            </span>
          ))}

          {isPriceActive && (
            <span className="bg-[#C9A66B]/15 border border-[#C9A66B]/30 text-[#8C6226] dark:text-[#E5CBA2] text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-2xs animate-fade-in">
              <span>Under ₹{priceRange.toLocaleString("en-IN")}</span>
              <button
                type="button"
                onClick={() => setPriceRange(200000)}
                className="cursor-pointer hover:text-red-500 p-0.5"
                title="Remove price filter"
                aria-label="Remove price filter"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {selectedRamList.map((ram) => (
            <span
              key={ram}
              className="bg-[#C9A66B]/15 border border-[#C9A66B]/30 text-[#8C6226] dark:text-[#E5CBA2] text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-2xs animate-fade-in"
            >
              <span>{ram} RAM</span>
              <button
                type="button"
                onClick={() => handleRamToggle(ram)}
                className="cursor-pointer hover:text-red-500 p-0.5"
                title={`Remove ${ram} RAM filter`}
                aria-label={`Remove ${ram} RAM filter`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}

          {isStorageActive && (
            <span className="bg-[#C9A66B]/15 border border-[#C9A66B]/30 text-[#8C6226] dark:text-[#E5CBA2] text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-2xs animate-fade-in">
              <span>{selectedStorage} Storage</span>
              <button
                type="button"
                onClick={() => setSelectedStorage("All")}
                className="cursor-pointer hover:text-red-500 p-0.5"
                title="Remove storage filter"
                aria-label="Remove storage filter"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {isOSActive && (
            <span className="bg-[#C9A66B]/15 border border-[#C9A66B]/30 text-[#8C6226] dark:text-[#E5CBA2] text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-2xs animate-fade-in">
              <span>{selectedOS}</span>
              <button
                type="button"
                onClick={() => setSelectedOS("All")}
                className="cursor-pointer hover:text-red-500 p-0.5"
                title="Remove OS filter"
                aria-label="Remove OS filter"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {isBatteryActive && (
            <span className="bg-[#C9A66B]/15 border border-[#C9A66B]/30 text-[#8C6226] dark:text-[#E5CBA2] text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-2xs animate-fade-in">
              <span>{BATTERY_OPTIONS.find((b) => b.value === selectedBattery)?.label || selectedBattery}</span>
              <button
                type="button"
                onClick={() => setSelectedBattery("All")}
                className="cursor-pointer hover:text-red-500 p-0.5"
                title="Remove battery filter"
                aria-label="Remove battery filter"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {is5GActive && (
            <span className="bg-[#C9A66B]/15 border border-[#C9A66B]/30 text-[#8C6226] dark:text-[#E5CBA2] text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-2xs animate-fade-in">
              <span>5G Only</span>
              <button
                type="button"
                onClick={() => setSelected5G("All")}
                className="cursor-pointer hover:text-red-500 p-0.5"
                title="Remove 5G filter"
                aria-label="Remove 5G filter"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {isInStockActive && (
            <span className="bg-[#C9A66B]/15 border border-[#C9A66B]/30 text-[#8C6226] dark:text-[#E5CBA2] text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-2xs animate-fade-in">
              <span>In Stock Only</span>
              <button
                type="button"
                onClick={() => setInStockOnly(false)}
                className="cursor-pointer hover:text-red-500 p-0.5"
                title="Remove in-stock filter"
                aria-label="Remove in-stock filter"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {isSearchActive && (
            <span className="bg-[#C9A66B]/15 border border-[#C9A66B]/30 text-[#8C6226] dark:text-[#E5CBA2] text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-2xs animate-fade-in">
              <span>&quot;{searchQuery}&quot;</span>
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="cursor-pointer hover:text-red-500 p-0.5"
                title="Clear search"
                aria-label="Clear search"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {isCategoryActive && (
            <span className="bg-[#C9A66B]/15 border border-[#C9A66B]/30 text-[#8C6226] dark:text-[#E5CBA2] text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-2xs animate-fade-in">
              <span>{selectedCategory === "SMARTPHONE" ? "Smartphones" : "Accessories"}</span>
              <button
                type="button"
                onClick={() => setSelectedCategory("all")}
                className="cursor-pointer hover:text-red-500 p-0.5"
                title="Clear category filter"
                aria-label="Clear category filter"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
        </div>

        {/* Sort Dropdown */}
        <div className="flex items-center gap-2 text-xs shrink-0 ml-auto">
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

      {/* 4. Horizontal Filter Bar */}
      <div
        ref={filterBarRef}
        className="relative bg-card/85 dark:bg-card/60 border border-[#C9A66B]/25 dark:border-[#D4B483]/25 bg-gradient-to-r from-[#C9A66B]/8 via-[#C9A66B]/3 to-transparent rounded-2xl p-2 sm:p-2.5 mb-6 shadow-xs flex items-center justify-between gap-3 overflow-x-auto scrollbar-none"
      >
        <div className="flex items-center gap-2 flex-nowrap shrink-0">
          {/* "All Filters" Button: Pinned at left on mobile */}
          <div className="sticky left-0 z-10 shrink-0 bg-card sm:bg-transparent pr-1">
            <button
              type="button"
              onClick={() => {
                setOpenPopover(null);
                setIsDrawerOpen(true);
              }}
              className="px-3.5 py-1.5 bg-[#C9A66B] dark:bg-[#D4B483] hover:bg-[#B8914A] dark:hover:bg-[#C49A5A] active:bg-[#A67C3D] text-[#FFFCFA] text-xs font-semibold rounded-full flex items-center gap-1.5 shadow-xs transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A66B]"
              aria-label="Open all filters drawer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>All Filters</span>
              {activeFilterCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-[#FFFCFA] text-[#8C6226] text-[10px] font-bold flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {/* Quick Chip 1: Brand */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setOpenPopover(openPopover === "brand" ? null : "brand")}
              aria-expanded={openPopover === "brand"}
              aria-haspopup="true"
              className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 border transition-all duration-150 cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A66B] ${
                isBrandActive
                  ? "bg-[#C9A66B]/15 dark:bg-[#D4B483]/15 border-[#C9A66B]/50 text-[#8C6226] dark:text-[#E5CBA2] font-semibold"
                  : "bg-tile border-border text-foreground hover:bg-tile/80"
              }`}
            >
              {isBrandActive && <Check className="w-3 h-3 text-[#C9A66B] dark:text-[#D4B483]" />}
              <span>{brandChipLabel}</span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-muted transition-transform duration-150 ${
                  openPopover === "brand" ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* Brand Popover (Desktop Dropdown) */}
            {openPopover === "brand" && (
              <div className="hidden sm:block absolute top-full left-0 mt-2 z-40 w-72 p-3 bg-card border border-border rounded-2xl shadow-xl animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-border">
                  <span className="text-xs font-bold text-foreground">Select Brand</span>
                  {isBrandActive && (
                    <button
                      type="button"
                      onClick={() => handleBrandSelect("All Mobiles")}
                      className="text-[11px] text-[#8C6226] dark:text-[#E5CBA2] hover:underline cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-1.5 max-h-56 overflow-y-auto scrollbar-thin pr-1">
                  {QUICK_BRANDS.map((b) => {
                    const isSelected = selectedBrandList.some((item) => item.toLowerCase() === b.toLowerCase());
                    return (
                      <button
                        key={b}
                        type="button"
                        onClick={() => handleBrandToggle(b)}
                        className={`px-2.5 py-1.5 rounded-xl text-xs font-medium flex items-center gap-2 border transition-all text-left cursor-pointer ${
                          isSelected
                            ? "bg-[#C9A66B] dark:bg-[#D4B483] text-[#FFFCFA] border-[#C9A66B] dark:border-[#D4B483] font-semibold shadow-2xs"
                            : "bg-tile border-border text-foreground hover:bg-tile/80"
                        }`}
                      >
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                            isSelected
                              ? "bg-black/20 text-[#FFFCFA]"
                              : "bg-card text-muted border border-border"
                          }`}
                        >
                          {BRAND_BADGES[b] || b.charAt(0)}
                        </span>
                        <span className="truncate flex-1">{b}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 shrink-0 text-[#FFFCFA]" />}
                      </button>
                    );
                  })}
                </div>

                <div className="pt-2 mt-2 border-t border-border flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      setOpenPopover(null);
                      setIsDrawerOpen(true);
                    }}
                    className="text-xs font-semibold text-[#8C6226] dark:text-[#E5CBA2] hover:text-[#B8914A] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>View All ({FAMOUS_BRANDS.length - 1} brands)</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Quick Chip 2: Price */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setOpenPopover(openPopover === "price" ? null : "price")}
              aria-expanded={openPopover === "price"}
              aria-haspopup="true"
              className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 border transition-all duration-150 cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A66B] ${
                isPriceActive
                  ? "bg-[#C9A66B]/15 dark:bg-[#D4B483]/15 border-[#C9A66B]/40 text-[#8C6226] dark:text-[#E5CBA2] font-semibold"
                  : "bg-tile border-border text-foreground hover:bg-tile/80"
              }`}
            >
              {isPriceActive && <Check className="w-3 h-3 text-[#C9A66B] dark:text-[#D4B483]" />}
              <span>{priceChipLabel}</span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-muted transition-transform duration-150 ${
                  openPopover === "price" ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* Price Popover (Desktop Dropdown) */}
            {openPopover === "price" && (
              <div className="hidden sm:block absolute top-full left-0 mt-2 z-40 w-72 p-4 bg-card border border-border rounded-2xl shadow-xl animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between text-xs font-bold mb-3">
                  <span className="text-foreground">Max Price Limit</span>
                  <span className="text-[#8C6226] dark:text-[#E5CBA2] font-semibold">
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
                <div className="flex justify-between text-[10px] text-muted font-mono mt-1 mb-3">
                  <span>₹10K</span>
                  <span>₹1 Lakh</span>
                  <span>₹2 Lakh</span>
                </div>

                {/* Quick Presets */}
                <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setPriceRange(30000)}
                    className="text-[11px] py-1 px-2 rounded-lg bg-tile hover:bg-tile/80 text-foreground font-medium text-center transition-colors cursor-pointer"
                  >
                    Under ₹30,000
                  </button>
                  <button
                    type="button"
                    onClick={() => setPriceRange(50000)}
                    className="text-[11px] py-1 px-2 rounded-lg bg-tile hover:bg-tile/80 text-foreground font-medium text-center transition-colors cursor-pointer"
                  >
                    Under ₹50,000
                  </button>
                  <button
                    type="button"
                    onClick={() => setPriceRange(100000)}
                    className="text-[11px] py-1 px-2 rounded-lg bg-tile hover:bg-tile/80 text-foreground font-medium text-center transition-colors cursor-pointer"
                  >
                    Under ₹1,00,000
                  </button>
                  <button
                    type="button"
                    onClick={() => setPriceRange(200000)}
                    className="text-[11px] py-1 px-2 rounded-lg bg-tile hover:bg-tile/80 text-[#8C6226] dark:text-[#E5CBA2] font-semibold text-center transition-colors cursor-pointer"
                  >
                    Reset (All)
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Quick Chip 3: RAM */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setOpenPopover(openPopover === "ram" ? null : "ram")}
              aria-expanded={openPopover === "ram"}
              aria-haspopup="true"
              className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 border transition-all duration-150 cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A66B] ${
                isRamActive
                  ? "bg-[#C9A66B]/15 dark:bg-[#D4B483]/15 border-[#C9A66B]/40 text-[#8C6226] dark:text-[#E5CBA2] font-semibold"
                  : "bg-tile border-border text-foreground hover:bg-tile/80"
              }`}
            >
              {isRamActive && <Check className="w-3 h-3 text-[#C9A66B] dark:text-[#D4B483]" />}
              <span>{ramChipLabel}</span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-muted transition-transform duration-150 ${
                  openPopover === "ram" ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* RAM Popover (Desktop Dropdown) */}
            {openPopover === "ram" && (
              <div className="hidden sm:block absolute top-full left-0 mt-2 z-40 w-64 p-3.5 bg-card border border-border rounded-2xl shadow-xl animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-border">
                  <span className="text-xs font-bold text-foreground">Select RAM Size</span>
                  {isRamActive && (
                    <button
                      type="button"
                      onClick={() => setSelectedRam("All")}
                      className="text-[11px] text-[#8C6226] dark:text-[#E5CBA2] hover:underline cursor-pointer"
                    >
                      Reset
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {RAM_OPTIONS.map((ram) => {
                    const isSelected = selectedRamList.some((r) => r.toLowerCase() === ram.toLowerCase()) || (ram === "All" && !isRamActive);
                    return (
                      <button
                        key={ram}
                        type="button"
                        onClick={() => handleRamToggle(ram)}
                        className={`py-1.5 px-2 text-xs rounded-xl font-medium transition-all text-center cursor-pointer ${
                          isSelected
                            ? "bg-[#C9A66B] dark:bg-[#D4B483] text-[#FFFCFA] font-semibold shadow-xs"
                            : "bg-tile hover:bg-tile/80 text-foreground"
                        }`}
                      >
                        {ram}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Quick Chip 4: More Filters */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setOpenPopover(openPopover === "more" ? null : "more")}
              aria-expanded={openPopover === "more"}
              aria-haspopup="true"
              className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 border transition-all duration-150 cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A66B] ${
                moreFiltersCount > 0
                  ? "bg-[#C9A66B]/15 dark:bg-[#D4B483]/15 border-[#C9A66B]/40 text-[#8C6226] dark:text-[#E5CBA2] font-semibold"
                  : "bg-tile border-border text-foreground hover:bg-tile/80"
              }`}
            >
              {moreFiltersCount > 0 && <Check className="w-3 h-3 text-[#C9A66B] dark:text-[#D4B483]" />}
              <span>{moreFiltersCount > 0 ? `More Filters (${moreFiltersCount})` : "More Filters"}</span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-muted transition-transform duration-150 ${
                  openPopover === "more" ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* More Filters Popover (Desktop Dropdown) */}
            {openPopover === "more" && (
              <div className="hidden sm:block absolute top-full left-auto right-0 sm:left-0 sm:right-auto mt-2 z-40 w-80 p-4 bg-card border border-border rounded-2xl shadow-xl animate-in fade-in zoom-in-95 duration-150 max-h-[420px] overflow-y-auto scrollbar-thin">
                {/* Storage */}
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-foreground block">Internal Storage</span>
                  <div className="flex flex-wrap gap-1.5">
                    {STORAGE_OPTIONS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSelectedStorage(s)}
                        className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all cursor-pointer ${
                          selectedStorage === s
                            ? "bg-[#C9A66B] dark:bg-[#D4B483] text-[#FFFCFA] font-semibold shadow-2xs"
                            : "bg-tile hover:bg-tile/80 text-foreground"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Operating System */}
                <div className="space-y-1.5 pt-3 border-t border-border mt-3">
                  <span className="text-xs font-bold text-foreground block">Operating System</span>
                  <div className="flex flex-wrap gap-1.5">
                    {OS_OPTIONS.map((os) => (
                      <button
                        key={os}
                        type="button"
                        onClick={() => setSelectedOS(os)}
                        className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all cursor-pointer ${
                          selectedOS === os
                            ? "bg-[#C9A66B] dark:bg-[#D4B483] text-[#FFFCFA] font-semibold shadow-2xs"
                            : "bg-tile hover:bg-tile/80 text-foreground"
                        }`}
                      >
                        {os}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Battery */}
                <div className="space-y-1 pt-3 border-t border-border mt-3">
                  <span className="text-xs font-bold text-foreground block mb-1">Battery Capacity</span>
                  <div className="space-y-1">
                    {BATTERY_OPTIONS.map((b) => (
                      <button
                        key={b.value}
                        type="button"
                        onClick={() => setSelectedBattery(b.value)}
                        className={`w-full text-left px-2.5 py-1 rounded-lg text-xs flex items-center justify-between transition-all cursor-pointer ${
                          selectedBattery === b.value
                            ? "bg-[#C9A66B] dark:bg-[#D4B483] text-[#FFFCFA] font-semibold"
                            : "bg-tile hover:bg-tile/80 text-foreground"
                        }`}
                      >
                        <span>{b.label}</span>
                        {selectedBattery === b.value && <Check className="w-3.5 h-3.5 text-[#FFFCFA]" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 5G Support & Stock Checkbox */}
                <div className="space-y-2 pt-3 border-t border-border mt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">5G Cellular Network</span>
                    <button
                      type="button"
                      onClick={() => setSelected5G(selected5G === "5G Only" ? "All" : "5G Only")}
                      className={`px-3 py-1 text-xs rounded-lg font-semibold transition-all cursor-pointer ${
                        selected5G === "5G Only"
                          ? "bg-[#C9A66B] dark:bg-[#D4B483] text-[#FFFCFA]"
                          : "bg-tile text-muted hover:text-foreground"
                      }`}
                    >
                      {selected5G === "5G Only" ? "5G Only" : "All"}
                    </button>
                  </div>

                  <label className="flex items-center gap-2 text-xs text-muted hover:text-foreground cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={inStockOnly}
                      onChange={(e) => setInStockOnly(e.target.checked)}
                      className="rounded border-border text-[#C9A66B] focus:ring-[#C9A66B]"
                    />
                    <span>In Stock Devices Only</span>
                  </label>
                </div>

                <div className="pt-3 border-t border-border mt-3">
                  <button
                    type="button"
                    onClick={() => {
                      setOpenPopover(null);
                      setIsDrawerOpen(true);
                    }}
                    className="w-full py-1.5 text-center text-xs text-[#8C6226] dark:text-[#E5CBA2] font-semibold hover:underline cursor-pointer flex items-center justify-center gap-1"
                  >
                    <span>Open All Filters Drawer</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* "Clear All Filters" Link on the right */}
        {activeFilterCount > 0 && (
          <div className="ml-auto shrink-0 pl-2">
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-xs font-semibold text-[#8C6226] dark:text-[#E5CBA2] hover:text-[#B8914A] hover:underline cursor-pointer whitespace-nowrap transition-colors flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Clear All Filters</span>
            </button>
          </div>
        )}
      </div>

      {/* Mobile Popover Bottom Sheet (when open on screens < sm) */}
      {openPopover && (
        <div className="sm:hidden fixed inset-0 z-50 flex items-end">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-150"
            onClick={() => setOpenPopover(null)}
            aria-hidden="true"
          />
          <div className="relative w-full max-h-[82vh] bg-card border-t border-border rounded-t-3xl p-5 shadow-2xl z-10 animate-in slide-in-from-bottom duration-150 flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-border mb-3">
              <h3 className="font-bold text-sm text-foreground">
                {openPopover === "brand" && "Filter by Brand"}
                {openPopover === "price" && "Filter by Max Price"}
                {openPopover === "ram" && "Filter by RAM"}
                {openPopover === "more" && "More Device Filters"}
              </h3>
              <button
                type="button"
                onClick={() => setOpenPopover(null)}
                className="p-1 rounded-full text-muted hover:text-foreground cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-4 pr-1">
              {openPopover === "brand" && (
                <div className="grid grid-cols-2 gap-2">
                  {QUICK_BRANDS.map((b) => {
                    const isSelected = selectedBrandList.some((item) => item.toLowerCase() === b.toLowerCase());
                    return (
                      <button
                        key={b}
                        type="button"
                        onClick={() => handleBrandToggle(b)}
                        className={`px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-2 border transition-all text-left cursor-pointer ${
                          isSelected
                            ? "bg-[#C9A66B] dark:bg-[#D4B483] text-[#FFFCFA] border-[#C9A66B] font-semibold shadow-2xs"
                            : "bg-tile border-border text-foreground"
                        }`}
                      >
                        <span className="w-5 h-5 rounded-full bg-black/10 dark:bg-white/10 flex items-center justify-center text-[10px] font-bold">
                          {BRAND_BADGES[b] || b.charAt(0)}
                        </span>
                        <span className="truncate flex-1">{b}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-[#FFFCFA]" />}
                      </button>
                    );
                  })}
                </div>
              )}

              {openPopover === "price" && (
                <div className="space-y-4 p-1">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-foreground">Max Price</span>
                    <span className="text-[#8C6226] dark:text-[#E5CBA2] text-sm">
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
                    className="w-full h-2 bg-tile rounded-lg appearance-none cursor-pointer accent-[#C9A66B]"
                  />
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setPriceRange(30000)}
                      className="py-2 text-xs rounded-xl bg-tile text-foreground font-medium"
                    >
                      Under ₹30,000
                    </button>
                    <button
                      type="button"
                      onClick={() => setPriceRange(50000)}
                      className="py-2 text-xs rounded-xl bg-tile text-foreground font-medium"
                    >
                      Under ₹50,000
                    </button>
                    <button
                      type="button"
                      onClick={() => setPriceRange(100000)}
                      className="py-2 text-xs rounded-xl bg-tile text-foreground font-medium"
                    >
                      Under ₹1,00,000
                    </button>
                    <button
                      type="button"
                      onClick={() => setPriceRange(200000)}
                      className="py-2 text-xs rounded-xl bg-tile text-[#8C6226] dark:text-[#E5CBA2] font-semibold"
                    >
                      Reset (Any)
                    </button>
                  </div>
                </div>
              )}

              {openPopover === "ram" && (
                <div className="grid grid-cols-3 gap-2">
                  {RAM_OPTIONS.map((ram) => {
                    const isSelected = selectedRamList.some((r) => r.toLowerCase() === ram.toLowerCase()) || (ram === "All" && !isRamActive);
                    return (
                      <button
                        key={ram}
                        type="button"
                        onClick={() => handleRamToggle(ram)}
                        className={`py-2 text-xs rounded-xl font-medium transition-all text-center ${
                          isSelected
                            ? "bg-[#C9A66B] dark:bg-[#D4B483] text-[#FFFCFA] font-semibold"
                            : "bg-tile text-foreground"
                        }`}
                      >
                        {ram}
                      </button>
                    );
                  })}
                </div>
              )}

              {openPopover === "more" && (
                <div className="space-y-4">
                  <div>
                    <span className="text-xs font-bold text-foreground block mb-1.5">Storage</span>
                    <div className="flex flex-wrap gap-1.5">
                      {STORAGE_OPTIONS.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setSelectedStorage(s)}
                          className={`px-3 py-1.5 text-xs rounded-xl font-medium ${
                            selectedStorage === s
                              ? "bg-[#C9A66B] text-[#FFFCFA] font-semibold"
                              : "bg-tile text-foreground"
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="text-xs font-bold text-foreground block mb-1.5">Operating System</span>
                    <div className="flex flex-wrap gap-1.5">
                      {OS_OPTIONS.map((os) => (
                        <button
                          key={os}
                          type="button"
                          onClick={() => setSelectedOS(os)}
                          className={`px-3 py-1.5 text-xs rounded-xl font-medium ${
                            selectedOS === os
                              ? "bg-[#C9A66B] text-[#FFFCFA] font-semibold"
                              : "bg-tile text-foreground"
                          }`}
                        >
                          {os}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="text-xs font-bold text-foreground block mb-1.5">Battery Capacity</span>
                    <div className="space-y-1">
                      {BATTERY_OPTIONS.map((b) => (
                        <button
                          key={b.value}
                          type="button"
                          onClick={() => setSelectedBattery(b.value)}
                          className={`w-full text-left px-3 py-1.5 rounded-xl text-xs flex items-center justify-between ${
                            selectedBattery === b.value
                              ? "bg-[#C9A66B] text-[#FFFCFA] font-semibold"
                              : "bg-tile text-foreground"
                          }`}
                        >
                          <span>{b.label}</span>
                          {selectedBattery === b.value && <Check className="w-3.5 h-3.5" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-border mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setOpenPopover(null)}
                className="w-full py-2.5 bg-[#C9A66B] dark:bg-[#D4B483] text-[#FFFCFA] text-xs font-bold rounded-xl text-center shadow-xs cursor-pointer"
              >
                Apply ({filteredProducts.length} devices)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Slide-in All Filters Drawer (Right on desktop, bottom sheet on mobile) */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-stretch sm:justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-200"
            onClick={() => setIsDrawerOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Panel */}
          <div className="relative w-full sm:w-[440px] max-h-[88vh] sm:max-h-full bg-card border-t sm:border-t-0 sm:border-l border-border rounded-t-3xl sm:rounded-none shadow-2xl flex flex-col z-10 animate-in slide-in-from-bottom sm:slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between bg-card shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#C9A66B]/15 text-[#8C6226] dark:text-[#E5CBA2] flex items-center justify-center">
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">All Filters</h3>
                  <p className="text-xs text-muted">
                    {activeFilterCount > 0 ? `${activeFilterCount} active filters selected` : "Filter smartphones by brand, specs & price"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="text-xs text-[#8C6226] dark:text-[#E5CBA2] hover:text-[#B8914A] font-semibold px-2.5 py-1 rounded-full hover:bg-tile transition-colors cursor-pointer"
                  >
                    Reset
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-1.5 rounded-full text-muted hover:text-foreground hover:bg-tile transition-colors cursor-pointer"
                  aria-label="Close filters drawer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Drawer Scrollable Body */}
            <div className="p-5 space-y-6 overflow-y-auto flex-1 scrollbar-thin">
              {/* Brand Filter */}
              <div id="drawer-brand-section" className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground block">Brand</span>
                  <span className="text-[11px] text-muted">{selectedBrandList.length > 0 ? `${selectedBrandList.length} selected` : "All"}</span>
                </div>
                <div className="space-y-1 max-h-52 overflow-y-auto pr-1 scrollbar-thin">
                  {FAMOUS_BRANDS.map((brand) => {
                    const isSelected = brand === "All Mobiles" 
                      ? selectedBrand === "All Mobiles"
                      : selectedBrandList.some((b) => b.toLowerCase() === brand.toLowerCase());

                    return (
                      <button
                        key={brand}
                        type="button"
                        onClick={() => handleBrandToggle(brand)}
                        className={`w-full text-left px-3 py-1.5 rounded-full text-xs transition-all duration-200 flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? "bg-[#C9A66B] dark:bg-[#D4B483] text-[#FFFCFA] font-semibold shadow-xs"
                            : "text-muted hover:text-foreground hover:bg-[#C9A66B]/10"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          {brand !== "All Mobiles" && (
                            <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
                              isSelected ? "bg-black/20 text-[#FFFCFA]" : "bg-tile text-muted"
                            }`}>
                              {BRAND_BADGES[brand] || brand.charAt(0)}
                            </span>
                          )}
                          <span>{brand}</span>
                        </span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-[#FFFCFA] shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Price Slider */}
              <div className="space-y-2 pt-4 border-t border-border">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">Max Price</span>
                  <span className="text-xs font-bold text-[#8C6226] dark:text-[#E5CBA2]">
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
                <div className="flex justify-between text-[11px] text-muted font-mono">
                  <span>₹10,000</span>
                  <span>₹1,00,000</span>
                  <span>₹2,00,000</span>
                </div>
              </div>

              {/* RAM Filter */}
              <div className="space-y-2 pt-4 border-t border-border">
                <span className="text-xs font-bold text-foreground block">RAM Capacity</span>
                <div className="flex flex-wrap gap-1.5">
                  {RAM_OPTIONS.map((ram) => {
                    const isSelected = selectedRamList.some((r) => r.toLowerCase() === ram.toLowerCase()) || (ram === "All" && !isRamActive);
                    return (
                      <button
                        key={ram}
                        type="button"
                        onClick={() => handleRamToggle(ram)}
                        className={`px-3 py-1.5 text-xs rounded-full font-medium transition-all duration-200 cursor-pointer ${
                          isSelected
                            ? "bg-[#C9A66B] dark:bg-[#D4B483] text-[#FFFCFA] font-semibold shadow-xs"
                            : "bg-[#C9A66B]/10 text-[#8C6226] dark:text-[#E2C799] hover:bg-[#C9A66B]/20 border border-[#C9A66B]/30"
                        }`}
                      >
                        {ram}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Storage Filter */}
              <div className="space-y-2 pt-4 border-t border-border">
                <span className="text-xs font-bold text-foreground block">Internal Storage</span>
                <div className="flex flex-wrap gap-1.5">
                  {STORAGE_OPTIONS.map((storage) => (
                    <button
                      key={storage}
                      type="button"
                      onClick={() => setSelectedStorage(storage)}
                      className={`px-3 py-1.5 text-xs rounded-full font-medium transition-all duration-200 cursor-pointer ${
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
              <div className="space-y-2 pt-4 border-t border-border">
                <span className="text-xs font-bold text-foreground block">Operating System</span>
                <div className="flex flex-wrap gap-1.5">
                  {OS_OPTIONS.map((os) => (
                    <button
                      key={os}
                      type="button"
                      onClick={() => setSelectedOS(os)}
                      className={`px-3 py-1.5 text-xs rounded-full font-medium transition-all duration-200 cursor-pointer ${
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
              <div className="space-y-2 pt-4 border-t border-border">
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
                        <Check className="w-3.5 h-3.5 text-[#FFFCFA] shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* 5G Support Filter */}
              <div className="space-y-2 pt-4 border-t border-border">
                <span className="text-xs font-bold text-foreground block">Cellular Network</span>
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
              <div className="pt-4 border-t border-border">
                <label className="flex items-center gap-2 text-xs text-muted hover:text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={inStockOnly}
                    onChange={(e) => setInStockOnly(e.target.checked)}
                    className="rounded border-border text-[#C9A66B] focus:ring-[#C9A66B]"
                  />
                  <span className="font-medium text-foreground">In Stock Devices Only</span>
                </label>
              </div>
            </div>

            {/* Drawer Footer with Apply & Reset */}
            <div className="p-4 border-t border-border bg-card flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={handleResetFilters}
                className="flex-1 py-2.5 px-4 rounded-xl border border-border bg-tile hover:bg-tile/80 text-foreground text-xs font-semibold transition-colors cursor-pointer"
              >
                Reset All
              </button>
              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className="flex-2 py-2.5 px-4 rounded-xl bg-[#C9A66B] dark:bg-[#D4B483] hover:bg-[#B8914A] dark:hover:bg-[#C49A5A] text-[#FFFCFA] text-xs font-bold transition-colors shadow-sm cursor-pointer"
              >
                Show {filteredProducts.length} Phones
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Product Grid: Full width beside vertical sidebar */}
      <div className="space-y-4">
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
      </div>
    </div>
  );
}
