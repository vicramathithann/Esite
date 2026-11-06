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
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-[#C9A66B]/10 dark:bg-[#D4B483]/15 border border-[#C9A66B]/25 flex items-center justify-center text-[#8C6226] dark:text-[#E5CBA2] shrink-0">
              <Heart className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">My Wishlist</h1>
              <p className="text-xs text-muted mt-0.5">
                Saved smartphones and mobile gear you want to buy later.
              </p>
            </div>
          </div>
          <span className="text-xs text-muted font-mono px-3 py-1 bg-tile border border-border rounded-full font-semibold">
            {products.length} {products.length === 1 ? "Saved Device" : "Saved Devices"}
          </span>
        </div>

        {/* Content Section */}
        {loading ? (
          <div className="py-20 text-center text-muted">
            <div className="w-8 h-8 border-3 border-[#C9A66B] dark:border-[#D4B483] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm font-medium">Loading wishlist...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-12 sm:p-16 text-center shadow-sm">
            <Heart className="w-12 h-12 text-muted mx-auto mb-3 opacity-30" />
            <h3 className="text-base font-bold text-foreground mb-1">Your Wishlist is Empty</h3>
            <p className="text-xs text-muted max-w-sm mx-auto mb-6">
              Tap the heart icon on any smartphone to save it to your wishlist and monitor prices.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#C9A66B] dark:bg-[#D4B483] hover:bg-[#B8914A] dark:hover:bg-[#C49A5A] text-[#FFFCFA] text-xs font-bold rounded-xl transition-all shadow-xs"
            >
              <Smartphone className="w-4 h-4 text-[#FFFCFA]" />
              <span>Explore Smartphones</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {products.map((product) => (
              <div
                key={product.id}
                className="bg-card border border-border rounded-2xl p-5 flex flex-col justify-between hover:-translate-y-1 hover:shadow-lg hover:border-[#C9A66B]/50 transition-all duration-300"
              >
                <div className="flex gap-4">
                  <div className="relative w-24 h-24 bg-tile border border-border rounded-xl p-2 shrink-0 flex items-center justify-center">
                    <Image
                      src={product.imageUrl || "/images/placeholder.png"}
                      alt={product.name}
                      fill
                      className="object-contain p-1"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] uppercase font-bold text-[#8C6226] dark:text-[#E5CBA2] tracking-wider">
                      {product.brand}
                    </span>
                    <h3 className="text-sm font-semibold text-foreground line-clamp-1 mt-0.5">
                      {product.name}
                    </h3>
                    <p className="text-xs text-muted mt-0.5 truncate">
                      {product.processor || "Octa Core"} • {product.ram || "8GB RAM"}
                    </p>
                    <div className="text-base font-bold text-foreground mt-2">
                      {formatINR(product.basePrice)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-4 pt-3.5 border-t border-border">
                  {/* Move to Cart button: Solid gold with high contrast */}
                  <button
                    onClick={() => handleAddToCart(product)}
                    className="flex-1 py-2.5 px-4 bg-[#C9A66B] dark:bg-[#D4B483] hover:bg-[#B8914A] dark:hover:bg-[#C49A5A] text-[#FFFCFA] text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-xs hover:shadow-md cursor-pointer"
                  >
                    <ShoppingBag className="w-3.5 h-3.5 text-[#FFFCFA]" />
                    <span>Move to Cart</span>
                  </button>

                  {/* Delete icon: Muted by default, red on hover */}
                  <button
                    onClick={() => toggleWishlist(product.id)}
                    className="p-2.5 rounded-xl border border-border bg-tile text-muted hover:text-red-600 dark:hover:text-red-400 hover:border-red-500/40 hover:bg-red-500/10 transition-all flex items-center justify-center cursor-pointer"
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
