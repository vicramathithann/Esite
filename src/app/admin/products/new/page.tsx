"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";
import NumberInput from "@/components/NumberInput";

const FAMOUS_BRANDS = [
  "Apple",
  "Samsung",
  "Google Pixel",
  "OnePlus",
  "Xiaomi",
  "Redmi",
  "Realme",
  "Vivo",
  "Oppo",
  "Motorola",
  "Nothing",
  "Sony",
  "Asus",
  "iQOO",
  "Tecno",
  "Nokia",
];

export default function AdminNewProductPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    name: "",
    brand: "Apple",
    model: "",
    category: "SMARTPHONE",
    basePrice: "",
    discountPrice: "",
    originalPrice: "",
    stock: "",
    imageUrl: "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=800&auto=format&fit=crop&q=80",
    ram: "12GB",
    display: "6.7\" Super Retina XDR OLED 120Hz",
    displayType: "OLED 120Hz LTPO",
    processor: "A18 Pro Bionic",
    camera: "48MP Triple Pro Camera",
    rearCamera: "48MP Main + 48MP Ultra-Wide + 12MP 5x Telephoto",
    frontCamera: "12MP TrueDepth Front Camera",
    battery: "4685 mAh All-Day Battery",
    batteryCapacity: "4685 mAh",
    os: "iOS 18",
    network5G: "5G Sub-6 & mmWave",
    warrantyMonths: "12",
    isFeatured: false,
    tagline: "The Ultimate Pro Smartphone",
    colors: [
      { name: "Black Titanium", hex: "#2b2b2b" },
      { name: "Natural Titanium", hex: "#8c8780" },
      { name: "Desert Titanium", hex: "#c9bba8" },
    ],
    storageOptions: [
      { size: "128GB", price: 69999 },
      { size: "256GB", price: 79999 },
      { size: "512GB", price: 99999 },
    ],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate fields before conversion
    const newErrors: Record<string, string> = {};
    const basePriceStr = String(formData.basePrice || "").trim();
    const stockStr = String(formData.stock || "").trim();
    const origPriceStr = String(formData.originalPrice || "").trim();

    if (!basePriceStr) {
      newErrors.basePrice = "Enter a valid price";
    } else {
      const bp = parseInt(basePriceStr, 10);
      if (isNaN(bp) || bp <= 0) {
        newErrors.basePrice = "Base Price must be greater than 0";
      }
    }

    if (stockStr === "") {
      newErrors.stock = "Enter available stock";
    } else {
      const st = parseInt(stockStr, 10);
      if (isNaN(st) || st < 0) {
        newErrors.stock = "Stock cannot be negative";
      }
    }

    if (origPriceStr !== "" && basePriceStr !== "") {
      const bp = parseInt(basePriceStr, 10);
      const op = parseInt(origPriceStr, 10);
      if (!isNaN(bp) && !isNaN(op) && op < bp) {
        newErrors.originalPrice = "Original Price must be greater than or equal to Base Price";
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);

    const priceNum = parseInt(basePriceStr, 10);
    const stockNum = parseInt(stockStr, 10);
    const origNum = origPriceStr !== "" ? parseInt(origPriceStr, 10) : priceNum;

    const payload = {
      ...formData,
      basePrice: priceNum,
      originalPrice: origNum,
      stock: stockNum,
      discountPrice: formData.discountPrice ? parseInt(formData.discountPrice, 10) : null,
      warrantyMonths: formData.warrantyMonths ? parseInt(formData.warrantyMonths, 10) : 12,
    };

    try {
      const res = await fetch("/api/products", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        alert("Product created successfully!");
        router.push("/admin/products");
      } else {
        alert(data.error || "Failed to create product");
      }
    } catch {
      alert("Error saving product to database");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <Link
          href="/admin/products"
          className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Products
        </Link>

        <div className="bg-card border border-border rounded-2xl p-6 shadow-xs transition-colors duration-200">
          <h1 className="text-xl font-bold text-foreground mb-1">Add New Smartphone / Accessory</h1>
          <p className="text-xs text-muted mb-6">
            Enter full technical specifications. Mobile products automatically register for 1-Year Device Shield warranty upon customer purchase.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Core Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-muted mb-1.5">Product Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Apple iPhone 16 Pro Max"
                  className="w-full px-4 py-2.5 bg-tile border border-border rounded-xl text-foreground text-xs focus:outline-none focus:border-[#C9A66B]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted mb-1.5">Brand</label>
                <select
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  className="w-full px-4 py-2.5 bg-tile border border-border rounded-xl text-foreground text-xs focus:outline-none focus:border-[#C9A66B]"
                >
                  {FAMOUS_BRANDS.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted mb-1.5">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-2.5 bg-tile border border-border rounded-xl text-foreground text-xs focus:outline-none focus:border-[#C9A66B]"
                >
                  <option value="SMARTPHONE">Smartphone</option>
                  <option value="ACCESSORY">Mobile Accessory</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted mb-1.5">
                  Base Price (₹) <span className="text-red-500">*</span>
                </label>
                <NumberInput
                  value={formData.basePrice}
                  onChange={(e) => {
                    setFormData({ ...formData, basePrice: e.target.value });
                    if (errors.basePrice) setErrors((prev) => ({ ...prev, basePrice: "" }));
                  }}
                  placeholder="Enter base price"
                  hasError={Boolean(errors.basePrice)}
                  className="w-full px-4 py-2.5 bg-tile border border-border rounded-xl text-foreground text-xs focus:outline-none focus:border-[#C9A66B]"
                />
                {errors.basePrice && (
                  <p className="mt-1 text-xs text-red-500 font-medium">{errors.basePrice}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted mb-1.5">Original Price (₹)</label>
                <NumberInput
                  value={formData.originalPrice}
                  onChange={(e) => {
                    setFormData({ ...formData, originalPrice: e.target.value });
                    if (errors.originalPrice) setErrors((prev) => ({ ...prev, originalPrice: "" }));
                  }}
                  placeholder="Enter original price (optional)"
                  hasError={Boolean(errors.originalPrice)}
                  className="w-full px-4 py-2.5 bg-tile border border-border rounded-xl text-foreground text-xs focus:outline-none focus:border-[#C9A66B]"
                />
                {errors.originalPrice && (
                  <p className="mt-1 text-xs text-red-500 font-medium">{errors.originalPrice}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted mb-1.5">
                  Initial Stock Quantity <span className="text-red-500">*</span>
                </label>
                <NumberInput
                  value={formData.stock}
                  onChange={(e) => {
                    setFormData({ ...formData, stock: e.target.value });
                    if (errors.stock) setErrors((prev) => ({ ...prev, stock: "" }));
                  }}
                  placeholder="Enter stock quantity"
                  hasError={Boolean(errors.stock)}
                  className="w-full px-4 py-2.5 bg-tile border border-border rounded-xl text-foreground text-xs focus:outline-none focus:border-[#C9A66B]"
                />
                {errors.stock && (
                  <p className="mt-1 text-xs text-red-500 font-medium">{errors.stock}</p>
                )}
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-muted mb-1.5">Product Image URL</label>
                <input
                  type="url"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-4 py-2.5 bg-tile border border-border rounded-xl text-foreground text-xs focus:outline-none focus:border-[#C9A66B]"
                  required
                />
              </div>
            </div>

            {/* Smartphone Specifications */}
            <div className="border-t border-border pt-5 space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#8C6226] dark:text-[#E5CBA2]">Technical Specifications</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-muted mb-1">Processor</label>
                  <input
                    type="text"
                    value={formData.processor}
                    onChange={(e) => setFormData({ ...formData, processor: e.target.value })}
                    className="w-full px-4 py-2 bg-tile border border-border rounded-xl text-foreground focus:outline-none focus:border-[#C9A66B]"
                  />
                </div>

                <div>
                  <label className="block text-muted mb-1">RAM</label>
                  <input
                    type="text"
                    value={formData.ram}
                    onChange={(e) => setFormData({ ...formData, ram: e.target.value })}
                    className="w-full px-4 py-2 bg-tile border border-border rounded-xl text-foreground focus:outline-none focus:border-[#C9A66B]"
                  />
                </div>

                <div>
                  <label className="block text-muted mb-1">Display</label>
                  <input
                    type="text"
                    value={formData.display}
                    onChange={(e) => setFormData({ ...formData, display: e.target.value })}
                    className="w-full px-4 py-2 bg-tile border border-border rounded-xl text-foreground focus:outline-none focus:border-[#C9A66B]"
                  />
                </div>

                <div>
                  <label className="block text-muted mb-1">Operating System</label>
                  <input
                    type="text"
                    value={formData.os}
                    onChange={(e) => setFormData({ ...formData, os: e.target.value })}
                    className="w-full px-4 py-2 bg-tile border border-border rounded-xl text-foreground focus:outline-none focus:border-[#C9A66B]"
                  />
                </div>

                <div>
                  <label className="block text-muted mb-1">Rear Camera</label>
                  <input
                    type="text"
                    value={formData.rearCamera}
                    onChange={(e) => setFormData({ ...formData, rearCamera: e.target.value })}
                    className="w-full px-4 py-2 bg-tile border border-border rounded-xl text-foreground focus:outline-none focus:border-[#C9A66B]"
                  />
                </div>

                <div>
                  <label className="block text-muted mb-1">Front Camera</label>
                  <input
                    type="text"
                    value={formData.frontCamera}
                    onChange={(e) => setFormData({ ...formData, frontCamera: e.target.value })}
                    className="w-full px-4 py-2 bg-tile border border-border rounded-xl text-foreground focus:outline-none focus:border-[#C9A66B]"
                  />
                </div>

                <div>
                  <label className="block text-muted mb-1">Battery</label>
                  <input
                    type="text"
                    value={formData.battery}
                    onChange={(e) => setFormData({ ...formData, battery: e.target.value })}
                    className="w-full px-4 py-2 bg-tile border border-border rounded-xl text-foreground focus:outline-none focus:border-[#C9A66B]"
                  />
                </div>

                <div>
                  <label className="block text-muted mb-1">5G Network Band</label>
                  <input
                    type="text"
                    value={formData.network5G}
                    onChange={(e) => setFormData({ ...formData, network5G: e.target.value })}
                    className="w-full px-4 py-2 bg-tile border border-border rounded-xl text-foreground focus:outline-none focus:border-[#C9A66B]"
                  />
                </div>
              </div>
            </div>

            {/* Featured Checkbox */}
            <div className="flex items-center gap-2 pt-2 border-t border-border">
              <input
                type="checkbox"
                id="featuredToggle"
                checked={formData.isFeatured}
                onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                className="rounded border-border text-[#C9A66B] focus:ring-[#C9A66B]"
              />
              <label htmlFor="featuredToggle" className="text-xs text-foreground/90 font-medium cursor-pointer">
                Mark as Featured Flagship Device (Promoted on homepage hero)
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#C9A66B] dark:bg-[#D4B483] hover:bg-[#B8914A] dark:hover:bg-[#C49A5A] active:bg-[#A67C3D] text-[#FFFCFA] font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer"
            >
              <Save className="w-4 h-4" />
              {loading ? "Publishing Product..." : "Publish to Storefront"}
            </button>
          </form>
        </div>
      </main>
  );
}
