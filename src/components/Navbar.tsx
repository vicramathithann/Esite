"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { 
  Search, 
  ShoppingBag, 
  Layers, 
  ShieldCheck, 
  ChevronDown,
  Heart,
  Menu
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

const BRANDS = [
  "Apple", "Samsung", "Google Pixel", "OnePlus", "Xiaomi", 
  "Redmi", "Realme", "Vivo", "Oppo", "Motorola", "Nothing", 
  "Sony", "Asus", "iQOO", "Tecno", "Nokia"
];

function BrandSubNav() {
  const searchParams = useSearchParams();
  const brandParam = searchParams.get("brand");
  const isAllPhones = !brandParam || brandParam === "All Mobiles" || brandParam === "All Phones";

  return (
    <div className="bg-card/90 border-t border-border px-4 sm:px-6 lg:px-8 py-2 flex items-center justify-between text-xs overflow-x-auto scrollbar-none">
      <div className="max-w-[1280px] mx-auto w-full flex items-center justify-between gap-3">
        <div className="flex items-center gap-1 shrink-0">
          <Link 
            href="/" 
            prefetch={false}
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
                prefetch={false}
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
}

export default function Navbar() {
  const pathname = usePathname();

  // Completely exclude Storefront navigation and header from all Admin routes
  if (pathname?.startsWith("/admin")) {
    return null;
  }

  const router = useRouter();
  const { 
    currentUser,
    logout,
    cartCount, 
    setIsCartOpen, 
    compareList,
    wishlistCount,
    siteSettings,
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
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* User Account / Sign In */}
          <div className="relative group">
            {currentUser ? (
              <div className="relative">
                <Link
                  href="/account"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-foreground hover:text-accent hover:bg-tile rounded-full transition-all duration-200 font-medium"
                >
                  <div className="w-5 h-5 rounded-full bg-foreground text-background flex items-center justify-center text-[10px] font-semibold">
                    {currentUser.name ? currentUser.name[0].toUpperCase() : "U"}
                  </div>
                  <span className="hidden md:inline max-w-[80px] truncate">
                    {currentUser.name.split(" ")[0]}
                  </span>
                  <ChevronDown className="w-3 h-3 text-muted" />
                </Link>

                {/* Dropdown Menu */}
                <div className="hidden group-hover:block absolute right-0 top-full mt-1 w-56 bg-card text-foreground shadow-2xl border border-border rounded-2xl py-2 z-50 text-xs">
                  <div className="px-4 py-2 border-b border-border text-muted">
                    Signed in as <span className="text-foreground block truncate font-medium">{currentUser.email}</span>
                  </div>
                  <Link href="/account" className="block px-4 py-2 hover:bg-tile text-foreground hover:text-accent transition-colors">
                    Account & Profile
                  </Link>
                  <Link href="/account/warranties" className="block px-4 py-2 hover:bg-tile text-foreground hover:text-accent transition-colors">
                    Device Warranties
                  </Link>
                  <Link href="/account/wishlist" className="block px-4 py-2 hover:bg-tile text-foreground hover:text-accent transition-colors">
                    Wishlist {wishlistCount > 0 && `(${wishlistCount})`}
                  </Link>
                  <Link href="/orders" className="block px-4 py-2 hover:bg-tile text-foreground hover:text-accent transition-colors">
                    Orders & Tracking
                  </Link>
                  {currentUser.role === "ADMIN" && (currentUser.email || "").toLowerCase() === "rrroyce20@gmail.com" && (
                    <Link
                      href="/admin"
                      className="block px-4 py-2 text-[#8C6226] dark:text-[#E5CBA2] bg-[#C9A66B]/10 hover:bg-[#C9A66B]/20 font-semibold flex items-center gap-1.5 border-t border-border"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-[#C9A66B]" /> Admin Portal
                    </Link>
                  )}
                  <button
                    onClick={logout}
                    className="w-full text-left px-4 py-2 hover:bg-[#C9A66B]/15 text-[#8C6226] dark:text-[#D4B483] font-medium border-t border-border mt-1 cursor-pointer transition-colors"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            ) : (
              <Link
                href="/login"
                className="px-3 py-1.5 text-xs font-semibold text-[#8C6226] dark:text-[#E2C799] bg-[#C9A66B]/10 hover:bg-[#C9A66B]/20 border border-[#C9A66B]/30 rounded-full transition-all duration-200"
              >
                Sign In
              </Link>
            )}
          </div>

          {/* Compare Link (Controllable by Admin) */}
          {siteSettings.showCompare === "true" && (
            <Link
              href="/compare"
              className="relative p-2 text-muted hover:text-[#8C6226] dark:hover:text-[#D4B483] hover:bg-[#C9A66B]/15 rounded-full transition-all duration-200"
              title="Compare Mobiles"
            >
              <Layers className="w-4 h-4" />
              {compareList.length > 0 && (
                <span className="absolute top-0.5 right-0.5 bg-[#C9A66B] dark:bg-[#D4B483] text-[#FFFCFA] text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center ring-2 ring-card shadow-2xs">
                  {compareList.length}
                </span>
              )}
            </Link>
          )}

          {/* Wishlist Link (Controllable by Admin) */}
          {siteSettings.showWishlist === "true" && (
            <Link
              href="/account/wishlist"
              className="relative p-2 text-muted hover:text-[#8C6226] dark:hover:text-[#D4B483] hover:bg-[#C9A66B]/15 rounded-full transition-all duration-200"
              title="Wishlist"
            >
              <Heart className="w-4 h-4" />
              {wishlistCount > 0 && (
                <span className="absolute top-0.5 right-0.5 bg-[#C9A66B] dark:bg-[#D4B483] text-[#FFFCFA] text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center ring-2 ring-card shadow-2xs">
                  {wishlistCount}
                </span>
              )}
            </Link>
          )}

          {/* Slide-in Mini Cart Trigger */}
          <button
            onClick={() => setIsCartOpen(true)}
            className="relative p-2 text-foreground hover:text-[#8C6226] dark:hover:text-[#D4B483] hover:bg-[#C9A66B]/15 rounded-full transition-all duration-200 cursor-pointer flex items-center gap-1.5"
            title="Shopping Cart"
          >
            <ShoppingBag className="w-4 h-4" />
            {cartCount > 0 && (
              <span className="bg-[#C9A66B] dark:bg-[#D4B483] text-[#FFFCFA] text-[10px] font-semibold px-1.5 py-0.2 rounded-full min-w-4 text-center shadow-2xs">
                {cartCount}
              </span>
            )}
          </button>

          {/* Theme Toggle (Light / Dark / System 3-segment switcher) */}
          <div className="ml-1 shrink-0">
            <ThemeToggle />
          </div>
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