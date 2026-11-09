"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUp } from "lucide-react";

export default function Footer() {
  const pathname = usePathname();

  // Completely exclude Storefront footer from all Admin routes
  if (pathname?.startsWith("/admin")) {
    return null;
  }

  const scrollToTop = () => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <footer className="w-full bg-background border-t border-border pt-12 sm:pt-14 pb-12 text-foreground transition-colors duration-200">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* 4 Columns Links Section */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 lg:gap-12 pb-12 border-b border-border text-xs">
          
          {/* Column 1: Shop & Flagships */}
          <div className="space-y-3.5">
            <h4 className="font-bold text-sm tracking-tight text-foreground">
              Shop & Explore
            </h4>
            <ul className="space-y-2.5 text-muted">
              <li>
                <Link href="/?brand=Apple" className="hover:text-accent transition-colors duration-200">
                  Apple iPhone Series
                </Link>
              </li>
              <li>
                <Link href="/?brand=Samsung" className="hover:text-accent transition-colors duration-200">
                  Samsung Galaxy Fold & Ultra
                </Link>
              </li>
              <li>
                <Link href="/?brand=Google Pixel" className="hover:text-accent transition-colors duration-200">
                  Google Pixel 9 & Pro
                </Link>
              </li>
              <li>
                <Link href="/?brand=OnePlus" className="hover:text-accent transition-colors duration-200">
                  OnePlus Flagships
                </Link>
              </li>
              <li>
                <Link href="/?brand=Nothing" className="hover:text-accent transition-colors duration-200">
                  Nothing Phone Series
                </Link>
              </li>
              <li>
                <Link href="/compare" className="hover:text-accent transition-colors duration-200 font-medium text-foreground">
                  Side-by-Side Compare →
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 2: Customer Support */}
          <div className="space-y-3.5">
            <h4 className="font-bold text-sm tracking-tight text-foreground">
              Customer Support
            </h4>
            <ul className="space-y-2.5 text-muted">
              <li>
                <Link href="/orders" className="hover:text-accent transition-colors duration-200">
                  Track Your Order
                </Link>
              </li>
              <li>
                <Link href="/account" className="hover:text-accent transition-colors duration-200">
                  Account Settings
                </Link>
              </li>
              <li>
                <Link href="/orders" className="hover:text-accent transition-colors duration-200">
                  Returns & Replacements
                </Link>
              </li>
              <li>
                <Link href="/account/wishlist" className="hover:text-accent transition-colors duration-200">
                  Saved Wishlist
                </Link>
              </li>
              <li>
                <a href="mailto:support@vmmobiles.in" className="hover:text-accent transition-colors duration-200">
                  Help Center & FAQs
                </a>
              </li>
            </ul>
          </div>

          {/* Column 3: Services & Protection */}
          <div className="space-y-3.5">
            <h4 className="font-bold text-sm tracking-tight text-foreground">
              Services & Protection
            </h4>
            <ul className="space-y-2.5 text-muted">
              <li>
                <Link href="/account/warranties" className="hover:text-accent transition-colors duration-200">
                  VN Device Shield Warranty
                </Link>
              </li>
              <li>
                <Link href="/account/warranties" className="hover:text-accent transition-colors duration-200">
                  Warranty Protection Alerts
                </Link>
              </li>
              <li>
                <Link href="/" className="hover:text-accent transition-colors duration-200">
                  No Cost EMI Options
                </Link>
              </li>
              <li>
                <Link href="/" className="hover:text-accent transition-colors duration-200">
                  Trade-In & Exchange
                </Link>
              </li>
              <li>
                <Link href="/checkout" className="hover:text-accent transition-colors duration-200">
                  GST Invoicing for Business
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: About VN Mobiles */}
          <div className="space-y-3.5">
            <h4 className="font-bold text-sm tracking-tight text-foreground">
              About VN Mobiles
            </h4>
            <ul className="space-y-2.5 text-muted">
              <li>
                <span className="text-muted">
                  India&apos;s clean tech smartphone boutique delivering 100% genuine products directly with manufacturer warranty.
                </span>
              </li>
              <li className="pt-2">
                <span className="font-medium text-foreground block">
                  Authorised Reseller Store
                </span>
                <span className="text-muted block mt-0.5">
                  Across 24+ Indian Cities & Express Delivery
                </span>
              </li>
              <li className="pt-1 flex items-center gap-3">
                <span className="text-foreground font-semibold">Support:</span>
                <span className="text-accent font-medium">1800-VN-MOBILE</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Payment Icons Strip & Trust Badges */}
        <div className="py-8 border-b border-border flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3 flex-wrap justify-center md:justify-start">
            <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
              Secure Payments:
            </span>
            {/* Payment Method Badges */}
            <div className="flex items-center gap-2 flex-wrap justify-center">
              {/* UPI */}
              <div className="px-3 py-1.5 rounded-lg bg-card border border-border shadow-2xs flex items-center gap-1.5 text-xs font-bold text-foreground">
                <span className="text-accent font-extrabold">UPI</span>
                <span className="text-[10px] text-muted font-medium">GPay/PhonePe</span>
              </div>
              {/* Visa */}
              <div className="px-3 py-1.5 rounded-lg bg-card border border-border shadow-2xs text-xs font-black tracking-wider text-foreground">
                VISA
              </div>
              {/* MasterCard */}
              <div className="px-3 py-1.5 rounded-lg bg-card border border-border shadow-2xs flex items-center gap-1 text-xs font-bold text-foreground">
                <div className="flex -space-x-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#EB001B]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#F79E1B] opacity-80" />
                </div>
                <span>Mastercard</span>
              </div>
              {/* RuPay */}
              <div className="px-3 py-1.5 rounded-lg bg-card border border-border shadow-2xs text-xs font-bold text-emerald-600 dark:text-emerald-400">
                RuPay
              </div>
              {/* NetBanking */}
              <div className="px-3 py-1.5 rounded-lg bg-card border border-border shadow-2xs text-xs font-semibold text-foreground">
                Net Banking
              </div>
              {/* COD */}
              <div className="px-3 py-1.5 rounded-lg bg-card border border-border shadow-2xs text-xs font-semibold text-foreground">
                Cash on Delivery
              </div>
              {/* No Cost EMI */}
              <div className="px-3 py-1.5 rounded-lg bg-card border border-accent/30 shadow-2xs text-xs font-semibold text-accent">
                0% EMI Available
              </div>
            </div>
          </div>

          {/* Scroll to Top Pill */}
          <button
            type="button"
            onClick={scrollToTop}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#C9A66B]/10 dark:bg-[#D4B483]/10 hover:bg-[#C9A66B]/20 dark:hover:bg-[#D4B483]/20 text-[#8C6226] dark:text-[#E5CBA2] border border-[#C9A66B]/30 dark:border-[#D4B483]/30 text-xs font-medium transition-all duration-200 cursor-pointer shadow-2xs shrink-0"
          >
            <span>Back to top</span>
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Bottom Sub-bar: Copyright, Legal & Region */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted">
          <div className="flex flex-wrap items-center gap-4 text-center sm:text-left">
            <span>© 2026 VN Mobiles India Ltd. All rights reserved.</span>
            <span className="hidden sm:inline opacity-30">•</span>
            <a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-foreground transition-colors">Terms of Sale</a>
            <a href="#" className="hover:text-foreground transition-colors">Legal Notices</a>
          </div>

          <div className="flex items-center gap-2 text-foreground font-medium">
            <span>🌐</span>
            <span>India (English / ₹ INR)</span>
          </div>
        </div>

      </div>
    </footer>
  );
}