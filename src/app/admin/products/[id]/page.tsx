"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, AlertCircle, CheckCircle2 } from "lucide-react";

export default function AdminEditProductPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<any | null>(null);
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
        const res = await fetch(`/api/products/${productId}`);
        const data = await res.json();
        if (data.success && data.product) {
          setFormData(data.product);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData) return;
    setSaving(true);
    setStatusMessage(null);

    // Prepare clean update payload without un-editable nested Prisma relations
    const payload = {
      name: formData.name,
      brand: formData.brand,
      model: formData.model || null,
      series: formData.series || "",
      tagline: formData.tagline || "",
      category: formData.category || "SMARTPHONE",
      basePrice: parseInt(formData.basePrice, 10),
      originalPrice: formData.originalPrice ? parseInt(formData.originalPrice, 10) : parseInt(formData.basePrice, 10),
      discountPrice: formData.discountPrice ? parseInt(formData.discountPrice, 10) : null,
      stock: parseInt(formData.stock, 10),
      inStock: Boolean(formData.inStock),
      isFeatured: Boolean(formData.isFeatured),
      warrantyMonths: formData.warrantyMonths ? parseInt(formData.warrantyMonths, 10) : 12,
      processor: formData.processor || "",
      ram: formData.ram || "",
      display: formData.display || "",
      camera: formData.camera || "",
      battery: formData.battery || "",
      os: formData.os || "",
    };

    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: "PATCH",
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
        }, 1200);
      } else {
        setStatusMessage({
          type: "error",
          text: data.error || "Failed to update product.",
        });
      }
    } catch (e: any) {
      console.error("Error saving product:", e);
      setStatusMessage({
        type: "error",
        text: e?.message || "Failed to connect to the server. Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading || !formData) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <p className="text-muted text-sm">Loading product details...</p>
      </div>
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
            Update pricing, stock availability, and smartphone specifications.
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

              <div>
                <label className="block text-xs font-semibold text-muted mb-1.5">Base Price (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.basePrice ?? ""}
                  onChange={(e) => setFormData({ ...formData, basePrice: parseInt(e.target.value, 10) || 0 })}
                  className="w-full px-4 py-2.5 bg-tile border border-border rounded-xl text-foreground text-xs focus:outline-none focus:border-[#C9A66B]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted mb-1.5">Original Price (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.originalPrice ?? ""}
                  onChange={(e) => setFormData({ ...formData, originalPrice: parseInt(e.target.value, 10) || 0 })}
                  className="w-full px-4 py-2.5 bg-tile border border-border rounded-xl text-foreground text-xs focus:outline-none focus:border-[#C9A66B]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted mb-1.5">Available Stock</label>
                <input
                  type="number"
                  min="0"
                  value={formData.stock ?? ""}
                  onChange={(e) => {
                    const st = parseInt(e.target.value, 10) || 0;
                    setFormData({
                      ...formData,
                      stock: st,
                      inStock: st > 0,
                    });
                  }}
                  className="w-full px-4 py-2.5 bg-tile border border-border rounded-xl text-foreground text-xs focus:outline-none focus:border-[#C9A66B]"
                  required
                />
              </div>

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
                <label className="block text-xs font-semibold text-muted mb-1.5">RAM</label>
                <input
                  type="text"
                  value={formData.ram || ""}
                  onChange={(e) => setFormData({ ...formData, ram: e.target.value })}
                  placeholder="e.g. 8GB / 12GB / 16GB"
                  className="w-full px-4 py-2.5 bg-tile border border-border rounded-xl text-foreground text-xs focus:outline-none focus:border-[#C9A66B]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted mb-1.5">Display</label>
                <input
                  type="text"
                  value={formData.display || ""}
                  onChange={(e) => setFormData({ ...formData, display: e.target.value })}
                  placeholder="e.g. 6.7-inch OLED, 120Hz"
                  className="w-full px-4 py-2.5 bg-tile border border-border rounded-xl text-foreground text-xs focus:outline-none focus:border-[#C9A66B]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted mb-1.5">Camera</label>
                <input
                  type="text"
                  value={formData.camera || ""}
                  onChange={(e) => setFormData({ ...formData, camera: e.target.value })}
                  placeholder="e.g. 48MP + 12MP Ultra-Wide"
                  className="w-full px-4 py-2.5 bg-tile border border-border rounded-xl text-foreground text-xs focus:outline-none focus:border-[#C9A66B]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted mb-1.5">Battery</label>
                <input
                  type="text"
                  value={formData.battery || ""}
                  onChange={(e) => setFormData({ ...formData, battery: e.target.value })}
                  placeholder="e.g. 4674 mAh, Fast Charging"
                  className="w-full px-4 py-2.5 bg-tile border border-border rounded-xl text-foreground text-xs focus:outline-none focus:border-[#C9A66B]"
                />
              </div>

              <div>
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

            <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-border">
              <label className="flex items-center gap-2 text-xs text-foreground/90 font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(formData.inStock)}
                  onChange={(e) => setFormData({ ...formData, inStock: e.target.checked })}
                  className="rounded border-border text-[#C9A66B] focus:ring-[#C9A66B]"
                />
                Mark as In Stock
              </label>

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
              disabled={saving}
              className="w-full py-3 bg-[#C9A66B] dark:bg-[#D4B483] hover:bg-[#B8914A] dark:hover:bg-[#C49A5A] active:bg-[#A67C3D] text-[#FFFCFA] font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? "Updating..." : "Save Product Changes"}
            </button>
          </form>
        </div>
      </main>
  );
}
