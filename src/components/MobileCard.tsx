"use client";

import React, { useState } from "react";
import Link from "next/link";
import MobileImage from "@/components/MobileImage";
import { MobileProductData, ProductColor, StorageOption } from "@/lib/types";
import { useApp } from "@/context/AppContext";
import { 
  Check, 
  Layers, 
  AlertCircle,
  X,
  ShoppingBag
} from "lucide-react";
import { calculateEMI } from "@/lib/formatters";

interface MobileCardProps {
  product: MobileProductData;
}

export default function MobileCard({ product }: MobileCardProps) {
  const { addToCart, addToCompare, compareList } = useApp();

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
    addToCompare(product);
  };

  return (
    <div className="bg-card border border-border rounded-[20px] p-4 sm:p-5 flex flex-col justify-between shadow-xs hover:-translate-y-1 hover:shadow-md transition-all duration-200 group relative">
      <div>
        {/* Top Minimalist Tag */}
        <div className="flex items-center justify-between w-full mb-2.5">
          <span className="text-[11px] font-semibold tracking-tight text-accent uppercase">
            {product.brand}
          </span>
          {product.isFeatured && (
            <span className="text-[10px] font-medium text-muted bg-tile px-2 py-0.5 rounded-full border border-border/40">
              Featured
            </span>
          )}
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
                  ? "ring-2 ring-offset-2 ring-accent scale-110"
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
            className="text-sm sm:text-base font-bold text-foreground hover:text-accent transition-colors duration-200 line-clamp-1 block leading-snug"
          >
            {product.name}
          </Link>

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
                    ? "bg-foreground text-background font-semibold"
                    : "bg-tile text-muted hover:text-foreground border border-border/50"
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
              className="w-full py-2 px-3 text-xs font-medium rounded-full bg-tile text-muted border border-border cursor-pointer flex items-center justify-center gap-1.5 transition-colors"
              title="Out of stock"
            >
              <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
              <span>Out of Stock</span>
            </button>
          ) : (
            <button
              onClick={handleAddToCart}
              className={`w-full py-2 px-3 text-xs font-semibold rounded-full transition-all duration-200 cursor-pointer shadow-xs flex items-center justify-center gap-1.5 ${
                isAdded
                  ? "bg-emerald-600 text-white"
                  : "bg-accent hover:opacity-90 text-white dark:text-[#0B0B0C]"
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
        <div className="grid grid-cols-2 gap-1.5 pt-0.5">
          <Link
            href={`/mobile/${product.id}`}
            className="py-1.5 px-2 text-[11px] rounded-full text-center font-medium bg-tile hover:bg-tile/80 text-foreground border border-border transition-all duration-200 block"
          >
            Buy Now
          </Link>

          <button
            onClick={handleToggleCompare}
            className={`py-1.5 px-2 text-[11px] rounded-full text-center font-medium transition-all duration-200 cursor-pointer border ${
              isCompared
                ? "bg-accent/15 text-accent border-accent/30 font-semibold"
                : "bg-tile hover:bg-tile/80 text-muted hover:text-foreground border-border"
            }`}
          >
            {isCompared ? "In Compare" : "Compare"}
          </button>
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
              className="absolute top-4 right-4 text-muted hover:text-foreground p-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-bold text-base text-foreground">
                  Currently Out of Stock
                </h3>
                <p className="text-xs text-muted leading-relaxed">
                  We&apos;re sorry, <strong>{product.name}</strong> is currently out of stock.
                </p>
                <p className="text-xs text-accent bg-accent/10 p-2.5 rounded-[12px] border border-accent/20 mt-2">
                  📢 We will notify you once fresh stock is replenished.
                </p>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-border flex justify-end">
              <button
                onClick={() => setOutOfStockAlert(false)}
                className="py-2 px-5 text-xs font-semibold rounded-full bg-foreground text-background cursor-pointer transition-colors"
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