"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ShieldCheck,
  ArrowLeft,
  Smartphone,
  RefreshCw,
  Mail,
  Copy,
  Check,
  Clock,
  AlertTriangle,
  ExternalLink,
  XCircle,
  FileText,
} from "lucide-react";

export interface EnrichedWarranty {
  id: string;
  warrantyNumber: string;
  orderId: string;
  orderNumber: string;
  orderStatus: string;
  productId?: string | null;
  productName: string;
  productBrand: string;
  productImageUrl: string;
  variantInfo: string;
  imeiNumber: string;
  purchaseDate: string;
  warrantyStartDate: string;
  warrantyExpiryDate: string;
  warrantyDuration: string;
  warrantyStatus: string;
  customerName: string;
  customerEmail: string;
  reminded1DayAt?: string | null;
  reminded6MonthsAt?: string | null;
}

interface WarrantiesClientProps {
  initialWarranties: EnrichedWarranty[];
  supabaseError?: string | null;
  userName: string;
  userEmail: string;
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
  percentUsed: number;
  isExpired: boolean;
  isExpiringSoon: boolean;
}

function calculateTimeRemaining(startDateStr: string, expiryDateStr: string): TimeRemaining {
  const now = Date.now();
  const start = new Date(startDateStr).getTime();
  const expiry = new Date(expiryDateStr).getTime();

  const totalDuration = Math.max(1, expiry - start);
  const elapsed = Math.max(0, now - start);
  const remaining = Math.max(0, expiry - now);

  const percentUsed = Math.min(100, Math.max(0, Math.round((elapsed / totalDuration) * 100)));
  const isExpired = remaining <= 0;
  const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
  const hours = Math.floor((remaining / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((remaining / (1000 * 60)) % 60);
  const seconds = Math.floor((remaining / 1000) % 60);

  const isExpiringSoon = !isExpired && days <= 30;

  return {
    days,
    hours,
    minutes,
    seconds,
    totalMs: remaining,
    percentUsed,
    isExpired,
    isExpiringSoon,
  };
}

function formatDateDisplay(dateStr?: string | null): string {
  if (!dateStr) return "N/A";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return String(dateStr);
  }
}

export default function WarrantiesClient({
  initialWarranties,
  supabaseError,
  userName,
  userEmail,
}: WarrantiesClientProps) {
  const [warranties, setWarranties] = useState<EnrichedWarranty[]>(initialWarranties);
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState<number>(Date.now());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{ id: string; msg: string; isError?: boolean } | null>(null);

  // Mount effect to avoid hydration mismatches
  useEffect(() => {
    setMounted(true);
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const copyToClipboard = (text: string, id: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleResendEmail = async (warrantyId: string, orderNumber: string) => {
    try {
      setResendingId(warrantyId);
      setActionFeedback(null);
      const res = await fetch("/api/warranties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ warrantyId, action: "RESEND_EMAIL" }),
      });
      const data = await res.json();
      if (data.success) {
        setActionFeedback({
          id: warrantyId,
          msg: data.message || `Warranty certificate resent to ${userEmail}.`,
        });
      } else {
        setActionFeedback({
          id: warrantyId,
          msg: data.error || "Failed to resend warranty email.",
          isError: true,
        });
      }
    } catch {
      setActionFeedback({
        id: warrantyId,
        msg: "Network error sending email.",
        isError: true,
      });
    } finally {
      setResendingId(null);
      setTimeout(() => setActionFeedback(null), 5000);
    }
  };

  const activeCount = warranties.filter((w) => {
    const isCancelled = w.warrantyStatus === "CANCELLED" || w.orderStatus === "CANCELLED";
    const isExpired = new Date(w.warrantyExpiryDate).getTime() <= Date.now();
    return !isCancelled && !isExpired;
  }).length;

  return (
    <div className="min-h-screen bg-background text-foreground py-8 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation & Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/account"
            className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Account
          </Link>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-tile border border-border text-xs text-muted font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-[#C9A66B]" />
            <span>
              {activeCount} Active {activeCount === 1 ? "Warranty" : "Warranties"}
            </span>
          </div>
        </div>

        {/* Hero Banner */}
        <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-sandal-secondary-bg border border-sandal-secondary-border flex items-center justify-center text-[#C9A66B] shrink-0">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                  Official Hardware Warranties
                </h1>
                <p className="text-xs sm:text-sm text-muted">
                  Registered device protection for <span className="font-semibold text-foreground">{userName || userEmail}</span>. Each device is protected by hardware IMEI verification.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Error State if Supabase failed */}
        {supabaseError && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <div className="font-semibold text-sm">Failed to load warranty records from database</div>
            </div>
            <p className="text-xs opacity-90 font-mono bg-background/50 p-2 rounded border border-red-500/10">
              {supabaseError}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-700 transition cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Reload Page
            </button>
          </div>
        )}

        {/* Warranties List */}
        {!supabaseError && warranties.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-12 text-center text-muted space-y-4 shadow-sm">
            <ShieldCheck className="w-12 h-12 mx-auto text-muted opacity-40" />
            <div className="space-y-1">
              <h3 className="text-base font-bold text-foreground">No Active Warranties Found</h3>
              <p className="text-xs text-muted max-w-md mx-auto">
                No active device warranties are registered for your account. When you purchase a smartphone from VN Mobiles, your 1-Year Device Shield warranty will appear here automatically.
              </p>
            </div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#C9A66B] hover:bg-[#B8914A] text-white text-xs font-semibold transition shadow-sm"
            >
              <Smartphone className="w-3.5 h-3.5" /> Explore Flagship Phones
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {warranties.map((w) => {
              const timing = calculateTimeRemaining(w.warrantyStartDate, w.warrantyExpiryDate);
              const isOrderCancelledStatus =
                w.orderStatus?.toUpperCase() === "CANCELLED" || w.warrantyStatus === "CANCELLED";

              let badgeText = "ACTIVE COVERAGE";
              let badgeClasses =
                "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20";

              if (isOrderCancelledStatus) {
                badgeText = "ORDER CANCELLED";
                badgeClasses = "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20";
              } else if (timing.isExpired) {
                badgeText = "COVERAGE EXPIRED";
                badgeClasses = "bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/20";
              } else if (timing.isExpiringSoon) {
                badgeText = `EXPIRING SOON (${timing.days}d LEFT)`;
                badgeClasses = "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 animate-pulse";
              }

              const progressColor = isOrderCancelledStatus
                ? "bg-red-500"
                : timing.isExpired
                ? "bg-slate-400"
                : timing.isExpiringSoon
                ? "bg-amber-500"
                : "bg-emerald-500";

              return (
                <div
                  key={w.id}
                  className="bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-sm space-y-5 hover:border-[#C9A66B]/40 transition"
                >
                  {/* Card Header: Device Name, Variant & Status Badge */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-border pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-xl bg-tile border border-border flex items-center justify-center relative overflow-hidden shrink-0">
                        {w.productImageUrl && !w.productImageUrl.includes("placeholder") ? (
                          <Image
                            src={w.productImageUrl}
                            alt={w.productName}
                            fill
                            className="object-contain p-1"
                            sizes="56px"
                          />
                        ) : (
                          <Smartphone className="w-6 h-6 text-[#C9A66B]" />
                        )}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-base sm:text-lg font-bold text-foreground">
                            {w.productName}
                          </h2>
                          {w.variantInfo && (
                            <span className="px-2 py-0.5 rounded-md bg-tile border border-border text-[11px] font-medium text-muted">
                              {w.variantInfo}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted flex items-center gap-2 mt-0.5">
                          <span>Brand: {w.productBrand || "VN Mobiles"}</span>
                          <span>&bull;</span>
                          <span>Order #{w.orderNumber}</span>
                        </p>
                      </div>
                    </div>

                    <div className="self-start sm:self-auto">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold tracking-wide ${badgeClasses}`}
                      >
                        {isOrderCancelledStatus ? (
                          <XCircle className="w-3.5 h-3.5" />
                        ) : timing.isExpired ? (
                          <Clock className="w-3.5 h-3.5" />
                        ) : timing.isExpiringSoon ? (
                          <AlertTriangle className="w-3.5 h-3.5" />
                        ) : (
                          <ShieldCheck className="w-3.5 h-3.5" />
                        )}
                        {badgeText}
                      </span>
                    </div>
                  </div>

                  {/* Warranty Metadata Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-tile border border-border rounded-xl p-4 text-xs">
                    <div>
                      <span className="block text-muted text-[10px] uppercase font-semibold">Certificate ID</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="font-mono font-bold text-foreground">{w.warrantyNumber}</span>
                        <button
                          onClick={() => copyToClipboard(w.warrantyNumber, `cert-${w.id}`)}
                          className="text-muted hover:text-foreground transition cursor-pointer"
                          title="Copy Certificate ID"
                        >
                          {copiedId === `cert-${w.id}` ? (
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div>
                      <span className="block text-muted text-[10px] uppercase font-semibold">Hardware IMEI</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="font-mono font-bold text-foreground">{w.imeiNumber}</span>
                        <button
                          onClick={() => copyToClipboard(w.imeiNumber, `imei-${w.id}`)}
                          className="text-muted hover:text-foreground transition cursor-pointer"
                          title="Copy IMEI"
                        >
                          {copiedId === `imei-${w.id}` ? (
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div>
                      <span className="block text-muted text-[10px] uppercase font-semibold">Coverage Period</span>
                      <span className="font-medium text-foreground block mt-0.5">
                        {formatDateDisplay(w.warrantyStartDate)} &rarr; {formatDateDisplay(w.warrantyExpiryDate)}
                      </span>
                    </div>

                    <div>
                      <span className="block text-muted text-[10px] uppercase font-semibold">Order Reference</span>
                      <Link
                        href={`/track/${w.orderNumber}`}
                        className="inline-flex items-center gap-1 font-semibold text-[#C9A66B] hover:underline mt-0.5"
                      >
                        <span>#{w.orderNumber}</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>

                  {/* Live Expiry Countdown & Progress Bar */}
                  <div className="space-y-2.5 bg-background border border-border rounded-xl p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="text-muted font-medium flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-[#C9A66B]" />
                        <span>Coverage Countdown:</span>
                      </span>

                      <div className="font-mono font-bold text-foreground">
                        {isOrderCancelledStatus ? (
                          <span className="text-red-500 font-sans">Coverage Cancelled (Order Cancelled)</span>
                        ) : timing.isExpired ? (
                          <span className="text-slate-500 font-sans">Official 1-Year Coverage Has Expired</span>
                        ) : !mounted ? (
                          <span className="text-muted">Calculating time remaining...</span>
                        ) : (
                          <span className={timing.isExpiringSoon ? "text-amber-500" : "text-emerald-500"}>
                            {timing.days}d {timing.hours}h {timing.minutes}m {timing.seconds}s remaining
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar of Time Used */}
                    {!isOrderCancelledStatus && (
                      <div className="space-y-1">
                        <div className="w-full bg-tile border border-border rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 ${progressColor}`}
                            style={{ width: `${timing.percentUsed}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] text-muted font-mono">
                          <span>Started {formatDateDisplay(w.warrantyStartDate)}</span>
                          <span>{timing.percentUsed}% Duration Used</span>
                          <span>Expires {formatDateDisplay(w.warrantyExpiryDate)}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Feedback Toast */}
                  {actionFeedback && actionFeedback.id === w.id && (
                    <div
                      className={`text-xs p-3 rounded-lg flex items-center gap-2 ${
                        actionFeedback.isError
                          ? "bg-red-500/10 text-red-600 border border-red-500/20"
                          : "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                      }`}
                    >
                      {actionFeedback.isError ? (
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                      ) : (
                        <Check className="w-4 h-4 shrink-0" />
                      )}
                      <span>{actionFeedback.msg}</span>
                    </div>
                  )}

                  {/* Card Actions Footer */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <p className="text-[11px] text-muted">
                      Need hardware claim assistance? Email <a href="mailto:support@vnmobiles.in" className="text-[#C9A66B] underline font-medium">support@vnmobiles.in</a> with certificate #{w.warrantyNumber}.
                    </p>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleResendEmail(w.id, w.orderNumber)}
                        disabled={resendingId === w.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-tile hover:bg-card text-foreground text-xs font-medium transition cursor-pointer disabled:opacity-50"
                      >
                        {resendingId === w.id ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Sending...</span>
                          </>
                        ) : (
                          <>
                            <Mail className="w-3.5 h-3.5 text-[#C9A66B]" />
                            <span>Email Certificate</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => window.print()}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-tile hover:bg-card text-foreground text-xs font-medium transition cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5 text-muted" />
                        <span>Print</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

