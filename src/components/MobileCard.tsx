"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import MobileImage from "@/components/MobileImage";
import { MobileProductData, ProductColor, ProductVariantData } from "@/lib/types";
import { useApp } from "@/context/AppContext";
import { 
  Check, 
  AlertCircle,
  X,
  ShoppingBag,
  Heart,
  Star,
  Layers
} from "lucide-react";
import { calculateEMI } from "@/lib/formatters";

interface MobileCardProps {
  product: MobileProductData;
}

function MobileCardComponent({ product }: MobileCardProps) {

  const { 
    addToCart, 
    addToCompare, 
    removeFromCompare,
    compareList, 
    toggleWishlist, 
    isInWishlist, 
    siteSettings 
  } = useApp();

  const variantsList: ProductVariantData[] = useMemo(() => {
    if (Array.isArray(product.variants) && product.variants.length > 0) {
      return product.variants;
    }
    if (Array.isArray(product.storageOptions) && product.storageOptions.length > 0) {
      return product.storageOptions.map((opt: any, idx: number) => ({
        id: opt.id || `${product.id}-${(opt.size || opt.storage || "128gb").toLowerCase().replace(/[^a-z0-9]/g, "")}`,
        productId: product.id,
        ram: opt.ram || (product.ram ? product.ram.split('/')[0].trim() : "8GB"),
        storage: opt.size || opt.storage || "128GB",
        basePrice: opt.basePrice || opt.price || product.basePrice || 49999,
        originalPrice: opt.originalPrice || product.originalPrice,
        stock: opt.stock !== undefined ? opt.stock : (product.stock !== undefined ? product.stock : 20),
        inStock: (opt.stock !== undefined ? opt.stock : (product.stock !== undefined ? product.stock : 20)) > 0,
        sku: opt.sku || "",
        isDefault: opt.isDefault !== undefined ? opt.isDefault : idx === 0,
      }));
    }
    return [{
      id: `${product.id}-default`,
      productId: product.id,
      ram: product.ram ? product.ram.split('/')[0].trim() : "8GB",
      storage: "128GB",
      basePrice: product.basePrice || 49999,
      originalPrice: product.originalPrice || (product.basePrice || 49999) + 10000,
      stock: product.stock !== undefined ? product.stock : 20,
      inStock: (product.stock !== undefined ? product.stock : 20) > 0,
      sku: "",
      isDefault: true,
    }];
  }, [product.variants, product.storageOptions, product.basePrice, product.originalPrice, product.stock, product.id, product.ram]);

  const defaultVariant = useMemo(() => {
    return variantsList.find((v) => v.isDefault) || variantsList[0];
  }, [variantsList]);

  const [selectedVariant, setSelectedVariant] = useState<ProductVariantData>(defaultVariant);

  const safeColorsList = Array.isArray(product.colors) && product.colors.length > 0
    ? product.colors
    : [{ name: "Default", hex: "#1e1e1e" }];

  const [selectedColor, setSelectedColor] = useState<ProductColor>(
    safeColorsList[0]
  );

  // Sync selected variant and color whenever product details are updated
  useEffect(() => {
    if (defaultVariant) {
      setSelectedVariant(defaultVariant);
    }
    if (safeColorsList[0]) {
      setSelectedColor(safeColorsList[0]);
    }
  }, [defaultVariant, product.basePrice, product.colors, product.imageUrl]);

  const [isAdded, setIsAdded] = useState(false);
  const [outOfStockAlert, setOutOfStockAlert] = useState(false);

  const isOutOfStock = !selectedVariant?.inStock || (selectedVariant?.stock !== undefined && selectedVariant.stock <= 0);

  const currentPrice = selectedVariant?.basePrice || product.basePrice || 49999;
  const originalPrice = selectedVariant?.originalPrice || product.originalPrice || currentPrice + 10000;
  const discountPercent = originalPrice > currentPrice ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100) : 0;
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
      id: `${product.id}-${selectedVariant?.id || selectedVariant?.storage}-${selectedColor?.name || "Default"}`,
      productId: product.id,
      variantId: selectedVariant?.id,
      name: product.name,
      brand: product.brand,
      imageUrl: product.imageUrl,
      selectedColor: selectedColor || safeColorsList[0],
      selectedStorage: { size: selectedVariant?.storage || "128GB", price: currentPrice },
      selectedRam: selectedVariant?.ram,
      price: currentPrice,
      quantity: 1,
      warrantyMonths: product.warrantyMonths || 12,
      inStock: !isOutOfStock,
      stock: selectedVariant?.stock,
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
    <div className="bg-card border border-border rounded-xl sm:rounded-[20px] p-2 sm:p-5 flex flex-col justify-between shadow-2xs sm:shadow-xs hover:-translate-y-0.5 sm:hover:-translate-y-1 hover:shadow-md transition-all duration-200 group relative">
      <div>
        {/* Desktop Top Minimalist Tag & Wishlist Button (sm and up) */}
        <div className="hidden sm:flex items-center justify-between w-full mb-2.5">
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

        {/* Product Image Frame */}
        {(() => {
          const primaryImg = product.images?.find((img) => img.isPrimary)?.url || product.imageUrl;
          const activeColorImage = selectedColor
            ? product.images?.find((img) => img.colorKey && img.colorKey.toLowerCase() === selectedColor.name.toLowerCase())?.url
            : null;
          const displayImage = activeColorImage || primaryImg;

          return (
            <div className="relative aspect-square w-full mb-2 sm:mb-3.5">
              {/* Phone Overlay: Discount Badge top-left */}
              {discountPercent > 0 && (
                <span className="sm:hidden absolute top-1.5 left-1.5 z-10 text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-600 text-white shadow-2xs pointer-events-none">
                  {discountPercent}% off
                </span>
              )}

              {/* Phone Overlay: Compare & Wishlist top-right */}
              <div className="sm:hidden absolute top-1.5 right-1.5 z-10 flex items-center gap-1">
                {siteSettings.showCompare === "true" && (
                  <button
                    type="button"
                    onClick={handleToggleCompare}
                    title={isCompared ? "Remove from Compare" : "Add to Compare"}
                    className={`w-7 h-7 rounded-full flex items-center justify-center shadow-xs backdrop-blur-md transition-colors cursor-pointer ${
                      isCompared
                        ? "bg-[#C9A66B] text-white"
                        : "bg-white/90 dark:bg-card/90 text-muted hover:text-foreground border border-border/50"
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                  </button>
                )}
                {siteSettings.showWishlist === "true" && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleWishlist(product.id);
                    }}
                    className={`w-7 h-7 rounded-full flex items-center justify-center shadow-xs backdrop-blur-md transition-colors cursor-pointer ${
                      isInWishlist(product.id)
                        ? "bg-rose-50 dark:bg-rose-950/60 text-rose-500 border border-rose-200 dark:border-rose-800/40"
                        : "bg-white/90 dark:bg-card/90 text-muted hover:text-rose-500 border border-border/50"
                    }`}
                    title={isInWishlist(product.id) ? "Remove from wishlist" : "Add to wishlist"}
                  >
                    <Heart className={`w-3.5 h-3.5 ${isInWishlist(product.id) ? "fill-rose-500 text-rose-500" : ""}`} />
                  </button>
                )}
              </div>

              <Link 
                href={`/mobile/${product.id}`}
                className="block w-full h-full p-2 sm:p-4 rounded-lg sm:rounded-[16px] bg-white dark:bg-zinc-900/60 border border-border/50 group-hover:border-border transition-colors duration-200 flex items-center justify-center overflow-hidden"
              >
                <MobileImage
                  src={displayImage}
                  alt={product.name}
                  phoneId={product.id}
                  brand={product.brand}
                  sizes="(max-width: 640px) 45vw, (max-width: 1200px) 33vw, 25vw"
                  className="object-contain group-hover:scale-105 transition-transform duration-200 ease-out"
                />
              </Link>
            </div>
          );
        })()}

        {/* Color Swatch Dots: Desktop (up to 5) */}
        <div className="hidden sm:flex items-center justify-center gap-1.5 mb-3">
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

        {/* Color Swatch Dots: Phone (max 4 then +N) */}
        <div className="flex sm:hidden items-center justify-center gap-1 mb-1.5">
          {(product.colors || safeColorsList).slice(0, 4).map((color) => (
            <button
              key={color.name}
              type="button"
              onClick={() => setSelectedColor(color)}
              className={`w-2.5 h-2.5 rounded-full transition-all duration-150 cursor-pointer ${
                selectedColor?.name === color.name
                  ? "ring-1.5 ring-offset-1 ring-[#C9A66B] dark:ring-[#D4B483] scale-110"
                  : "opacity-70 hover:opacity-100"
              }`}
              style={{ backgroundColor: color.hex }}
              title={color.name}
            />
          ))}
          {(product.colors || safeColorsList).length > 4 && (
            <span className="text-[8px] text-muted font-medium ml-0.5">
              +{(product.colors || safeColorsList).length - 4}
            </span>
          )}
        </div>

        {/* Desktop Product Name & Details (sm and up) */}
        <div className="hidden sm:block space-y-1">
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

          {/* Storage selector pills from variants */}
          <div className="pt-2 flex flex-wrap gap-1">
            {variantsList.map((v) => {
              const isVarOos = !v.inStock || (v.stock !== undefined && v.stock <= 0);
              const isSelected = selectedVariant?.id ? selectedVariant.id === v.id : selectedVariant?.storage === v.storage;
              return (
                <button
                  key={v.id || v.storage}
                  type="button"
                  disabled={isVarOos}
                  onClick={() => !isVarOos && setSelectedVariant(v)}
                  className={`px-2.5 py-0.5 text-[10px] sm:text-[11px] rounded-full font-medium transition-all duration-200 ${
                    isVarOos
                      ? "opacity-40 cursor-not-allowed line-through bg-tile text-muted border border-border"
                      : isSelected
                      ? "bg-[#C9A66B] dark:bg-[#D4B483] text-[#FFFCFA] font-semibold shadow-xs cursor-pointer"
                      : "bg-[#C9A66B]/10 hover:bg-[#C9A66B]/20 text-[#8C6226] dark:text-[#E2C799] border border-[#C9A66B]/30 cursor-pointer"
                  }`}
                  title={isVarOos ? `${v.storage} - Out of stock` : `${v.storage} (₹${v.basePrice.toLocaleString("en-IN")})`}
                >
                  {(v.storage || "").split(" ")[0]}
                  {isVarOos && <span className="ml-1 text-[9px] no-underline font-normal">OOS</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Phone Product Name & Details (<sm) */}
        <div className="sm:hidden space-y-0.5">
          <span className="text-[10px] font-semibold tracking-wider text-muted uppercase block leading-none">
            {product.brand}
          </span>

          <Link 
            href={`/mobile/${product.id}`}
            className="text-xs font-bold text-foreground hover:text-[#C9A66B] dark:hover:text-[#D4B483] transition-colors line-clamp-2 block leading-tight pt-0.5"
          >
            {product.name}
          </Link>

          {/* Green rating pill + review count */}
          {siteSettings.showReviews === "true" && (
            <div className="flex items-center gap-1 text-[10px] text-muted pt-0.5">
              <span className="inline-flex items-center gap-0.5 font-bold bg-emerald-600 dark:bg-emerald-700 text-white text-[9px] px-1.5 py-0.5 rounded leading-none">
                {product.rating || 4.7} <Star className="w-2.5 h-2.5 fill-white text-white" />
              </span>
              <span>({product.reviewCount || 120})</span>
            </div>
          )}

          {/* Price Row: Bold current, struck original, % off */}
          <div className="pt-0.5 flex items-baseline gap-1.5 flex-wrap">
            <span className="text-sm font-bold text-foreground">
              ₹{currentPrice.toLocaleString("en-IN")}
            </span>
            {originalPrice > currentPrice && (
              <span className="text-[10px] text-muted line-through font-normal">
                ₹{originalPrice.toLocaleString("en-IN")}
              </span>
            )}
            {discountPercent > 0 && (
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                {discountPercent}% off
              </span>
            )}
          </div>

          {/* EMI and Stock status */}
          <div className="text-[10px] text-muted flex items-center justify-between">
            <span>EMI from ₹{emiAmount.toLocaleString("en-IN")}/mo</span>
            {selectedVariant?.stock !== undefined && selectedVariant.stock > 0 && selectedVariant.stock <= 5 && (
              <span className="text-amber-600 dark:text-amber-400 font-semibold text-[9px]">Only {selectedVariant.stock} left</span>
            )}
          </div>

          {/* Storage summary text line (instead of bulky chips) */}
          <div className="text-[10px] text-muted truncate pt-0.5">
            {variantsList.map((v) => (v.storage || "").split(" ")[0]).slice(0, 2).join(", ")}
            {variantsList.length > 2 ? ` +${variantsList.length - 2} more` : ""}
          </div>
        </div>
      </div>

      {/* Phone Action Button: ONE primary 38-40px Add to Cart button */}
      <div className="sm:hidden pt-2">
        {isOutOfStock ? (
          <button
            type="button"
            onClick={handleAddToCart}
            className="w-full h-9 text-[11px] font-medium rounded-lg bg-[#C9A66B]/15 text-[#8C6226] dark:text-[#D4B483] border border-[#C9A66B]/30 flex items-center justify-center gap-1 cursor-pointer"
          >
            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
            <span>Out of Stock</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleAddToCart}
            className={`w-full h-9 text-xs font-semibold rounded-lg transition-all duration-150 flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer ${
              isAdded
                ? "bg-[#A67C3D] text-[#FFFCFA]"
                : "bg-[#C9A66B] dark:bg-[#D4B483] hover:bg-[#B8914A] active:scale-[0.98] text-[#FFFCFA]"
            }`}
          >
            {isAdded ? (
              <>
                <Check className="w-3.5 h-3.5" /> Added
              </>
            ) : (
              <>
                <ShoppingBag className="w-3.5 h-3.5" /> Add to Cart
              </>
            )}
          </button>
        )}
      </div>

      {/* Desktop Action Buttons (sm and up) */}
      <div className="hidden sm:block pt-3.5 space-y-2">
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

const MobileCard = React.memo(MobileCardComponent);
export default MobileCard;

export function MobileCardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-xl sm:rounded-[20px] p-2 sm:p-5 flex flex-col justify-between animate-pulse">
      <div>
        <div className="aspect-square w-full rounded-lg sm:rounded-[16px] bg-tile mb-2" />
        <div className="h-2.5 w-12 bg-tile rounded mb-1" />
        <div className="h-3.5 w-full bg-tile rounded mb-1" />
        <div className="h-3.5 w-3/4 bg-tile rounded mb-2" />
        <div className="h-3 w-16 bg-tile rounded mb-2" />
        <div className="h-4 w-20 bg-tile rounded" />
      </div>
      <div className="h-9 w-full bg-tile rounded-lg mt-2" />
    </div>
  );
}