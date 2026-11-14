"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  X, 
  User, 
  ShieldCheck, 
  Heart, 
  Package, 
  ShoppingBag, 
  Layers, 
  Home, 
  Smartphone, 
  LogIn, 
  UserPlus, 
  LogOut, 
  Shield,
  ChevronRight
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import ThemeToggle from "@/components/ThemeToggle";

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MobileDrawer({ isOpen, onClose }: MobileDrawerProps) {
  const pathname = usePathname() || "";
  const { 
    currentUser, 
    logout, 
    wishlist, 
    cartCount, 
    compareList,
    setIsCartOpen 
  } = useApp();

  // Close on route changes
  useEffect(() => {
    onClose();
  }, [pathname]);

  // Lock body scroll and handle Esc key
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const navLinks = [
    { label: "Home", href: "/", icon: Home },
    { label: "All Smartphones", href: "/#all-phones", icon: Smartphone },
    { 
      label: "Device Warranties", 
      href: "/account/warranties", 
      icon: ShieldCheck, 
      requiresAuth: true 
    },
    { 
      label: "Orders & Tracking", 
      href: "/orders", 
      icon: Package, 
      requiresAuth: true 
    },
    { 
      label: "Wishlist", 
      href: "/account/wishlist", 
      icon: Heart, 
      badge: wishlist?.length || 0 
    },
    { 
      label: "Shopping Bag", 
      href: "#cart", 
      icon: ShoppingBag, 
      badge: cartCount || 0,
      onClick: (e: React.MouseEvent) => {
        e.preventDefault();
        onClose();
        setIsCartOpen(true);
      }
    },
    { 
      label: "Compare Mobiles", 
      href: "/compare", 
      icon: Layers, 
      badge: compareList?.length || 0 
    },
  ];

  return (
    <div className="fixed inset-0 z-50 lg:hidden flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <div 
        role="dialog"
        aria-modal="true"
        aria-label="Navigation Menu"
        className="relative z-50 w-[82vw] max-w-xs h-full bg-card border-r border-border shadow-2xl flex flex-col justify-between animate-in slide-in-from-left duration-200 focus:outline-none"
      >
        <div className="overflow-y-auto flex-1 scrollbar-thin">
          {/* Top Drag Pill / Accent bar */}
          <div className="pt-2 pb-1 flex justify-center">
            <div className="w-10 h-1 rounded-full bg-border/80" />
          </div>

          {/* User Profile or Guest Banner Header */}
          <div className="p-4 border-b border-border bg-tile/50">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted">Theme</span>
                <ThemeToggle />
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center text-muted hover:text-foreground hover:bg-tile transition-colors cursor-pointer"
                aria-label="Close menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {currentUser ? (
              <div className="flex items-center gap-3">
                {currentUser.avatar ? (
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.name || "User"}
                    className="w-11 h-11 rounded-full object-cover border-2 border-[#C9A66B]/50 shrink-0"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-[#C9A66B] dark:bg-[#D4B483] text-[#FFFCFA] font-bold text-sm flex items-center justify-center shrink-0 shadow-xs">
                    {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : "U"}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-foreground truncate">
                    {currentUser.name || "Customer"}
                  </div>
                  <div className="text-[11px] text-muted truncate">
                    {currentUser.email || ""}
                  </div>
                  <Link
                    href="/account"
                    onClick={onClose}
                    className="inline-block mt-1 text-[11px] font-semibold text-[#C9A66B] dark:text-[#D4B483] hover:underline"
                  >
                    View Account & Profile →
                  </Link>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-9 h-9 rounded-full bg-tile border border-border flex items-center justify-center text-muted shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-foreground">Welcome Guest</div>
                    <div className="text-[10px] text-muted">Sign in for orders & warranties</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href="/login"
                    onClick={onClose}
                    className="py-2 px-3 text-xs font-bold rounded-xl text-center bg-[#C9A66B] dark:bg-[#D4B483] text-[#FFFCFA] shadow-xs flex items-center justify-center gap-1.5"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Sign In</span>
                  </Link>
                  <Link
                    href="/register"
                    onClick={onClose}
                    className="py-2 px-3 text-xs font-semibold rounded-xl text-center bg-card hover:bg-tile border border-border text-foreground flex items-center justify-center gap-1.5"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Sign Up</span>
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            {navLinks.map((item) => {
              if (item.requiresAuth && !currentUser) return null;
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={(e) => {
                    if (item.onClick) {
                      item.onClick(e);
                    } else {
                      onClose();
                    }
                  }}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-colors ${
                    isActive
                      ? "bg-[#C9A66B]/15 text-[#8C6226] dark:text-[#E5CBA2] font-semibold border-l-3 border-[#C9A66B]"
                      : "text-foreground hover:bg-tile text-muted hover:text-foreground"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? "text-[#C9A66B]" : "text-muted"}`} />
                    <span>{item.label}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {typeof item.badge === "number" && item.badge > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#C9A66B] text-[#FFFCFA]">
                        {item.badge}
                      </span>
                    )}
                    <ChevronRight className="w-3.5 h-3.5 text-muted opacity-50" />
                  </div>
                </Link>
              );
            })}

            {/* Admin Portal if Admin */}
            {currentUser?.role === "ADMIN" && (currentUser.email || "").toLowerCase() === "rrroyce20@gmail.com" && (
              <Link
                href="/admin"
                onClick={onClose}
                className="flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold text-[#8C6226] dark:text-[#E5CBA2] bg-[#C9A66B]/10 hover:bg-[#C9A66B]/20 border border-[#C9A66B]/30"
              >
                <div className="flex items-center gap-3">
                  <Shield className="w-4 h-4 text-[#C9A66B]" />
                  <span>Admin Portal</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-[#C9A66B]" />
              </Link>
            )}
          </nav>
        </div>

        {/* Footer: Sign Out if Logged In */}
        {currentUser && (
          <div className="p-3 border-t border-border bg-tile/30">
            <button
              type="button"
              onClick={() => {
                onClose();
                logout();
              }}
              className="w-full py-2.5 px-3 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
