"use client";

import React, { useState, useEffect } from "react";
import {
  SlidersHorizontal,
  Save,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Megaphone,
  Heart,
  Layers,
  Sparkles,
  MessageSquare,
} from "lucide-react";
import { useApp } from "@/context/AppContext";

export default function AdminSettingsPage() {
  const { refreshSiteSettings } = useApp();
  const [settings, setSettings] = useState({
    showWishlist: "true",
    showCompare: "true",
    showDealsBanner: "true",
    showReviews: "true",
    showDealsCountdown: "true",
    showAnnouncement: "true",
    announcementText: "⚡ Free Express Delivery across India | 1-Year Official Brand Warranty",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/admin/settings", {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json();
      if (data.success && data.settings) {
        setSettings((prev) => ({ ...prev, ...data.settings }));
      } else {
        setError(data.error || "Failed to load store settings.");
      }
    } catch (err) {
      console.error(err);
      setError("Network error fetching store settings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleToggle = (key: keyof typeof settings) => {
    setSettings((prev) => ({
      ...prev,
      [key]: prev[key] === "true" ? "false" : "true",
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const res = await fetch("/api/admin/settings", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccess("Storefront visibility controls updated and applied live!");
        if (data.settings) {
          setSettings(data.settings);
          try {
            localStorage.setItem("novamobile_site_settings", JSON.stringify(data.settings));
          } catch {}
        }
        await refreshSiteSettings();
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("vn_settings_updated"));
        }
        setTimeout(() => setSuccess(null), 4000);
      } else {
        setError(data.error || "Failed to save storefront settings.");
      }
    } catch (err) {
      console.error(err);
      setError("Network error updating settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border border-border rounded-2xl p-6 shadow-xs transition-colors duration-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#C9A66B]/10 border border-[#C9A66B]/20 flex items-center justify-center text-[#8C6226] dark:text-[#E5CBA2]">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Storefront & User Visibility Controls</h1>
              <p className="text-xs text-muted">
                Control what normal users and shoppers can see across the VN Mobiles storefront.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadSettings}
              disabled={loading}
              className="p-2.5 bg-[#C9A66B]/10 dark:bg-[#D4B483]/10 hover:bg-[#C9A66B]/20 border border-[#C9A66B]/30 dark:border-[#D4B483]/30 text-[#8C6226] dark:text-[#E5CBA2] rounded-xl transition-all cursor-pointer"
              title="Refresh Settings"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Feedback Alerts */}
        {error && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-3 text-rose-600 dark:text-rose-400 text-xs animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{error}</div>
          </div>
        )}

        {success && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-start gap-3 text-emerald-600 dark:text-emerald-400 text-xs animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{success}</div>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          {/* Top Announcement Bar Control */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2.5">
                <Megaphone className="w-4 h-4 text-[#C9A66B] dark:text-[#D4B483]" />
                <h2 className="text-sm font-bold text-foreground">Top Announcement Ticker</h2>
              </div>
              <button
                type="button"
                onClick={() => handleToggle("showAnnouncement")}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  settings.showAnnouncement === "true" ? "bg-[#C9A66B] dark:bg-[#D4B483]" : "bg-tile"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    settings.showAnnouncement === "true" ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">
                Announcement Message (Displayed at the top of the entire store)
              </label>
              <input
                type="text"
                value={settings.announcementText}
                onChange={(e) => setSettings({ ...settings, announcementText: e.target.value })}
                placeholder="Enter announcement text..."
                className="w-full px-3.5 py-2.5 bg-tile/70 border border-border rounded-xl text-xs text-foreground placeholder:text-muted focus:outline-none focus:border-[#C9A66B] transition-all"
              />
              <p className="text-[11px] text-muted">
                Status: {settings.showAnnouncement === "true" ? "Visible to all visitors" : "Hidden from storefront"}
              </p>
            </div>
          </div>

          {/* Feature Toggles Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Wishlist Feature */}
            <div className="bg-card border border-border rounded-2xl p-5 shadow-xs flex items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-tile flex items-center justify-center shrink-0 text-[#C9A66B] dark:text-[#D4B483]">
                  <Heart className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-foreground">Wishlist System</h3>
                  <p className="text-[11px] text-muted mt-0.5">
                    Allow users to favorite products and view their saved wishlist items.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleToggle("showWishlist")}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  settings.showWishlist === "true" ? "bg-[#C9A66B] dark:bg-[#D4B483]" : "bg-tile"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    settings.showWishlist === "true" ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Compare Phones Feature */}
            <div className="bg-card border border-border rounded-2xl p-5 shadow-xs flex items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-tile flex items-center justify-center shrink-0 text-[#C9A66B] dark:text-[#D4B483]">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-foreground">Compare Smartphones</h3>
                  <p className="text-[11px] text-muted mt-0.5">
                    Enable side-by-side spec comparison between different smartphone models.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleToggle("showCompare")}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  settings.showCompare === "true" ? "bg-[#C9A66B] dark:bg-[#D4B483]" : "bg-tile"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    settings.showCompare === "true" ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Deals & Promotional Banners */}
            <div className="bg-card border border-border rounded-2xl p-5 shadow-xs flex items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-tile flex items-center justify-center shrink-0 text-[#C9A66B] dark:text-[#D4B483]">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-foreground">Deals & Promotional Banner</h3>
                  <p className="text-[11px] text-muted mt-0.5">
                    Display promotional flash deal banners and seasonal savings highlights.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleToggle("showDealsBanner")}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  settings.showDealsBanner === "true" ? "bg-[#C9A66B] dark:bg-[#D4B483]" : "bg-tile"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    settings.showDealsBanner === "true" ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Customer Reviews Section */}
            <div className="bg-card border border-border rounded-2xl p-5 shadow-xs flex items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-tile flex items-center justify-center shrink-0 text-[#C9A66B] dark:text-[#D4B483]">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-foreground">User Reviews & Ratings</h3>
                  <p className="text-[11px] text-muted mt-0.5">
                    Show public verified customer ratings, feedbacks, and stars on product cards.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleToggle("showReviews")}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  settings.showReviews === "true" ? "bg-[#C9A66B] dark:bg-[#D4B483]" : "bg-tile"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    settings.showReviews === "true" ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Submit / Save Button */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-[#C9A66B] dark:bg-[#D4B483] hover:bg-[#B8914A] dark:hover:bg-[#C49A5A] active:bg-[#A67C3D] text-[#FFFCFA] font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Saving Settings...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Visibility Settings</span>
                </>
              )}
            </button>
          </div>
        </form>
      </main>
  );
}

