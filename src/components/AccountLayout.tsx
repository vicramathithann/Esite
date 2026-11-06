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
  X,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Shield,
  LogIn,
  UserPlus,
} from "lucide-react";
import { useApp } from "@/context/AppContext";

export interface AccountNavRoute {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  requiresAuth?: boolean;
  match: (pathname: string) => boolean;
}

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname() || "";
  const { 
    currentUser, 
    logout, 
    wishlist, 
    cartCount, 
    compareList,
    isUserSidebarOpen,
    setIsUserSidebarOpen,
  } = useApp();

  // Desktop sidebar collapsible state (expanded ~260px or icon rail ~76px)
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Close mobile drawer on route change
  useEffect(() => {
    setIsUserSidebarOpen(false);
  }, [pathname, setIsUserSidebarOpen]);

  const navItems: AccountNavRoute[] = [
    {
      label: "Account & Profile",
      href: "/account",
      icon: User,
      requiresAuth: true,
      match: (p) => p === "/account" || p.startsWith("/account/profile"),
    },
    {
      label: "Device Warranties",
      href: "/account/warranties",
      icon: ShieldCheck,
      requiresAuth: true,
      match: (p) => p.startsWith("/account/warranties"),
    },
    {
      label: "Wishlist",
      href: "/account/wishlist",
      icon: Heart,
      badge: wishlist?.length || 0,
      requiresAuth: false,
      match: (p) => p.startsWith("/account/wishlist"),
    },
    {
      label: "Orders",
      href: "/orders",
      icon: Package,
      requiresAuth: true,
      match: (p) => p.startsWith("/orders") || p.startsWith("/account/orders"),
    },
    {
      label: "Shopping Cart",
      href: "/cart",
      icon: ShoppingBag,
      badge: cartCount || 0,
      requiresAuth: false,
      match: (p) => p.startsWith("/cart"),
    },
    {
      label: "Compare Mobiles",
      href: "/compare",
      icon: Layers,
      badge: compareList?.length || 0,
      requiresAuth: false,
      match: (p) => p.startsWith("/compare"),
    },
  ];

  // Filter out protected links when logged out
  const visibleNavItems = navItems.filter((item) => {
    if (item.requiresAuth && !currentUser) {
      return false;
    }
    return true;
  });

  // On home page "/", no item is active
  const isHome = pathname === "/";

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-200">
      {/* Mobile / Tablet Slide-in Drawer (Opened by menu button in Navbar) */}
      {isUserSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-200"
            onClick={() => setIsUserSidebarOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Panel */}
          <div className="fixed inset-y-0 left-0 z-50 w-72 bg-card border-r border-border p-5 flex flex-col justify-between shadow-2xl animate-in slide-in-from-left duration-200">
            <div>
              {/* Drawer Header: User Card or Guest Card */}
              <div className="flex items-center justify-between pb-4 border-b border-border mb-4">
                {currentUser ? (
                  <div className="flex items-center gap-3 min-w-0">
                    {currentUser.avatar ? (
                      <img
                        src={currentUser.avatar}
                        alt={currentUser.name || "User"}
                        className="w-10 h-10 rounded-full object-cover border border-[#C9A66B]/40 shadow-xs shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-[#C9A66B] dark:bg-[#D4B483] text-[#FFFCFA] flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                        {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : "U"}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold text-foreground truncate">
                        {currentUser.name || "Customer"}
                      </div>
                      <div className="text-xs text-muted truncate">
                        {currentUser.email}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-tile border border-border flex items-center justify-center text-muted shrink-0">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-foreground">Welcome</div>
                      <div className="text-[11px] text-muted">Guest Shopper</div>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => setIsUserSidebarOpen(false)}
                  className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-tile transition-colors"
                  aria-label="Close navigation menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Guest Authentication Callout if Logged Out */}
              {!currentUser && (
                <div className="mb-4 pb-4 border-b border-border">
                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      href="/login"
                      onClick={() => setIsUserSidebarOpen(false)}
                      className="py-2 px-3 bg-[#C9A66B] dark:bg-[#D4B483] hover:bg-[#B8914A] dark:hover:bg-[#C49A5A] text-[#FFFCFA] text-xs font-bold rounded-xl text-center shadow-xs transition-colors flex items-center justify-center gap-1.5"
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      <span>Sign In</span>
                    </Link>
                    <Link
                      href="/register"
                      onClick={() => setIsUserSidebarOpen(false)}
                      className="py-2 px-3 bg-tile hover:bg-tile/80 text-foreground text-xs font-semibold rounded-xl text-center border border-border transition-colors flex items-center justify-center gap-1.5"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Sign Up</span>
                    </Link>
                  </div>
                </div>
              )}

              {/* Navigation Items */}
              <nav className="space-y-1">
                {visibleNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = !isHome && item.match(pathname);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      prefetch={true}
                      onClick={() => setIsUserSidebarOpen(false)}
                      className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                        isActive
                          ? "bg-[#C9A66B]/15 dark:bg-[#D4B483]/15 text-[#8C6226] dark:text-[#E5CBA2] border-l-4 border-[#C9A66B] dark:border-[#D4B483] font-semibold"
                          : "text-muted hover:text-foreground hover:bg-tile border-l-4 border-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-[#C9A66B] dark:text-[#D4B483]" : "text-muted"}`} />
                        <span>{item.label}</span>
                      </div>
                      {typeof item.badge === "number" && item.badge > 0 && (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isActive
                            ? "bg-[#C9A66B] dark:bg-[#D4B483] text-[#FFFCFA]"
                            : "bg-tile text-foreground border border-border"
                        }`}>
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}

                {/* Admin Portal if Admin */}
                {currentUser?.role === "ADMIN" && (currentUser.email || "").toLowerCase() === "rrroyce20@gmail.com" && (
                  <Link
                    href="/admin"
                    onClick={() => setIsUserSidebarOpen(false)}
                    className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-[#8C6226] dark:text-[#E5CBA2] bg-[#C9A66B]/10 hover:bg-[#C9A66B]/20 transition-colors border border-[#C9A66B]/30"
                  >
                    <Shield className="w-4 h-4 text-[#C9A66B]" />
                    <span>Admin Portal</span>
                  </Link>
                )}
              </nav>
            </div>

            {/* Drawer Footer: Sign Out if Logged In */}
            {currentUser && (
              <div className="pt-4 border-t border-border">
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Container: Sticky Desktop Sidebar (Left) + Page Content (Right) */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="flex flex-col lg:flex-row items-start gap-6 lg:gap-8">
          {/* Desktop Vertical Sidebar: Sticky (~260px or ~76px icon rail) */}
          <aside
            style={{
              position: "sticky",
              top: "var(--header-offset, 124px)",
              maxHeight: "calc(100vh - var(--header-offset, 124px) - 16px)",
              alignSelf: "flex-start",
            }}
            className={`hidden lg:block shrink-0 sticky self-start overflow-y-auto scrollbar-thin bg-card border border-border rounded-2xl p-4 shadow-sm space-y-4 transition-all duration-300 ${
              isCollapsed ? "w-[76px]" : "w-[260px]"
            }`}
          >
            {/* User Card at Top (Zara or Customer) */}
            <div className="pb-4 border-b border-border">
                {currentUser ? (
                  isCollapsed ? (
                    <div className="flex flex-col items-center gap-2" title={`${currentUser.name} (${currentUser.email})`}>
                      {currentUser.avatar ? (
                        <img
                          src={currentUser.avatar}
                          alt={currentUser.name || "User"}
                          className="w-10 h-10 rounded-full object-cover border border-[#C9A66B]/40 shadow-xs"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-[#C9A66B] dark:bg-[#D4B483] text-[#FFFCFA] flex items-center justify-center text-sm font-bold shadow-xs">
                          {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : "U"}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      {currentUser.avatar ? (
                        <img
                          src={currentUser.avatar}
                          alt={currentUser.name || "User"}
                          className="w-10 h-10 rounded-full object-cover border border-[#C9A66B]/40 shadow-xs shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-[#C9A66B] dark:bg-[#D4B483] text-[#FFFCFA] flex items-center justify-center text-sm font-bold shadow-xs shrink-0">
                          {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : "U"}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-foreground truncate">
                          {currentUser.name || "Customer Account"}
                        </div>
                        <div className="text-[11px] text-muted truncate">
                          {currentUser.email || "customer@vnmobiles.in"}
                        </div>
                      </div>
                    </div>
                  )
                ) : (
                  /* Logged out state: Login / Sign Up */
                  isCollapsed ? (
                    <div className="flex flex-col items-center gap-2" title="Sign In">
                      <Link
                        href="/login"
                        className="w-10 h-10 rounded-full bg-tile border border-border flex items-center justify-center text-muted hover:text-foreground transition-colors"
                      >
                        <LogIn className="w-4 h-4" />
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-tile border border-border flex items-center justify-center text-muted shrink-0">
                          <User className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-foreground">Welcome Guest</div>
                          <div className="text-[10px] text-muted">Join VN Mobiles Club</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <Link
                          href="/login"
                          className="py-1.5 px-2 bg-[#C9A66B] dark:bg-[#D4B483] hover:bg-[#B8914A] dark:hover:bg-[#C49A5A] text-[#FFFCFA] text-xs font-bold rounded-xl text-center shadow-xs transition-colors"
                        >
                          Sign In
                        </Link>
                        <Link
                          href="/register"
                          className="py-1.5 px-2 bg-tile hover:bg-tile/80 text-foreground text-xs font-semibold rounded-xl text-center border border-border transition-colors"
                        >
                          Sign Up
                        </Link>
                      </div>
                    </div>
                  )
                )}
              </div>

              {/* Sidebar Navigation */}
              <nav className="space-y-1">
                {visibleNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = !isHome && item.match(pathname);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      prefetch={true}
                      title={isCollapsed ? item.label : undefined}
                      className={`group flex items-center ${
                        isCollapsed ? "justify-center px-2 py-2.5" : "justify-between px-3.5 py-2.5"
                      } rounded-xl text-xs font-medium transition-all relative ${
                        isActive
                          ? "bg-[#C9A66B]/15 dark:bg-[#D4B483]/15 text-[#8C6226] dark:text-[#E5CBA2] border-l-4 border-[#C9A66B] dark:border-[#D4B483] font-semibold"
                          : "text-muted hover:text-foreground hover:bg-tile border-l-4 border-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`w-4 h-4 shrink-0 transition-transform duration-200 group-hover:scale-110 ${
                          isActive ? "text-[#C9A66B] dark:text-[#D4B483]" : "text-muted group-hover:text-foreground"
                        }`} />
                        {!isCollapsed && <span>{item.label}</span>}
                      </div>

                      {typeof item.badge === "number" && item.badge > 0 && (
                        isCollapsed ? (
                          <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-[#C9A66B] dark:bg-[#D4B483] text-[#FFFCFA] shadow-xs">
                            {item.badge}
                          </span>
                        ) : (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isActive
                              ? "bg-[#C9A66B] dark:bg-[#D4B483] text-[#FFFCFA]"
                              : "bg-tile text-foreground border border-border group-hover:bg-[#C9A66B] group-hover:text-[#FFFCFA] transition-colors"
                          }`}>
                            {item.badge}
                          </span>
                        )
                      )}
                    </Link>
                  );
                })}

                {/* Admin Portal if Admin */}
                {currentUser?.role === "ADMIN" && (currentUser.email || "").toLowerCase() === "rrroyce20@gmail.com" && (
                  <Link
                    href="/admin"
                    title={isCollapsed ? "Admin Portal" : undefined}
                    className={`group flex items-center ${
                      isCollapsed ? "justify-center px-2 py-2.5" : "px-3.5 py-2.5 gap-3"
                    } rounded-xl text-xs font-semibold text-[#8C6226] dark:text-[#E5CBA2] bg-[#C9A66B]/10 hover:bg-[#C9A66B]/20 transition-colors border border-[#C9A66B]/30`}
                  >
                    <Shield className="w-4 h-4 text-[#C9A66B] shrink-0" />
                    {!isCollapsed && <span>Admin Portal</span>}
                  </Link>
                )}
              </nav>

              {/* Divider and Sign Out (if logged in) */}
              {currentUser && (
                <div className="pt-3 border-t border-border">
                  <button
                    onClick={logout}
                    title={isCollapsed ? "Sign Out" : undefined}
                    className={`w-full flex items-center ${
                      isCollapsed ? "justify-center px-2 py-2" : "gap-2.5 px-3.5 py-2"
                    } rounded-xl text-xs font-medium text-muted hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer`}
                  >
                    <LogOut className="w-4 h-4 shrink-0" />
                    {!isCollapsed && <span>Sign Out</span>}
                  </button>
                </div>
              )}

              {/* Collapsible Rail Toggle Button */}
              <div className="pt-2 border-t border-border/60">
                <button
                  type="button"
                  onClick={() => setIsCollapsed(!isCollapsed)}
                  className={`w-full flex items-center ${
                    isCollapsed ? "justify-center" : "justify-between"
                  } p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-tile text-[11px] font-medium transition-colors cursor-pointer`}
                  title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar to Rail"}
                  aria-label={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar to Rail"}
                >
                  {!isCollapsed && <span>Collapse Sidebar</span>}
                  {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                </button>
              </div>
          </aside>

          {/* Page Content / Product Area (Right) */}
          <div className="flex-1 min-w-0 w-full">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
