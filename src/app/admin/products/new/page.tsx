"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AdminNav from "@/components/AdminNav";
import { Smartphone, ArrowLeft, Save, Plus, Trash2, Sparkles, CheckCircle2 } from "lucide-react";

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
  "Nokia",
];

export default function AdminNewProductPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    brand: "Apple",
    model: "",
    category: "SMARTPHONE",
    basePrice: 69999,
    discountPrice: 64999,
    originalPrice: 79999,
    stock: 25,
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
    warrantyMonths: 12,
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
    setLoading(true);

    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <AdminNav />

      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <Link
          href="/admin/products"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Products
        </Link>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <h1 className="text-xl font-bold text-white mb-1">Add New Smartphone / Accessory</h1>
          <p className="text-xs text-slate-400 mb-6">
            Enter full technical specifications. Mobile products automatically register for 1-Year Device Shield warranty upon customer purchase.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Core Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Product Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Apple iPhone 16 Pro Max"
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Brand</label>
                <select
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-indigo-500"
                >
                  {FAMOUS_BRANDS.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-indigo-500"
                >
                  <option value="SMARTPHONE">Smartphone</option>
                  <option value="ACCESSORY">Mobile Accessory</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Base Price (₹)</label>
                <input
                  type="number"
                  value={formData.basePrice}
                  onChange={(e) => setFormData({ ...formData, basePrice: parseInt(e.target.value, 10) || 0 })}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Initial Stock Quantity</label>
                <input
                  type="number"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value, 10) || 0 })}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Product Image URL</label>
                <input
                  type="url"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>
            </div>

            {/* Smartphone Specifications */}
            <div className="border-t border-slate-800 pt-5 space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-400">Technical Specifications</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">Processor</label>
                  <input
                    type="text"
                    value={formData.processor}
                    onChange={(e) => setFormData({ ...formData, processor: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">RAM</label>
                  <input
                    type="text"
                    value={formData.ram}
                    onChange={(e) => setFormData({ ...formData, ram: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Display</label>
                  <input
                    type="text"
                    value={formData.display}
                    onChange={(e) => setFormData({ ...formData, display: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Operating System</label>
                  <input
                    type="text"
                    value={formData.os}
                    onChange={(e) => setFormData({ ...formData, os: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Rear Camera</label>
                  <input
                    type="text"
                    value={formData.rearCamera}
                    onChange={(e) => setFormData({ ...formData, rearCamera: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Front Camera</label>
                  <input
                    type="text"
                    value={formData.frontCamera}
                    onChange={(e) => setFormData({ ...formData, frontCamera: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Battery</label>
                  <input
                    type="text"
                    value={formData.battery}
                    onChange={(e) => setFormData({ ...formData, battery: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">5G Network Band</label>
                  <input
                    type="text"
                    value={formData.network5G}
                    onChange={(e) => setFormData({ ...formData, network5G: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Featured Checkbox */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
              <input
                type="checkbox"
                id="featuredToggle"
                checked={formData.isFeatured}
                onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                className="rounded border-slate-800 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="featuredToggle" className="text-xs text-slate-300 font-medium cursor-pointer">
                Mark as Featured Flagship Device (Promoted on homepage hero)
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition"
            >
              <Save className="w-4 h-4" />
              {loading ? "Publishing Product..." : "Publish to Storefront"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
