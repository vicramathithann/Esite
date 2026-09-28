"use client";

import React, { useState, useEffect, use } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MobileProductData, ProductColor, StorageOption } from "@/lib/types";
import { DEFAULT_PRODUCTS } from "@/lib/catalogData";
import { useApp } from "@/context/AppContext";
import { 
  Star, 
  Check, 
  ShieldCheck, 
  Lock, 
  MapPin, 
  RotateCcw, 
  Truck, 
  CreditCard, 
  Tag, 
  ChevronRight,
  Layers,
  Sparkles,
  BellRing,
  AlertCircle,
  X
} from "lucide-react";
import { formatINR, calculateEMI } from "@/lib/formatters";

export default function MobileDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { addToCart, addToCompare, compareList, currentUser } = useApp();

  const defaultMatch = DEFAULT_PRODUCTS.find((p) => p.id === resolvedParams.id) || null;

  const [product, setProduct] = useState<MobileProductData | null>(defaultMatch);
  const [loading, setLoading] = useState(!defaultMatch);
  const [selectedImage, setSelectedImage] = useState<string>(defaultMatch?.imageUrl || "");
  const [selectedColor, setSelectedColor] = useState<ProductColor | null>(defaultMatch?.colors[0] || null);
  const [selectedStorage, setSelectedStorage] = useState<StorageOption | null>(defaultMatch?.storageOptions[0] || null);
  const [quantity, setQuantity] = useState(1);
  const [isAdded, setIsAdded] = useState(false);
  const [outOfStockAlert, setOutOfStockAlert] = useState(false);

  useEffect(() => {
    async function fetchProduct() {
      try {
        const res = await fetch(`/api/products/${resolvedParams.id}`);
        const data = await res.json();
        if (data.success && data.product) {
          setProduct(data.product);
          setSelectedImage(data.product.imageUrl);
          if (data.product.colors && data.product.colors.length > 0) {
            setSelectedColor(data.product.colors[0]);
          }
          if (data.product.storageOptions && data.product.storageOptions.length > 0) {
            setSelectedStorage(data.product.storageOptions[0]);
          }
        }
      } catch (e) {
        console.error("Failed to load product from API, using default", e);
      } finally {
        setLoading(false);
      }
    }
    fetchProduct();
  }, [resolvedParams.id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#eaeded] text-gray-700">
        <div className="space-y-3 text-center">
          <div className="w-10 h-10 border-4 border-[#e77600] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="font-medium text-xs">Loading smartphone specs from VM Mobiles...</p>
        </div>
      </div>
    );
  }

  if (!product || !selectedStorage || !selectedColor) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center p-6 bg-[#eaeded]">
        <h2 className="text-xl font-bold text-[#0f1111] mb-2">Smartphone Not Found</h2>
        <p className="text-gray-600 text-sm mb-6">
          The requested device does not exist in our catalog.
        </p>
        <Link href="/" className="btn-amazon-yellow py-2 px-6 text-xs font-bold">
          Back to VM Mobiles Store
        </Link>
      </div>
    );
  }

  const currentPrice = selectedStorage.price;
  const originalPrice = product.originalPrice || currentPrice + 10000;
  const savings = Math.max(0, originalPrice - currentPrice);
  const discountPercent = Math.round((savings / originalPrice) * 100);
  const isCompared = compareList.some((p) => p.id === product.id);

  const isOutOfStock = !product.inStock || ((product as any).stock !== undefined && (product as any).stock <= 0);

  const handleAddToCart = () => {
    if (isOutOfStock) {
      setOutOfStockAlert(true);
      return;
    }

    addToCart({
      id: `${product.id}-${selectedStorage.size}-${selectedColor.name}`,
      productId: product.id,
      name: product.name,
      brand: product.brand,
      imageUrl: product.imageUrl,
      selectedColor,
      selectedStorage,
      price: currentPrice,
      quantity,
      warrantyMonths: product.warrantyMonths || 12,
    });
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2000);
  };

  const handleBuyNow = () => {
    if (isOutOfStock) {
      setOutOfStockAlert(true);
      return;
    }

    addToCart({
      id: `${product.id}-${selectedStorage.size}-${selectedColor.name}`,
      productId: product.id,
      name: product.name,
      brand: product.brand,
      imageUrl: product.imageUrl,
      selectedColor,
      selectedStorage,
      price: currentPrice,
      quantity,
      warrantyMonths: product.warrantyMonths || 12,
    });
    router.push("/checkout");
  };

  return (
    <div className="min-h-screen pb-20 bg-white">
      {/* Amazon Breadcrumb */}
      <div className="max-w-[1450px] mx-auto px-4 py-2 text-xs text-gray-500 border-b border-gray-100 flex items-center gap-1.5 overflow-x-auto">
        <Link href="/" className="text-[#007185] hover:underline">Mobiles</Link>
        <ChevronRight className="w-3 h-3 text-gray-400" />
        <Link href={`/?brand=${product.brand}`} className="text-[#007185] hover:underline">{product.brand}</Link>
        <ChevronRight className="w-3 h-3 text-gray-400" />
        <span className="text-gray-800 truncate">{product.name}</span>
      </div>

      {/* Main 3-Column Amazon Layout */}
      <div className="max-w-[1450px] mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Column 1: Image Gallery (4 cols) */}
          <div className="lg:col-span-4 flex flex-col-reverse sm:flex-row gap-3">
            {/* Thumbnail Strip */}
            {product.galleryImages && product.galleryImages.length > 1 && (
              <div className="flex sm:flex-col gap-2 overflow-x-auto sm:overflow-y-auto max-h-[450px] scrollbar-none shrink-0">
                {product.galleryImages.map((imgUrl, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(imgUrl)}
                    className={`relative w-14 h-14 rounded-xs border p-1 bg-white shrink-0 cursor-pointer ${
                      selectedImage === imgUrl
                        ? "border-[#e77600] ring-1 ring-[#e77600] shadow-xs"
                        : "border-gray-300 hover:border-gray-500 opacity-80"
                    }`}
                  >
                    <Image src={imgUrl} alt="Thumb" fill unoptimized className="object-contain" />
                  </button>
                ))}
              </div>
            )}

            {/* Main Stage Image */}
            <div className="relative aspect-square w-full max-h-[500px] border border-gray-100 rounded-sm p-4 flex items-center justify-center bg-white">
              <Image
                src={selectedImage || product.imageUrl}
                alt={product.name}
                fill
                priority
                unoptimized
                className="object-contain hover:scale-105 transition-transform duration-300"
              />
            </div>
          </div>

          {/* Column 2: Product Details & Spec Matrix (5 cols) */}
          <div className="lg:col-span-5 space-y-3.5">
            {/* Brand Store Link */}
            <div>
              <Link 
                href={`/?brand=${product.brand}`}
                className="text-xs font-semibold text-[#007185] hover:text-[#c7511f] hover:underline"
              >
                Brand: {product.brand} | Visit the {product.brand} Store
              </Link>
              <h1 className="text-xl sm:text-2xl font-medium text-[#0f1111] leading-snug mt-1">
                {product.name} ({selectedColor.name}, {selectedStorage.size})
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">{product.tagline}</p>
            </div>

            {/* Amazon Rating & Badge Row */}
            <div className="flex flex-wrap items-center gap-2 text-xs border-b border-gray-200 pb-3">
              <div className="flex items-center gap-1 text-[#ffa41c]">
                <span className="font-bold text-[#0f1111]">{product.rating}</span>
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-3.5 h-3.5 ${
                        i < Math.floor(product.rating) ? "fill-[#ffa41c]" : "fill-gray-200 text-gray-200"
                      }`}
                    />
                  ))}
                </div>
              </div>
              <span className="text-gray-300">|</span>
              <span className="text-[#007185] hover:underline cursor-pointer">
                {product.reviewCount} ratings
              </span>
              <span className="text-gray-300">|</span>
              <span className="text-[#007185] hover:underline cursor-pointer">
                100+ answered questions
              </span>

              {product.isFeatured && (
                <div className="badge-best-seller ml-auto shadow-xs">
                  #1 Best Seller
                </div>
              )}
            </div>

            {/* Deal Badge & Price Block */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="bg-[#cc0c39] text-white text-[11px] font-bold px-2 py-0.5 rounded-xs uppercase">
                  Limited time deal
                </span>
                {discountPercent > 0 && (
                  <span className="text-[#cc0c39] text-base font-normal">
                    -{discountPercent}%
                  </span>
                )}
              </div>

              <div className="flex items-baseline">
                <span className="text-sm align-top font-normal text-[#0f1111] mr-1">₹</span>
                <span className="text-3xl font-medium text-[#0f1111]">
                  {currentPrice.toLocaleString("en-IN")}
                </span>
              </div>

              <div className="text-xs text-gray-500">
                M.R.P.: <span className="line-through">₹{originalPrice.toLocaleString("en-IN")}</span>
              </div>
              <div className="text-xs text-gray-700">
                Inclusive of all taxes
              </div>
              <div className="text-xs text-gray-700 pt-1 font-medium">
                <strong>EMI</strong> starts at ₹{calculateEMI(currentPrice).toLocaleString("en-IN")}/month. No Cost EMI available.
              </div>
            </div>

            {/* Bank & Partner Offers Carousel */}
            <div className="border-t border-b border-gray-200 py-3 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#0f1111]">
                <Tag className="w-4 h-4 text-[#e67a00]" />
                <span>Offers</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="border border-gray-300 rounded-md p-2.5 bg-gray-50/50 space-y-1">
                  <span className="font-bold text-[#0f1111] block">Bank Offer</span>
                  <p className="text-gray-600 text-[11px]">
                    Upto ₹3,000 Instant Discount on select Credit Cards.
                  </p>
                  <span className="text-[#007185] font-medium text-[11px] block cursor-pointer">
                    1 offer &gt;
                  </span>
                </div>

                <div className="border border-gray-300 rounded-md p-2.5 bg-gray-50/50 space-y-1">
                  <span className="font-bold text-[#0f1111] block">No Cost EMI</span>
                  <p className="text-gray-600 text-[11px]">
                    Avail 0% interest EMI options on major bank credit cards.
                  </p>
                  <span className="text-[#007185] font-medium text-[11px] block cursor-pointer">
                    1 offer &gt;
                  </span>
                </div>
              </div>
            </div>

            {/* Color Selector */}
            <div className="space-y-1.5 text-xs">
              <span className="text-gray-600">Colour: <strong className="text-[#0f1111]">{selectedColor.name}</strong></span>
              <div className="flex flex-wrap gap-2">
                {product.colors.map((color) => (
                  <button
                    key={color.name}
                    onClick={() => setSelectedColor(color)}
                    className={`px-3 py-1.5 rounded-sm border flex items-center gap-2 cursor-pointer transition-all ${
                      selectedColor.name === color.name
                        ? "border-[#e77600] ring-1 ring-[#e77600] bg-[#fef8f2] font-bold"
                        : "border-gray-300 hover:border-gray-500 bg-white"
                    }`}
                  >
                    <span 
                      className="w-3.5 h-3.5 rounded-full border border-gray-400" 
                      style={{ backgroundColor: color.hex }}
                    />
                    <span>{color.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Storage Size Selector */}
            <div className="space-y-1.5 text-xs">
              <span className="text-gray-600">Size / Storage: <strong className="text-[#0f1111]">{selectedStorage.size}</strong></span>
              <div className="flex flex-wrap gap-2">
                {product.storageOptions.map((storage) => (
                  <button
                    key={storage.size}
                    onClick={() => setSelectedStorage(storage)}
                    className={`px-3 py-2 rounded-sm border text-left cursor-pointer transition-all ${
                      selectedStorage.size === storage.size
                        ? "border-[#e77600] ring-1 ring-[#e77600] bg-[#fef8f2]"
                        : "border-gray-300 hover:border-gray-500 bg-white"
                    }`}
                  >
                    <div className="font-bold text-[#0f1111]">{storage.size}</div>
                    <div className="text-[11px] text-[#565959] font-medium">₹{storage.price.toLocaleString("en-IN")}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Technical Specifications Table */}
            <div className="pt-2 border-t border-gray-200">
              <h3 className="font-bold text-sm text-[#0f1111] mb-2">Technical Details</h3>
              <table className="w-full text-xs text-left border-collapse">
                <tbody>
                  <tr className="border-b border-gray-100">
                    <td className="py-1.5 font-bold text-gray-600 w-1/3">Processor</td>
                    <td className="py-1.5 text-gray-900">{product.processor}</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="py-1.5 font-bold text-gray-600">Camera</td>
                    <td className="py-1.5 text-gray-900">{product.camera}</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="py-1.5 font-bold text-gray-600">Display</td>
                    <td className="py-1.5 text-gray-900">{product.display}</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="py-1.5 font-bold text-gray-600">Battery</td>
                    <td className="py-1.5 text-gray-900">{product.battery}</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="py-1.5 font-bold text-gray-600">Operating System</td>
                    <td className="py-1.5 text-gray-900">{product.os}</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 font-bold text-gray-600">Warranty & SMS</td>
                    <td className="py-1.5 text-emerald-700 font-bold">12 Months + Pre-Expiry SMS Alerts</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* About this item Bullets */}
            <div className="pt-2 border-t border-gray-200 space-y-1.5 text-xs text-gray-800">
              <h3 className="font-bold text-sm text-[#0f1111] mb-1">About this item</h3>
              <ul className="list-disc pl-5 space-y-1">
                {product.highlightFeatures.map((f, i) => (
                  <li key={i} className="leading-relaxed">{f}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Column 3: Amazon Buy Box (3 cols) */}
          <div className="lg:col-span-3">
            <div className="border border-[#d5d9d9] rounded-lg p-4 bg-white shadow-xs space-y-3 sticky top-24">
              {/* Buy box price */}
              <div>
                <div className="flex items-baseline">
                  <span className="text-xs align-top font-normal mr-0.5">₹</span>
                  <span className="text-2xl font-medium text-[#0f1111]">
                    {currentPrice.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="text-xs text-[#007185] hover:underline cursor-pointer">
                  FREE Delivery on your first order
                </div>
              </div>

              {/* Delivery ETA with Prime */}
              <div className="text-xs space-y-0.5 text-gray-800">
                <div className="flex items-center gap-1">
                  <span className="text-[#00a8e1] font-black text-xs italic">prime</span>
                  <span>FREE delivery <strong>Tomorrow, 8 AM - 12 PM</strong></span>
                </div>
                <div className="text-gray-500 text-[11px] flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-gray-500" />
                  <span>Deliver to {currentUser?.name ? currentUser.name.split(" ")[0] : "Vicram"} - Bengaluru 560038</span>
                </div>
              </div>

              {/* Stock Status */}
              <div className="pt-1">
                {isOutOfStock ? (
                  <div className="space-y-1">
                    <div className="text-lg font-bold text-[#b12704] flex items-center gap-1.5">
                      <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                      <span>Currently Out of Stock</span>
                    </div>
                    <p className="text-xs text-gray-500">
                      We don&apos;t know when or if this item will be back in stock.
                    </p>
                  </div>
                ) : (
                  <div className="text-base font-bold text-[#007600] flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#007600]"></span>
                    <span>In Stock &bull; Ready to Ship</span>
                  </div>
                )}
              </div>

              {/* Quantity Selector */}
              <div className={`flex items-center gap-2 text-xs text-gray-700 ${isOutOfStock ? "opacity-50" : ""}`}>
                <span>Quantity:</span>
                <select
                  disabled={isOutOfStock}
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="border border-gray-300 rounded-md px-2 py-1 bg-[#f0f2f2] text-xs focus:outline-none cursor-pointer disabled:cursor-not-allowed"
                >
                  {[1, 2, 3, 4, 5].map((q) => (
                    <option key={q} value={q}>{q}</option>
                  ))}
                </select>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-1">
                {isOutOfStock ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setOutOfStockAlert(true)}
                      className="w-full py-2.5 px-4 text-xs font-bold rounded-md bg-gray-100 hover:bg-red-50 text-red-700 border border-red-300 transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                      title="Item is out of stock - click to view alert"
                    >
                      <AlertCircle className="w-4 h-4 text-red-600" />
                      <span>Currently Out of Stock</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setOutOfStockAlert(true)}
                      className="w-full py-2 px-4 text-xs font-bold rounded-md bg-gray-200 text-gray-500 border border-gray-300 hover:bg-gray-300 hover:text-red-700 transition-colors cursor-pointer text-center block"
                    >
                      Buy Now (Unavailable)
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={handleAddToCart}
                      className={`btn-amazon-yellow py-2 px-4 text-xs font-medium w-full text-center block ${
                        isAdded ? "bg-emerald-600 text-white font-bold" : ""
                      }`}
                    >
                      {isAdded ? "Added to Cart ✓" : "Add to Cart"}
                    </button>

                    <button
                      onClick={handleBuyNow}
                      className="btn-amazon-orange py-2 px-4 text-xs font-medium w-full text-center block cursor-pointer"
                    >
                      Buy Now
                    </button>
                  </>
                )}
              </div>

              {/* Metadata table */}
              <div className="pt-2 text-xs text-gray-600 space-y-1 border-t border-gray-200">
                <div className="flex justify-between">
                  <span className="text-gray-500">Ships from</span>
                  <span className="text-[#0f1111] font-medium">VM Mobiles</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Sold by</span>
                  <span className="text-[#007185] font-medium">VM Mobiles Retail India</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Payment</span>
                  <span className="text-[#007185] font-medium">Secure transaction</span>
                </div>
              </div>

              {/* Signature Feature: Expiry SMS Alert Included */}
              <div className="p-2.5 bg-[#fef8f2] border border-[#fbd8b4] rounded-sm text-xs text-[#703800] space-y-1">
                <div className="font-bold flex items-center gap-1 text-[#e67a00]">
                  <BellRing className="w-3.5 h-3.5" />
                  <span>Pre-Expiry SMS Alert Included</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Your registered mobile number receives instant IMEI registration and automated SMS alerts 7 days & 24h before warranty ends.
                </p>
              </div>

              {/* Add to Compare button */}
              <button
                onClick={() => addToCompare(product)}
                className={`w-full py-1.5 px-3 text-xs border rounded-sm font-medium transition-colors cursor-pointer ${
                  isCompared
                    ? "bg-gray-100 border-gray-400 text-gray-900"
                    : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
              >
                {isCompared ? "✓ In Comparison Tray" : "Add to Compare List"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Out of Stock Interactive Modal Alert */}
      {outOfStockAlert && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fade-in"
          onClick={() => setOutOfStockAlert(false)}
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
                  Sorry, <strong>{product.name}</strong> is currently out of stock and cannot be purchased right now.
                </p>
                <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded border border-amber-200 mt-2">
                  📢 We will alert you via SMS once new inventory arrives at the fulfillment center.
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