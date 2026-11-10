"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, AlertCircle } from "lucide-react";
import VariantEditor, { FormVariantRow } from "@/components/admin/VariantEditor";
import ProductImageManager from "@/components/admin/ProductImageManager";
import { ProductImageData } from "@/lib/types";

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
  const [rowErrors, setRowErrors] = useState<Record<number, string[]>>({});
  const [statusError, setStatusError] = useState<string | null>(null);
  const [images, setImages] = useState<ProductImageData[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    brand: "Apple",
    model: "",
    category: "SMARTPHONE",
    imageUrl: "",
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
  });

  const [variants, setVariants] = useState<FormVariantRow[]>([
    {
      ram: "8GB",
      storage: "128GB",
      basePrice: "69999",
      originalPrice: "79999",
      stock: "20",
      inStock: true,
      isDefault: true,
    },
    {
      ram: "8GB",
      storage: "256GB",
      basePrice: "79999",
      originalPrice: "89999",
      stock: "20",
      inStock: true,
      isDefault: false,
    },
    {
      ram: "8GB",
      storage: "512GB",
      basePrice: "99999",
      originalPrice: "109999",
      stock: "15",
      inStock: true,
      isDefault: false,
    },
  ]);

  const totalStock = variants.reduce((sum, v) => sum + (parseInt(v.stock, 10) || 0), 0);
  const isAnyVariantInStock = variants.some((v) => (parseInt(v.stock, 10) || 0) > 0 && v.inStock);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRowErrors({});
    setImageError(null);
    setStatusError(null);

    // Validate active upload
    if (isUploading) {
      setImageError("Please wait for the photo upload to complete before saving.");
      setStatusError("Please wait for photo uploads to finish before saving.");
      return;
    }

    // Validate Images: at least 1 image required
    if (images.length === 0) {
      setImageError("At least one product photo is required.");
      setStatusError("Every product must have at least one image before saving.");
      return;
    }

    if (variants.length === 0) {
      setStatusError("At least one variant is required.");
      return;
    }

    const errorsMap: Record<number, string[]> = {};
    const seenPairs = new Set<string>();

    variants.forEach((v, idx) => {
      const rowErrs: string[] = [];
      const ramStr = (v.ram || "").trim();
      const storageStr = (v.storage || "").trim();

      if (!ramStr) {
        rowErrs.push("RAM is required");
      }
      if (!storageStr) {
        rowErrs.push("Storage is required");
      }

      const pairKey = `${ramStr.toLowerCase()}_${storageStr.toLowerCase()}`;
      if (seenPairs.has(pairKey)) {
        rowErrs.push(`Duplicate RAM (${ramStr}) and Storage (${storageStr})`);
      } else {
        seenPairs.add(pairKey);
      }

      const bpStr = (v.basePrice || "").trim();
      if (!bpStr) {
        rowErrs.push("Base price is required");
      } else {
        const bp = parseInt(bpStr, 10);
        if (isNaN(bp) || bp <= 0) {
          rowErrs.push("Base price must be greater than 0");
        }
      }

      const opStr = (v.originalPrice || "").trim();
      if (opStr !== "") {
        const op = parseInt(opStr, 10);
        const bp = parseInt(bpStr, 10);
        if (isNaN(op) || (!isNaN(bp) && op < bp)) {
          rowErrs.push("Original price must be >= Base price");
        }
      }

      const stStr = (v.stock || "").trim();
      if (stStr === "") {
        rowErrs.push("Stock is required");
      } else {
        const st = parseInt(stStr, 10);
        if (isNaN(st) || st < 0) {
          rowErrs.push("Stock cannot be negative");
        }
      }

      if (rowErrs.length > 0) {
        errorsMap[idx] = rowErrs;
      }
    });

    if (Object.keys(errorsMap).length > 0) {
      setRowErrors(errorsMap);
      setStatusError("Please fix the highlighted errors in the variants table before saving.");
      return;
    }

    setLoading(true);

    const preparedVariants = variants.map((v) => {
      const bp = parseInt(v.basePrice.trim(), 10);
      const opStr = v.originalPrice.trim();
      const op = opStr !== "" ? parseInt(opStr, 10) : bp;
      const st = parseInt(v.stock.trim() || "0", 10);
      return {
        ram: v.ram.trim(),
        storage: v.storage.trim(),
        basePrice: bp,
        originalPrice: op,
        stock: st,
        inStock: v.inStock && st > 0,
        isDefault: v.isDefault,
        sku: v.sku ? v.sku.trim() : "",
      };
    });

    const primaryImg = images.find((img) => img.isPrimary) || images[0];

    const payload = {
      ...formData,
      imageUrl: primaryImg ? primaryImg.url : "",
      images,
      variants: preparedVariants,
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
        router.push("/admin/products");
      } else {
        setStatusError(data.error || "Failed to create product");
      }
    } catch {
      setStatusError("Error saving product to database");
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

      {statusError && (
        <div className="p-4 rounded-xl border flex items-center gap-3 text-xs font-medium bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 dark:text-rose-400" />
          <div className="flex-1">{statusError}</div>
          <button
            type="button"
            onClick={() => setStatusError(null)}
            className="text-xs hover:opacity-75 cursor-pointer font-bold px-1"
          >
            ✕
          </button>
        </div>
      )}

      <div className="bg-card border border-border rounded-2xl p-6 shadow-xs transition-colors duration-200">
        <h1 className="text-xl font-bold text-foreground mb-1">Add New Smartphone / Accessory</h1>
        <p className="text-xs text-muted mb-6">
          Enter product identity, specifications, and RAM/storage variants with independent pricing.
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
          </div>

          {/* Variants Section */}
          <div className="pt-4 border-t border-border">
            <VariantEditor
              variants={variants}
              onChange={setVariants}
              rowErrors={rowErrors}
            />
          </div>

          {/* Product Images Section (Above Hardware Specifications) */}
          <div className="pt-4 border-t border-border">
            <ProductImageManager
              images={images}
              onChange={setImages}
              availableColors={
                formData.colors
                  ? Array.isArray(formData.colors)
                    ? formData.colors
                    : []
                  : []
              }
              isUploading={isUploading}
              setIsUploading={setIsUploading}
              errorMessage={imageError}
              setErrorMessage={setImageError}
            />
          </div>

          {/* Specifications */}
          <div className="pt-4 border-t border-border space-y-4">
            <h3 className="text-sm font-bold text-foreground">Hardware Specifications</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-muted mb-1.5">Processor</label>
                <input
                  type="text"
                  value={formData.processor}
                  onChange={(e) => setFormData({ ...formData, processor: e.target.value })}
                  placeholder="e.g. A18 Pro Bionic / Snapdragon 8 Gen 3"
                  className="w-full px-4 py-2.5 bg-tile border border-border rounded-xl text-foreground text-xs focus:outline-none focus:border-[#C9A66B]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted mb-1.5">Display</label>
                <input
                  type="text"
                  value={formData.display}
                  onChange={(e) => setFormData({ ...formData, display: e.target.value })}
                  placeholder="e.g. 6.7 inch Super Retina XDR OLED"
                  className="w-full px-4 py-2.5 bg-tile border border-border rounded-xl text-foreground text-xs focus:outline-none focus:border-[#C9A66B]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted mb-1.5">Camera</label>
                <input
                  type="text"
                  value={formData.camera}
                  onChange={(e) => setFormData({ ...formData, camera: e.target.value })}
                  placeholder="e.g. 48MP Main + 12MP Ultra-Wide"
                  className="w-full px-4 py-2.5 bg-tile border border-border rounded-xl text-foreground text-xs focus:outline-none focus:border-[#C9A66B]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted mb-1.5">Battery</label>
                <input
                  type="text"
                  value={formData.battery}
                  onChange={(e) => setFormData({ ...formData, battery: e.target.value })}
                  placeholder="e.g. 4685 mAh All-Day Battery"
                  className="w-full px-4 py-2.5 bg-tile border border-border rounded-xl text-foreground text-xs focus:outline-none focus:border-[#C9A66B]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-muted mb-1.5">Operating System (OS)</label>
                <input
                  type="text"
                  value={formData.os}
                  onChange={(e) => setFormData({ ...formData, os: e.target.value })}
                  placeholder="e.g. iOS 18 / Android 15"
                  className="w-full px-4 py-2.5 bg-tile border border-border rounded-xl text-foreground text-xs focus:outline-none focus:border-[#C9A66B]"
                />
              </div>
            </div>
          </div>

          {/* Automatic In-Stock & Feature */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4 border-t border-border">
            <div className="flex items-center gap-2 text-xs font-medium text-foreground">
              <span className="text-muted">Automatic Stock Status:</span>
              {isAnyVariantInStock ? (
                <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/30">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  In Stock ({totalStock} total units)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-semibold bg-rose-500/10 px-2.5 py-1 rounded-full border border-rose-500/30">
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                  Out of Stock
                </span>
              )}
            </div>

            <label className="flex items-center gap-2 text-xs text-foreground/90 font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isFeatured}
                onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                className="rounded border-border text-[#C9A66B] focus:ring-[#C9A66B]"
              />
              Feature on Homepage
            </label>
          </div>

          <button
            type="submit"
            disabled={loading || isUploading || images.length === 0}
            className="w-full py-3 bg-[#C9A66B] dark:bg-[#D4B483] hover:bg-[#B8914A] dark:hover:bg-[#C49A5A] active:bg-[#A67C3D] text-[#FFFCFA] font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {loading ? "Creating Product..." : isUploading ? "Uploading Images..." : "Create Product with Variants"}
          </button>
        </form>
      </div>
    </main>
  );
}
