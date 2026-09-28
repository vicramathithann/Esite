"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import MobileImage from "@/components/MobileImage";
import { MobileProductData, ProductColor, StorageOption } from "@/lib/types";
import { useApp } from "@/context/AppContext";
import { 
  Star, 
  Check, 
  ShieldCheck, 
  Layers, 
  Cpu, 
  Camera, 
  Battery,
  AlertCircle,
  X
} from "lucide-react";
import { formatINR, calculateEMI } from "@/lib/formatters";

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
  const discountPercent = Math.max(0, Math.round(((originalPrice - currentPrice) / originalPrice) * 100));
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
    <div className="bg-white border border-gray-200 rounded-sm p-4 flex flex-col justify-between hover:shadow-md transition-shadow relative">
      {/* Top Amazon Badge Ribbon */}
      <div className="absolute top-0 left-0 z-10">
        {product.isFeatured ? (
          <div className="badge-best-seller flex items-center gap-1 shadow-xs">
            <span>#1 Best Seller</span>
            <span className="text-[10px] font-normal opacity-90">in {product.brand}</span>
          </div>
        ) : (
          <div className="badge-vm-choice flex items-center gap-1">
            <span className="text-[#febd69]">VM&apos;s</span>
            <span>Choice</span>
          </div>
        )}
      </div>

      <div>
        {/* Product Image Frame */}
        <Link 
          href={`/mobile/${product.id}`}
          className="block relative aspect-square w-full mt-4 mb-3 p-3 overflow-hidden bg-white"
        >
          <MobileImage
            src={product.imageUrl}
            alt={product.name}
            phoneId={product.id}
            brand={product.brand}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-contain hover:scale-105 transition-transform duration-300"
          />
        </Link>

        {/* Color Swatch Dots */}
        <div className="flex items-center justify-center gap-1.5 mb-2.5">
          {(product.colors || safeColorsList).slice(0, 4).map((color) => (
            <button
              key={color.name}
              type="button"
              onClick={() => setSelectedColor(color)}
              className={`w-3.5 h-3.5 rounded-full border transition-all ${
                selectedColor?.name === color.name
                  ? "ring-2 ring-offset-1 ring-[#e77600] scale-110"
                  : "border-gray-300 opacity-80"
              }`}
              style={{ backgroundColor: color.hex }}
              title={color.name}
            />
          ))}
        </div>

        {/* Product Title */}
        <div className="space-y-1">
          {/* Brand Tag */}
          <div className="text-[11px] font-semibold tracking-wide uppercase text-[#007185]">
            {product.brand}
          </div>

          <Link 
            href={`/mobile/${product.id}`}
            className="text-sm font-semibold text-[#0f1111] hover:text-[#c7511f] line-clamp-2 leading-snug"
          >
            {product.name} ({selectedColor?.name || "Default"})
          </Link>

          {/* RAM & Storage Badges */}
          <div className="flex items-center gap-1.5 pt-0.5 text-xs text-gray-700">
            <span className="font-medium bg-gray-100 px-1.5 py-0.5 rounded text-[11px] border border-gray-200">
              {product.ram || "8GB"}
            </span>
            <span className="text-gray-400">|</span>
            <span className="font-medium bg-gray-100 px-1.5 py-0.5 rounded text-[11px] border border-gray-200">
              {selectedStorage?.size || "256GB"}
            </span>
          </div>

          {/* Amazon Star Ratings */}
          <div className="flex items-center gap-1.5 text-xs pt-1">
            <div className="flex text-[#ffa41c]">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-3.5 h-3.5 ${
                    i < Math.floor(product.rating || 4.5) ? "fill-[#ffa41c]" : "fill-gray-200 text-gray-200"
                  }`}
                />
              ))}
            </div>
            <span className="text-[#007185] hover:underline cursor-pointer font-medium text-xs">
              {product.reviewCount || 100}
            </span>
          </div>

          {/* Storage Variant Selectors (Amazon-Style Pill Options) */}
          <div className="pt-1.5 flex flex-wrap gap-1">
            {(product.storageOptions || safeStorageList).map((storage) => (
              <button
                key={storage.size}
                type="button"
                onClick={() => setSelectedStorage(storage)}
                className={`px-2 py-0.5 text-[11px] rounded-xs border font-medium transition-all ${
                  selectedStorage?.size === storage.size
                    ? "border-[#e77600] bg-[#fef8f2] text-[#0f1111] font-bold ring-1 ring-[#e77600]"
                    : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                {(storage.size || "").split(" ")[0]}
              </button>
            ))}
          </div>

          {/* Deal Tag */}
          <div className="pt-2 flex items-center gap-2">
            <span className="bg-[#cc0c39] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-xs uppercase">
              Limited time deal
            </span>
            {discountPercent > 0 && (
              <span className="text-[#cc0c39] text-xs font-bold">
                -{discountPercent}%
              </span>
            )}
          </div>

          {/* Price Block */}
          <div className="pt-0.5">
            <div className="flex items-baseline">
              <span className="text-xs align-top font-normal mr-0.5">₹</span>
              <span className="text-2xl font-bold text-[#0f1111]">
                {currentPrice.toLocaleString("en-IN")}
              </span>
            </div>
            <div className="text-xs text-gray-500">
              M.R.P.: <span className="line-through">₹{originalPrice.toLocaleString("en-IN")}</span>
            </div>
            <div className="text-[11px] text-gray-600 mt-0.5">
              EMI starts from ₹{calculateEMI(currentPrice).toLocaleString("en-IN")}/mo
            </div>
          </div>

          {/* Stock Availability Indicator */}
          <div className="pt-1 text-xs">
            {isOutOfStock ? (
              <span className="text-[#b12704] font-bold flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                Currently Out of Stock
              </span>
            ) : (
              <span className="text-[#007600] font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#007600]"></span>
                In Stock &bull; Ready to Ship
              </span>
            )}
          </div>

          {/* Key Hardware Specs */}
          <div className="pt-2 border-t border-gray-100 text-[11px] text-gray-600 space-y-1">
            <div className="flex items-center gap-1.5 truncate">
              <Cpu className="w-3 h-3 text-gray-400 shrink-0" />
              <span className="truncate">{(product.processor || "Flagship Octa-Core").split("(")[0]}</span>
            </div>
            <div className="flex items-center gap-1.5 truncate">
              <Camera className="w-3 h-3 text-gray-400 shrink-0" />
              <span className="truncate">{(product.camera || "50MP Main").split("+")[0]}</span>
            </div>
            <div className="flex items-center gap-1.5 truncate">
              <Battery className="w-3 h-3 text-gray-400 shrink-0" />
              <span className="truncate">{(product.battery || "5000 mAh").split(",")[0]}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="pt-4 space-y-1.5">
        <Link
          href={`/mobile/${product.id}`}
          className="w-full py-1.5 px-4 text-xs font-semibold text-center block rounded-full border border-gray-300 bg-[#f0f2f2] hover:bg-[#e3e6e6] text-[#0f1111] transition-all shadow-xs"
        >
          View Details
        </Link>

        {isOutOfStock ? (
          <button
            type="button"
            onClick={handleAddToCart}
            className="w-full py-1.5 px-4 text-xs font-bold rounded-full shadow-xs transition-all bg-gray-100 hover:bg-red-50 text-red-700 border border-red-200 cursor-pointer flex items-center justify-center gap-1.5"
            title="Item is out of stock - click to view alert"
          >
            <AlertCircle className="w-3.5 h-3.5 text-red-600" />
            <span>Currently Out of Stock</span>
          </button>
        ) : (
          <button
            onClick={handleAddToCart}
            className={`w-full py-1.5 px-4 text-xs font-medium rounded-full shadow-xs transition-all ${
              isAdded
                ? "bg-emerald-600 text-white font-bold"
                : "btn-amazon-yellow"
            }`}
          >
            {isAdded ? (
              <span className="flex items-center justify-center gap-1">
                <Check className="w-3.5 h-3.5" /> Added to Cart
              </span>
            ) : (
              "Add to Cart"
            )}
          </button>
        )}

        <div className="grid grid-cols-2 gap-1.5">
          {isOutOfStock ? (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setOutOfStockAlert(true);
              }}
              className="py-1 px-2 text-xs rounded-full border border-gray-300 bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-red-700 text-center font-bold cursor-pointer"
            >
              Unavailable
            </button>
          ) : (
            <Link
              href={`/mobile/${product.id}`}
              className="btn-amazon-orange py-1 px-2 text-xs text-center block"
            >
              Buy Now
            </Link>
          )}

          <button
            onClick={handleToggleCompare}
            className={`py-1 px-2 text-xs rounded-full border text-center font-medium transition-colors ${
              isCompared
                ? "bg-gray-200 border-gray-400 text-gray-900"
                : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
            }`}
          >
            {isCompared ? "In Compare" : "Compare"}
          </button>
        </div>
      </div>

      {/* Out of Stock Interactive Modal Alert */}
      {outOfStockAlert && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fade-in"
          onClick={(e) => {
            e.stopPropagation();
            setOutOfStockAlert(false);
          }}
        >
          <div 
            className="bg-white rounded-lg shadow-2xl max-w-sm w-full p-5 border border-red-200 relative animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setOutOfStockAlert(false)}
              className="absolute top-3 right-3 text-gray-400 hover:text-black p-1"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-sm text-[#0f1111]">
                  Currently Out of Stock
                </h3>
                <p className="text-xs text-gray-600 leading-relaxed">
                  We&apos;re sorry, <strong>{product.name}</strong> is currently out of stock and cannot be purchased right now.
                </p>
                <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded border border-amber-200 mt-2">
                  📢 We will alert you once fresh stock arrives at the fulfillment center.
                </p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setOutOfStockAlert(false)}
                className="btn-amazon-yellow py-1.5 px-4 text-xs font-bold rounded-sm shadow-xs cursor-pointer"
              >
                Understood, Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}