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
  Check 
} from "lucide-react";
import { formatINR } from "@/lib/formatters";

export default function ComparePage() {
  const { compareList, removeFromCompare, clearCompare, addToCart } = useApp();
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
    <div className="min-h-screen pb-20 bg-[#eaeded]">
      {/* Breadcrumb */}
      <div className="max-w-[1450px] mx-auto px-4 py-3 text-xs text-gray-500 flex items-center gap-1">
        <Link href="/" className="text-[#007185] hover:underline">Mobiles</Link>
        <ChevronRight className="w-3 h-3 text-gray-400" />
        <span className="text-gray-900 font-medium">Compare Smartphones</span>
      </div>

      <div className="max-w-[1450px] mx-auto px-4">
        {/* Header */}
        <div className="bg-white border border-gray-200 rounded-sm p-5 mb-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#0f1111]">
              Compare Smartphones Side-by-Side
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Review differences in processors, cameras, batteries, and prices on VM Mobiles.in
            </p>
          </div>

          {compareList.length > 0 && (
            <button
              onClick={clearCompare}
              className="text-xs text-gray-600 hover:text-[#c7511f] border border-gray-300 rounded-sm px-3 py-1.5 bg-white hover:bg-gray-50"
            >
              Clear comparison
            </button>
          )}
        </div>

        {compareList.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-sm p-12 text-center text-gray-600 space-y-3">
            <Layers className="w-12 h-12 mx-auto text-gray-400" />
            <h3 className="text-lg font-bold text-[#0f1111]">No Smartphones in Comparison</h3>
            <p className="text-xs text-gray-500">
              Select &quot;Compare&quot; on any smartphone to view full specs side by side.
            </p>
            <Link href="/" className="btn-amazon-yellow py-2 px-6 text-xs font-bold inline-block">
              Browse Latest Mobiles
            </Link>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-sm p-6 overflow-x-auto">
            <div className="min-w-[700px]">
              {/* Product Header Row */}
              <div className="grid grid-cols-4 gap-4 pb-6 border-b border-gray-200">
                <div className="flex flex-col justify-end">
                  <span className="text-xs uppercase font-bold text-gray-500">
                    Comparing {compareList.length} of 3 devices
                  </span>
                </div>

                {compareList.map((item) => (
                  <div key={item.id} className="relative space-y-2.5 p-2 text-center">
                    <button
                      onClick={() => removeFromCompare(item.id)}
                      className="absolute top-0 right-0 p-1 text-gray-400 hover:text-gray-700"
                      title="Remove"
                    >
                      <X className="w-4 h-4" />
                    </button>

                    <div className="relative aspect-square w-full max-h-40 p-2">
                      <Image src={item.imageUrl} alt={item.name} fill unoptimized className="object-contain" />
                    </div>

                    <div>
                      <h4 className="font-bold text-sm text-[#0f1111] line-clamp-1">{item.name}</h4>
                      <div className="text-base font-bold text-[#0f1111] mt-0.5">
                        ₹{item.basePrice.toLocaleString("en-IN")}
                      </div>
                    </div>

                    <button
                      onClick={() => handleAddToCart(item)}
                      className={`btn-amazon-yellow py-1.5 px-3 text-xs w-full font-medium ${
                        addedItemMap[item.id] ? "bg-emerald-600 text-white font-bold" : ""
                      }`}
                    >
                      {addedItemMap[item.id] ? "Added ✓" : "Add to Cart"}
                    </button>
                  </div>
                ))}

                {compareList.length < 3 && (
                  <div
                    onClick={() => setShowAddModal(true)}
                    className="border-2 border-dashed border-gray-300 rounded-sm p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-gray-50"
                  >
                    <Plus className="w-6 h-6 text-gray-400 mb-1" />
                    <span className="text-xs font-bold text-[#007185]">Add Smartphone</span>
                    <span className="text-[11px] text-gray-500">Compare up to 3</span>
                  </div>
                )}
              </div>

              {/* Spec Rows */}
              <div className="divide-y divide-gray-100 text-xs">
                {/* Processor */}
                <div className="grid grid-cols-4 gap-4 py-3 items-center">
                  <div className="font-bold text-gray-600">Processor</div>
                  {compareList.map((item) => (
                    <div key={item.id} className="text-[#0f1111] font-mono">{item.processor}</div>
                  ))}
                </div>

                {/* Camera */}
                <div className="grid grid-cols-4 gap-4 py-3 items-center">
                  <div className="font-bold text-gray-600">Camera System</div>
                  {compareList.map((item) => (
                    <div key={item.id} className="text-gray-800 leading-relaxed">{item.camera}</div>
                  ))}
                </div>

                {/* Display */}
                <div className="grid grid-cols-4 gap-4 py-3 items-center">
                  <div className="font-bold text-gray-600">Display</div>
                  {compareList.map((item) => (
                    <div key={item.id} className="text-gray-800">{item.display}</div>
                  ))}
                </div>

                {/* Battery */}
                <div className="grid grid-cols-4 gap-4 py-3 items-center">
                  <div className="font-bold text-gray-600">Battery & Charging</div>
                  {compareList.map((item) => (
                    <div key={item.id} className="text-gray-800">{item.battery}</div>
                  ))}
                </div>

                {/* OS */}
                <div className="grid grid-cols-4 gap-4 py-3 items-center">
                  <div className="font-bold text-gray-600">Operating System</div>
                  {compareList.map((item) => (
                    <div key={item.id} className="text-gray-800">{item.os}</div>
                  ))}
                </div>

                {/* Warranty & SMS */}
                <div className="grid grid-cols-4 gap-4 py-3 items-center bg-[#fef8f2]">
                  <div className="font-bold text-[#703800]">Warranty & SMS Alerts</div>
                  {compareList.map((item) => (
                    <div key={item.id} className="text-emerald-700 font-bold">
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
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-gray-300 rounded-sm p-4 shadow-xl max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-bold text-sm text-[#0f1111]">Choose a Phone to Compare</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-black">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto py-2 space-y-2 flex-1">
              {allProducts
                .filter((p) => !compareList.some((c) => c.id === p.id))
                .map((product) => (
                  <div
                    key={product.id}
                    onClick={() => {
                      useApp().addToCompare(product);
                      setShowAddModal(false);
                    }}
                    className="p-2 border rounded-xs hover:bg-gray-50 flex items-center gap-3 cursor-pointer"
                  >
                    <div className="relative w-10 h-10 shrink-0">
                      <Image src={product.imageUrl} alt={product.name} fill unoptimized className="object-contain" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-[#0f1111] truncate">{product.name}</div>
                      <div className="text-[11px] text-gray-600">₹{product.basePrice.toLocaleString("en-IN")}</div>
                    </div>
                    <span className="btn-amazon-yellow py-1 px-3 text-xs font-bold">
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