"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useApp } from "@/context/AppContext";
import { MobileProductData } from "@/lib/types";
import { DEFAULT_PRODUCTS } from "@/lib/catalogData";
import { 
  X, 
  Plus, 
  Layers, 
  Cpu, 
  Camera, 
  Battery, 
  Smartphone, 
  ShieldCheck, 
  ChevronRight, 
  Check,
  ShoppingBag
} from "lucide-react";
import { formatINR, calculateEMI } from "@/lib/formatters";

export default function ComparePage() {
  const { compareList, addToCompare, removeFromCompare, clearCompare, addToCart } = useApp();
  const [allProducts, setAllProducts] = useState<MobileProductData[]>(DEFAULT_PRODUCTS);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addedItemMap, setAddedItemMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    async function fetchAll() {
      try {
        const res = await fetch("/api/products");
        const data = await res.json();
        if (data.success) {
          setAllProducts(data.products);
        }
      } catch (e) {
        console.error("Failed to load products for comparison", e);
      }
    }
    fetchAll();
  }, []);

  const handleAddToCart = (product: MobileProductData) => {
    addToCart({
      id: `${product.id}-${product.storageOptions[0]?.size || "256GB"}-${product.colors[0]?.name || "Default"}`,
      productId: product.id,
      name: product.name,
      brand: product.brand,
      imageUrl: product.imageUrl,
      selectedColor: product.colors[0] || { name: "Standard", hex: "#1e1e1e" },
      selectedStorage: product.storageOptions[0] || { size: "256GB", price: product.basePrice },
      price: product.basePrice,
      quantity: 1,
      warrantyMonths: product.warrantyMonths || 12,
    });

    setAddedItemMap((prev) => ({ ...prev, [product.id]: true }));
    setTimeout(() => {
      setAddedItemMap((prev) => ({ ...prev, [product.id]: false }));
    }, 1800);
  };

  return (
    <div className="min-h-screen pb-24 bg-background text-foreground transition-colors duration-200">
      {/* Breadcrumb */}
      <div className="bg-card border-b border-border">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-3 text-xs text-muted flex items-center gap-1.5">
          <Link href="/" className="hover:text-foreground transition-colors">Phones</Link>
          <ChevronRight className="w-3 h-3 text-muted" />
          <span className="text-foreground font-medium">Compare Models</span>
        </div>
      </div>

      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
              Compare Smartphones
            </h1>
            <p className="text-sm text-muted mt-1">
              Select up to 3 phones and compare display, chip, camera, battery, and price.
            </p>
          </div>

          {compareList.length > 0 && (
            <button
              onClick={clearCompare}
              className="text-xs text-muted hover:text-foreground px-4 py-2 rounded-full border border-border bg-tile transition-all duration-200 cursor-pointer shadow-xs"
            >
              Clear all
            </button>
          )}
        </div>

        {compareList.length === 0 ? (
          <div className="bg-card border border-border rounded-[20px] p-16 text-center text-muted space-y-4 shadow-xs">
            <div className="w-16 h-16 rounded-full bg-tile flex items-center justify-center mx-auto text-muted">
              <Layers className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-foreground">No Smartphones in Comparison</h3>
            <p className="text-sm text-muted max-w-sm mx-auto">
              Select &quot;Compare&quot; on any flagship device card or browse the catalog.
            </p>
            <div className="pt-2">
              <Link href="/" className="px-6 py-3 rounded-full bg-accent hover:opacity-90 text-white dark:text-[#0B0B0C] text-xs font-semibold inline-block transition-all duration-200 shadow-sm">
                Browse All Models
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-[20px] p-6 sm:p-8 shadow-xs overflow-x-auto">
            <div className="min-w-[760px]">
              {/* Product Header Cards Row */}
              <div className="grid grid-cols-4 gap-6 pb-8 border-b border-border">
                <div className="flex flex-col justify-end">
                  <span className="text-xs uppercase tracking-wider font-bold text-muted">
                    Comparing {compareList.length} of 3
                  </span>
                </div>

                {compareList.map((item) => (
                  <div key={item.id} className="relative space-y-3 p-4 rounded-[16px] bg-tile border border-border/50 text-center flex flex-col justify-between">
                    <button
                      onClick={() => removeFromCompare(item.id)}
                      className="absolute top-2 right-2 p-1 text-muted hover:text-foreground rounded-full hover:bg-card transition-colors"
                      title="Remove"
                    >
                      <X className="w-4 h-4" />
                    </button>

                    <div className="relative aspect-square w-full max-h-36 p-2 mx-auto">
                      <Image src={item.imageUrl} alt={item.name} fill unoptimized className="object-contain" />
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold text-accent">{item.brand}</span>
                      <h4 className="font-bold text-sm text-foreground line-clamp-1">{item.name}</h4>
                      <div className="text-base font-bold text-foreground">
                        ₹{item.basePrice.toLocaleString("en-IN")}
                      </div>
                      <div className="text-[11px] text-muted">
                        EMI from ₹{calculateEMI(item.basePrice).toLocaleString("en-IN")}/mo
                      </div>
                    </div>

                    <div className="pt-2">
                      <button
                        onClick={() => handleAddToCart(item)}
                        className={`py-2 px-3 text-xs w-full font-semibold rounded-full transition-all duration-200 cursor-pointer shadow-xs flex items-center justify-center gap-1.5 ${
                          addedItemMap[item.id]
                            ? "bg-emerald-600 text-white font-semibold"
                            : "bg-accent hover:opacity-90 text-white dark:text-[#0B0B0C]"
                        }`}
                      >
                        {addedItemMap[item.id] ? (
                          <>
                            <Check className="w-3.5 h-3.5" /> Added
                          </>
                        ) : (
                          <>
                            <ShoppingBag className="w-3.5 h-3.5" /> Add to Cart
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}

                {compareList.length < 3 && (
                  <div
                    onClick={() => setShowAddModal(true)}
                    className="border-2 border-dashed border-border rounded-[16px] p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-tile transition-all duration-200 min-h-[220px]"
                  >
                    <Plus className="w-6 h-6 text-accent mb-2" />
                    <span className="text-xs font-bold text-foreground">Add Device</span>
                    <span className="text-[11px] text-muted mt-0.5">Compare up to 3</span>
                  </div>
                )}
              </div>

              {/* Spec Rows */}
              <div className="divide-y divide-border text-xs">
                {/* Display */}
                <div className="grid grid-cols-4 gap-6 py-4 items-center">
                  <div className="font-bold text-foreground flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-accent" />
                    <span>Display</span>
                  </div>
                  {compareList.map((item) => (
                    <div key={item.id} className="text-foreground">{item.display}</div>
                  ))}
                </div>

                {/* Processor */}
                <div className="grid grid-cols-4 gap-6 py-4 items-center">
                  <div className="font-bold text-foreground flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-accent" />
                    <span>Processor</span>
                  </div>
                  {compareList.map((item) => (
                    <div key={item.id} className="text-foreground">{item.processor}</div>
                  ))}
                </div>

                {/* Camera */}
                <div className="grid grid-cols-4 gap-6 py-4 items-center">
                  <div className="font-bold text-foreground flex items-center gap-2">
                    <Camera className="w-4 h-4 text-accent" />
                    <span>Camera System</span>
                  </div>
                  {compareList.map((item) => (
                    <div key={item.id} className="text-foreground leading-relaxed">{item.camera}</div>
                  ))}
                </div>

                {/* Battery */}
                <div className="grid grid-cols-4 gap-6 py-4 items-center">
                  <div className="font-bold text-foreground flex items-center gap-2">
                    <Battery className="w-4 h-4 text-accent" />
                    <span>Battery & Charging</span>
                  </div>
                  {compareList.map((item) => (
                    <div key={item.id} className="text-foreground">{item.battery}</div>
                  ))}
                </div>

                {/* RAM & Storage */}
                <div className="grid grid-cols-4 gap-6 py-4 items-center">
                  <div className="font-bold text-foreground">RAM & Storage</div>
                  {compareList.map((item) => (
                    <div key={item.id} className="text-foreground">
                      {item.ram} | {item.storageOptions.map((s) => s.size).join(", ")}
                    </div>
                  ))}
                </div>

                {/* Operating System */}
                <div className="grid grid-cols-4 gap-6 py-4 items-center">
                  <div className="font-bold text-foreground">Operating System</div>
                  {compareList.map((item) => (
                    <div key={item.id} className="text-foreground">{item.os}</div>
                  ))}
                </div>

                {/* 5G Support */}
                <div className="grid grid-cols-4 gap-6 py-4 items-center">
                  <div className="font-bold text-foreground">Cellular</div>
                  {compareList.map((item) => (
                    <div key={item.id} className="text-foreground">{item.network5G}</div>
                  ))}
                </div>

                {/* Warranty & SMS Protection */}
                <div className="grid grid-cols-4 gap-6 py-4 items-center bg-tile rounded-[14px] px-3">
                  <div className="font-bold text-foreground flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-accent" />
                    <span>Warranty & SMS Protection</span>
                  </div>
                  {compareList.map((item) => (
                    <div key={item.id} className="text-accent font-semibold">
                      {item.warrantyMonths} Months + Pre-Expiry SMS
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-md bg-card border border-border rounded-[20px] p-6 shadow-2xl max-h-[80vh] flex flex-col animate-scale-up text-foreground">
            <div className="flex justify-between items-center border-b border-border pb-3">
              <h3 className="font-bold text-base text-foreground">Choose Device to Compare</h3>
              <button onClick={() => setShowAddModal(false)} className="text-muted hover:text-foreground p-1 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto py-3 space-y-2 flex-1 scrollbar-thin">
              {allProducts
                .filter((p) => !compareList.some((c) => c.id === p.id))
                .map((product) => (
                  <div
                    key={product.id}
                    onClick={() => {
                      addToCompare(product);
                      setShowAddModal(false);
                    }}
                    className="p-3 border border-border rounded-[14px] hover:bg-tile flex items-center gap-3.5 cursor-pointer transition-all duration-200"
                  >
                    <div className="relative w-12 h-12 bg-tile rounded-[10px] p-1.5 shrink-0">
                      <Image src={product.imageUrl} alt={product.name} fill unoptimized className="object-contain" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-foreground truncate">{product.name}</div>
                      <div className="text-[11px] text-muted">₹{product.basePrice.toLocaleString("en-IN")}</div>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-accent text-white dark:text-[#0B0B0C] text-xs font-semibold">
                      Add
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}