"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import AdminNav from "@/components/AdminNav";
import {
  Boxes,
  Search,
  Filter,
  RefreshCw,
  Plus,
  Minus,
  Save,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ExternalLink,
} from "lucide-react";
import { formatINR } from "@/lib/formatters";

export default function AdminInventoryPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [stockEdits, setStockEdits] = useState<Record<string, number>>({});

  const loadInventory = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (categoryFilter !== "all") params.set("category", categoryFilter);

      const res = await fetch(`/api/admin/inventory?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setItems(data.inventory || []);
        // Initialize stock edits
        const initEdits: Record<string, number> = {};
        (data.inventory || []).forEach((item: any) => {
          initEdits[item.id] = item.stock;
        });
        setStockEdits(initEdits);
      }
    } catch (e) {
      console.error("Failed to load inventory:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInventory();
  }, [statusFilter, categoryFilter]);

  const handleStockChange = (id: string, delta: number) => {
    setStockEdits((prev) => ({
      ...prev,
      [id]: Math.max(0, (prev[id] ?? 0) + delta),
    }));
  };

  const handleSaveStock = async (id: string) => {
    const newStock = stockEdits[id];
    if (newStock === undefined) return;

    try {
      setUpdatingId(id);
      const res = await fetch("/api/admin/inventory", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, stock: newStock }),
      });
      const data = await res.json();
      if (data.success) {
        await loadInventory();
      } else {
        alert(data.error || "Failed to update stock");
      }
    } catch {
      alert("Error contacting inventory service");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col transition-colors duration-200">
      <AdminNav />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border border-border rounded-2xl p-6 shadow-xs transition-colors duration-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#C9A66B]/10 border border-[#C9A66B]/20 flex items-center justify-center text-[#8C6226] dark:text-[#E5CBA2]">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Mobile Store Inventory</h1>
              <p className="text-xs text-muted">
                Track and update stock levels for smartphones and accessories. Out of stock products are automatically guarded on checkout.
              </p>
            </div>
          </div>

          <button
            onClick={loadInventory}
            className="p-2.5 bg-[#C9A66B]/10 dark:bg-[#D4B483]/10 hover:bg-[#C9A66B]/20 border border-[#C9A66B]/30 dark:border-[#D4B483]/30 text-[#8C6226] dark:text-[#E5CBA2] rounded-xl transition-all self-start sm:self-auto cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadInventory()}
              placeholder="Search product, brand, or model..."
              className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl text-foreground text-xs focus:outline-none focus:border-[#C9A66B]"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-card border border-border text-xs text-foreground rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#C9A66B]"
            >
              <option value="all">All Stock Statuses</option>
              <option value="available">Available (&gt; 5)</option>
              <option value="low">Low Stock (1 - 5)</option>
              <option value="out">Out of Stock (0)</option>
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-card border border-border text-xs text-foreground rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#C9A66B]"
            >
              <option value="all">All Categories</option>
              <option value="SMARTPHONE">Smartphones</option>
              <option value="ACCESSORY">Accessories</option>
            </select>
          </div>
        </div>

        {/* Inventory Table */}
        <div className="bg-card border border-border rounded-2xl shadow-xs overflow-hidden transition-colors duration-200">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-tile/80 border-b border-border text-muted font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3.5 px-4">Product</th>
                  <th className="py-3.5 px-4">Brand / Model</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Base Price</th>
                  <th className="py-3.5 px-4">Stock Status</th>
                  <th className="py-3.5 px-4 text-center">Adjust Stock</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-muted">
                      Loading inventory records...
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-muted">
                      No inventory items match your search.
                    </td>
                  </tr>
                ) : (
                  items.map((item) => {
                    const editedStock = stockEdits[item.id] ?? item.stock;
                    const hasChanged = editedStock !== item.stock;

                    return (
                      <tr key={item.id} className="hover:bg-tile/50 transition">
                        <td className="py-3 px-4 font-semibold text-foreground flex items-center gap-3">
                          <div className="relative w-9 h-9 rounded-lg bg-tile border border-border p-1 flex-shrink-0">
                            <Image
                              src={item.imageUrl || "/images/placeholder.png"}
                              alt={item.name}
                              fill
                              className="object-contain"
                            />
                          </div>
                          <span className="line-clamp-1 max-w-xs">{item.name}</span>
                        </td>
                        <td className="py-3 px-4 text-foreground/90">
                          <div>{item.brand}</div>
                          <div className="text-[11px] text-muted">{item.model || "—"}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-tile text-foreground">
                            {item.category || "SMARTPHONE"}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono font-medium text-foreground">
                          {formatINR(item.basePrice)}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                              item.status === "Out of Stock"
                                ? "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20"
                                : item.status === "Low Stock"
                                ? "bg-amber-500/10 text-amber-800 dark:text-amber-400 border-amber-500/20"
                                : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                            }`}
                          >
                            {item.status} ({item.stock})
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleStockChange(item.id, -1)}
                              className="w-6 h-6 rounded-lg border border-[#C9A66B]/30 dark:border-[#D4B483]/30 bg-[#C9A66B]/10 dark:bg-[#D4B483]/10 hover:bg-[#C9A66B]/20 text-[#8C6226] dark:text-[#E5CBA2] flex items-center justify-center cursor-pointer transition-all"
                              title="Decrement"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <input
                              type="number"
                              min="0"
                              value={editedStock}
                              onChange={(e) =>
                                setStockEdits((prev) => ({
                                  ...prev,
                                  [item.id]: Math.max(0, parseInt(e.target.value, 10) || 0),
                                }))
                              }
                              className="w-14 text-center py-1 bg-tile border border-border rounded-lg text-foreground font-mono text-xs focus:outline-none focus:border-[#C9A66B]"
                            />
                            <button
                              onClick={() => handleStockChange(item.id, 1)}
                              className="w-6 h-6 rounded-lg border border-[#C9A66B]/30 dark:border-[#D4B483]/30 bg-[#C9A66B]/10 dark:bg-[#D4B483]/10 hover:bg-[#C9A66B]/20 text-[#8C6226] dark:text-[#E5CBA2] flex items-center justify-center cursor-pointer transition-all"
                              title="Increment"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {hasChanged && (
                              <button
                                onClick={() => handleSaveStock(item.id)}
                                disabled={updatingId === item.id}
                                className="px-2.5 py-1 bg-[#C9A66B] dark:bg-[#D4B483] hover:bg-[#B8914A] dark:hover:bg-[#C49A5A] active:bg-[#A67C3D] text-[#FFFCFA] font-semibold rounded-lg text-[11px] flex items-center gap-1 transition-all shadow-xs cursor-pointer"
                              >
                                <Save className="w-3 h-3" />
                                {updatingId === item.id ? "Saving..." : "Save"}
                              </button>
                            )}
                            <Link
                              href={`/admin/products/${item.id}`}
                              className="p-1.5 hover:bg-tile rounded-lg text-muted hover:text-foreground transition"
                              title="Edit full product details"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
