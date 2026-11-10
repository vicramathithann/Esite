"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, AlertCircle, CheckCircle2 } from "lucide-react";
import VariantEditor, { FormVariantRow } from "@/components/admin/VariantEditor";
import ProductImageManager from "@/components/admin/ProductImageManager";
import { ProductImageData } from "@/lib/types";

export default function AdminEditProductPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<any | null>(null);
  const [variants, setVariants] = useState<FormVariantRow[]>([]);
  const [images, setImages] = useState<ProductImageData[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [rowErrors, setRowErrors] = useState<Record<number, string[]>>({});
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    async function loadProduct() {
      if (!productId) return;
      try {
        setLoading(true);
        setStatusMessage(null);
        const res = await fetch(`/api/products/${productId}`, {
          credentials: "include",
          cache: "no-store",
        });
        const data = await res.json();
        if (data.success && data.product) {
          setFormData(data.product);

          // 1. Initialize Variants
          let initialVariants: FormVariantRow[] = [];
          if (Array.isArray(data.product.variants) && data.product.variants.length > 0) {
            initialVariants = data.product.variants.map((v: any) => ({
              id: v.id,
              ram: v.ram || "8GB",
              storage: v.storage || "128GB",
              basePrice: v.basePrice !== undefined ? String(v.basePrice) : String(v.price || ""),
              originalPrice: v.originalPrice !== undefined && v.originalPrice !== null ? String(v.originalPrice) : "",
              stock: v.stock !== undefined ? String(v.stock) : "20",
              inStock: Boolean(v.inStock),
              isDefault: Boolean(v.isDefault),
              sku: v.sku || "",
            }));
          } else if (Array.isArray(data.product.storageOptions) && data.product.storageOptions.length > 0) {
            initialVariants = data.product.storageOptions.map((opt: any, idx: number) => ({
              id: opt.id,
              ram: opt.ram || (data.product.ram ? data.product.ram.split("/")[0].trim() : "8GB"),
              storage: opt.size || opt.storage || "128GB",
              basePrice: opt.basePrice !== undefined ? String(opt.basePrice) : String(opt.price || data.product.basePrice || ""),
              originalPrice: opt.originalPrice !== undefined ? String(opt.originalPrice) : String(data.product.originalPrice || ""),
              stock: opt.stock !== undefined ? String(opt.stock) : String(data.product.stock ?? "20"),
              inStock: true,
              isDefault: idx === 0,
              sku: opt.sku || "",
            }));
          } else {
            initialVariants = [
              {
                ram: data.product.ram ? data.product.ram.split("/")[0].trim() : "8GB",
                storage: "128GB",
                basePrice: String(data.product.basePrice || "49999"),
                originalPrice: String(data.product.originalPrice || "54999"),
                stock: String(data.product.stock ?? "20"),
                inStock: true,
                isDefault: true,
              },
            ];
          }

          if (!initialVariants.some((v) => v.isDefault) && initialVariants.length > 0) {
            initialVariants[0].isDefault = true;
          }
          setVariants(initialVariants);

          // 2. Initialize Images
          let initialImages: ProductImageData[] = [];
          if (Array.isArray(data.product.images) && data.product.images.length > 0) {
            initialImages = data.product.images;
          } else if (Array.isArray(data.product.galleryImages) && data.product.galleryImages.length > 0) {
            initialImages = data.product.galleryImages.map((u: any, idx: number) => {
              if (typeof u === "object" && u !== null && u.url) return u;
              return {
                url: typeof u === "string" ? u : "",
                alt: `${data.product.name} photo ${idx + 1}`,
                isPrimary: idx === 0,
                order: idx,
              };
            });
          } else if (data.product.imageUrl) {
            initialImages = [
              {
                url: data.product.imageUrl,
                alt: data.product.name,
                isPrimary: true,
                order: 0,
              },
            ];
          }
          setImages(initialImages);
        } else {
          setStatusMessage({
            type: "error",
            text: data.error || "Failed to load product details.",
          });
        }
      } catch (e: any) {
        console.error("Failed to load product:", e);
        setStatusMessage({
          type: "error",
          text: e?.message || "Failed to communicate with server.",
        });
      } finally {
        setLoading(false);
      }
    }
    loadProduct();
  }, [productId]);

  const totalStock = variants.reduce((sum, v) => sum + (parseInt(v.stock, 10) || 0), 0);
  const isAnyVariantInStock = variants.some((v) => (parseInt(v.stock, 10) || 0) > 0 && v.inStock);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData) return;
    setRowErrors({});
    setImageError(null);
    setStatusMessage(null);

    // Validate active upload
    if (isUploading) {
      setImageError("Please wait for the photo upload to complete before saving.");
      setStatusMessage({
        type: "error",
        text: "Please wait for photo uploads to finish before saving.",
      });
      return;
    }

    // Validate Images: at least 1 image required
    if (images.length === 0) {
      setImageError("At least one product photo is required.");
      setStatusMessage({
        type: "error",
        text: "Every product must have at least one image before saving.",
      });
      return;
    }

    // Validate Variants
    if (variants.length === 0) {
      setStatusMessage({
        type: "error",
        text: "At least one variant is required.",
      });
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
      setStatusMessage({
        type: "error",
        text: "Please fix the highlighted errors in the variants table before saving.",
      });
      return;
    }

    setSaving(true);

    const preparedVariants = variants.map((v) => {
      const bp = parseInt(v.basePrice.trim(), 10);
      const opStr = v.originalPrice.trim();
      const op = opStr !== "" ? parseInt(opStr, 10) : bp;
      const st = parseInt(v.stock.trim() || "0", 10);
      return {
        id: v.id,
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

    const payload = {
      name: formData.name,
      brand: formData.brand,
      model: formData.model || null,
      series: formData.series || "",
      tagline: formData.tagline || "",
      category: formData.category || "SMARTPHONE",
      isFeatured: Boolean(formData.isFeatured),
      warrantyMonths: formData.warrantyMonths ? parseInt(formData.warrantyMonths, 10) : 12,
      processor: formData.processor || "",
      display: formData.display || "",
      camera: formData.camera || "",
      battery: formData.battery || "",
      os: formData.os || "",
      variants: preparedVariants,
      images: images.map((img, i) => ({
        url: img.url.trim(),
        alt: img.alt ? img.alt.trim() : `${formData.name} photo ${i + 1}`,
        isPrimary: img.isPrimary,
        order: i,
        colorKey: img.colorKey,
      })),
    };

    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setStatusMessage({
          type: "success",
          text: data.message || "Product updated successfully!",
        });
        setTimeout(() => {
          router.push("/admin/products");
          router.refresh();
        }, 1200);
      } else {
        setStatusMessage({
          type: "error",
          text: data.error || "Failed to update product.",
        });
      }
    } catch (e: any) {
      console.error("Failed to update product:", e);
      setStatusMessage({
        type: "error",
        text: e?.message || "Failed to communicate with server.",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-8 h-8 border-2 border-[#C9A66B] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!formData) {
    return (
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <Link
          href="/admin/products"
          className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Products
        </Link>
        <div className="p-4 rounded-xl border bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs font-medium">
          Product not found or failed to load.
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <Link
        href="/admin/products"
        className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground transition"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Products
      </Link>

      {statusMessage && (
        <div
          className={`p-4 rounded-xl border flex items-center gap-3 text-xs font-medium transition-all ${
            statusMessage.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
              : "bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300"
          }`}
        >
          {statusMessage.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 dark:text-rose-400" />
          )}
          <div className="flex-1">{statusMessage.text}</div>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="text-xs hover:opacity-75 cursor-pointer font-bold px-1"
          >
            ✕
          </button>
        </div>
      )}

      <div className="bg-card border border-border rounded-2xl p-6 shadow-xs transition-colors duration-200">
        <h1 className="text-xl font-bold text-foreground mb-1">Edit {formData.name}</h1>
        <p className="text-xs text-muted mb-6">
          Update specifications, upload product gallery photos, and manage RAM & storage tiers.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-muted mb-1.5">Product Name</label>
              <input
                type="text"
                value={formData.name || ""}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2.5 bg-tile border border-border rounded-xl text-foreground text-xs focus:outline-none focus:border-[#C9A66B]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted mb-1.5">Brand</label>
              <input
                type="text"
                value={formData.brand || ""}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                className="w-full px-4 py-2.5 bg-tile border border-border rounded-xl text-foreground text-xs focus:outline-none focus:border-[#C9A66B]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted mb-1.5">Category</label>
              <select
                value={formData.category || "SMARTPHONE"}
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
                    : JSON.parse(formData.colors)
                  : []
              }
              isUploading={isUploading}
              setIsUploading={setIsUploading}
              errorMessage={imageError}
              setErrorMessage={setImageError}
            />
          </div>

          {/* Hardware Specifications */}
          <div className="pt-4 border-t border-border space-y-4">
            <h3 className="text-sm font-bold text-foreground">Hardware Specifications</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-muted mb-1.5">Processor</label>
                <input
                  type="text"
                  value={formData.processor || ""}
                  onChange={(e) => setFormData({ ...formData, processor: e.target.value })}
                  placeholder="e.g. Apple A18 Pro / Snapdragon 8 Gen 3"
                  className="w-full px-4 py-2.5 bg-tile border border-border rounded-xl text-foreground text-xs focus:outline-none focus:border-[#C9A66B]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted mb-1.5">Display</label>
                <input
                  type="text"
                  value={formData.display || ""}
                  onChange={(e) => setFormData({ ...formData, display: e.target.value })}
                  placeholder="e.g. 6.7 inch Super Retina XDR OLED"
                  className="w-full px-4 py-2.5 bg-tile border border-border rounded-xl text-foreground text-xs focus:outline-none focus:border-[#C9A66B]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted mb-1.5">Camera</label>
                <input
                  type="text"
                  value={formData.camera || ""}
                  onChange={(e) => setFormData({ ...formData, camera: e.target.value })}
                  placeholder="e.g. 48MP Main + 12MP Ultra-Wide"
                  className="w-full px-4 py-2.5 bg-tile border border-border rounded-xl text-foreground text-xs focus:outline-none focus:border-[#C9A66B]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted mb-1.5">Battery</label>
                <input
                  type="text"
                  value={formData.battery || ""}
                  onChange={(e) => setFormData({ ...formData, battery: e.target.value })}
                  placeholder="e.g. 4685 mAh All-Day Battery"
                  className="w-full px-4 py-2.5 bg-tile border border-border rounded-xl text-foreground text-xs focus:outline-none focus:border-[#C9A66B]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-muted mb-1.5">Operating System (OS)</label>
                <input
                  type="text"
                  value={formData.os || ""}
                  onChange={(e) => setFormData({ ...formData, os: e.target.value })}
                  placeholder="e.g. iOS 18 / Android 15"
                  className="w-full px-4 py-2.5 bg-tile border border-border rounded-xl text-foreground text-xs focus:outline-none focus:border-[#C9A66B]"
                />
              </div>
            </div>
          </div>

          {/* Automatic In-Stock & Options */}
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
                checked={Boolean(formData.isFeatured)}
                onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                className="rounded border-border text-[#C9A66B] focus:ring-[#C9A66B]"
              />
              Feature on Homepage
            </label>
          </div>

          <button
            type="submit"
            disabled={saving || isUploading || images.length === 0}
            className="w-full py-3 bg-[#C9A66B] dark:bg-[#D4B483] hover:bg-[#B8914A] dark:hover:bg-[#C49A5A] active:bg-[#A67C3D] text-[#FFFCFA] font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving Changes..." : isUploading ? "Uploading Images..." : "Save Product Changes"}
          </button>
        </form>
      </div>
    </main>
  );
}
