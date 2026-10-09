"use client";

import React, { useState, useEffect } from "react";
import AdminNav from "@/components/AdminNav";
import {
  Users,
  Search,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Mail,
  Phone,
  Calendar,
  ShoppingBag,
} from "lucide-react";
import { formatINR, formatDateOnly } from "@/lib/formatters";

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set("search", search);

      const res = await fetch(`/api/admin/customers?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setCustomers(data.customers || []);
      }
    } catch (e) {
      console.error("Failed to load customers:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col transition-colors duration-200">
      <AdminNav />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border border-border rounded-2xl p-6 shadow-xs transition-colors duration-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#C9A66B]/10 border border-[#C9A66B]/20 flex items-center justify-center text-[#8C6226] dark:text-[#E5CBA2]">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Customer Accounts Directory</h1>
              <p className="text-xs text-muted">
                View registered customers, their MSG91 email verification status, order count, and lifetime value.
              </p>
            </div>
          </div>

          <button
            onClick={loadCustomers}
            className="p-2.5 bg-[#C9A66B]/10 dark:bg-[#D4B483]/10 hover:bg-[#C9A66B]/20 border border-[#C9A66B]/30 dark:border-[#D4B483]/30 text-[#8C6226] dark:text-[#E5CBA2] rounded-xl transition-all self-start sm:self-auto cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && loadCustomers()}
            placeholder="Search by customer name, email, or mobile..."
            className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl text-foreground text-xs focus:outline-none focus:border-[#C9A66B]"
          />
        </div>

        {/* Table */}
        <div className="bg-card border border-border rounded-2xl shadow-xs overflow-hidden transition-colors duration-200">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-tile/80 border-b border-border text-muted font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">Email & Verification</th>
                  <th className="py-3.5 px-4">Mobile</th>
                  <th className="py-3.5 px-4 text-center">Orders</th>
                  <th className="py-3.5 px-4 text-right">Total Spent</th>
                  <th className="py-3.5 px-4 text-right">Registered</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-muted">
                      Loading customer records...
                    </td>
                  </tr>
                ) : customers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-muted">
                      No customer accounts found.
                    </td>
                  </tr>
                ) : (
                  customers.map((c) => (
                    <tr key={c.id} className="hover:bg-tile/50 transition">
                      <td className="py-3.5 px-4 font-semibold text-foreground">
                        {c.name}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="text-foreground/90 font-mono text-[11px]">{c.email}</span>
                          {c.emailVerified ? (
                            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-semibold">
                              <CheckCircle2 className="w-3 h-3" /> Verified
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full font-semibold">
                              <AlertCircle className="w-3 h-3" /> Unverified
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-muted font-mono">
                        {c.phone || "—"}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2.5 py-0.5 rounded-full bg-tile font-semibold text-foreground text-[11px]">
                          {c.orderCount}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-semibold text-foreground">
                        {formatINR(c.totalSpent)}
                      </td>
                      <td className="py-3.5 px-4 text-right text-muted">
                        {formatDateOnly(c.registeredAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
