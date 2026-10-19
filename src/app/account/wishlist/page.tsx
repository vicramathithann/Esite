"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Heart, ArrowLeft, ShoppingBag, Trash2, Smartphone } from "lucide-react";
import { formatINR } from "@/lib/formatters";
import { useApp } from "@/context/AppContext";

export default function WishlistPage() {
  const { wishlist, toggleWishlist, addToCart } = useApp();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadWishlistProducts() {
      if (!wishlist || wishlist.length === 0) {
        setProducts([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const res = await fetch("/api/products");
        const data = await res.json();
        if (data.success && data.products) {
          const filtered = data.products.filter((p: any) => wishlist.includes(p.id));
          setProducts(filtered);
        }
      } catch (err) {
        console.error("Failed to load wishlist products:", err);
      } finally {
        setLoading(false);
      }
    }

    loadWishlistProducts();
  }, [wishlist]);

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
    <div className="min-h-screen bg-slate-950 text-slate-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href="/account"
            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Account
          </Link>
          <span className="text-xs text-slate-400 font-mono">
            {products.length} Saved Devices
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <Heart className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">My Wishlist</h1>
              <p className="text-xs text-slate-400">Saved smartphones and mobile gear you want to buy later.</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-400">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-sm">Loading wishlist...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
            <Heart className="w-12 h-12 text-slate-700 mx-auto mb-3" />
            <h3 className="text-base font-bold text-white mb-1">Your Wishlist is Empty</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mb-6">
              Tap the heart icon on any smartphone to save it to your wishlist and monitor prices.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#C9A66B] dark:bg-[#D4B483] hover:bg-[#B8914A] dark:hover:bg-[#C49A5A] active:bg-[#A67C3D] text-[#FFFCFA] text-xs font-semibold rounded-xl transition-all shadow-sm"
            >
              <Smartphone className="w-4 h-4" /> Explore Smartphones
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {products.map((product) => (
              <div
                key={product.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between hover:border-slate-700 transition"
              >
                <div className="flex gap-4">
                  <div className="relative w-24 h-24 bg-slate-950 border border-slate-800 rounded-xl p-2 flex-shrink-0">
                    <Image
                      src={product.imageUrl || "/images/placeholder.png"}
                      alt={product.name}
                      fill
                      className="object-contain"
                    />
                  </div>
                  <div className="flex-1">
                    <span className="text-[10px] uppercase font-bold text-[#C9A66B] dark:text-[#D4B483] tracking-wider">
                      {product.brand}
                    </span>
                    <h3 className="text-sm font-semibold text-white line-clamp-1">{product.name}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">{product.processor} • {product.ram}</p>
                    <div className="text-sm font-bold text-white mt-2">
                      {formatINR(product.basePrice)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-800/80">
                  <button
                    onClick={() => handleAddToCart(product)}
                    className="flex-1 py-2 px-3 bg-[#C9A66B] dark:bg-[#D4B483] hover:bg-[#B8914A] dark:hover:bg-[#C49A5A] active:bg-[#A67C3D] text-[#FFFCFA] text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-xs"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" /> Move to Cart
                  </button>
                  <button
                    onClick={() => toggleWishlist(product.id)}
                    className="p-2 border border-[#C9A66B]/30 dark:border-[#D4B483]/30 bg-[#C9A66B]/10 dark:bg-[#D4B483]/10 hover:bg-[#C9A66B]/20 dark:hover:bg-[#D4B483]/20 text-[#8C6226] dark:text-[#E5CBA2] rounded-xl transition-all"
                    title="Remove from wishlist"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
