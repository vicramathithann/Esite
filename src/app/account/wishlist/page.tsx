"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { Heart, ShoppingBag, Trash2, Smartphone } from "lucide-react";
import { formatINR } from "@/lib/formatters";
import { useApp } from "@/context/AppContext";
import AccountLayout from "@/components/AccountLayout";

export default function WishlistPage() {
  const { wishlist, toggleWishlist, addToCart } = useApp();
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAllProducts() {
      try {
        setLoading(true);
        const res = await fetch("/api/products");
        const data = await res.json();
        if (data.success && data.products) {
          setAllProducts(data.products);
        }
      } catch (err) {
        console.error("Failed to load wishlist products:", err);
      } finally {
        setLoading(false);
      }
    }

    loadAllProducts();
  }, []);

  const products = useMemo(() => {
    if (!wishlist || wishlist.length === 0) return [];
    return allProducts.filter((p: any) => wishlist.includes(p.id));
  }, [allProducts, wishlist]);

  const handleAddToCart = (product: any) => {
    const defaultColor = product.colors?.[0] || { name: "Default", hex: "#000" };
    const defaultStorage = product.storageOptions?.[0] || { size: "Standard", price: product.basePrice };

    addToCart({
      id: `${product.id}-${defaultColor.name}-${defaultStorage.size}`,
      productId: product.id,
      name: product.name,
      brand: product.brand,
      imageUrl: product.imageUrl,
      selectedColor: defaultColor,
      selectedStorage: defaultStorage,
      price: product.basePrice,
      quantity: 1,
      warrantyMonths: product.warrantyMonths || 12,
    });
  };

  return (
    <AccountLayout>
      <div className="space-y-6">
        {/* Header Card */}
        <div className="bg-[#121B2E] border border-[#1F2A44] rounded-2xl p-6 shadow-lg flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-[#C9A56A]/10 border border-[#C9A56A]/20 flex items-center justify-center text-[#C9A56A] shrink-0">
              <Heart className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#E5E7EB]">My Wishlist</h1>
              <p className="text-xs text-[#94A3B8] mt-0.5">
                Saved smartphones and mobile gear you want to buy later.
              </p>
            </div>
          </div>
          <span className="text-xs text-[#94A3B8] font-mono px-3 py-1 bg-[#0B1220] border border-[#1F2A44] rounded-full font-semibold">
            {products.length} {products.length === 1 ? "Saved Device" : "Saved Devices"}
          </span>
        </div>

        {/* Content Section */}
        {loading ? (
          <div className="py-20 text-center text-[#94A3B8]">
            <div className="w-8 h-8 border-3 border-[#C9A56A] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm font-medium">Loading wishlist...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="bg-[#121B2E] border border-[#1F2A44] rounded-2xl p-12 sm:p-16 text-center shadow-md">
            <Heart className="w-12 h-12 text-[#94A3B8] mx-auto mb-3 opacity-30" />
            <h3 className="text-base font-bold text-[#E5E7EB] mb-1">Your Wishlist is Empty</h3>
            <p className="text-xs text-[#94A3B8] max-w-sm mx-auto mb-6">
              Tap the heart icon on any smartphone to save it to your wishlist and monitor prices.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#C9A56A] hover:bg-[#D8B47E] active:bg-[#B8914A] text-[#0B1220] text-xs font-bold rounded-xl transition-all shadow-sm"
            >
              <Smartphone className="w-4 h-4 text-[#0B1220]" />
              <span>Explore Smartphones</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {products.map((product) => (
              <div
                key={product.id}
                className="bg-[#121B2E] border border-[#1F2A44] rounded-2xl p-5 flex flex-col justify-between hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(201,165,106,0.14)] hover:border-[#C9A56A]/50 transition-all duration-300"
              >
                <div className="flex gap-4">
                  <div className="relative w-24 h-24 bg-[#0B1220] border border-[#1F2A44] rounded-xl p-2 shrink-0 flex items-center justify-center">
                    <Image
                      src={product.imageUrl || "/images/placeholder.png"}
                      alt={product.name}
                      fill
                      className="object-contain p-1"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] uppercase font-bold text-[#C9A56A] tracking-wider">
                      {product.brand}
                    </span>
                    <h3 className="text-sm font-semibold text-[#E5E7EB] line-clamp-1 mt-0.5">
                      {product.name}
                    </h3>
                    <p className="text-xs text-[#94A3B8] mt-0.5 truncate">
                      {product.processor || "Octa Core"} • {product.ram || "8GB RAM"}
                    </p>
                    <div className="text-base font-bold text-[#E5E7EB] mt-2">
                      {formatINR(product.basePrice)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-4 pt-3.5 border-t border-[#1F2A44]">
                  {/* Move to Cart button: Solid gold with dark text, brighter on hover */}
                  <button
                    onClick={() => handleAddToCart(product)}
                    className="flex-1 py-2.5 px-4 bg-[#C9A56A] hover:bg-[#D8B47E] active:bg-[#B8914A] text-[#0B1220] text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow-[0_4px_16px_rgba(201,165,106,0.25)] cursor-pointer"
                  >
                    <ShoppingBag className="w-3.5 h-3.5 text-[#0B1220]" />
                    <span>Move to Cart</span>
                  </button>

                  {/* Delete icon: Muted by default, red on hover */}
                  <button
                    onClick={() => toggleWishlist(product.id)}
                    className="p-2.5 rounded-xl border border-[#1F2A44] bg-[#0B1220] text-[#94A3B8] hover:text-[#EF4444] hover:border-[#EF4444]/40 hover:bg-[#EF4444]/10 transition-all flex items-center justify-center cursor-pointer"
                    title="Remove from wishlist"
                    aria-label="Remove from wishlist"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AccountLayout>
  );
}
