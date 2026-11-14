"use client";

import React, { useState, useEffect, Suspense, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { 
  Search, 
  Menu,
  Heart,
  ShoppingBag,
  X,
  Smartphone
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import SearchOverlay from "@/components/SearchOverlay";
import MobileDrawer from "@/components/MobileDrawer";

const BRANDS = [
  "Apple", "Samsung", "Google Pixel", "OnePlus", "Xiaomi", 
  "Redmi", "Realme", "Vivo", "Oppo", "Motorola", "Nothing", 
  "Sony", "Asus", "iQOO", "Tecno", "Nokia"
];

const BRAND_INITIALS: Record<string, string> = {
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

// Desktop/Tablet Brand Sub-Navigation (stays exactly as is inside desktop header)
const DesktopBrandSubNav = React.memo(function DesktopBrandSubNav() {
  const searchParams = useSearchParams();
  const brandParam = searchParams.get("brand");
  const isAllPhones = !brandParam || brandParam === "All Mobiles" || brandParam === "All Phones";

  return (
    <div className="hidden sm:flex bg-card/90 border-t border-border px-4 sm:px-6 lg:px-8 py-2 items-center text-xs overflow-x-auto scrollbar-none">
      <div className="max-w-[1280px] mx-auto w-full flex items-center">
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
      </div>
    </div>
  );
});

// Mobile Circular Brand Row (Flipkart-style category circles, non-sticky, scrolls away with page)
export const MobileBrandCircleRow = React.memo(function MobileBrandCircleRow() {
  const searchParams = useSearchParams();
  const brandParam = searchParams.get("brand");
  const isAllPhones = !brandParam || brandParam === "All Mobiles" || brandParam === "All Phones";

  return (
    <div id="brand-categories" className="sm:hidden bg-card/60 border-b border-border py-3 px-3 overflow-x-auto scrollbar-none">
      <div className="flex items-center gap-3 w-max">
        {/* All Phones Circle */}
        <Link
          href="/"
          className="flex flex-col items-center gap-1 text-center shrink-0 w-14 group"
        >
          <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
            isAllPhones 
              ? "bg-[#C9A66B] dark:bg-[#D4B483] text-[#FFFCFA] ring-2 ring-[#C9A66B]/50 shadow-xs" 
              : "bg-tile border border-border text-foreground group-active:scale-95"
          }`}>
            <Smartphone className="w-5 h-5" />
          </div>
          <span className={`text-[10px] font-semibold truncate w-full ${
            isAllPhones ? "text-[#C9A66B] dark:text-[#D4B483]" : "text-muted"
          }`}>
            All Phones
          </span>
        </Link>

        {/* Brands */}
        {BRANDS.map((b) => {
          const isActive = brandParam?.toLowerCase() === b.toLowerCase();
          const initial = BRAND_INITIALS[b] || b.charAt(0);
          return (
            <Link
              key={b}
              href={`/?brand=${encodeURIComponent(b)}`}
              className="flex flex-col items-center gap-1 text-center shrink-0 w-14 group"
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                isActive 
                  ? "bg-[#C9A66B] dark:bg-[#D4B483] text-[#FFFCFA] ring-2 ring-[#C9A66B]/50 shadow-xs" 
                  : "bg-tile border border-border text-foreground group-active:scale-95"
              }`}>
                {initial}
              </div>
              <span className={`text-[10px] font-medium truncate w-full ${
                isActive ? "text-[#C9A66B] dark:text-[#D4B483] font-semibold" : "text-muted"
              }`}>
                {b.replace("Google Pixel", "Pixel")}
              </span>
            </Link>
          );
        })}
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
    wishlist,
    cartCount,
    setIsCartOpen
  } = useApp();

  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOverlayOpen, setIsSearchOverlayOpen] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [isAnnouncementDismissed, setIsAnnouncementDismissed] = useState(false);
  const headerRef = React.useRef<HTMLElement | null>(null);

  const isHome = pathname === "/";
  const wishlistCount = wishlist?.length || 0;
  const totalCartCount = cartCount || 0;

  useEffect(() => {
    const updateHeaderOffset = () => {
      if (headerRef.current) {
        const height = headerRef.current.getBoundingClientRect().height;
        document.documentElement.style.setProperty("--header-height", `${height}px`);
        // On phone (<= 640px), --header-offset matches exact header height so sticky elements dock flush.
        // On desktop, retain +16px offset for desktop sidebar aesthetics.
        const isPhone = window.innerWidth <= 640;
        document.documentElement.style.setProperty(
          "--header-offset", 
          isPhone ? `${height}px` : `${height + 16}px`
        );
      }
    };

    updateHeaderOffset();

    const ro = new ResizeObserver(updateHeaderOffset);
    if (headerRef.current) {
      ro.observe(headerRef.current);
    }
    window.addEventListener("resize", updateHeaderOffset);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", updateHeaderOffset);
    };
  }, [siteSettings.showAnnouncement, isAnnouncementDismissed, isHome, pathname]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push(`/`);
    }
  };

  return (
    <>
      {/* 1. Mobile Non-Sticky Announcement Strip (Phone only: single line, 12px, dismissible, scrolls away) */}
      {siteSettings.showAnnouncement === "true" && !isAnnouncementDismissed && (
        <div className="sm:hidden bg-[#C9A66B]/15 dark:bg-[#D4B483]/10 border-b border-[#C9A66B]/20 py-1.5 px-3 flex items-center justify-between text-[11px] font-semibold text-[#8C6226] dark:text-[#E5CBA2]">
          <div className="flex items-center gap-1.5 truncate">
            <span className="shrink-0">⚡</span>
            <span className="truncate">{siteSettings.announcementText || "Free Express Delivery across India | 1-Year Brand Warranty"}</span>
          </div>
          <button
            type="button"
            onClick={() => setIsAnnouncementDismissed(true)}
            className="p-1 -mr-1 text-[#8C6226] dark:text-[#E5CBA2] opacity-75 hover:opacity-100 cursor-pointer shrink-0"
            aria-label="Dismiss announcement"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 2. Main Sticky Header */}
      <header 
        ref={headerRef}
        className="sticky top-0 z-40 w-full backdrop-blur-md bg-card/90 border-b border-border transition-all duration-200"
      >
        {/* Desktop Sticky Announcement Bar (Kept exactly as is for tablet/laptop) */}
        {siteSettings.showAnnouncement === "true" && (
          <div className="hidden sm:flex bg-[#C9A66B]/15 dark:bg-[#D4B483]/10 border-b border-[#C9A66B]/20 py-1.5 px-4 text-center text-[11px] font-semibold text-[#8C6226] dark:text-[#E5CBA2] items-center justify-center gap-1.5">
            <span>{siteSettings.announcementText || "⚡ Free Express Delivery across India | 1-Year Official Brand Warranty"}</span>
          </div>
        )}

        {/* Primary Top Bar (56px on phone, 64px on laptop) */}
        <div className="max-w-[1280px] mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
          {/* Left: Mobile Hamburger OR Desktop Logo */}
          <div className="flex items-center gap-2">
            {/* Phone Hamburger Button (opens drawer) */}
            <button
              type="button"
              onClick={() => setIsMobileDrawerOpen(true)}
              className="sm:hidden w-10 h-10 -ml-1 rounded-full text-foreground hover:bg-tile active:bg-tile/80 flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Open menu drawer"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Brand Logo */}
            <Link 
              href="/" 
              className="flex items-center gap-2 group shrink-0 focus:outline-none"
            >
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-foreground text-background flex items-center justify-center font-bold text-xs tracking-tighter transition-all duration-200 group-hover:scale-105">
                VN
              </div>
              <span className="text-sm sm:text-base font-bold tracking-tight text-foreground">
                VN <span className="text-muted font-normal">Mobiles</span>
              </span>
            </Link>
          </div>

          {/* Desktop Search Bar (Hidden on phone, active on tablet/laptop) */}
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
            {/* Phone Top Icons: Search, Wishlist, Cart */}
            <div className="flex sm:hidden items-center gap-0.5">
              {/* Search button */}
              <button
                type="button"
                onClick={() => setIsSearchOverlayOpen(true)}
                className="w-10 h-10 rounded-full flex items-center justify-center text-foreground hover:bg-tile active:bg-tile/80 transition-colors cursor-pointer"
                aria-label="Search smartphones"
              >
                <Search className="w-5 h-5" />
              </button>

              {/* Wishlist button */}
              <Link
                href="/account/wishlist"
                className="w-10 h-10 rounded-full flex items-center justify-center text-foreground hover:bg-tile active:bg-tile/80 relative transition-colors"
                aria-label="Wishlist"
              >
                <Heart className="w-5 h-5" />
                {wishlistCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 min-w-[15px] h-3.5 px-0.5 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">
                    {wishlistCount}
                  </span>
                )}
              </Link>

              {/* Cart button */}
              <button
                type="button"
                onClick={() => setIsCartOpen(true)}
                className="w-10 h-10 rounded-full flex items-center justify-center text-foreground hover:bg-tile active:bg-tile/80 relative transition-colors cursor-pointer"
                aria-label="Open cart"
              >
                <ShoppingBag className="w-5 h-5" />
                {totalCartCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 min-w-[15px] h-3.5 px-0.5 rounded-full bg-[#C9A66B] dark:bg-[#D4B483] text-[#FFFCFA] text-[9px] font-bold flex items-center justify-center shadow-xs">
                    {totalCartCount}
                  </span>
                )}
              </button>
            </div>

            {/* Desktop Theme Toggle & Menu (stays exact on laptop/tablet) */}
            <div className="hidden sm:flex items-center gap-2">
              <ThemeToggle />
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
        </div>

        {/* 3. Sticky Full-Width Search Bar on Home Page (Phone only) */}
        {isHome && (
          <div className="sm:hidden px-3 pb-2.5 pt-0.5">
            <button
              type="button"
              onClick={() => setIsSearchOverlayOpen(true)}
              className="w-full h-10 px-3.5 bg-tile hover:bg-tile/80 active:bg-tile/90 border border-border rounded-full text-xs text-muted flex items-center justify-between shadow-2xs transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2 truncate">
                <Search className="w-4 h-4 text-muted shrink-0" />
                <span className="truncate">Search phones, brands (Apple, Samsung)...</span>
              </div>
            </button>
          </div>
        )}

        {/* 4. Desktop Sub-Navigation Brand Strip (Hidden on phone, exact on laptop/tablet) */}
        <Suspense fallback={null}>
          <DesktopBrandSubNav />
        </Suspense>
      </header>

      {/* Full-Screen Mobile Search Overlay */}
      <SearchOverlay 
        isOpen={isSearchOverlayOpen} 
        onClose={() => setIsSearchOverlayOpen(false)} 
      />

      {/* Mobile Drawer (opened by hamburger) */}
      <MobileDrawer
        isOpen={isMobileDrawerOpen}
        onClose={() => setIsMobileDrawerOpen(false)}
      />
    </>
  );
}
