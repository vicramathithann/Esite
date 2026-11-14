"use client";

import React, { useState, useEffect, useMemo, use } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MobileProductData, ProductColor, ProductVariantData, ProductImageData } from "@/lib/types";
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
  Star,
  ArrowLeft,
  Share2,
  ZoomIn,
  Truck,
  RotateCcw,
  CheckCircle2,
  MapPin,
  Flame,
  BadgePercent
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
    cartCount,
    siteSettings 
  } = useApp();

  const [allProducts, setAllProducts] = useState<MobileProductData[]>([]);
  const [pinCode, setPinCode] = useState("625001");
  const [isPinChecked, setIsPinChecked] = useState(false);
  const [isEmiOpen, setIsEmiOpen] = useState(false);
  const [isZoomModalOpen, setIsZoomModalOpen] = useState(false);
  const [shareToast, setShareToast] = useState(false);

  const [mobileSpecOpen, setMobileSpecOpen] = useState<Record<string, boolean>>({
    display: true,
    processor: false,
    camera: false,
    battery: false,
    os: false,
  });

  const toggleMobileSpec = (key: string) => {
    setMobileSpecOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && Array.isArray(d.products)) {
          setAllProducts(d.products);
        }
      })
      .catch(() => {});
  }, []);

  const handleShare = () => {
    if (typeof navigator !== "undefined" && navigator.share && product) {
      navigator.share({
        title: product.name,
        text: `Check out ${product.name} on VN Mobiles!`,
        url: window.location.href,
      }).catch(() => {});
    } else if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setShareToast(true);
      setTimeout(() => setShareToast(false), 2000);
    }
  };

  const initialMatch = getCachedProduct(resolvedParams.id) || null;

  const [product, setProduct] = useState<MobileProductData | null>(initialMatch);
  const [loading, setLoading] = useState(!initialMatch);
  const [selectedImage, setSelectedImage] = useState<string>(initialMatch?.imageUrl || "");
  const [selectedColor, setSelectedColor] = useState<ProductColor | null>(initialMatch?.colors?.[0] || null);

  const variantsList: ProductVariantData[] = useMemo(() => {
    if (!product) return [];
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
  }, [product]);

  const defaultVariant = useMemo(() => {
    return variantsList.find((v) => v.isDefault) || variantsList[0] || null;
  }, [variantsList]);

  const [selectedVariant, setSelectedVariant] = useState<ProductVariantData | null>(defaultVariant);

  useEffect(() => {
    if (defaultVariant && (!selectedVariant || !variantsList.some(v => v.id === selectedVariant.id))) {
      setSelectedVariant(defaultVariant);
    }
  }, [defaultVariant, variantsList]);

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
    let isMounted = true;

    async function fetchProduct(showLoading = false) {
      if (showLoading && !product) {
        setLoading(true);
      }
      try {
        const res = await fetch(`/api/products/${resolvedParams.id}?t=${Date.now()}`, {
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache",
            "Pragma": "no-cache",
          },
        });
        const data = await res.json();
        if (isMounted && data.success && data.product) {
          setProduct(data.product);
          setSelectedImage(data.product.imageUrl);
          if (data.product.colors && data.product.colors.length > 0) {
            setSelectedColor(data.product.colors[0]);
          }
        }
      } catch (err) {
        console.error("Failed to fetch product:", err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchProduct(true);

    const handleFocus = () => {
      fetchProduct(false);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchProduct(false);
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isMounted = false;
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [resolvedParams.id]);

  const distinctStorages = useMemo(() => {
    const map = new Map<string, ProductVariantData>();
    for (const v of variantsList) {
      if (!map.has(v.storage)) {
        map.set(v.storage, v);
      }
    }
    return Array.from(map.values());
  }, [variantsList]);

  const distinctRams = useMemo(() => {
    const rams = Array.from(new Set(variantsList.map((v) => v.ram).filter(Boolean)));
    return rams.length > 0 ? rams : [product?.ram || "8GB"];
  }, [variantsList, product?.ram]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-foreground font-medium gap-3">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-muted">Loading flagship details...</span>
      </div>
    );
  }

  if (!product || !selectedColor || !selectedVariant) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-foreground p-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-tile border border-border flex items-center justify-center text-accent mb-4">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold tracking-tight mb-2">Smartphone Not Found</h2>
        <p className="text-xs text-muted max-w-md mb-6">
          We couldn&apos;t load the requested device details. The product may have been relocated or updated.
        </p>
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="px-5 py-2.5 rounded-full bg-accent text-accent-foreground text-xs font-semibold hover:opacity-90 transition shadow-xs"
          >
            Browse All Phones
          </Link>
          <button
            onClick={() => window.location.reload()}
            className="px-5 py-2.5 rounded-full border border-border bg-card text-foreground text-xs font-medium hover:bg-tile transition"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const currentPrice = selectedVariant.basePrice || product.basePrice || 49999;
  const originalPrice = selectedVariant.originalPrice || product.originalPrice || currentPrice + 10000;
  const discountPercent = originalPrice > currentPrice ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100) : 0;
  const isCompared = compareList.some((p) => p.id === product.id);
  const isOutOfStock = !selectedVariant.inStock || (selectedVariant.stock !== undefined && selectedVariant.stock <= 0);

  const similarPhones: MobileProductData[] = useMemo(() => {
    if (!product || allProducts.length === 0) return [];
    return allProducts
      .filter((p) => p.id !== product.id)
      .sort((a, b) => (a.brand === product.brand ? -1 : 1))
      .slice(0, 6);
  }, [allProducts, product]);

  const productImagesList: ProductImageData[] = useMemo(() => {
    if (!product) return [];
    if (Array.isArray(product.images) && product.images.length > 0) {
      return product.images;
    }
    if (Array.isArray(product.galleryImages) && product.galleryImages.length > 0) {
      return product.galleryImages.map((imgUrl, idx) => ({
        url: typeof imgUrl === "string" ? imgUrl : (imgUrl as any)?.url || product.imageUrl,
        alt: `${product.name} photo ${idx + 1}`,
        isPrimary: idx === 0,
        order: idx,
      }));
    }
    return [{
      url: product.imageUrl,
      alt: product.name,
      isPrimary: true,
      order: 0,
    }];
  }, [product]);

  useEffect(() => {
    if (productImagesList.length > 0 && !selectedImage) {
      const primary = productImagesList.find((img) => img.isPrimary) || productImagesList[0];
      setSelectedImage(primary.url);
    }
  }, [productImagesList, selectedImage]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setZoomPos({ x, y });
  };

  const handleColorChange = (color: ProductColor) => {
    setSelectedColor(color);
    const colorPhoto = productImagesList.find(
      (img) => img.colorKey && img.colorKey.toLowerCase() === color.name.toLowerCase()
    );
    if (colorPhoto) {
      setSelectedImage(colorPhoto.url);
    } else {
      const primary = productImagesList.find((img) => img.isPrimary) || productImagesList[0];
      if (primary) {
        setSelectedImage(primary.url);
      }
    }
  };

  const handleAddToCart = () => {
    if (isOutOfStock) {
      setOutOfStockAlert(true);
      return;
    }

    addToCart({
      id: `${product.id}-${selectedVariant.id || selectedVariant.storage}-${selectedColor.name}`,
      productId: product.id,
      variantId: selectedVariant.id,
      name: product.name,
      brand: product.brand,
      imageUrl: product.imageUrl,
      selectedColor,
      selectedStorage: { size: selectedVariant.storage, price: currentPrice },
      selectedRam: selectedVariant.ram,
      price: currentPrice,
      quantity,
      warrantyMonths: product.warrantyMonths || 12,
      inStock: !isOutOfStock,
      stock: selectedVariant.stock,
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
      id: `${product.id}-${selectedVariant.id || selectedVariant.storage}-${selectedColor.name}`,
      productId: product.id,
      variantId: selectedVariant.id,
      name: product.name,
      brand: product.brand,
      imageUrl: product.imageUrl,
      selectedColor,
      selectedStorage: { size: selectedVariant.storage, price: currentPrice },
      selectedRam: selectedVariant.ram,
      price: currentPrice,
      quantity,
      warrantyMonths: product.warrantyMonths || 12,
      inStock: !isOutOfStock,
      stock: selectedVariant.stock,
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
      {/* ───────────────────────────────────────────────────────────── */}
      {/* PHONE SPECIFIC UI (<sm): Amazon / Flipkart Style */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="sm:hidden">
        {/* Compact Phone Header */}
        <div className="sticky top-0 z-40 bg-card/95 backdrop-blur-md border-b border-border px-3 h-14 flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.back()}
            className="w-10 h-10 rounded-full flex items-center justify-center text-foreground hover:bg-tile active:scale-95 transition-all cursor-pointer"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div className="flex-1 px-2 text-center truncate">
            <span className="text-xs font-bold text-foreground truncate block">
              {product.name}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleShare}
              className="w-9 h-9 rounded-full flex items-center justify-center text-foreground hover:bg-tile active:scale-95 transition-all cursor-pointer"
              aria-label="Share product"
            >
              <Share2 className="w-4 h-4" />
            </button>
            {siteSettings.showWishlist === "true" && (
              <button
                type="button"
                onClick={() => toggleWishlist(product.id)}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                  isInWishlist(product.id) ? "text-rose-500" : "text-foreground hover:bg-tile"
                }`}
                aria-label="Wishlist"
              >
                <Heart className={`w-4 h-4 ${isInWishlist(product.id) ? "fill-rose-500 text-rose-500" : ""}`} />
              </button>
            )}
            <Link
              href="/cart"
              className="w-9 h-9 rounded-full flex items-center justify-center text-foreground hover:bg-tile relative cursor-pointer"
              aria-label="Cart"
            >
              <ShoppingBag className="w-4 h-4" />
              {cartCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#C9A66B] text-white text-[9px] font-bold flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* Share Feedback Toast */}
        {shareToast && (
          <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-black/80 text-white text-xs px-4 py-2 rounded-full shadow-lg animate-fade-in">
            Link copied to clipboard!
          </div>
        )}

        {/* Phone Content (Scrolls normally) */}
        <div className="p-3.5 space-y-4 pb-28">
          {/* 1. Swipeable Image Gallery */}
          <div className="space-y-2">
            <div className="relative aspect-square w-full rounded-2xl bg-white dark:bg-card border border-border/50 p-4 overflow-hidden flex items-center justify-center">
              {discountPercent > 0 && (
                <span className="absolute top-3 left-3 z-10 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-600 text-white shadow-xs">
                  {discountPercent}% OFF
                </span>
              )}
              <Image
                src={selectedImage || productImagesList[0]?.url || product.imageUrl}
                alt={product.name}
                fill
                priority
                unoptimized
                className="object-contain"
                onClick={() => setIsZoomModalOpen(true)}
              />
              <button
                type="button"
                onClick={() => setIsZoomModalOpen(true)}
                className="absolute bottom-3 right-3 px-2.5 py-1 bg-black/60 backdrop-blur-xs text-white text-[10px] font-medium rounded-full flex items-center gap-1 cursor-pointer"
              >
                <ZoomIn className="w-3 h-3" /> Tap to zoom
              </button>
            </div>

            {/* Thumbnail Strip */}
            {productImagesList.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1">
                {productImagesList.map((img, idx) => (
                  <button
                    key={img.url || idx}
                    type="button"
                    onClick={() => setSelectedImage(img.url)}
                    className={`w-14 h-14 rounded-xl p-1 bg-white dark:bg-card border shrink-0 transition-all cursor-pointer ${
                      selectedImage === img.url
                        ? "border-[#C9A66B] ring-2 ring-[#C9A66B]/30"
                        : "border-border/60"
                    }`}
                  >
                    <div className="relative w-full h-full">
                      <Image src={img.url} alt="Thumb" fill unoptimized className="object-contain" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 2. Brand, Title, Rating */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">
              {product.brand}
            </span>
            <h1 className="text-lg font-bold text-foreground leading-snug">
              {product.name}
            </h1>
            {siteSettings.showReviews === "true" && (
              <div className="flex items-center gap-2 pt-0.5 text-xs">
                <span className="bg-emerald-600 dark:bg-emerald-700 text-white px-1.5 py-0.5 rounded text-[10px] font-bold inline-flex items-center gap-0.5">
                  {product.rating || 4.8} <Star className="w-2.5 h-2.5 fill-white text-white" />
                </span>
                <span className="text-muted text-xs">({product.reviewCount || 380} reviews)</span>
                <span className="text-muted/40">•</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">98% Buyer Satisfaction</span>
              </div>
            )}
          </div>

          {/* 3. Price Block */}
          <div className="bg-card border border-border rounded-xl p-3.5 space-y-1.5 shadow-2xs">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-2xl font-extrabold text-foreground">
                ₹{currentPrice.toLocaleString("en-IN")}
              </span>
              {originalPrice > currentPrice && (
                <span className="text-xs text-muted line-through">
                  ₹{originalPrice.toLocaleString("en-IN")}
                </span>
              )}
              {discountPercent > 0 && (
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  {discountPercent}% off
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted">
              Inclusive of all taxes. Free express PAN-India delivery.
            </p>

            {/* Expandable No Cost EMI */}
            <div className="pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setIsEmiOpen(!isEmiOpen)}
                className="w-full flex items-center justify-between text-xs font-semibold text-[#8C6226] dark:text-[#E5CBA2] cursor-pointer"
              >
                <div className="flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-[#C9A66B]" />
                  <span>No Cost EMI from ₹{calculateEMI(currentPrice).toLocaleString("en-IN")}/mo</span>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isEmiOpen ? "rotate-180" : ""}`} />
              </button>
              {isEmiOpen && (
                <div className="mt-2.5 p-2.5 rounded-lg bg-tile/70 border border-border text-[11px] space-y-1.5 animate-in fade-in duration-150">
                  <div className="flex justify-between text-muted">
                    <span>3 Months:</span>
                    <strong className="text-foreground">₹{Math.round(currentPrice / 3).toLocaleString("en-IN")}/mo</strong>
                  </div>
                  <div className="flex justify-between text-muted">
                    <span>6 Months:</span>
                    <strong className="text-foreground">₹{Math.round(currentPrice / 6).toLocaleString("en-IN")}/mo</strong>
                  </div>
                  <div className="flex justify-between text-muted">
                    <span>12 Months:</span>
                    <strong className="text-foreground">₹{calculateEMI(currentPrice).toLocaleString("en-IN")}/mo</strong>
                  </div>
                  <p className="text-[10px] text-muted/80 pt-1 border-t border-border/60">
                    * Available on HDFC, ICICI, SBI, Axis, and OneCard credit cards.
                  </p>
                </div>
              )}
            </div>

            {/* Special Offers Strip */}
            <div className="pt-2 border-t border-border space-y-1 text-xs">
              <div className="flex items-center gap-1.5 text-foreground font-semibold">
                <Tag className="w-3.5 h-3.5 text-accent" />
                <span>Available Offers</span>
              </div>
              <ul className="text-[11px] text-muted space-y-1 list-disc list-inside">
                <li>Bank Offer: Instant ₹3,000 off on ICICI & HDFC credit cards</li>
                <li>Exchange Offer: Extra ₹3,500 bonus trade-in value on old phones</li>
              </ul>
            </div>
          </div>

          {/* 4. Finish Colors */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-foreground block">
              Finish: <span className="font-normal text-muted">{selectedColor.name}</span>
            </span>
            <div className="flex items-center gap-2">
              {(product.colors || [{ name: "Standard", hex: "#1e1e1e" }]).map((c) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => handleColorChange(c)}
                  className={`w-8 h-8 rounded-full border-2 transition-all cursor-pointer ${
                    selectedColor.name === c.name
                      ? "ring-2 ring-offset-2 ring-[#C9A66B] scale-105"
                      : "border-border hover:opacity-100 opacity-80"
                  }`}
                  style={{ backgroundColor: c.hex }}
                  title={c.name}
                />
              ))}
            </div>
          </div>

          {/* 5. Storage Variants with Price Delta */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-foreground block">
              Storage Capacity
            </span>
            <div className="flex flex-wrap gap-2">
              {distinctStorages.map((storageVariant) => {
                const match = variantsList.find(
                  (v) => v.storage === storageVariant.storage && (selectedVariant ? v.ram === selectedVariant.ram : true)
                ) || storageVariant;
                const isVarOos = !match.inStock || (match.stock !== undefined && match.stock <= 0);
                const isSelected = selectedVariant?.storage === storageVariant.storage;
                const priceDelta = match.basePrice - currentPrice;

                return (
                  <button
                    key={storageVariant.storage}
                    type="button"
                    disabled={isVarOos}
                    onClick={() => !isVarOos && setSelectedVariant(match)}
                    className={`px-3 py-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                      isVarOos
                        ? "opacity-40 line-through bg-tile text-muted cursor-not-allowed border-border"
                        : isSelected
                        ? "bg-[#C9A66B] dark:bg-[#D4B483] text-[#FFFCFA] border-[#C9A66B] shadow-xs"
                        : "bg-tile text-foreground border-border hover:border-foreground/30"
                    }`}
                  >
                    <span>{storageVariant.storage}</span>
                    {priceDelta !== 0 && !isSelected && !isVarOos && (
                      <span className="text-[10px] ml-1 opacity-70">
                        {priceDelta > 0 ? `+₹${priceDelta.toLocaleString("en-IN")}` : `-₹${Math.abs(priceDelta).toLocaleString("en-IN")}`}
                      </span>
                    )}
                    {isVarOos && <span className="ml-1 text-[9px] no-underline font-normal">OOS</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 6. RAM Variants */}
          {distinctRams.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-bold text-foreground block">
                RAM (Memory)
              </span>
              <div className="flex flex-wrap gap-2">
                {distinctRams.map((ram: string) => {
                  const match = variantsList.find(
                    (v) => v.ram === ram && (selectedVariant ? v.storage === selectedVariant.storage : true)
                  ) || variantsList.find((v) => v.ram === ram);
                  const isVarOos = match ? (!match.inStock || (match.stock !== undefined && match.stock <= 0)) : false;
                  const isSelected = selectedVariant?.ram === ram;

                  return (
                    <button
                      key={ram}
                      type="button"
                      disabled={isVarOos}
                      onClick={() => match && !isVarOos && setSelectedVariant(match)}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                        isVarOos
                          ? "opacity-40 line-through bg-tile text-muted cursor-not-allowed border-border"
                          : isSelected
                          ? "bg-[#C9A66B] dark:bg-[#D4B483] text-[#FFFCFA] border-[#C9A66B] shadow-xs"
                          : "bg-tile text-foreground border-border"
                      }`}
                    >
                      <span>{ram} RAM</span>
                      {isVarOos && <span className="ml-1 text-[9px] no-underline">OOS</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 7. Delivery PIN code check & Trust strip */}
          <div className="bg-card border border-border rounded-xl p-3.5 space-y-3 shadow-2xs">
            <span className="text-xs font-bold text-foreground block">Delivery Options</span>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <MapPin className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  maxLength={6}
                  inputMode="numeric"
                  value={pinCode}
                  onChange={(e) => setPinCode(e.target.value)}
                  placeholder="Enter PIN code"
                  className="w-full pl-9 pr-3 py-2 text-xs bg-tile border border-border rounded-xl text-foreground font-mono focus:outline-none focus:border-[#C9A66B]"
                />
              </div>
              <button
                type="button"
                onClick={() => setIsPinChecked(true)}
                className="px-4 py-2 bg-tile border border-border hover:bg-tile/80 text-foreground text-xs font-bold rounded-xl cursor-pointer"
              >
                Check
              </button>
            </div>

            {isPinChecked && (
              <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1.5 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>FREE Delivery by Tomorrow, 11 PM to {pinCode}</span>
              </div>
            )}

            {/* Trust Icon Strip */}
            <div className="grid grid-cols-4 gap-2 pt-2 border-t border-border text-center">
              <div className="flex flex-col items-center gap-1">
                <div className="w-8 h-8 rounded-full bg-tile border border-border flex items-center justify-center text-[#C9A66B]">
                  <RotateCcw className="w-3.5 h-3.5" />
                </div>
                <span className="text-[9px] text-muted font-medium leading-tight">7-Day Replacement</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="w-8 h-8 rounded-full bg-tile border border-border flex items-center justify-center text-[#C9A66B]">
                  <Truck className="w-3.5 h-3.5" />
                </div>
                <span className="text-[9px] text-muted font-medium leading-tight">Free Delivery</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="w-8 h-8 rounded-full bg-tile border border-border flex items-center justify-center text-[#C9A66B]">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </div>
                <span className="text-[9px] text-muted font-medium leading-tight">1-Yr Warranty</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="w-8 h-8 rounded-full bg-tile border border-border flex items-center justify-center text-[#C9A66B]">
                  <CreditCard className="w-3.5 h-3.5" />
                </div>
                <span className="text-[9px] text-muted font-medium leading-tight">COD Available</span>
              </div>
            </div>
          </div>

          {/* 8. Key Highlights & Specs Accordions */}
          <div className="bg-card border border-border rounded-xl p-4 space-y-3 shadow-2xs">
            <span className="text-xs font-bold text-foreground uppercase tracking-wide block">Key Highlights</span>
            <ul className="text-xs text-muted space-y-1.5">
              <li className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                <span>{product.display || "OLED ProMotion Display with 120Hz refresh"}</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                <span>{product.processor || "Flagship Octa-Core Processor"}</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                <span>{product.camera || "Triple Camera with 4K Dolby Vision"}</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                <span>{product.battery || "All-Day Battery with Fast Charging"}</span>
              </li>
            </ul>

            {/* Accordions */}
            <div className="pt-2 border-t border-border divide-y divide-border text-xs">
              {/* Display Accordion */}
              <div>
                <button
                  type="button"
                  onClick={() => toggleMobileSpec("display")}
                  className="w-full py-2.5 flex items-center justify-between text-left font-semibold text-foreground cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-accent" />
                    <span>Display Specifications</span>
                  </div>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${mobileSpecOpen.display ? "rotate-180" : ""}`} />
                </button>
                {mobileSpecOpen.display && (
                  <p className="pb-2.5 text-[11px] text-muted leading-relaxed">
                    {product.display || "AMOLED HDR10+ with 2000 nits peak outdoor brightness and Ceramic Shield glass protection."}
                  </p>
                )}
              </div>

              {/* Processor Accordion */}
              <div>
                <button
                  type="button"
                  onClick={() => toggleMobileSpec("processor")}
                  className="w-full py-2.5 flex items-center justify-between text-left font-semibold text-foreground cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-accent" />
                    <span>Processor & Graphics</span>
                  </div>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${mobileSpecOpen.processor ? "rotate-180" : ""}`} />
                </button>
                {mobileSpecOpen.processor && (
                  <p className="pb-2.5 text-[11px] text-muted leading-relaxed">
                    {product.processor || "4nm Architecture, 6-core GPU with hardware ray tracing, Neural Engine for on-device AI."}
                  </p>
                )}
              </div>

              {/* Camera Accordion */}
              <div>
                <button
                  type="button"
                  onClick={() => toggleMobileSpec("camera")}
                  className="w-full py-2.5 flex items-center justify-between text-left font-semibold text-foreground cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Camera className="w-4 h-4 text-accent" />
                    <span>Camera System</span>
                  </div>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${mobileSpecOpen.camera ? "rotate-180" : ""}`} />
                </button>
                {mobileSpecOpen.camera && (
                  <p className="pb-2.5 text-[11px] text-muted leading-relaxed">
                    {product.camera || "Ultra-wide, main with sensor-shift OIS, 5x telephoto optical zoom, Night mode portraits, Action mode video."}
                  </p>
                )}
              </div>

              {/* Battery Accordion */}
              <div>
                <button
                  type="button"
                  onClick={() => toggleMobileSpec("battery")}
                  className="w-full py-2.5 flex items-center justify-between text-left font-semibold text-foreground cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Battery className="w-4 h-4 text-accent" />
                    <span>Battery & Charging</span>
                  </div>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${mobileSpecOpen.battery ? "rotate-180" : ""}`} />
                </button>
                {mobileSpecOpen.battery && (
                  <p className="pb-2.5 text-[11px] text-muted leading-relaxed">
                    {product.battery || "Up to 29 hours video playback. 50% charge in 30 minutes with 20W+ adapter. Qi2 wireless charging supported."}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* 9. Reviews Summary with Rating Bars */}
          {siteSettings.showReviews === "true" && (
            <div className="bg-card border border-border rounded-xl p-4 space-y-3 shadow-2xs">
              <span className="text-xs font-bold text-foreground uppercase tracking-wide block">Customer Reviews</span>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div className="text-3xl font-extrabold text-foreground">{product.rating || 4.8}</div>
                  <div className="flex items-center gap-0.5 justify-center text-amber-500 pt-0.5">
                    <Star className="w-3 h-3 fill-amber-500" />
                    <Star className="w-3 h-3 fill-amber-500" />
                    <Star className="w-3 h-3 fill-amber-500" />
                    <Star className="w-3 h-3 fill-amber-500" />
                    <Star className="w-3 h-3 fill-amber-500" />
                  </div>
                  <span className="text-[10px] text-muted block mt-0.5">{product.reviewCount || 380} verified</span>
                </div>

                {/* Rating bars */}
                <div className="flex-1 space-y-1 text-[10px] text-muted">
                  {[
                    { stars: "5★", percent: 78 },
                    { stars: "4★", percent: 14 },
                    { stars: "3★", percent: 5 },
                    { stars: "2★", percent: 2 },
                    { stars: "1★", percent: 1 },
                  ].map((bar) => (
                    <div key={bar.stars} className="flex items-center gap-2">
                      <span className="w-4">{bar.stars}</span>
                      <div className="flex-1 h-1.5 bg-tile rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${bar.percent}%` }} />
                      </div>
                      <span className="w-6 text-right">{bar.percent}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 10. "Similar Phones" horizontal scroll row */}
          {similarPhones.length > 0 && (
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wide">Similar Smartphones</h3>
                <span className="text-[10px] text-muted">Swipe →</span>
              </div>
              <div className="flex items-stretch gap-2.5 overflow-x-auto scrollbar-none -mx-3.5 px-3.5 py-1">
                {similarPhones.map((sp) => (
                  <Link
                    key={sp.id}
                    href={`/mobile/${sp.id}`}
                    className="w-[145px] shrink-0 bg-card border border-border rounded-xl p-2.5 flex flex-col justify-between shadow-2xs group"
                  >
                    <div className="relative aspect-square w-full rounded-lg bg-white dark:bg-card p-2 flex items-center justify-center overflow-hidden mb-1.5 border border-border/40">
                      <Image src={sp.imageUrl} alt={sp.name} fill unoptimized className="object-contain" />
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[9px] uppercase font-bold text-muted">{sp.brand}</span>
                      <h4 className="text-xs font-bold text-foreground line-clamp-1 leading-snug">{sp.name}</h4>
                      <div className="text-xs font-bold text-foreground pt-0.5">
                        ₹{(sp.basePrice || 49999).toLocaleString("en-IN")}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sticky Bottom Buy Bar on Phone (<sm) */}
        <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-md border-t border-border px-3.5 py-2.5 z-40 flex items-center justify-between gap-3 shadow-2xl text-foreground pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="min-w-0 pr-1">
            <div className="text-base font-extrabold text-foreground leading-tight">
              ₹{currentPrice.toLocaleString("en-IN")}
            </div>
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold truncate">
              EMI from ₹{calculateEMI(currentPrice).toLocaleString("en-IN")}/mo
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {siteSettings.showWishlist === "true" && (
              <button
                onClick={() => toggleWishlist(product.id)}
                className={`w-10 h-10 rounded-full border flex items-center justify-center transition-colors cursor-pointer ${
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
              className="px-3.5 h-10 rounded-full border border-[#C9A66B] bg-[#C9A66B]/10 hover:bg-[#C9A66B]/20 text-[#8C6226] dark:text-[#D4B483] text-xs font-bold transition-all cursor-pointer disabled:opacity-40"
            >
              {isAdded ? "Added ✓" : "Add to Cart"}
            </button>

            <button
              onClick={handleBuyNow}
              disabled={isOutOfStock}
              className="px-5 h-10 rounded-full bg-[#C9A66B] dark:bg-[#D4B483] hover:bg-[#B8914A] active:scale-95 text-[#FFFCFA] text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-40"
            >
              Buy Now
            </button>
          </div>
        </div>

        {/* Tap to Zoom Modal */}
        {isZoomModalOpen && (
          <div
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col p-4 animate-in fade-in duration-150"
            onClick={() => setIsZoomModalOpen(false)}
          >
            <div className="flex justify-between items-center text-white pb-3">
              <span className="text-xs font-bold truncate">{product.name}</span>
              <button
                type="button"
                onClick={() => setIsZoomModalOpen(false)}
                className="p-1 rounded-full bg-white/20 text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 relative flex items-center justify-center">
              <Image
                src={selectedImage || product.imageUrl}
                alt={product.name}
                fill
                unoptimized
                className="object-contain"
              />
            </div>
          </div>
        )}
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* DESKTOP & TABLET UI (>=sm): 100% Intact and Unchanged */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="hidden sm:block">
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
            {productImagesList.length > 1 && (
              <div className="flex sm:flex-col gap-2.5 overflow-x-auto sm:overflow-y-auto max-h-[520px] scrollbar-none shrink-0">
                {productImagesList.map((img, idx) => (
                  <button
                    key={img.url || idx}
                    type="button"
                    onClick={() => setSelectedImage(img.url)}
                    className={`relative w-16 h-16 rounded-[14px] p-2 bg-tile border transition-all duration-200 cursor-pointer overflow-hidden ${
                      selectedImage === img.url
                        ? "border-[#C9A66B] dark:border-[#D4B483] ring-2 ring-[#C9A66B]/25 shadow-xs"
                        : "border-border hover:border-foreground/30"
                    }`}
                    title={img.alt || `Photo ${idx + 1}`}
                  >
                    <Image src={img.url} alt={img.alt || "Thumbnail"} fill unoptimized className="object-contain p-1" />
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
                  src={selectedImage || productImagesList[0]?.url || product.imageUrl}
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

            {/* Storage Pills from Variants */}
            <div className="space-y-2.5">
              <span className="text-xs font-bold text-foreground block">
                Storage Capacity: <span className="font-normal text-muted">{selectedVariant?.storage}</span>
              </span>
              <div className="flex flex-wrap gap-2">
                {distinctStorages.map((storageVariant: ProductVariantData) => {
                  const match = variantsList.find(
                    (v) => v.storage === storageVariant.storage && (selectedVariant ? v.ram === selectedVariant.ram : true)
                  ) || storageVariant;
                  const isVarOos = !match.inStock || (match.stock !== undefined && match.stock <= 0);
                  const isSelected = selectedVariant?.storage === storageVariant.storage;

                  return (
                    <button
                      key={storageVariant.storage}
                      disabled={isVarOos}
                      onClick={() => !isVarOos && setSelectedVariant(match)}
                      className={`px-4 py-2 rounded-full border text-xs font-medium transition-all duration-200 ${
                        isVarOos
                          ? "opacity-40 cursor-not-allowed line-through bg-tile text-muted border-border"
                          : isSelected
                          ? "border-[#C9A66B] dark:border-[#D4B483] bg-[#C9A66B] dark:bg-[#D4B483] text-[#FFFCFA] shadow-xs font-semibold cursor-pointer"
                          : "border-[#C9A66B]/30 bg-[#C9A66B]/5 text-foreground hover:border-[#C9A66B] cursor-pointer"
                      }`}
                      title={isVarOos ? `${storageVariant.storage} - Out of stock` : `${storageVariant.storage} (₹${match.basePrice.toLocaleString("en-IN")})`}
                    >
                      <span>{storageVariant.storage}</span>
                      <span className="ml-1.5 opacity-70">₹{match.basePrice.toLocaleString("en-IN")}</span>
                      {isVarOos && <span className="ml-1.5 text-[10px] font-normal no-underline opacity-80">(Out of stock)</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* RAM Pills from Variants */}
            {distinctRams.length > 0 && (
              <div className="space-y-2.5">
                <span className="text-xs font-bold text-foreground block">
                  Memory (RAM): <span className="font-normal text-muted">{selectedVariant?.ram || distinctRams[0]}</span>
                </span>
                <div className="flex flex-wrap gap-2">
                  {distinctRams.map((ram: string) => {
                    const match = variantsList.find(
                      (v) => v.ram === ram && (selectedVariant ? v.storage === selectedVariant.storage : true)
                    ) || variantsList.find((v) => v.ram === ram);
                    const isVarOos = match ? (!match.inStock || (match.stock !== undefined && match.stock <= 0)) : false;
                    const isSelected = selectedVariant?.ram === ram;

                    return (
                      <button
                        key={ram}
                        disabled={isVarOos}
                        onClick={() => match && !isVarOos && setSelectedVariant(match)}
                        className={`px-4 py-2 rounded-full border text-xs font-medium transition-all duration-200 ${
                          isVarOos
                            ? "opacity-40 cursor-not-allowed line-through bg-tile text-muted border-border"
                            : isSelected
                            ? "border-[#C9A66B] dark:border-[#D4B483] bg-[#C9A66B] dark:bg-[#D4B483] text-[#FFFCFA] shadow-xs font-semibold cursor-pointer"
                            : "border-[#C9A66B]/30 bg-[#C9A66B]/5 text-foreground hover:border-[#C9A66B] cursor-pointer"
                        }`}
                        title={isVarOos ? `${ram} - Out of stock` : ram}
                      >
                        {ram} Unified Memory
                        {isVarOos && <span className="ml-1.5 text-[10px] font-normal no-underline opacity-80">(Out of stock)</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

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