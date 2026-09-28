"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { 
  MapPin, 
  Search, 
  ShoppingBag, 
  Menu, 
  Layers, 
  MessageSquareText, 
  ShieldCheck, 
  ChevronDown 
} from "lucide-react";
import { formatINR } from "@/lib/formatters";

export default function Navbar() {
  const router = useRouter();
  const { 
    currentUser,
    logout,
    cartCount, 
    setIsCartOpen, 
    unreadSmsCount, 
    setIsSmsDrawerOpen, 
    compareList 
  } = useApp();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All Mobiles");

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push(`/`);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full text-white">
      {/* Primary Top Bar (Amazon Dark Navy #131921) */}
      <div className="bg-[#131921] px-3 sm:px-4 py-2 flex items-center justify-between gap-3 text-sm">
        {/* VM Mobiles Logo */}
        <Link 
          href="/" 
          className="flex items-center gap-1 p-1 hover:outline hover:outline-1 hover:outline-white rounded-xs shrink-0"
        >
          <div className="flex flex-col items-start leading-none">
            <div className="flex items-baseline">
              <span className="text-2xl font-black tracking-tight text-white">
                vm<span className="text-[#febd69]">mobiles</span>
              </span>
              <span className="text-[11px] text-[#febd69] font-bold">.in</span>
            </div>
            {/* Amazon-style smile line */}
            <div className="w-16 h-1 bg-gradient-to-r from-transparent via-[#febd69] to-transparent rounded-full -mt-0.5" />
          </div>
        </Link>

        {/* Deliver to Location (Amazon Pin) */}
        <div className="hidden lg:flex items-center gap-1.5 p-1 hover:outline hover:outline-1 hover:outline-white rounded-xs cursor-pointer text-xs">
          <MapPin className="w-4 h-4 text-white mt-1 shrink-0" />
          <div className="leading-tight">
            <span className="text-[11px] text-gray-300 block">
              Deliver to {currentUser?.name ? currentUser.name.split(" ")[0] : "Vicram"}
            </span>
            <span className="font-bold text-white block">Bengaluru 560038</span>
          </div>
        </div>

        {/* Amazon-Style Search Bar */}
        <form 
          onSubmit={handleSearchSubmit} 
          className="flex-1 max-w-3xl flex items-center h-10 rounded-md overflow-hidden focus-within:ring-3 focus-within:ring-[#f3a847]"
        >
          {/* Category Dropdown */}
          <div className="hidden sm:flex items-center bg-[#f3f3f3] hover:bg-[#dadada] text-[#0f1111] px-2.5 h-full text-xs font-normal border-r border-gray-300 cursor-pointer">
            <span>{selectedCategory}</span>
            <ChevronDown className="w-3 h-3 ml-1 text-gray-600" />
          </div>

          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search brand + model: iPhone 16 Pro, Samsung S24 Ultra, OnePlus 13..."
            className="flex-1 h-full px-3 text-sm text-[#0f1111] bg-white placeholder-gray-500 focus:outline-none"
          />

          <button
            type="submit"
            className="bg-[#febd69] hover:bg-[#f3a847] h-full px-4.5 flex items-center justify-center text-[#131921] transition-colors"
          >
            <Search className="w-5 h-5 stroke-[2.5]" />
          </button>
        </form>

        {/* Right Section: Language, Account, Orders, SMS Alerts, Cart */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* User Account / Sign In */}
          <div className="relative group">
            {currentUser ? (
              <div className="relative">
                <Link
                  href="/account"
                  className="flex flex-col p-1 hover:outline hover:outline-1 hover:outline-white rounded-xs text-left leading-tight cursor-pointer block"
                >
                  <span className="text-[11px] text-gray-300">Hello, {currentUser.name.split(" ")[0]}</span>
                  <span className="text-xs font-bold text-white flex items-center gap-0.5">
                    Account <ChevronDown className="w-3 h-3 text-gray-400" />
                  </span>
                </Link>

                {/* Dropdown Menu */}
                <div className="hidden group-hover:block absolute right-0 top-full mt-1 w-48 bg-white text-[#0f1111] shadow-xl border border-gray-200 rounded-sm py-2 z-50 text-xs">
                  <div className="px-3 py-1.5 border-b border-gray-100 font-bold text-gray-700">
                    Signed in as <span className="text-[#007185] block truncate">{currentUser.email}</span>
                  </div>
                  <Link href="/account" className="block px-3 py-1.5 hover:bg-gray-100 font-bold text-[#007185]">
                    👤 My Account & Profile
                  </Link>
                  {currentUser.role === "ADMIN" && (
                    <Link
                      href="/admin"
                      className="block px-3 py-2 font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 flex items-center gap-1.5"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-600" /> Admin Control Center
                    </Link>
                  )}
                  <Link href="/orders" className="block px-3 py-1.5 hover:bg-gray-100">
                    Your Orders & Tracking
                  </Link>
                  <button
                    onClick={logout}
                    className="w-full text-left px-3 py-1.5 hover:bg-gray-100 text-red-600 font-medium border-t border-gray-100 mt-1 cursor-pointer"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            ) : (
              <Link
                href="/login"
                className="flex flex-col p-1 hover:outline hover:outline-1 hover:outline-white rounded-xs text-left leading-tight"
              >
                <span className="text-[11px] text-gray-300">Hello, sign in</span>
                <span className="text-xs font-bold text-white flex items-center gap-0.5">
                  Account & Lists <ChevronDown className="w-3 h-3 text-gray-400" />
                </span>
              </Link>
            )}
          </div>

          {/* Returns & Orders */}
          <Link
            href="/orders"
            className="flex flex-col p-1 hover:outline hover:outline-1 hover:outline-white rounded-xs text-left leading-tight"
          >
            <span className="text-[11px] text-gray-300">Returns</span>
            <span className="text-xs font-bold text-white">& Orders</span>
          </Link>

          {/* Admin Portal Direct Link */}
          <Link
            href="/admin"
            className="hidden md:flex items-center gap-1 px-2 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-[#febd69] border border-[#febd69]/40 rounded-xs text-xs font-bold transition-colors"
            title="Open Admin Control Center"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#febd69]" />
            <span>Admin</span>
          </Link>

          {/* Compare Mobiles */}
          <Link
            href="/compare"
            className="hidden sm:flex items-center gap-1 p-1 hover:outline hover:outline-1 hover:outline-white rounded-xs text-xs font-bold text-gray-200"
          >
            <Layers className="w-4 h-4 text-[#febd69]" />
            <span>Compare</span>
            {compareList.length > 0 && (
              <span className="bg-[#febd69] text-[#131921] text-[10px] font-black px-1.5 rounded-full">
                {compareList.length}
              </span>
            )}
          </Link>

          {/* Buyer SMS Alerts Drawer */}
          <button
            onClick={() => setIsSmsDrawerOpen(true)}
            className="relative flex items-center gap-1 p-1 hover:outline hover:outline-1 hover:outline-white rounded-xs text-left cursor-pointer"
            title="Open Buyer SMS Alerts"
          >
            <div className="relative">
              <MessageSquareText className="w-6 h-6 text-[#febd69]" />
              {unreadSmsCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#cc0c39] text-white text-[10px] font-black px-1 rounded-full animate-pulse">
                  {unreadSmsCount}
                </span>
              )}
            </div>
            <div className="hidden xl:flex flex-col leading-tight">
              <span className="text-[11px] text-gray-300">Buyer SMS</span>
              <span className="text-xs font-bold text-white">Alerts</span>
            </div>
          </button>

          {/* Cart Icon */}
          <button
            onClick={() => setIsCartOpen(true)}
            className="flex items-center gap-1 p-1 hover:outline hover:outline-1 hover:outline-white rounded-xs cursor-pointer text-white"
          >
            <div className="relative flex items-center">
              <ShoppingBag className="w-7 h-7 text-[#febd69]" />
              <span className="absolute top-1 left-2.5 text-[#131921] font-black text-xs">
                {cartCount}
              </span>
            </div>
            <span className="font-bold text-xs hidden sm:inline text-[#febd69]">Cart</span>
          </button>
        </div>
      </div>

      {/* Sub-Navigation Bar (Amazon Sub-Navy #232f3e) */}
      <div className="bg-[#232f3e] px-4 py-1.5 flex items-center justify-between text-xs font-medium overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-4 shrink-0">
          <Link 
            href="/" 
            prefetch={false}
            onClick={() => {
              setSelectedCategory("All Mobiles");
              if (typeof window !== "undefined") {
                window.scrollTo({ top: 0, behavior: "smooth" });
              }
            }}
            className="flex items-center gap-1 p-1 hover:outline hover:outline-1 hover:outline-white rounded-xs font-bold"
          >
            <Menu className="w-4 h-4" />
            <span>All Mobiles</span>
          </Link>
          <Link href="/?brand=Apple" prefetch={false} className="p-1 hover:outline hover:outline-1 hover:outline-white rounded-xs">
            Apple
          </Link>
          <Link href="/?brand=Samsung" prefetch={false} className="p-1 hover:outline hover:outline-1 hover:outline-white rounded-xs">
            Samsung
          </Link>
          <Link href="/?brand=Google+Pixel" prefetch={false} className="p-1 hover:outline hover:outline-1 hover:outline-white rounded-xs">
            Google Pixel
          </Link>
          <Link href="/?brand=OnePlus" prefetch={false} className="p-1 hover:outline hover:outline-1 hover:outline-white rounded-xs">
            OnePlus
          </Link>
          <Link href="/?brand=Xiaomi" prefetch={false} className="p-1 hover:outline hover:outline-1 hover:outline-white rounded-xs">
            Xiaomi
          </Link>
          <Link href="/?brand=Redmi" prefetch={false} className="p-1 hover:outline hover:outline-1 hover:outline-white rounded-xs">
            Redmi
          </Link>
          <Link href="/?brand=Realme" prefetch={false} className="p-1 hover:outline hover:outline-1 hover:outline-white rounded-xs">
            Realme
          </Link>
          <Link href="/?brand=Vivo" prefetch={false} className="p-1 hover:outline hover:outline-1 hover:outline-white rounded-xs">
            Vivo
          </Link>
          <Link href="/?brand=Oppo" prefetch={false} className="p-1 hover:outline hover:outline-1 hover:outline-white rounded-xs">
            Oppo
          </Link>
          <Link href="/?brand=Motorola" prefetch={false} className="p-1 hover:outline hover:outline-1 hover:outline-white rounded-xs">
            Motorola
          </Link>
          <Link href="/?brand=Nothing" prefetch={false} className="p-1 hover:outline hover:outline-1 hover:outline-white rounded-xs">
            Nothing
          </Link>
          <Link href="/?brand=iQOO" prefetch={false} className="p-1 hover:outline hover:outline-1 hover:outline-white rounded-xs">
            iQOO
          </Link>
          <Link href="/?brand=Sony" prefetch={false} className="p-1 hover:outline hover:outline-1 hover:outline-white rounded-xs">
            Sony
          </Link>
          <Link href="/?brand=Asus" prefetch={false} className="p-1 hover:outline hover:outline-1 hover:outline-white rounded-xs">
            Asus
          </Link>
          <Link href="/?brand=Nokia" prefetch={false} className="p-1 hover:outline hover:outline-1 hover:outline-white rounded-xs">
            Nokia
          </Link>
          <Link href="/orders" prefetch={false} className="p-1 hover:outline hover:outline-1 hover:outline-white rounded-xs text-[#febd69] font-bold flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" /> Warranty & SMS Tracker
          </Link>
        </div>

        <div className="hidden lg:flex items-center gap-1 text-[11px] text-gray-300 shrink-0">
          <span className="text-[#febd69] font-bold">VM Prime:</span> Free Delivery & SMS Alerts on All Orders
        </div>
      </div>
    </header>
  );
}