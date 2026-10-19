"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import MobileImage from "@/components/MobileImage";
import { MobileProductData, ProductColor, StorageOption } from "@/lib/types";
import { useApp } from "@/context/AppContext";
import { 
  Check, 
  Layers, 
  AlertCircle,
  X,
  ShoppingBag,
  Heart,
  Star
} from "lucide-react";
import { calculateEMI } from "@/lib/formatters";

interface MobileCardProps {
  product: MobileProductData;
}

export default function MobileCard({ product }: MobileCardProps) {
  const router = useRouter();
  const { 
    addToCart, 
    addToCompare, 
    removeFromCompare,
    compareList, 
    toggleWishlist, 
    isInWishlist, 
    siteSettings 
  } = useApp();

  const safeStorageList = Array.isArray(product.storageOptions) && product.storageOptions.length > 0
    ? product.storageOptions
    : [{ size: "256GB", price: product.basePrice || 49999 }];

  const safeColorsList = Array.isArray(product.colors) && product.colors.length > 0
    ? product.colors
    : [{ name: "Default", hex: "#1e1e1e" }];

  const [selectedStorage, setSelectedStorage] = useState<StorageOption>(
    safeStorageList[0]
  );

  const [selectedColor, setSelectedColor] = useState<ProductColor>(
    safeColorsList[0]
  );

  const [isAdded, setIsAdded] = useState(false);
  const [outOfStockAlert, setOutOfStockAlert] = useState(false);

  const isOutOfStock = !product.inStock || (product.stock !== undefined && product.stock <= 0);

  const currentPrice = selectedStorage?.price || product.basePrice || 49999;
  const originalPrice = product.originalPrice || currentPrice + 10000;
  const emiAmount = calculateEMI(currentPrice);
  const isCompared = compareList.some((p) => p.id === product.id);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isOutOfStock) {
      setOutOfStockAlert(true);
      return;
    }

    addToCart({
      id: `${product.id}-${selectedStorage?.size || "256GB"}-${selectedColor?.name || "Default"}`,
      productId: product.id,
      name: product.name,
      brand: product.brand,
      imageUrl: product.imageUrl,
      selectedColor: selectedColor || safeColorsList[0],
      selectedStorage: selectedStorage || safeStorageList[0],
      price: currentPrice,
      quantity: 1,
      warrantyMonths: product.warrantyMonths || 12,
    });

    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 1800);
  };

  const handleToggleCompare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isCompared) {
      removeFromCompare(product.id);
    } else {
      addToCompare(product);
    }
  };

  return (
    <div className="bg-card border border-border rounded-[20px] p-4 sm:p-5 flex flex-col justify-between shadow-xs hover:-translate-y-1 hover:shadow-md transition-all duration-200 group relative">
      <div>
        {/* Top Minimalist Tag & Wishlist Button */}
        <div className="flex items-center justify-between w-full mb-2.5">
          <span className="text-[11px] font-semibold tracking-tight text-accent uppercase">
            {product.brand}
          </span>
          <div className="flex items-center gap-1.5">
            {product.isFeatured && (
              <span className="text-[10px] font-medium text-muted bg-tile px-2 py-0.5 rounded-full border border-border/40">
                Featured
              </span>
            )}
            {siteSettings.showWishlist === "true" && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  toggleWishlist(product.id);
                }}
                className={`p-1.5 rounded-full transition-all duration-200 cursor-pointer ${
                  isInWishlist(product.id)
                    ? "text-rose-500 bg-rose-500/10 hover:bg-rose-500/20"
                    : "text-muted hover:text-rose-500 hover:bg-tile"
                }`}
                title={isInWishlist(product.id) ? "Remove from wishlist" : "Add to wishlist"}
              >
                <Heart className={`w-3.5 h-3.5 ${isInWishlist(product.id) ? "fill-rose-500 text-rose-500" : ""}`} />
              </button>
            )}
          </div>
        </div>

        {/* Product Image Frame: in dark mode, tile is slightly lighter than card */}
        <Link 
          href={`/mobile/${product.id}`}
          className="block relative aspect-square w-full mb-3.5 p-4 rounded-[16px] bg-tile border border-border/50 group-hover:border-border transition-colors duration-200 flex items-center justify-center overflow-hidden"
        >
          <MobileImage
            src={product.imageUrl}
            alt={product.name}
            phoneId={product.id}
            brand={product.brand}
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
            className="object-contain group-hover:scale-105 transition-transform duration-200 ease-out"
          />
        </Link>

        {/* Color Swatch Dots */}
        <div className="flex items-center justify-center gap-1.5 mb-3">
          {(product.colors || safeColorsList).slice(0, 5).map((color) => (
            <button
              key={color.name}
              type="button"
              onClick={() => setSelectedColor(color)}
              className={`w-3.5 h-3.5 rounded-full transition-all duration-200 cursor-pointer ${
                selectedColor?.name === color.name
                  ? "ring-2 ring-offset-2 ring-[#C9A66B] dark:ring-[#D4B483] scale-110"
                  : "opacity-75 hover:opacity-100"
              }`}
              style={{ backgroundColor: color.hex }}
              title={color.name}
            />
          ))}
        </div>

        {/* Product Name & Details */}
        <div className="space-y-1">
          <Link 
            href={`/mobile/${product.id}`}
            className="text-sm sm:text-base font-bold text-foreground hover:text-[#C9A66B] dark:hover:text-[#D4B483] transition-colors duration-200 line-clamp-1 block leading-snug"
          >
            {product.name}
          </Link>

          {/* Customer Reviews & Rating Badge (Controllable by Admin) */}
          {siteSettings.showReviews === "true" && (
            <div className="flex items-center gap-1.5 text-[11px] text-muted">
              <span className="inline-flex items-center gap-0.5 font-bold text-amber-500">
                <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                {product.rating || 4.8}
              </span>
              <span>({product.reviewCount || 120} reviews)</span>
            </div>
          )}

          {/* Price */}
          <div className="pt-0.5 flex items-baseline gap-2">
            <span className="text-base sm:text-lg font-bold text-foreground">
              ₹{currentPrice.toLocaleString("en-IN")}
            </span>
            {originalPrice > currentPrice && (
              <span className="text-xs text-muted line-through font-normal">
                ₹{originalPrice.toLocaleString("en-IN")}
              </span>
            )}
          </div>

          {/* EMI from ₹X/month */}
          <div className="text-xs text-muted">
            EMI from ₹{emiAmount.toLocaleString("en-IN")}/mo
          </div>

          {/* Storage selector pills */}
          <div className="pt-2 flex flex-wrap gap-1">
            {(product.storageOptions || safeStorageList).map((storage) => (
              <button
                key={storage.size}
                type="button"
                onClick={() => setSelectedStorage(storage)}
                className={`px-2.5 py-0.5 text-[10px] sm:text-[11px] rounded-full font-medium transition-all duration-200 cursor-pointer ${
                  selectedStorage?.size === storage.size
                    ? "bg-[#C9A66B] dark:bg-[#D4B483] text-[#FFFCFA] font-semibold shadow-xs"
                    : "bg-[#C9A66B]/10 hover:bg-[#C9A66B]/20 text-[#8C6226] dark:text-[#E2C799] border border-[#C9A66B]/30"
                }`}
              >
                {(storage.size || "").split(" ")[0]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="pt-3.5 space-y-2">
        {/* Add to Cart Button */}
        <div>
          {isOutOfStock ? (
            <button
              type="button"
              onClick={handleAddToCart}
              className="w-full py-2 px-3 text-xs font-medium rounded-full bg-[#C9A66B]/15 text-[#8C6226] dark:text-[#D4B483] border border-[#C9A66B]/30 cursor-pointer flex items-center justify-center gap-1.5 transition-colors"
              title="Out of stock"
            >
              <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Out of Stock</span>
            </button>
          ) : (
            <button
              onClick={handleAddToCart}
              className={`w-full py-2 px-3 text-xs font-semibold rounded-full transition-all duration-200 cursor-pointer shadow-xs flex items-center justify-center gap-1.5 ${
                isAdded
                  ? "bg-[#A67C3D] text-[#FFFCFA]"
                  : "bg-[#C9A66B] dark:bg-[#D4B483] hover:bg-[#B8914A] dark:hover:bg-[#C49A5A] active:bg-[#A67C3D] text-[#FFFCFA]"
              }`}
            >
              {isAdded ? (
                <>
                  <Check className="w-3.5 h-3.5" /> Added to Bag
                </>
              ) : (
                <>
                  <ShoppingBag className="w-3.5 h-3.5" /> Add to Cart
                </>
              )}
            </button>
          )}
        </div>

        {/* Secondary Row: Buy Now & Compare */}
        <div className={siteSettings.showCompare === "true" ? "grid grid-cols-2 gap-1.5 pt-0.5" : "pt-0.5"}>
          <Link
            href={`/mobile/${product.id}`}
            className={`py-1.5 px-2 text-[11px] rounded-full text-center font-semibold bg-[#C9A66B] dark:bg-[#D4B483] hover:bg-[#B8914A] dark:hover:bg-[#C49A5A] active:bg-[#A67C3D] text-[#FFFCFA] shadow-xs transition-all duration-200 block ${
              siteSettings.showCompare === "true" ? "" : "w-full"
            }`}
          >
            Buy Now
          </Link>

          {siteSettings.showCompare === "true" && (
            <button
              onClick={handleToggleCompare}
              title={isCompared ? "Remove from Compare" : "Add to Compare"}
              className={`py-1.5 px-2 text-[11px] rounded-full text-center font-medium transition-all duration-200 cursor-pointer border ${
                isCompared
                  ? "bg-[#C9A66B] dark:bg-[#D4B483] text-[#FFFCFA] border-[#C9A66B] dark:border-[#D4B483] font-semibold shadow-xs"
                  : "bg-[#C9A66B]/10 hover:bg-[#C9A66B]/20 text-[#8C6226] dark:text-[#E2C799] border-[#C9A66B]/40"
              }`}
            >
              {isCompared ? "In Compare ✓" : "Compare"}
            </button>
          )}
        </div>
      </div>

      {/* Out of Stock Alert Modal */}
      {outOfStockAlert && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in"
          onClick={(e) => {
            e.stopPropagation();
            setOutOfStockAlert(false);
          }}
        >
          <div 
            className="bg-card rounded-[20px] shadow-2xl max-w-sm w-full p-6 border border-border relative animate-scale-up text-foreground"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setOutOfStockAlert(false)}
              className="absolute top-4 right-4 text-[#8C6226] hover:text-[#B8914A] dark:text-[#D4B483] p-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-bold text-base text-foreground">
                  Currently Out of Stock
                </h3>
                <p className="text-xs text-muted leading-relaxed">
                  We&apos;re sorry, <strong>{product.name}</strong> is currently out of stock.
                </p>
                <p className="text-xs text-[#8C6226] dark:text-[#D4B483] bg-[#C9A66B]/15 p-2.5 rounded-[12px] border border-[#C9A66B]/30 mt-2">
                  📢 We will notify you once fresh stock is replenished.
                </p>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-border flex justify-end">
              <button
                onClick={() => setOutOfStockAlert(false)}
                className="py-2 px-5 text-xs font-semibold rounded-full bg-[#C9A66B] dark:bg-[#D4B483] hover:bg-[#B8914A] dark:hover:bg-[#C49A5A] active:bg-[#A67C3D] text-[#FFFCFA] cursor-pointer transition-colors shadow-xs"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}