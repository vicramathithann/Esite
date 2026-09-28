"use client";

import React from "react";
import Link from "next/link";

export default function Footer() {
  const scrollToTop = () => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <footer className="w-full text-white mt-16">
      {/* Back to top banner */}
      <button
        type="button"
        onClick={scrollToTop}
        className="w-full bg-[#37475a] hover:bg-[#485769] text-white text-xs font-bold py-4 text-center cursor-pointer transition-colors block"
      >
        Back to top
      </button>

      {/* Main Multi-Column Links Section (Amazon #232f3e) */}
      <div className="bg-[#232f3e] py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-xs text-gray-300">
          <div className="space-y-2.5">
            <h4 className="font-bold text-sm text-white mb-3">Get to Know Us</h4>
            <div><Link href="/" className="hover:underline">About VM Mobiles</Link></div>
            <div><Link href="/" className="hover:underline">Careers</Link></div>
            <div><Link href="/" className="hover:underline">Press Releases</Link></div>
            <div><Link href="/" className="hover:underline">VM Science & AI</Link></div>
          </div>

          <div className="space-y-2.5">
            <h4 className="font-bold text-sm text-white mb-3">Connect with Us</h4>
            <div><a href="#" className="hover:underline">Facebook</a></div>
            <div><a href="#" className="hover:underline">Twitter / X</a></div>
            <div><a href="#" className="hover:underline">Instagram</a></div>
          </div>

          <div className="space-y-2.5">
            <h4 className="font-bold text-sm text-white mb-3">VM Mobiles Device Shield</h4>
            <div><Link href="/orders" className="hover:underline">Device Warranty Registration</Link></div>
            <div><Link href="/orders" className="hover:underline">Pre-Expiry SMS Alerts Info</Link></div>
            <div><Link href="/compare" className="hover:underline">Side-by-Side Comparison</Link></div>
            <div><Link href="/checkout" className="hover:underline">100% Purchase Protection</Link></div>
          </div>

          <div className="space-y-2.5">
            <h4 className="font-bold text-sm text-white mb-3">Let Us Help You</h4>
            <div><Link href="/orders" className="hover:underline">Your Account & Orders</Link></div>
            <div><Link href="/orders" className="hover:underline">Returns & Replacements</Link></div>
            <div><Link href="/" className="hover:underline">Manage Your Content and Devices</Link></div>
            <div><Link href="/" className="hover:underline">Help</Link></div>
          </div>
        </div>

        {/* Mid logo separator */}
        <div className="max-w-6xl mx-auto mt-10 pt-8 border-t border-gray-700 flex flex-col sm:flex-row items-center justify-center gap-6 text-xs text-gray-300">
          <div className="flex items-baseline">
            <span className="text-xl font-black text-white">vm<span className="text-[#febd69]">mobiles</span></span>
            <span className="text-[11px] text-[#febd69] font-bold">.in</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="border border-gray-600 rounded px-2 py-1 text-gray-300">🌐 English</span>
            <span className="border border-gray-600 rounded px-2 py-1 text-gray-300">🇮🇳 India (₹ INR)</span>
          </div>
        </div>
      </div>

      {/* Bottom Legal & Trademark Bar (Amazon #131921) */}
      <div className="bg-[#131921] py-8 text-center text-[11px] text-gray-400 space-y-2">
        <div className="flex flex-wrap justify-center gap-4">
          <a href="#" className="hover:underline">Conditions of Use & Sale</a>
          <a href="#" className="hover:underline">Privacy Notice</a>
          <a href="#" className="hover:underline">Interest-Based Ads</a>
        </div>
        <p>
          © 2026, VM Mobiles.in, Inc. or its affiliates. All flagship brand names & trademarks are property of their respective owners.
        </p>
      </div>
    </footer>
  );
}