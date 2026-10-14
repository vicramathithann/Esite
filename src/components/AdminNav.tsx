"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Smartphone,
  Boxes,
  Users,
  ShieldCheck,
  MailCheck,
  ExternalLink,
} from "lucide-react";

export default function AdminNav() {
  const pathname = usePathname();

  const links = [
    { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/orders", label: "Orders", icon: Package },
    { href: "/admin/products", label: "Products", icon: Smartphone },
    { href: "/admin/inventory", label: "Inventory", icon: Boxes },
    { href: "/admin/customers", label: "Customers", icon: Users },
    { href: "/admin/warranties", label: "Warranties", icon: ShieldCheck },
    { href: "/admin/email-logs", label: "Email Logs", icon: MailCheck },
  ];

  return (
    <div className="bg-card border-b border-border sticky top-0 z-40 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <span className="font-bold text-foreground text-sm tracking-tight flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#C9A66B] dark:bg-[#D4B483] animate-pulse"></span>
              VN Mobiles Admin
            </span>
          </div>

          <nav className="flex items-center gap-1 overflow-x-auto py-1">
            {links.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href || (link.href === "/admin/dashboard" && pathname === "/admin");
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    isActive
                      ? "bg-[#C9A66B] dark:bg-[#D4B483] text-[#FFFCFA] shadow-xs"
                      : "text-muted hover:text-foreground hover:bg-tile"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <Link
            href="/"
            target="_blank"
            className="hidden md:flex items-center gap-1 text-xs text-muted hover:text-foreground transition"
          >
            Storefront <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
