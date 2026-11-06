"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  User,
  ShieldCheck,
  Heart,
  Package,
  ShoppingBag,
  Layers,
  Menu,
  X,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { useApp } from "@/context/AppContext";

export interface AccountNavRoute {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  match: (pathname: string) => boolean;
}

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname() || "";
  const { currentUser, logout, wishlist, cartCount, compareList } = useApp();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileDrawerOpen(false);
  }, [pathname]);

  const navItems: AccountNavRoute[] = [
    {
      label: "Account & Profile",
      href: "/account",
      icon: User,
      match: (p) => p === "/account" || p.startsWith("/account/profile"),
    },
    {
      label: "Device Warranties",
      href: "/account/warranties",
      icon: ShieldCheck,
      match: (p) => p.startsWith("/account/warranties"),
    },
    {
      label: "Wishlist",
      href: "/account/wishlist",
      icon: Heart,
      badge: wishlist?.length || 0,
      match: (p) => p.startsWith("/account/wishlist"),
    },
    {
      label: "Orders",
      href: "/orders",
      icon: Package,
      match: (p) => p.startsWith("/orders") || p.startsWith("/account/orders"),
    },
    {
      label: "Shopping Cart",
      href: "/cart",
      icon: ShoppingBag,
      badge: cartCount || 0,
      match: (p) => p.startsWith("/cart"),
    },
    {
      label: "Compare Mobiles",
      href: "/compare",
      icon: Layers,
      badge: compareList?.length || 0,
      match: (p) => p.startsWith("/compare"),
    },
  ];

  const activeItem = navItems.find((item) => item.match(pathname)) || navItems[0];

  return (
    <div className="min-h-screen bg-[#0B1220] text-[#E5E7EB]">
      {/* Mobile Top Navigation Bar (visible on < lg screens) */}
      <div className="lg:hidden sticky top-0 z-40 bg-[#121B2E] border-b border-[#1F2A44] px-4 py-3 flex items-center justify-between shadow-md">
        <button
          onClick={() => setMobileDrawerOpen(true)}
          className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-[#0B1220] border border-[#1F2A44] text-[#E5E7EB] hover:border-[#C9A56A]/50 hover:text-[#C9A56A] transition-colors text-xs font-semibold"
          aria-label="Open Account Menu"
        >
          <Menu className="w-4 h-4 text-[#C9A56A]" />
          <span>Account Menu</span>
        </button>

        <div className="flex items-center gap-2 text-xs font-medium text-[#94A3B8]">
          <span className="truncate max-w-[160px] text-[#E5E7EB] font-semibold">
            {activeItem.label}
          </span>
        </div>
      </div>

      {/* Mobile Slide-in Drawer */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileDrawerOpen(false)}
          />

          {/* Drawer Panel */}
          <div className="fixed inset-y-0 left-0 z-50 w-72 bg-[#121B2E] border-r border-[#1F2A44] p-5 flex flex-col justify-between shadow-2xl animate-in slide-in-from-left duration-200">
            <div>
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-4 border-b border-[#1F2A44] mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-[#C9A56A] text-[#0B1220] flex items-center justify-center font-black text-xs shadow-xs">
                    VN
                  </div>
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-[#C9A56A]">
                      Account Hub
                    </div>
                    <div className="text-sm font-semibold text-[#E5E7EB] truncate max-w-[140px]">
                      {currentUser?.name || "Customer"}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setMobileDrawerOpen(false)}
                  className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#E5E7EB] hover:bg-[#1F2A44] transition-colors"
                  aria-label="Close Account Menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation Items */}
              <nav className="space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = item.match(pathname);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      prefetch={true}
                      onClick={() => setMobileDrawerOpen(false)}
                      className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                        isActive
                          ? "bg-[#C9A56A]/15 text-[#C9A56A] border-l-4 border-[#C9A56A] font-semibold"
                          : "text-[#94A3B8] hover:text-[#E5E7EB] hover:bg-[#0B1220] border-l-4 border-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-[#C9A56A]" : "text-[#94A3B8]"}`} />
                        <span>{item.label}</span>
                      </div>
                      {typeof item.badge === "number" && item.badge > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#C9A56A] text-[#0B1220]">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Drawer Footer */}
            {currentUser && (
              <div className="pt-4 border-t border-[#1F2A44]">
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Container: Fixed Desktop Sidebar (Left) + Page Content (Right) */}
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="flex flex-col lg:flex-row items-start gap-6 lg:gap-8">
          {/* Desktop Vertical Sidebar: Fixed 240px, Sticky */}
          <aside className="hidden lg:block w-[240px] shrink-0 sticky top-24 self-start">
            <div className="bg-[#121B2E] border border-[#1F2A44] rounded-2xl p-4 shadow-lg space-y-4">
              {/* User Brief Card */}
              <div className="pb-4 border-b border-[#1F2A44]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#C9A56A] text-[#0B1220] flex items-center justify-center text-sm font-black shadow-xs shrink-0">
                    {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : "U"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-[#E5E7EB] truncate">
                      {currentUser?.name || "Customer Account"}
                    </div>
                    <div className="text-[11px] text-[#94A3B8] truncate">
                      {currentUser?.email || "Guest Shopper"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Sidebar Navigation */}
              <nav className="space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = item.match(pathname);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      prefetch={true}
                      className={`group flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                        isActive
                          ? "bg-[#C9A56A]/15 text-[#C9A56A] border-l-4 border-[#C9A56A] font-semibold"
                          : "text-[#94A3B8] hover:text-[#E5E7EB] hover:bg-[#0B1220] border-l-4 border-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`w-4 h-4 shrink-0 transition-transform duration-200 group-hover:scale-110 ${isActive ? "text-[#C9A56A]" : "text-[#94A3B8] group-hover:text-[#E5E7EB]"}`} />
                        <span>{item.label}</span>
                      </div>
                      {typeof item.badge === "number" && item.badge > 0 && (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isActive
                            ? "bg-[#C9A56A] text-[#0B1220]"
                            : "bg-[#1F2A44] text-[#E5E7EB] group-hover:bg-[#C9A56A] group-hover:text-[#0B1220] transition-colors"
                        }`}>
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>

              {/* Quick Logout if Logged In */}
              {currentUser && (
                <div className="pt-3 border-t border-[#1F2A44]">
                  <button
                    onClick={logout}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-medium text-[#94A3B8] hover:text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors"
                  >
                    <LogOut className="w-4 h-4 shrink-0" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </aside>

          {/* Page Content (Right) */}
          <main className="flex-1 min-w-0 w-full">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
