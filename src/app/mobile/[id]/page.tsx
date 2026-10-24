"use client";

import React, { useState, useEffect, use } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MobileProductData, ProductColor, StorageOption } from "@/lib/types";
import { DEFAULT_PRODUCTS } from "@/lib/catalogData";
import { getCachedProduct } from "@/components/ProductCatalog";
import { useApp } from "@/context/AppContext";
import { 
  Check, 
  ShieldCheck, 
  ChevronRight, 
  Layers, 
  AlertCircle, 
  X, 
  Camera, 
  Battery, 
  Smartphone, 
  Cpu, 
  ChevronDown, 
  Tag, 
  CreditCard, 
  RefreshCw, 
  ShoppingBag,
  Heart,
  Star
} from "lucide-react";
import { calculateEMI } from "@/lib/formatters";

export default function MobileDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { 
    currentUser, 
    addToCart, 
    addToCompare, 
    removeFromCompare,
    compareList, 
    toggleWishlist, 
    isInWishlist, 
    siteSettings 
  } = useApp();

  const initialMatch = getCachedProduct(resolvedParams.id) || null;

  const [product, setProduct] = useState<MobileProductData | null>(initialMatch);
  const [loading, setLoading] = useState(!initialMatch);
  const [selectedImage, setSelectedImage] = useState<string>(initialMatch?.imageUrl || "");
  const [selectedColor, setSelectedColor] = useState<ProductColor | null>(initialMatch?.colors?.[0] || null);
  const [selectedStorage, setSelectedStorage] = useState<StorageOption | null>(initialMatch?.storageOptions?.[0] || null);
  const [selectedRam, setSelectedRam] = useState<string>(initialMatch?.ram || "8GB");
  const quantity = 1;
  const [isAdded, setIsAdded] = useState(false);
  const [outOfStockAlert, setOutOfStockAlert] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });

  // Accordion open states
  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>({
    offers: true,
    emi: false,
    exchange: false,
    warranty: false,
  });

  const toggleAccordion = (key: string) => {
    setOpenAccordions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

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
          if (data.product.ram) {
            setSelectedRam(data.product.ram);
          }
        }
      } catch (err) {
        console.error("Failed to fetch product:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchProduct();
  }, [resolvedParams.id]);

  if (loading || !product || !selectedColor || !selectedStorage) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-foreground font-medium">
        Loading flagship details...
      </div>
    );
  }

  const currentPrice = selectedStorage.price;
  const originalPrice = product.originalPrice || currentPrice + 10000;
  const isCompared = compareList.some((p) => p.id === product.id);
  const isOutOfStock = !product.inStock || ((product as any).stock !== undefined && (product as any).stock <= 0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setZoomPos({ x, y });
  };

  const handleColorChange = (color: ProductColor) => {
    setSelectedColor(color);
    if (product.galleryImages && product.galleryImages.length > 0) {
      setSelectedImage(product.galleryImages[0]);
    } else {
      setSelectedImage(product.imageUrl);
    }
  };

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

    if (!currentUser) {
      router.push("/login?redirect=/checkout");
      return;
    }

    if (!currentUser.emailVerified) {
      router.push(`/verify-email?email=${encodeURIComponent(currentUser.email)}&redirect=/checkout`);
      return;
    }

    router.push("/checkout");
  };

  return (
    <div className="min-h-screen pb-28 lg:pb-20 bg-background text-foreground transition-colors duration-200">
      {/* Breadcrumbs */}
      <div className="bg-card border-b border-border">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-3 text-xs text-muted flex items-center gap-1.5 overflow-x-auto">
          <Link href="/" className="hover:text-foreground transition-colors">Phones</Link>
          <ChevronRight className="w-3 h-3 text-muted" />
          <Link href={`/?brand=${product.brand}`} className="hover:text-foreground transition-colors">{product.brand}</Link>
          <ChevronRight className="w-3 h-3 text-muted" />
          <span className="text-foreground font-medium truncate">{product.name}</span>
        </div>
      </div>

      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          
          {/* Column 1: Image Gallery with Interactive Zoom */}
          <div className="lg:col-span-6 flex flex-col-reverse sm:flex-row gap-4 sticky top-24">
            {/* Thumbnail Strip */}
            {product.galleryImages && product.galleryImages.length > 1 && (
              <div className="flex sm:flex-col gap-2.5 overflow-x-auto sm:overflow-y-auto max-h-[520px] scrollbar-none shrink-0">
                {product.galleryImages.map((imgUrl, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(imgUrl)}
                    className={`relative w-16 h-16 rounded-[14px] p-2 bg-tile border transition-all duration-200 cursor-pointer ${
                      selectedImage === imgUrl
                        ? "border-accent ring-2 ring-accent/20 shadow-xs"
                        : "border-border hover:border-foreground/30"
                    }`}
                  >
                    <Image src={imgUrl} alt="Thumbnail" fill unoptimized className="object-contain" />
                  </button>
                ))}
              </div>
            )}

            {/* Main Stage with Zoom Lens Effect */}
            <div 
              onMouseEnter={() => setIsZoomed(true)}
              onMouseLeave={() => setIsZoomed(false)}
              onMouseMove={handleMouseMove}
              className="relative aspect-square w-full rounded-[20px] bg-card border border-border shadow-xs p-8 flex items-center justify-center overflow-hidden cursor-crosshair group"
            >
              <div 
                className="relative w-full h-full transition-transform duration-200 ease-out"
                style={{
                  transform: isZoomed ? `scale(1.4)` : "scale(1)",
                  transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`
                }}
              >
                <Image
                  src={selectedImage || product.imageUrl}
                  alt={product.name}
                  fill
                  priority
                  unoptimized
                  className="object-contain"
                />
              </div>

              {/* Zoom hint pill */}
              <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-xs text-white text-[10px] px-2.5 py-1 rounded-full pointer-events-none opacity-80 group-hover:opacity-0 transition-opacity">
                Hover to Zoom
              </div>
            </div>
          </div>

          {/* Column 2: Product Specifications & Selectors */}
          <div className="lg:col-span-6 space-y-6">
            {/* Header info */}
            <div className="space-y-1.5">
              <span className="text-xs uppercase font-semibold tracking-wider text-accent">
                {product.brand}
              </span>
              <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-foreground">
                {product.name}
              </h1>
              {siteSettings.showReviews === "true" && (
                <div className="flex items-center gap-2 pt-0.5 text-xs">
                  <span className="flex items-center gap-1 font-bold text-amber-500">
                    <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                    {product.rating || 4.9}
                  </span>
                  <span className="text-muted">({product.reviewCount || 380} verified reviews)</span>
                  <span className="text-muted/40">•</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium text-[11px]">98% Buyer Satisfaction</span>
                </div>
              )}
              <p className="text-sm text-muted leading-relaxed">
                {product.tagline}
              </p>
            </div>

            {/* Price Block */}
            <div className="bg-card rounded-[20px] p-6 border border-border shadow-xs space-y-2">
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-bold text-foreground">
                  ₹{currentPrice.toLocaleString("en-IN")}
                </span>
                {originalPrice > currentPrice && (
                  <span className="text-base text-muted line-through font-normal">
                    ₹{originalPrice.toLocaleString("en-IN")}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted">
                Inclusive of all taxes. EMI starts from ₹{calculateEMI(currentPrice).toLocaleString("en-IN")}/mo with No Cost EMI.
              </p>
            </div>

            {/* Color Swatches */}
            <div className="space-y-2.5">
              <span className="text-xs font-bold text-foreground block">
                Finish: <span className="font-normal text-muted">{selectedColor.name}</span>
              </span>
              <div className="flex flex-wrap gap-2.5">
                {product.colors.map((color) => (
                  <button
                    key={color.name}
                    onClick={() => handleColorChange(color)}
                    className={`px-3.5 py-2 rounded-full border text-xs font-medium flex items-center gap-2 cursor-pointer transition-all duration-200 ${
                      selectedColor.name === color.name
                        ? "border-[#C9A66B] dark:border-[#D4B483] bg-[#C9A66B]/15 ring-2 ring-[#C9A66B]/30 shadow-xs text-[#8C6226] dark:text-[#D4B483] font-semibold"
                        : "border-[#C9A66B]/30 bg-[#C9A66B]/5 text-muted hover:text-foreground"
                    }`}
                  >
                    <span 
                      className="w-3.5 h-3.5 rounded-full border border-black/10"
                      style={{ backgroundColor: color.hex }}
                    />
                    <span>{color.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Storage Pills */}
            <div className="space-y-2.5">
              <span className="text-xs font-bold text-foreground block">
                Storage Capacity: <span className="font-normal text-muted">{selectedStorage.size}</span>
              </span>
              <div className="flex flex-wrap gap-2">
                {product.storageOptions.map((storage) => (
                  <button
                    key={storage.size}
                    onClick={() => setSelectedStorage(storage)}
                    className={`px-4 py-2 rounded-full border text-xs font-medium cursor-pointer transition-all duration-200 ${
                      selectedStorage.size === storage.size
                        ? "border-[#C9A66B] dark:border-[#D4B483] bg-[#C9A66B] dark:bg-[#D4B483] text-[#FFFCFA] shadow-xs font-semibold"
                        : "border-[#C9A66B]/30 bg-[#C9A66B]/5 text-foreground hover:border-[#C9A66B]"
                    }`}
                  >
                    <span>{storage.size}</span>
                    <span className="ml-1.5 opacity-70">₹{storage.price.toLocaleString("en-IN")}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* RAM Pills */}
            <div className="space-y-2.5">
              <span className="text-xs font-bold text-foreground block">
                Memory (RAM): <span className="font-normal text-muted">{selectedRam}</span>
              </span>
              <div className="flex flex-wrap gap-2">
                {[product.ram || "8GB", "12GB"].filter((v, i, a) => a.indexOf(v) === i).map((ram) => (
                  <button
                    key={ram}
                    onClick={() => setSelectedRam(ram)}
                    className={`px-4 py-2 rounded-full border text-xs font-medium cursor-pointer transition-all duration-200 ${
                      selectedRam === ram
                        ? "border-[#C9A66B] dark:border-[#D4B483] bg-[#C9A66B] dark:bg-[#D4B483] text-[#FFFCFA] shadow-xs font-semibold"
                        : "border-[#C9A66B]/30 bg-[#C9A66B]/5 text-foreground hover:border-[#C9A66B]"
                    }`}
                  >
                    {ram} Unified Memory
                  </button>
                ))}
              </div>
            </div>

            {/* Spec Icons (Camera, Battery, Display, Chip) */}
            <div className="bg-card rounded-[20px] p-5 border border-border shadow-xs grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div className="space-y-1.5 flex flex-col items-center">
                <Camera className="w-5 h-5 text-accent" />
                <span className="text-[10px] uppercase font-bold text-muted tracking-wider">Camera</span>
                <p className="text-xs font-semibold text-foreground line-clamp-1">{(product.camera || "50MP").split("+")[0]}</p>
              </div>

              <div className="space-y-1.5 flex flex-col items-center">
                <Battery className="w-5 h-5 text-accent" />
                <span className="text-[10px] uppercase font-bold text-muted tracking-wider">Battery</span>
                <p className="text-xs font-semibold text-foreground line-clamp-1">{(product.battery || "5000 mAh").split(",")[0]}</p>
              </div>

              <div className="space-y-1.5 flex flex-col items-center">
                <Smartphone className="w-5 h-5 text-accent" />
                <span className="text-[10px] uppercase font-bold text-muted tracking-wider">Display</span>
                <p className="text-xs font-semibold text-foreground line-clamp-1">{(product.display || "OLED").split("OLED")[0]} OLED</p>
              </div>

              <div className="space-y-1.5 flex flex-col items-center">
                <Cpu className="w-5 h-5 text-accent" />
                <span className="text-[10px] uppercase font-bold text-muted tracking-wider">Chip</span>
                <p className="text-xs font-semibold text-foreground line-clamp-1">{(product.processor || "Flagship").split("(")[0]}</p>
              </div>
            </div>

            {/* Desktop Actions Row */}
            <div className="hidden lg:flex items-center gap-3 pt-2">
              <button
                onClick={handleAddToCart}
                disabled={isOutOfStock}
                className={`flex-1 py-3.5 px-6 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer shadow-sm flex items-center justify-center gap-2 ${
                  isOutOfStock
                    ? "bg-[#C9A66B]/20 text-[#8C6226]/50 dark:text-[#D4B483]/50 cursor-not-allowed border border-[#C9A66B]/30"
                    : isAdded
                    ? "bg-[#A67C3D] text-[#FFFCFA]"
                    : "bg-[#C9A66B] dark:bg-[#D4B483] hover:bg-[#B8914A] dark:hover:bg-[#C49A5A] active:bg-[#A67C3D] text-[#FFFCFA]"
                }`}
              >
                {isAdded ? (
                  <>
                    <Check className="w-4 h-4" /> Added to Bag
                  </>
                ) : (
                  <>
                    <ShoppingBag className="w-4 h-4" /> Add to Cart
                  </>
                )}
              </button>

              <button
                onClick={handleBuyNow}
                disabled={isOutOfStock}
                className="py-3.5 px-8 rounded-full text-xs font-semibold bg-[#C9A66B] dark:bg-[#D4B483] hover:bg-[#B8914A] dark:hover:bg-[#C49A5A] active:bg-[#A67C3D] text-[#FFFCFA] shadow-xs transition-all duration-200 cursor-pointer disabled:opacity-50"
              >
                Buy Now
              </button>

              {siteSettings.showWishlist === "true" && (
                <button
                  type="button"
                  onClick={() => toggleWishlist(product.id)}
                  className={`p-3.5 rounded-full border transition-all duration-200 cursor-pointer ${
                    isInWishlist(product.id)
                      ? "bg-rose-500/15 border-rose-500 text-rose-500 font-semibold shadow-xs"
                      : "border-[#C9A66B]/40 bg-[#C9A66B]/10 text-[#8C6226] dark:text-[#D4B483] hover:bg-[#C9A66B]/20"
                  }`}
                  title={isInWishlist(product.id) ? "In Wishlist" : "Add to Wishlist"}
                >
                  <Heart className={`w-4 h-4 ${isInWishlist(product.id) ? "fill-rose-500 text-rose-500" : ""}`} />
                </button>
              )}

              {siteSettings.showCompare === "true" && (
                <button
                  onClick={() => {
                    if (isCompared) {
                      removeFromCompare(product.id);
                    } else {
                      addToCompare(product);
                    }
                  }}
                  className={`p-3.5 rounded-full border transition-all duration-200 cursor-pointer ${
                    isCompared
                      ? "bg-[#C9A66B] dark:bg-[#D4B483] border-[#C9A66B] text-[#FFFCFA] font-semibold shadow-xs"
                      : "border-[#C9A66B]/40 bg-[#C9A66B]/10 text-[#8C6226] dark:text-[#D4B483] hover:bg-[#C9A66B]/20"
                  }`}
                  title={isCompared ? "Remove from Compare" : "Add to Compare"}
                >
                  <Layers className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Accordion for Offers / EMI / Exchange / Warranty */}
            <div className="bg-card rounded-[20px] border border-border shadow-xs divide-y divide-border overflow-hidden">
              {/* Accordion 1: Offers */}
              <div>
                <button
                  type="button"
                  onClick={() => toggleAccordion("offers")}
                  className="w-full p-4 flex items-center justify-between text-left text-xs font-bold text-foreground cursor-pointer hover:bg-tile/40 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Tag className="w-4 h-4 text-accent" />
                    <span>Special Offers & Bank Discounts</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-muted transition-transform duration-200 ${openAccordions.offers ? "rotate-180" : ""}`} />
                </button>
                {openAccordions.offers && (
                  <div className="px-4 pb-4 pt-1 text-xs text-muted space-y-2">
                    <p>• Up to ₹3,000 instant discount with ICICI, HDFC, and SBI Bank Credit Cards.</p>
                    <p>• Complimentary express insured delivery to all pincodes across India.</p>
                  </div>
                )}
              </div>

              {/* Accordion 2: EMI */}
              <div>
                <button
                  type="button"
                  onClick={() => toggleAccordion("emi")}
                  className="w-full p-4 flex items-center justify-between text-left text-xs font-bold text-foreground cursor-pointer hover:bg-tile/40 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <CreditCard className="w-4 h-4 text-accent" />
                    <span>No Cost EMI Plans</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-muted transition-transform duration-200 ${openAccordions.emi ? "rotate-180" : ""}`} />
                </button>
                {openAccordions.emi && (
                  <div className="px-4 pb-4 pt-1 text-xs text-muted space-y-2">
                    <p>• 0% Interest EMI for up to 12 months with all leading bank cards.</p>
                    <p>• Cardless EMI available with Bajaj Finserv & ZestMoney at checkout.</p>
                  </div>
                )}
              </div>

              {/* Accordion 3: Exchange */}
              <div>
                <button
                  type="button"
                  onClick={() => toggleAccordion("exchange")}
                  className="w-full p-4 flex items-center justify-between text-left text-xs font-bold text-foreground cursor-pointer hover:bg-tile/40 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <RefreshCw className="w-4 h-4 text-accent" />
                    <span>Device Exchange Program</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-muted transition-transform duration-200 ${openAccordions.exchange ? "rotate-180" : ""}`} />
                </button>
                {openAccordions.exchange && (
                  <div className="px-4 pb-4 pt-1 text-xs text-muted space-y-2">
                    <p>• Exchange your old smartphone and get up to ₹25,000 trade-in bonus value.</p>
                    <p>• Doorstep evaluation with immediate cash credit upon verification.</p>
                  </div>
                )}
              </div>

              {/* Accordion 4: Warranty */}
              <div>
                <button
                  type="button"
                  onClick={() => toggleAccordion("warranty")}
                  className="w-full p-4 flex items-center justify-between text-left text-xs font-bold text-foreground cursor-pointer hover:bg-tile/40 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-accent" />
                    <span>1-Year Brand Warranty & Protection</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-muted transition-transform duration-200 ${openAccordions.warranty ? "rotate-180" : ""}`} />
                </button>
                {openAccordions.warranty && (
                  <div className="px-4 pb-4 pt-1 text-xs text-muted space-y-2">
                    <p>• 1-Year official manufacturer warranty honored at all brand service centers.</p>
                    <p>• Automated email alerts dispatched 6 months and 1 day prior to warranty expiry.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Bottom Buy Now Bar on Mobile */}
      <div className="fixed bottom-0 left-0 right-0 lg:hidden bg-card/95 backdrop-blur-md border-t border-border p-3.5 z-40 flex items-center justify-between gap-4 shadow-lg text-foreground">
        <div className="min-w-0">
          <div className="text-xs font-bold text-foreground truncate">{product.name}</div>
          <div className="text-sm font-bold text-[#C9A66B] dark:text-[#D4B483]">₹{currentPrice.toLocaleString("en-IN")}</div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {siteSettings.showWishlist === "true" && (
            <button
              onClick={() => toggleWishlist(product.id)}
              className={`p-2.5 rounded-full border transition-all duration-200 cursor-pointer ${
                isInWishlist(product.id)
                  ? "bg-rose-500/15 border-rose-500 text-rose-500"
                  : "border-border bg-tile text-muted hover:text-rose-500"
              }`}
              title="Wishlist"
            >
              <Heart className={`w-4 h-4 ${isInWishlist(product.id) ? "fill-rose-500 text-rose-500" : ""}`} />
            </button>
          )}
          <button
            onClick={handleAddToCart}
            disabled={isOutOfStock}
            className="px-4 py-2.5 rounded-full border border-[#C9A66B] bg-[#C9A66B]/15 text-[#8C6226] dark:text-[#D4B483] hover:bg-[#C9A66B]/25 text-xs font-semibold cursor-pointer"
          >
            {isAdded ? "Added ✓" : "Add to Cart"}
          </button>
          <button
            onClick={handleBuyNow}
            disabled={isOutOfStock}
            className="px-6 py-2.5 rounded-full bg-[#C9A66B] dark:bg-[#D4B483] hover:bg-[#B8914A] dark:hover:bg-[#C49A5A] active:bg-[#A67C3D] text-[#FFFCFA] text-xs font-semibold cursor-pointer shadow-sm"
          >
            Buy Now
          </button>
        </div>
      </div>

      {/* Out of Stock Interactive Modal Alert */}
      {outOfStockAlert && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in"
          onClick={() => setOutOfStockAlert(false)}
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
                  We apologize, <strong>{product.name}</strong> is currently out of stock.
                </p>
                <p className="text-xs text-[#8C6226] dark:text-[#D4B483] bg-[#C9A66B]/15 p-2.5 rounded-[12px] border border-[#C9A66B]/30 mt-2">
                  📢 We will alert you via email once restocked.
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