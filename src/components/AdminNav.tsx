"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "@/context/AppContext";
import {
  LayoutDashboard,
  Package,
  Smartphone,
  Boxes,
  Users,
  ShieldCheck,
  MailCheck,
  ExternalLink,
  SlidersHorizontal,
  KeyRound,
  LogOut,
  Menu,
  X,
  ChevronRight,
  UserPlus,
} from "lucide-react";

export default function AdminNav() {
  const pathname = usePathname();
  const { currentUser, logout } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  interface NavItem {
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    external?: boolean;
  }

  interface NavGroup {
    title: string;
    items: NavItem[];
  }

  const navGroups: NavGroup[] = [
    {
      title: "Core Management",
      items: [
        { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { href: "/admin/orders", label: "Orders", icon: Package },
        { href: "/admin/products", label: "Products", icon: Smartphone },
        { href: "/admin/inventory", label: "Inventory", icon: Boxes },
        { href: "/admin/customers", label: "Users", icon: Users },
        { href: "/admin/invite", label: "Invite", icon: UserPlus },
      ],
    },
    {
      title: "Store & Settings",
      items: [
        { href: "/admin/settings", label: "Store Controls", icon: SlidersHorizontal },
        { href: "/admin/warranties", label: "Warranties", icon: ShieldCheck },
        { href: "/admin/email-logs", label: "Email Logs", icon: MailCheck },
        { href: "/admin/password", label: "Change Password", icon: KeyRound },
      ],
    },
    {
      title: "Public Store",
      items: [
        { href: "/", label: "Storefront", icon: ExternalLink, external: true },
      ],
    },
  ];

  const isItemActive = (href: string, external?: boolean) => {
    if (external) return false;
    if (href === "/admin/dashboard") {
      return pathname === "/admin/dashboard" || pathname === "/admin";
    }
    if (href === "/admin/orders") {
      return pathname === "/admin/orders" || pathname.startsWith("/admin/orders/");
    }
    if (href === "/admin/products") {
      return pathname === "/admin/products" || pathname.startsWith("/admin/products/");
    }
    if (href === "/admin/customers") {
      return pathname === "/admin/customers" || pathname === "/admin/users" || pathname.startsWith("/admin/customers/");
    }
    if (href === "/admin/invite") {
      return pathname === "/admin/invite" || pathname.startsWith("/admin/invite/");
    }
    if (href === "/admin/settings") {
      return pathname === "/admin/settings" || pathname.startsWith("/admin/settings/");
    }
    if (href === "/admin/warranties") {
      return pathname === "/admin/warranties" || pathname.startsWith("/admin/warranties/");
    }
    if (href === "/admin/email-logs") {
      return pathname === "/admin/email-logs" || pathname.startsWith("/admin/email-logs/");
    }
    if (href === "/admin/password") {
      return pathname === "/admin/password" || pathname.startsWith("/admin/password/");
    }
    return pathname === href;
  };

  const handleSignOut = async () => {
    try {
      await fetch("/api/admin/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      await logout();
    } catch (e) {
      console.error("Sign out error:", e);
    }
    // Hard redirect to public storefront homepage
    window.location.href = "/";
  };

  const NavContent = () => (
    <div className="flex flex-col h-full">
      {/* Brand Header */}
      <div className="h-16 px-5 border-b border-border flex items-center justify-between shrink-0">
        <Link href="/admin/dashboard" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl bg-[#C9A66B]/15 border border-[#C9A66B]/30 flex items-center justify-center text-[#8C6226] dark:text-[#E5CBA2] shadow-xs group-hover:scale-105 transition-transform">
            <ShieldCheck className="w-5 h-5 text-[#C9A66B]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-foreground text-sm tracking-tight">
                VN MOBILES
              </span>
              <span className="w-2 h-2 rounded-full bg-[#C9A66B] animate-pulse"></span>
            </div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#8C6226] dark:text-[#E5CBA2] block -mt-0.5">
              Admin Portal
            </span>
          </div>
        </Link>
      </div>

      {/* Navigation Links Scroll Area */}
      <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-6 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
        {navGroups.map((group) => (
          <div key={group.title} className="space-y-1">
            <div className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted">
              {group.title}
            </div>
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = isItemActive(item.href, item.external);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    target={item.external ? "_blank" : undefined}
                    rel={item.external ? "noopener noreferrer" : undefined}
                    className={`group w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                      active
                        ? "bg-[#C9A66B] dark:bg-[#D4B483] text-[#FFFCFA] shadow-xs"
                        : "text-muted hover:text-foreground hover:bg-tile"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Icon
                        className={`w-4 h-4 shrink-0 transition-colors ${
                          active
                            ? "text-[#FFFCFA]"
                            : "text-muted group-hover:text-foreground"
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </div>

                    {item.external ? (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20 shrink-0">
                        Live
                      </span>
                    ) : active ? (
                      <ChevronRight className="w-3.5 h-3.5 text-[#FFFCFA] shrink-0" />
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Admin User Profile & Sign Out Footer */}
      <div className="p-3.5 border-t border-border bg-tile/40 space-y-2.5 shrink-0">
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-card border border-border/80">
          <div className="w-8 h-8 rounded-lg bg-[#C9A66B]/15 border border-[#C9A66B]/30 flex items-center justify-center text-[#8C6226] dark:text-[#E5CBA2] shrink-0 font-bold text-xs">
            AD
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-foreground truncate">
              Store Administrator
            </div>
            <div className="text-[11px] text-muted truncate">
              {currentUser?.email || "rrroyce20@gmail.com"}
            </div>
          </div>
        </div>

        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-all cursor-pointer"
          title="Sign Out from Admin Portal"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* 1. Desktop Vertical Sidebar Navigation */}
      <aside className="hidden lg:flex flex-col w-64 xl:w-72 fixed inset-y-0 left-0 bg-card border-r border-border z-40 transition-colors duration-200 select-none shadow-xs">
        <NavContent />
      </aside>

      {/* 2. Mobile Top Navigation Bar */}
      <header className="lg:hidden h-14 bg-card border-b border-border px-4 flex items-center justify-between sticky top-0 z-40 transition-colors duration-200">
        <Link href="/admin/dashboard" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#C9A66B]/15 border border-[#C9A66B]/30 flex items-center justify-center text-[#8C6226] dark:text-[#E5CBA2]">
            <ShieldCheck className="w-4 h-4 text-[#C9A66B]" />
          </div>
          <div>
            <span className="font-bold text-foreground text-xs tracking-tight">
              VN Mobiles
            </span>
            <span className="text-[9px] uppercase font-bold text-[#8C6226] dark:text-[#E5CBA2] block -mt-0.5">
              Admin Portal
            </span>
          </div>
        </Link>

        <button
          onClick={() => setMobileOpen((prev) => !prev)}
          className="p-2 rounded-xl border border-border bg-tile text-foreground hover:bg-tile/80 transition cursor-pointer"
          aria-label="Toggle navigation menu"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* 3. Mobile Slide-out Drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileOpen(false)}
          />

          {/* Drawer Panel */}
          <div className="relative w-72 max-w-[85vw] bg-card border-r border-border h-full flex flex-col z-10 shadow-2xl animate-in slide-in-from-left duration-200">
            <NavContent />
          </div>
        </div>
      )}
    </>
  );
}
