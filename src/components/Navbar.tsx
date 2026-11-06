"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { 
  Search, 
  ShieldCheck, 
  Menu
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

const BRANDS = [
  "Apple", "Samsung", "Google Pixel", "OnePlus", "Xiaomi", 
  "Redmi", "Realme", "Vivo", "Oppo", "Motorola", "Nothing", 
  "Sony", "Asus", "iQOO", "Tecno", "Nokia"
];

const BrandSubNav = React.memo(function BrandSubNav() {
  const searchParams = useSearchParams();
  const brandParam = searchParams.get("brand");
  const isAllPhones = !brandParam || brandParam === "All Mobiles" || brandParam === "All Phones";

  return (
    <div className="bg-card/90 border-t border-border px-4 sm:px-6 lg:px-8 py-2 flex items-center justify-between text-xs overflow-x-auto scrollbar-none">
      <div className="max-w-[1280px] mx-auto w-full flex items-center justify-between gap-3">
        <div className="flex items-center gap-1 shrink-0">
          <Link 
            href="/" 
            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs transition-all duration-200 ${
              isAllPhones
                ? "font-semibold bg-[#C9A66B] dark:bg-[#D4B483] text-[#FFFCFA] shadow-xs"
                : "text-muted hover:text-foreground hover:bg-tile font-normal"
            }`}
          >
            <Menu className="w-3 h-3" />
            <span>All Phones</span>
          </Link>
          
          {BRANDS.map((b) => {
            const isActive = brandParam?.toLowerCase() === b.toLowerCase();
            return (
              <Link
                key={b}
                href={`/?brand=${encodeURIComponent(b)}`}
                className={`px-2.5 py-1 rounded-full text-xs transition-all duration-200 whitespace-nowrap ${
                  isActive
                    ? "font-semibold bg-[#C9A66B] dark:bg-[#D4B483] text-[#FFFCFA] shadow-xs"
                    : "text-muted hover:text-foreground hover:bg-tile font-normal"
                }`}
              >
                {b}
              </Link>
            );
          })}
        </div>

        <div className="hidden lg:flex items-center gap-1.5 text-[11px] text-muted shrink-0">
          <ShieldCheck className="w-3.5 h-3.5 text-accent" />
          <span>Authorized Hardware & 1-Year Brand Warranty</span>
        </div>
      </div>
    </div>
  );
});

export default function Navbar() {
  const pathname = usePathname();

  // Completely exclude Storefront navigation and header from all Admin routes
  if (pathname?.startsWith("/admin")) {
    return null;
  }

  const router = useRouter();
  const { 
    siteSettings,
    setIsUserSidebarOpen,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState("");

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push(`/`);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full backdrop-blur-md bg-card/85 border-b border-border transition-all duration-200">
      {/* Top Announcement Bar (Controllable by Admin) */}
      {siteSettings.showAnnouncement === "true" && (
        <div className="bg-[#C9A66B]/15 dark:bg-[#D4B483]/10 border-b border-[#C9A66B]/20 py-1.5 px-4 text-center text-[11px] font-semibold text-[#8C6226] dark:text-[#E5CBA2] flex items-center justify-center gap-1.5 transition-all">
          <span>{siteSettings.announcementText || "⚡ Free Express Delivery across India | 1-Year Official Brand Warranty"}</span>
        </div>
      )}

      {/* Primary Top Bar */}
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <Link 
          href="/" 
          className="flex items-center gap-2 group shrink-0 focus:outline-none"
        >
          <div className="w-8 h-8 rounded-full bg-foreground text-background flex items-center justify-center font-bold text-xs tracking-tighter transition-all duration-250 group-hover:scale-105">
            VN
          </div>
          <span className="text-base font-bold tracking-tight text-foreground">
            VN <span className="text-muted font-normal">Mobiles</span>
          </span>
        </Link>

        {/* Minimalist Search Bar with Pill Styling */}
        <form 
          onSubmit={handleSearchSubmit} 
          className="flex-1 max-w-md relative hidden sm:flex items-center"
        >
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 text-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search iPhone, Galaxy, OnePlus, Pixel..."
              className="w-full pl-9 pr-4 py-2 text-xs bg-tile hover:bg-tile/80 focus:bg-card text-foreground placeholder:text-muted rounded-full border border-border focus:border-accent focus:ring-2 focus:ring-accent/20 focus:outline-none transition-all duration-200"
            />
          </div>
        </form>

        {/* Right Navigation Section */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Theme Toggle (Light / Dark / System 3-segment switcher) */}
          <ThemeToggle />

          {/* Mobile/Tablet Menu Button to open User Navigation Sidebar Drawer */}
          <button
            type="button"
            onClick={() => setIsUserSidebarOpen(true)}
            className="lg:hidden p-2 rounded-xl text-foreground hover:bg-tile border border-border/60 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            aria-label="Open User Navigation Menu"
            title="Account Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Sub-Navigation Brand Strip */}
      <Suspense fallback={
        <div className="bg-card/90 border-t border-border px-4 sm:px-6 lg:px-8 py-2 flex items-center justify-between text-xs overflow-x-auto scrollbar-none">
          <div className="max-w-[1280px] mx-auto w-full flex items-center gap-1">
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-[#C9A66B] dark:bg-[#D4B483] text-[#FFFCFA]">
              <Menu className="w-3 h-3" />
              <span>All Phones</span>
            </span>
          </div>
        </div>
      }>
        <BrandSubNav />
      </Suspense>
    </header>
  );
}