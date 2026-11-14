"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LayoutGrid, Heart, ShoppingBag, User } from "lucide-react";
import { useApp } from "@/context/AppContext";

export default function BottomTabBar() {
  const pathname = usePathname() || "";
  const { wishlist, cartCount, currentUser, setIsCartOpen, setIsUserSidebarOpen } = useApp();

  // Hide on admin routes, checkout page, and product detail pages with sticky buy bars
  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/checkout") ||
    pathname.startsWith("/mobile/") ||
    pathname.startsWith("/products/")
  ) {
    return null;
  }

  const isHome = pathname === "/";
  const isCategories = pathname === "/categories" || pathname.startsWith("/?brand=");
  const isWishlist = pathname.startsWith("/account/wishlist");
  const isCart = pathname.startsWith("/cart");
  const isAccount = pathname.startsWith("/account") && !isWishlist;

  const wishlistCount = wishlist?.length || 0;
  const totalCartCount = cartCount || 0;

  return (
    <nav
      aria-label="Mobile Bottom Navigation"
      className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t border-border shadow-lg transition-transform duration-200"
      style={{
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <div className="h-14 grid grid-cols-5 items-center px-1">
        {/* 1. Home */}
        <Link
          href="/"
          className={`flex flex-col items-center justify-center h-full py-1 min-h-[44px] transition-colors select-none ${
            isHome
              ? "text-[#C9A66B] dark:text-[#D4B483] font-bold"
              : "text-muted hover:text-foreground font-medium"
          }`}
        >
          <Home className={`w-5 h-5 mb-0.5 ${isHome ? "stroke-[2.5]" : "stroke-[1.8]"}`} />
          <span className="text-[10px] tracking-tight">Home</span>
        </Link>

        {/* 2. Categories / Brands */}
        <Link
          href="/#brand-categories"
          onClick={() => {
            if (isHome) {
              const el = document.getElementById("brand-categories");
              el?.scrollIntoView({ behavior: "smooth" });
            }
          }}
          className={`flex flex-col items-center justify-center h-full py-1 min-h-[44px] transition-colors select-none ${
            isCategories
              ? "text-[#C9A66B] dark:text-[#D4B483] font-bold"
              : "text-muted hover:text-foreground font-medium"
          }`}
        >
          <LayoutGrid className={`w-5 h-5 mb-0.5 ${isCategories ? "stroke-[2.5]" : "stroke-[1.8]"}`} />
          <span className="text-[10px] tracking-tight">Categories</span>
        </Link>

        {/* 3. Wishlist */}
        <Link
          href="/account/wishlist"
          className={`flex flex-col items-center justify-center h-full py-1 min-h-[44px] relative transition-colors select-none ${
            isWishlist
              ? "text-[#C9A66B] dark:text-[#D4B483] font-bold"
              : "text-muted hover:text-foreground font-medium"
          }`}
        >
          <div className="relative">
            <Heart className={`w-5 h-5 mb-0.5 ${isWishlist ? "stroke-[2.5] fill-[#C9A66B]/20" : "stroke-[1.8]"}`} />
            {wishlistCount > 0 && (
              <span className="absolute -top-1 -right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center shadow-xs">
                {wishlistCount > 99 ? "99+" : wishlistCount}
              </span>
            )}
          </div>
          <span className="text-[10px] tracking-tight">Wishlist</span>
        </Link>

        {/* 4. Cart */}
        <button
          type="button"
          onClick={() => setIsCartOpen(true)}
          className={`flex flex-col items-center justify-center h-full py-1 min-h-[44px] relative transition-colors select-none cursor-pointer ${
            isCart
              ? "text-[#C9A66B] dark:text-[#D4B483] font-bold"
              : "text-muted hover:text-foreground font-medium"
          }`}
        >
          <div className="relative">
            <ShoppingBag className={`w-5 h-5 mb-0.5 ${isCart ? "stroke-[2.5]" : "stroke-[1.8]"}`} />
            {totalCartCount > 0 && (
              <span className="absolute -top-1 -right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-[#C9A66B] dark:bg-[#D4B483] text-[#FFFCFA] text-[9px] font-bold flex items-center justify-center shadow-xs">
                {totalCartCount > 99 ? "99+" : totalCartCount}
              </span>
            )}
          </div>
          <span className="text-[10px] tracking-tight">Cart</span>
        </button>

        {/* 5. Account */}
        <Link
          href={currentUser ? "/account" : "/login"}
          className={`flex flex-col items-center justify-center h-full py-1 min-h-[44px] transition-colors select-none ${
            isAccount
              ? "text-[#C9A66B] dark:text-[#D4B483] font-bold"
              : "text-muted hover:text-foreground font-medium"
          }`}
        >
          <User className={`w-5 h-5 mb-0.5 ${isAccount ? "stroke-[2.5]" : "stroke-[1.8]"}`} />
          <span className="text-[10px] tracking-tight">{currentUser ? "Account" : "Sign In"}</span>
        </Link>
      </div>
    </nav>
  );
}
