"use client";

import React, { useState, useMemo } from "react";
import {
  renderOrderConfirmedEmail,
  renderOrderStatusEmail,
  renderOrderCancelledEmail,
  renderWarrantyActivationEmail,
  renderWarrantyExpiringEmail,
  renderOtpEmail,
  renderPasswordResetLinkEmail,
  renderWelcomeEmail,
  renderAccountDeletionOtpEmail,
  renderAccountDeletionConfirmedEmail,
  renderAdminInvitationEmail,
} from "@/lib/email-templates";

export default function EmailPreviewPage() {
  const [selectedKey, setSelectedKey] = useState<string>("order_confirmed");
  const [viewMode, setViewMode] = useState<"html" | "text" | "split">("html");
  const [deviceWidth, setDeviceWidth] = useState<"desktop" | "mobile">("desktop");
  const [copiedSubject, setCopiedSubject] = useState(false);

  const siteUrl = "https://vnmobiles.in";

  // Common sample dataset
  const sampleCustomer = {
    name: "Alex Rivera",
    email: "alex.rivera@example.com",
    address: "Flat 402, Prestige Tower, Indiranagar 100ft Road",
    city: "Bengaluru",
    state: "Karnataka",
    pincode: "560038",
  };

  const sampleItem = {
    productName: "Nothing Phone (4b)",
    selectedStorage: "128GB",
    selectedColor: "Milk White",
    quantity: 1,
    price: 21999,
    imeiNumber: "867493019485721",
  };

  const templates = useMemo(() => {
    return [
      {
        key: "order_confirmed",
        category: "Orders",
        title: "Order Confirmed & Paid",
        rendered: renderOrderConfirmedEmail(
          {
            orderNumber: "ORD-94821",
            customerName: sampleCustomer.name,
            customerEmail: sampleCustomer.email,
            totalAmount: 21999,
            items: [sampleItem],
            address: sampleCustomer.address,
            city: sampleCustomer.city,
            state: sampleCustomer.state,
            pincode: sampleCustomer.pincode,
            createdAt: new Date("2026-11-03T10:30:00Z"),
            paymentMethod: "Amazon Pay UPI",
            paymentStatus: "PAID",
          },
          siteUrl
        ),
      },
      {
        key: "order_shipped",
        category: "Orders",
        title: "Order Shipped (On the move)",
        rendered: renderOrderStatusEmail(
          {
            orderNumber: "ORD-94821",
            customerName: sampleCustomer.name,
            customerEmail: sampleCustomer.email,
            totalAmount: 21999,
            orderStatus: "SHIPPED",
            shippingCarrier: "BlueDart Express",
            trackingNumber: "BD98472910IN",
            items: [sampleItem],
          },
          "SHIPPED",
          "Tamper-proof package dispatched from Bengaluru Central Warehouse.",
          undefined,
          siteUrl
        ),
      },
      {
        key: "order_out_for_delivery",
        category: "Orders",
        title: "Out for Delivery (Arriving Today)",
        rendered: renderOrderStatusEmail(
          {
            orderNumber: "ORD-94821",
            customerName: sampleCustomer.name,
            customerEmail: sampleCustomer.email,
            totalAmount: 21999,
            orderStatus: "OUT_FOR_DELIVERY",
            shippingCarrier: "BlueDart Express",
            trackingNumber: "BD98472910IN",
            items: [sampleItem],
          },
          "OUT_FOR_DELIVERY",
          "Courier agent assigned for afternoon doorstep delivery.",
          undefined,
          siteUrl
        ),
      },
      {
        key: "order_delivered",
        category: "Orders",
        title: "Order Delivered (Unboxing Day)",
        rendered: renderOrderStatusEmail(
          {
            orderNumber: "ORD-94821",
            customerName: sampleCustomer.name,
            customerEmail: sampleCustomer.email,
            totalAmount: 21999,
            orderStatus: "DELIVERED",
            shippingCarrier: "BlueDart Express",
            trackingNumber: "BD98472910IN",
            items: [sampleItem],
          },
          "DELIVERED",
          "Delivered to resident at Indiranagar 100ft Road.",
          undefined,
          siteUrl
        ),
      },
      {
        key: "order_cancelled",
        category: "Orders",
        title: "Order Cancelled & Refund Initiated",
        rendered: renderOrderCancelledEmail(
          {
            orderNumber: "ORD-94821",
            customerName: sampleCustomer.name,
            customerEmail: sampleCustomer.email,
            totalAmount: 21999,
            orderStatus: "CANCELLED",
            items: [sampleItem],
          },
          "Cancelled per customer request prior to courier dispatch.",
          undefined,
          siteUrl
        ),
      },
      {
        key: "warranty_activated",
        category: "Warranty",
        title: "Warranty Activated (Certificate)",
        rendered: renderWarrantyActivationEmail(
          {
            orderNumber: "ORD-94821",
            customerName: sampleCustomer.name,
            customerEmail: sampleCustomer.email,
            items: [
              {
                productName: sampleItem.productName,
                variantInfo: `${sampleItem.selectedStorage} • ${sampleItem.selectedColor}`,
                warrantyNumber: "WRT-ORD-94821-1",
                imeiNumber: sampleItem.imeiNumber,
                coveragePeriod: "1-Year Official Brand Warranty",
                startDateStr: "3 Nov 2026",
                expiryDateStr: "3 Nov 2027",
                status: "ACTIVE",
              },
            ],
            createdAt: new Date("2026-11-03T10:30:00Z"),
            paymentMethod: "Amazon Pay UPI",
            paymentStatus: "PAID",
            totalAmount: 21999,
            quantity: 1,
            address: sampleCustomer.address,
            city: sampleCustomer.city,
            state: sampleCustomer.state,
            pincode: sampleCustomer.pincode,
          },
          siteUrl
        ),
      },
      {
        key: "warranty_reminder_6m",
        category: "Warranty",
        title: "Warranty Reminder (6 Months Left)",
        rendered: renderWarrantyExpiringEmail(
          {
            customerName: sampleCustomer.name,
            customerEmail: sampleCustomer.email,
            productName: sampleItem.productName,
            warrantyNumber: "WRT-ORD-94821-1",
            imeiNumber: sampleItem.imeiNumber,
            warrantyStartDate: new Date("2026-05-03"),
            warrantyExpiryDate: new Date("2027-05-03"),
            orderNumber: "ORD-94821",
            warrantyDuration: "1-Year Official Brand Warranty",
          },
          "6_MONTHS",
          siteUrl
        ),
      },
      {
        key: "warranty_reminder_1d",
        category: "Warranty",
        title: "Warranty Reminder (Expires Tomorrow)",
        rendered: renderWarrantyExpiringEmail(
          {
            customerName: sampleCustomer.name,
            customerEmail: sampleCustomer.email,
            productName: sampleItem.productName,
            warrantyNumber: "WRT-ORD-94821-1",
            imeiNumber: sampleItem.imeiNumber,
            warrantyStartDate: new Date("2025-11-04"),
            warrantyExpiryDate: new Date("2026-11-04"),
            orderNumber: "ORD-94821",
            warrantyDuration: "1-Year Official Brand Warranty",
          },
          "1_DAY",
          siteUrl
        ),
      },
      {
        key: "otp_registration",
        category: "Auth & Security",
        title: "Registration Verification Code",
        rendered: renderOtpEmail(
          {
            recipientName: sampleCustomer.name,
            recipientEmail: sampleCustomer.email,
            code: "582914",
            purpose: "registration",
            expiresInMinutes: 5,
          },
          siteUrl
        ),
      },
      {
        key: "otp_login",
        category: "Auth & Security",
        title: "Login Sign-In Code",
        rendered: renderOtpEmail(
          {
            recipientName: sampleCustomer.name,
            recipientEmail: sampleCustomer.email,
            code: "719302",
            purpose: "login",
            expiresInMinutes: 5,
          },
          siteUrl
        ),
      },
      {
        key: "otp_password_reset",
        category: "Auth & Security",
        title: "Customer Password Reset Code",
        rendered: renderOtpEmail(
          {
            recipientName: sampleCustomer.name,
            recipientEmail: sampleCustomer.email,
            code: "394815",
            purpose: "password_reset",
            expiresInMinutes: 5,
          },
          siteUrl
        ),
      },
      {
        key: "otp_admin_login",
        category: "Auth & Security",
        title: "Admin Control Desk OTP",
        rendered: renderOtpEmail(
          {
            recipientName: "Store Administrator",
            recipientEmail: "rrroyce20@gmail.com",
            code: "847291",
            purpose: "admin_login",
            expiresInMinutes: 5,
          },
          siteUrl
        ),
      },
      {
        key: "admin_password_reset_link",
        category: "Auth & Security",
        title: "Admin Password Reset (Direct Link)",
        rendered: renderPasswordResetLinkEmail(
          {
            recipientName: "Store Administrator",
            recipientEmail: "rrroyce20@gmail.com",
            resetUrl: `${siteUrl}/reset-password?token=sample_admin_secure_token_9482&email=rrroyce20@gmail.com`,
            expiresInMinutes: 60,
          },
          siteUrl
        ),
      },
      {
        key: "account_welcome",
        category: "Account",
        title: "Welcome New Member",
        rendered: renderWelcomeEmail(
          {
            recipientName: sampleCustomer.name,
            recipientEmail: sampleCustomer.email,
          },
          siteUrl
        ),
      },
      {
        key: "account_deletion_otp",
        category: "Account",
        title: "Account Deletion Authorization OTP",
        rendered: renderAccountDeletionOtpEmail(
          {
            recipientName: sampleCustomer.name,
            recipientEmail: sampleCustomer.email,
            code: "928374",
          },
          siteUrl
        ),
      },
      {
        key: "account_deletion_confirmed",
        category: "Account",
        title: "Account Deletion Confirmation",
        rendered: renderAccountDeletionConfirmedEmail(
          {
            recipientName: sampleCustomer.name,
            recipientEmail: sampleCustomer.email,
          },
          siteUrl
        ),
      },
      {
        key: "admin_invitation",
        category: "Admin",
        title: "Admin Team Member Invitation",
        rendered: renderAdminInvitationEmail(
          {
            inviteLink: `${siteUrl}/admin/accept-invite?token=sample_invite_token_88219`,
            recipientEmail: "new.admin@vnmobiles.in",
            invitedByName: "Senior Store Administrator",
            expiresAtFormatted: "48 hours",
          },
          siteUrl
        ),
      },
    ];
  }, []);

  const currentTemplate = templates.find((t) => t.key === selectedKey) || templates[0];

  const handleCopySubject = () => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(currentTemplate.rendered.subject);
      setCopiedSubject(true);
      setTimeout(() => setCopiedSubject(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Banner Notice */}
      <div className="bg-gradient-to-r from-amber-900/60 via-slate-900 to-amber-900/60 border-b border-amber-600/30 px-6 py-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 font-bold text-xs">
            VN
          </span>
          <div>
            <div className="text-sm font-semibold text-white tracking-wide">
              Email Template Visual Previewer
            </div>
            <div className="text-xs text-amber-200/80">
              Sample device: <span className="text-white font-medium">Nothing Phone (4b), 128GB, Milk White, Rs 21,999</span> &bull; Zero emojis
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 bg-slate-900/80 px-3 py-1 rounded-md border border-slate-800">
            Path: <code className="text-amber-300">/email-preview</code> &bull; Delete this page after design review
          </span>
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Navigation */}
        <aside className="w-80 border-r border-slate-800 bg-slate-900/60 flex flex-col overflow-y-auto">
          <div className="p-4 border-b border-slate-800 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Email Templates ({templates.length})
          </div>
          <div className="p-2 space-y-1">
            {templates.map((tpl) => {
              const active = tpl.key === selectedKey;
              return (
                <button
                  key={tpl.key}
                  onClick={() => setSelectedKey(tpl.key)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-medium transition-colors flex items-start gap-2.5 ${
                    active
                      ? "bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-sm"
                      : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
                  }`}
                >
                  <span
                    className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${
                      active ? "bg-amber-400" : "bg-slate-600"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="truncate font-medium">{tpl.title}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5 truncate">{tpl.category}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Preview Area */}
        <main className="flex-1 flex flex-col overflow-hidden bg-slate-950">
          {/* Metadata Bar */}
          <div className="border-b border-slate-800 bg-slate-900/40 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-bold tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  {currentTemplate.category}
                </span>
                <h1 className="text-base font-bold text-white">{currentTemplate.title}</h1>
              </div>

              {/* View & Device Toggles */}
              <div className="flex items-center gap-2">
                <div className="inline-flex rounded-lg border border-slate-800 bg-slate-900 p-0.5 text-xs">
                  <button
                    onClick={() => setViewMode("html")}
                    className={`px-3 py-1 rounded-md font-medium transition-colors ${
                      viewMode === "html" ? "bg-amber-500/20 text-amber-300" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    HTML Email
                  </button>
                  <button
                    onClick={() => setViewMode("text")}
                    className={`px-3 py-1 rounded-md font-medium transition-colors ${
                      viewMode === "text" ? "bg-amber-500/20 text-amber-300" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Plain Text
                  </button>
                  <button
                    onClick={() => setViewMode("split")}
                    className={`px-3 py-1 rounded-md font-medium transition-colors ${
                      viewMode === "split" ? "bg-amber-500/20 text-amber-300" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Side-by-Side
                  </button>
                </div>

                {viewMode !== "text" && (
                  <div className="inline-flex rounded-lg border border-slate-800 bg-slate-900 p-0.5 text-xs">
                    <button
                      onClick={() => setDeviceWidth("desktop")}
                      className={`px-3 py-1 rounded-md font-medium transition-colors ${
                        deviceWidth === "desktop" ? "bg-slate-800 text-white" : "text-slate-400 hover:text-white"
                      }`}
                    >
                      Desktop (600px)
                    </button>
                    <button
                      onClick={() => setDeviceWidth("mobile")}
                      className={`px-3 py-1 rounded-md font-medium transition-colors ${
                        deviceWidth === "mobile" ? "bg-slate-800 text-white" : "text-slate-400 hover:text-white"
                      }`}
                    >
                      Mobile (380px)
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Subject & Preheader inspect card */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-slate-900/90 rounded-lg p-3 border border-slate-800">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 uppercase font-semibold text-[10px] tracking-wider">
                    Subject Line
                  </span>
                  <button
                    onClick={handleCopySubject}
                    className="text-[11px] text-amber-400 hover:text-amber-300 font-medium cursor-pointer"
                  >
                    {copiedSubject ? "Copied" : "Copy"}
                  </button>
                </div>
                <div className="text-slate-100 font-mono text-xs truncate bg-slate-950 px-2 py-1.5 rounded border border-slate-800 select-all">
                  {currentTemplate.rendered.subject}
                </div>
              </div>

              <div className="space-y-1 min-w-0">
                <span className="text-slate-400 uppercase font-semibold text-[10px] tracking-wider">
                  Inbox Preheader Preview
                </span>
                <div className="text-slate-300 text-xs truncate bg-slate-950 px-2 py-1.5 rounded border border-slate-800">
                  {currentTemplate.rendered.preheader}
                </div>
              </div>
            </div>
          </div>

          {/* Canvas Render Area */}
          <div className="flex-1 overflow-auto p-6 flex justify-center bg-slate-950/90">
            {viewMode === "html" && (
              <div
                className={`transition-all duration-200 bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-800 ${
                  deviceWidth === "desktop" ? "w-[640px]" : "w-[380px]"
                }`}
                style={{ height: "calc(100vh - 270px)" }}
              >
                <iframe
                  title={currentTemplate.title}
                  srcDoc={currentTemplate.rendered.html}
                  className="w-full h-full border-0"
                />
              </div>
            )}

            {viewMode === "text" && (
              <div
                className="w-full max-w-3xl bg-slate-900 rounded-xl border border-slate-800 p-6 overflow-y-auto font-mono text-xs text-slate-300 leading-relaxed shadow-xl select-all"
                style={{ height: "calc(100vh - 270px)" }}
              >
                <pre className="whitespace-pre-wrap">{currentTemplate.rendered.text}</pre>
              </div>
            )}

            {viewMode === "split" && (
              <div className="w-full flex gap-6" style={{ height: "calc(100vh - 270px)" }}>
                {/* HTML Side */}
                <div
                  className={`bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-800 ${
                    deviceWidth === "desktop" ? "w-[600px]" : "w-[380px]"
                  }`}
                >
                  <iframe
                    title={currentTemplate.title}
                    srcDoc={currentTemplate.rendered.html}
                    className="w-full h-full border-0"
                  />
                </div>

                {/* Plain Text Side */}
                <div className="flex-1 bg-slate-900 rounded-xl border border-slate-800 p-6 overflow-y-auto font-mono text-xs text-slate-300 leading-relaxed shadow-xl select-all">
                  <div className="text-[10px] uppercase font-bold text-amber-400 mb-2 tracking-wider">
                    Plain-Text Fallback
                  </div>
                  <pre className="whitespace-pre-wrap">{currentTemplate.rendered.text}</pre>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

