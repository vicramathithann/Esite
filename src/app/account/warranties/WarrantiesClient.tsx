"use client";

import React, { useState } from "react";
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
import WarrantyCountdown from "./WarrantyCountdown";
import WarrantyCertificatePrint from "./WarrantyCertificatePrint";

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
  warrantyStatus: "ACTIVE" | "EXPIRING_SOON" | "EXPIRED" | "CANCELLED";
  customerName: string;
  customerEmail: string;
  reminded1DayAt?: string | null;
  reminded6MonthsAt?: string | null;
}

interface WarrantiesClientProps {
  activeWarranties: EnrichedWarranty[];
  expiredWarranties: EnrichedWarranty[];
  cancelledWarranties: EnrichedWarranty[];
  supabaseError?: string | null;
  userName: string;
  userEmail: string;
}

type TabKey = "ACTIVE" | "EXPIRED" | "CANCELLED";

function formatDateDisplay(dateStr?: string | null): string {
  if (!dateStr) return "N/A";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return String(dateStr);
  }
}

export default function WarrantiesClient({
  activeWarranties,
  expiredWarranties,
  cancelledWarranties,
  supabaseError,
  userName,
  userEmail,
}: WarrantiesClientProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("ACTIVE");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [selectedPrintWarranty, setSelectedPrintWarranty] = useState<EnrichedWarranty | null>(
    activeWarranties[0] || cancelledWarranties[0] || expiredWarranties[0] || null
  );
  const [actionFeedback, setActionFeedback] = useState<{
    id: string;
    msg: string;
    isError?: boolean;
  } | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handlePrint = (w: EnrichedWarranty) => {
    setSelectedPrintWarranty(w);
    // Allow state update to render target certificate into DOM before opening print dialog
    setTimeout(() => {
      window.print();
    }, 60);
  };

  const handleResendEmail = async (warrantyId: string, _orderNumber: string) => {
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

  const currentList =
    activeTab === "ACTIVE"
      ? activeWarranties
      : activeTab === "EXPIRED"
      ? expiredWarranties
      : cancelledWarranties;

  return (
    <>
      {/* Print-only component: Hidden on screen, visible only during @media print */}
      {selectedPrintWarranty && (
        <WarrantyCertificatePrint
          warranty={selectedPrintWarranty}
          userEmail={userEmail}
        />
      )}

      {/* Screen Container: Hidden completely during @media print */}
      <div className="no-print min-h-screen bg-background text-foreground py-8 px-4 sm:px-6 lg:px-8 transition-colors">
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
                {activeWarranties.length} Active {activeWarranties.length === 1 ? "Warranty" : "Warranties"}
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
                    Registered device protection for{" "}
                    <span className="font-semibold text-foreground">{userName || userEmail}</span>. Each device is protected by hardware IMEI verification.
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
                <RefreshCw className="w-3.5 h-3.5" /> Retry
              </button>
            </div>
          )}

          {/* Category Tabs: Client-side Switch */}
          <div className="flex items-center gap-2 border-b border-border pb-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab("ACTIVE")}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                activeTab === "ACTIVE"
                  ? "bg-[#C9A66B] text-white border-[#C9A66B] shadow-sm"
                  : "bg-tile text-muted border-border hover:text-foreground hover:bg-card"
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Active ({activeWarranties.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("EXPIRED")}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                activeTab === "EXPIRED"
                  ? "bg-[#C9A66B] text-white border-[#C9A66B] shadow-sm"
                  : "bg-tile text-muted border-border hover:text-foreground hover:bg-card"
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Expired ({expiredWarranties.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("CANCELLED")}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                activeTab === "CANCELLED"
                  ? "bg-[#C9A66B] text-white border-[#C9A66B] shadow-sm"
                  : "bg-tile text-muted border-border hover:text-foreground hover:bg-card"
              }`}
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Cancelled ({cancelledWarranties.length})</span>
            </button>
          </div>

          {/* Warranties List */}
          {!supabaseError && currentList.length === 0 ? (
            <div className="bg-card border border-border rounded-2xl p-12 text-center text-muted space-y-4 shadow-sm">
              {activeTab === "ACTIVE" ? (
                <>
                  <ShieldCheck className="w-12 h-12 mx-auto text-muted opacity-40" />
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-foreground">No Active Warranties</h3>
                    <p className="text-xs text-muted max-w-md mx-auto">
                      No active device warranties registered for your account. When you purchase a smartphone from VN Mobiles, your 1-Year official warranty will appear here automatically.
                    </p>
                  </div>
                  <Link
                    href="/"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#C9A66B] hover:bg-[#B8914A] text-white text-xs font-semibold transition shadow-sm"
                  >
                    <Smartphone className="w-3.5 h-3.5" /> Explore Phones
                  </Link>
                </>
              ) : activeTab === "EXPIRED" ? (
                <>
                  <Clock className="w-12 h-12 mx-auto text-muted opacity-40" />
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-foreground">No Expired Warranties</h3>
                    <p className="text-xs text-muted max-w-md mx-auto">
                      None of your registered device protection plans have reached their expiration date.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <XCircle className="w-12 h-12 mx-auto text-muted opacity-40" />
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-foreground">No Cancelled Warranties</h3>
                    <p className="text-xs text-muted max-w-md mx-auto">
                      You have no cancelled or refunded device warranties.
                    </p>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {currentList.map((w, idx) => {
                const isCancelled = w.warrantyStatus === "CANCELLED";
                const isExpired = w.warrantyStatus === "EXPIRED";
                const isExpiringSoon = w.warrantyStatus === "EXPIRING_SOON";

                let badgeText = "ACTIVE COVERAGE";
                let badgeClasses =
                  "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20";

                if (isCancelled) {
                  badgeText = "ORDER CANCELLED";
                  badgeClasses = "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20";
                } else if (isExpired) {
                  badgeText = "COVERAGE EXPIRED";
                  badgeClasses = "bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/20";
                } else if (isExpiringSoon) {
                  const daysUntil = Math.max(
                    0,
                    Math.floor(
                      (new Date(w.warrantyExpiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                    )
                  );
                  badgeText = `EXPIRING SOON (${daysUntil}d LEFT)`;
                  badgeClasses = "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 animate-pulse";
                }

                return (
                  <div
                    key={w.id}
                    className={`border rounded-2xl p-5 sm:p-6 shadow-sm space-y-5 transition ${
                      isCancelled
                        ? "bg-card/60 dark:bg-card/40 border-border/80 opacity-80"
                        : "bg-card border-border hover:border-[#C9A66B]/40"
                    }`}
                  >
                    {/* Card Header: Device Name, Variant & Status Badge */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-border pb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-14 h-14 rounded-xl bg-tile border border-border flex items-center justify-center relative overflow-hidden shrink-0">
                          {w.productImageUrl && !w.productImageUrl.includes("placeholder") ? (
                            <Image
                              src={w.productImageUrl}
                              alt={w.productName}
                              width={56}
                              height={56}
                              className="object-contain p-1"
                              sizes="56px"
                              loading={idx === 0 ? "eager" : "lazy"}
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
                          {isCancelled ? (
                            <XCircle className="w-3.5 h-3.5" />
                          ) : isExpired ? (
                            <Clock className="w-3.5 h-3.5" />
                          ) : isExpiringSoon ? (
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

                    {/* Countdown / Status Box */}
                    {isCancelled ? (
                      <div className="bg-background/80 border border-border rounded-xl p-3.5 flex items-center gap-2.5 text-xs text-red-600 dark:text-red-400">
                        <XCircle className="w-4 h-4 shrink-0" />
                        <span>Coverage cancelled (order cancelled)</span>
                      </div>
                    ) : (
                      <WarrantyCountdown
                        startDate={w.warrantyStartDate}
                        expiryDate={w.warrantyExpiryDate}
                        isExpiringSoon={isExpiringSoon}
                        isExpired={isExpired}
                      />
                    )}

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

                    {/* Card Actions Footer: Active or Cancelled print */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                      <p className="text-[11px] text-muted">
                        {isCancelled ? (
                          <span>Official record for cancelled order #{w.orderNumber}.</span>
                        ) : (
                          <>
                            Need hardware claim assistance? Email{" "}
                            <a href="mailto:support@vnmobiles.in" className="text-[#C9A66B] underline font-medium">
                              support@vnmobiles.in
                            </a>{" "}
                            with certificate #{w.warrantyNumber}.
                          </>
                        )}
                      </p>

                      <div className="flex items-center gap-2">
                        {/* Email Certificate button: Active only */}
                        {!isCancelled && !isExpired && (
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
                        )}

                        {/* Print Certificate button */}
                        <button
                          onClick={() => handlePrint(w)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-tile hover:bg-card text-foreground text-xs font-medium transition cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5 text-muted" />
                          <span>{isCancelled ? "Print Record" : "Print"}</span>
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
    </>
  );
}
