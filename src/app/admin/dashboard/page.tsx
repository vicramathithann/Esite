"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import AdminNav from "@/components/AdminNav";
import {
  LayoutDashboard,
  Package,
  Smartphone,
  Boxes,
  Users,
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  Clock,
  Truck,
  CheckCircle2,
  XCircle,
  ArrowRight,
  RefreshCw,
  PlusCircle,
} from "lucide-react";
import { formatINR } from "@/lib/formatters";
import { useApp } from "@/context/AppContext";

export default function AdminDashboardView() {
  const { currentUser } = useApp();
  const [metrics, setMetrics] = useState<any | null>(null);
  const [lowStock, setLowStock] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/dashboard");
      const data = await res.json();
      if (data.success) {
        setMetrics(data.metrics);
        setLowStock(data.lowStockProducts || []);
      }
    } catch (e) {
      console.error("Failed to load dashboard metrics:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <AdminNav />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Executive Store Dashboard</h1>
            <p className="text-xs text-slate-400 mt-1">
              Live operational metrics for VM Mobiles smartphone marketplace & inventory.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition"
              title="Refresh Metrics"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <Link
              href="/admin/products/new"
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition"
            >
              <PlusCircle className="w-4 h-4" /> Add Product
            </Link>
          </div>
        </div>

        {/* Primary Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-medium">Total Revenue</span>
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-white">
              {metrics ? formatINR(metrics.totalSales) : "..."}
            </div>
            <p className="text-[11px] text-emerald-400 font-medium">Completed & active orders</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-medium">Total Orders</span>
              <Package className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-2xl font-bold text-white">
              {metrics ? metrics.totalOrders : "..."}
            </div>
            <p className="text-[11px] text-slate-400">
              {metrics ? `${metrics.confirmedOrders + metrics.processingOrders} in fulfillment` : "..."}
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-medium">Smartphones Catalog</span>
              <Smartphone className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl font-bold text-white">
              {metrics ? metrics.totalSmartphones : "..."}
            </div>
            <p className="text-[11px] text-slate-400">
              {metrics ? `${metrics.totalAccessories} accessories available` : "..."}
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-medium">Registered Customers</span>
              <Users className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold text-white">
              {metrics ? metrics.totalCustomers : "..."}
            </div>
            <p className="text-[11px] text-slate-400">Verified buyer accounts</p>
          </div>
        </div>

        {/* Order Status Breakdown */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Package className="w-5 h-5 text-indigo-400" /> Order Fulfillment Pipeline
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
              <div className="flex items-center gap-1.5 text-xs text-indigo-400 font-medium">
                <Clock className="w-3.5 h-3.5" /> Confirmed
              </div>
              <p className="text-xl font-bold text-white mt-1">{metrics?.confirmedOrders ?? 0}</p>
            </div>
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
              <div className="flex items-center gap-1.5 text-xs text-amber-400 font-medium">
                <Boxes className="w-3.5 h-3.5" /> Processing
              </div>
              <p className="text-xl font-bold text-white mt-1">{metrics?.processingOrders ?? 0}</p>
            </div>
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
              <div className="flex items-center gap-1.5 text-xs text-blue-400 font-medium">
                <Truck className="w-3.5 h-3.5" /> Shipped
              </div>
              <p className="text-xl font-bold text-white mt-1">{metrics?.shippedOrders ?? 0}</p>
            </div>
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
              <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" /> Delivered
              </div>
              <p className="text-xl font-bold text-white mt-1">{metrics?.deliveredOrders ?? 0}</p>
            </div>
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
              <div className="flex items-center gap-1.5 text-xs text-rose-400 font-medium">
                <XCircle className="w-3.5 h-3.5" /> Cancelled
              </div>
              <p className="text-xl font-bold text-white mt-1">{metrics?.cancelledOrders ?? 0}</p>
            </div>
          </div>
        </div>

        {/* Low Stock Watchlist */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" /> Low Stock & Inventory Alerts ({metrics?.lowStockCount ?? 0})
            </h2>
            <Link
              href="/admin/inventory"
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
            >
              Manage Full Inventory <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {lowStock.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">All smartphones and products have healthy stock levels.</p>
          ) : (
            <div className="divide-y divide-slate-800/80">
              {lowStock.map((prod) => (
                <div key={prod.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-white">{prod.name}</span>
                    <span className="text-slate-400 ml-2">Brand: {prod.brand}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] ${
                        prod.stock === 0
                          ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      }`}
                    >
                      {prod.stock === 0 ? "Out of Stock" : `Only ${prod.stock} Left`}
                    </span>
                    <Link
                      href={`/admin/products/${prod.id}`}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition"
                    >
                      Restock
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
