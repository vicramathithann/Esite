"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Smartphone,
  PlusCircle,
  Search,
  Edit3,
  Trash2,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { formatINR } from "@/lib/formatters";

export default function AdminProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (categoryFilter !== "all") params.set("category", categoryFilter);

      const res = await fetch(`/api/products?${params.toString()}`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json();
      if (data.success) {
        setProducts(data.products || []);
      }
    } catch (e) {
      console.error("Failed to load products:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [categoryFilter]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to permanently delete "${name}"?`)) return;

    try {
      setDeletingId(id);
      const res = await fetch(`/api/products/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json();
      if (data.success) {
        setProducts((prev) => prev.filter((p) => p.id !== id));
      } else {
        alert(data.error || "Failed to delete product");
      }
    } catch {
      alert("Error contacting server");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border border-border rounded-2xl p-6 shadow-xs transition-colors duration-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#C9A66B]/10 border border-[#C9A66B]/20 flex items-center justify-center text-[#8C6226] dark:text-[#E5CBA2]">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Product Catalog Management</h1>
              <p className="text-xs text-muted">
                Manage smartphone specs, accessories, pricing, and hardware variants.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadProducts}
              className="p-2.5 bg-[#C9A66B]/10 dark:bg-[#D4B483]/10 hover:bg-[#C9A66B]/20 border border-[#C9A66B]/30 dark:border-[#D4B483]/30 text-[#8C6226] dark:text-[#E5CBA2] rounded-xl transition-all cursor-pointer"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <Link
              href="/admin/products/new"
              className="px-4 py-2.5 bg-[#C9A66B] dark:bg-[#D4B483] hover:bg-[#B8914A] dark:hover:bg-[#C49A5A] active:bg-[#A67C3D] text-[#FFFCFA] text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all shadow-xs"
            >
              <PlusCircle className="w-4 h-4" /> Add Product
            </Link>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadProducts()}
              placeholder="Search by name, brand, processor..."
              className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl text-foreground text-xs focus:outline-none focus:border-[#C9A66B]"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-card border border-border text-xs text-foreground rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#C9A66B]"
          >
            <option value="all">All Product Categories</option>
            <option value="SMARTPHONE">Smartphones Only</option>
            <option value="ACCESSORY">Accessories Only</option>
          </select>
        </div>

        {/* Products Table */}
        <div className="bg-card border border-border rounded-2xl shadow-xs overflow-hidden transition-colors duration-200">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-tile/80 border-b border-border text-muted font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3.5 px-4">Device</th>
                  <th className="py-3.5 px-4">Brand</th>
                  <th className="py-3.5 px-4">Base Price</th>
                  <th className="py-3.5 px-4">Specs & RAM</th>
                  <th className="py-3.5 px-4">Stock</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-muted">
                      Loading products...
                    </td>
                  </tr>
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-muted">
                      No products found.
                    </td>
                  </tr>
                ) : (
                  products.map((p) => (
                    <tr key={p.id} className="hover:bg-tile/50 transition">
                      <td className="py-3.5 px-4 font-semibold text-foreground flex items-center gap-3">
                        <div className="relative w-10 h-10 rounded-lg bg-tile border border-border p-1 flex-shrink-0">
                          <Image
                            src={p.imageUrl || "/images/placeholder.png"}
                            alt={p.name}
                            fill
                            className="object-contain"
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span>{p.name}</span>
                            {p.isFeatured && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] text-[#8C6226] dark:text-[#E5CBA2] bg-[#C9A66B]/15 px-1.5 py-0.5 rounded-full font-bold">
                                <Sparkles className="w-2.5 h-2.5 text-[#C9A66B]" /> Featured
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-muted">{p.model || p.tagline}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-foreground/90 font-medium">{p.brand}</td>
                      <td className="py-3.5 px-4 font-mono font-bold text-foreground">
                        {formatINR(p.basePrice)}
                      </td>
                      <td className="py-3.5 px-4 text-muted text-[11px]">
                        <div>{p.ram} RAM • {p.processor}</div>
                        <div>{p.os} • {p.display}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                            p.stock === 0
                              ? "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20"
                              : p.stock <= 5
                              ? "bg-amber-500/10 text-amber-800 dark:text-amber-400 border-amber-500/20"
                              : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                          }`}
                        >
                          {p.stock === 0 ? "Out of Stock" : `${p.stock} In Stock`}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/admin/products/${p.id}`}
                            className="p-1.5 border border-[#C9A66B]/30 dark:border-[#D4B483]/30 bg-[#C9A66B]/10 dark:bg-[#D4B483]/10 hover:bg-[#C9A66B]/20 text-[#8C6226] dark:text-[#E5CBA2] rounded-lg transition-all"
                            title="Edit Product"
                          >
                            <Edit3 className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => handleDelete(p.id, p.name)}
                            disabled={deletingId === p.id}
                            className="p-1.5 border border-[#C9A66B]/30 dark:border-[#D4B483]/30 bg-[#C9A66B]/10 dark:bg-[#D4B483]/10 hover:bg-[#C9A66B]/20 text-[#8C6226] dark:text-[#E5CBA2] rounded-lg transition-all cursor-pointer"
                            title="Delete Product"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
  );
}
