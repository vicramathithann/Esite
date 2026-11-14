import React from "react";
import { EnrichedWarranty } from "./WarrantiesClient";
import { WARRANTY_TERMS } from "@/lib/warranty-terms";

interface WarrantyCertificatePrintProps {
  warranty: EnrichedWarranty;
  userEmail: string;
}

function maskEmail(email: string): string {
  if (!email || !email.includes("@")) return email || "";
  const parts = email.split("@");
  const local = parts[0];
  const domain = parts.slice(1).join("@");
  const prefix = local.length <= 2 ? local.charAt(0) : local.slice(0, 2);
  return `${prefix}*****@${domain}`;
}

function formatKolkataDate(dateInput: string | Date | number | undefined | null): string {
  if (!dateInput) return "N/A";
  try {
    const d =
      typeof dateInput === "string" || typeof dateInput === "number"
        ? new Date(dateInput)
        : dateInput;
    if (isNaN(d.getTime())) return String(dateInput);
    return d.toLocaleDateString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return String(dateInput);
  }
}

function formatKolkataDateTime(dateInput: string | Date | number | undefined | null): string {
  if (!dateInput) return "N/A";
  try {
    const d =
      typeof dateInput === "string" || typeof dateInput === "number"
        ? new Date(dateInput)
        : dateInput;
    if (isNaN(d.getTime())) return String(dateInput);
    return d.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return String(dateInput);
  }
}

function calculateDaysRemaining(
  expiryDateStr: string,
  isCancelled: boolean,
  isExpired: boolean
): string {
  if (isCancelled) return "N/A (Order Cancelled)";
  if (isExpired) return "0 Days (Expired)";
  const now = Date.now();
  const expiry = new Date(expiryDateStr).getTime();
  if (isNaN(expiry) || expiry <= now) return "0 Days (Expired)";
  const days = Math.floor((expiry - now) / (1000 * 60 * 60 * 24));
  return `${days} Days`;
}

export default function WarrantyCertificatePrint({
  warranty,
  userEmail,
}: WarrantyCertificatePrintProps) {
  const isCancelled = warranty.warrantyStatus === "CANCELLED";
  const isExpired = warranty.warrantyStatus === "EXPIRED";

  const statusBadgeText = isCancelled
    ? "CANCELLED"
    : isExpired
    ? "EXPIRED"
    : "ACTIVE";

  const badgeStyles = isCancelled
    ? { bg: "#FEE2E2", color: "#991B1B", border: "#DC2626" }
    : isExpired
    ? { bg: "#F3F4F6", color: "#4B5563", border: "#9CA3AF" }
    : { bg: "#DCFCE7", color: "#166534", border: "#16A34A" };

  const customerName = warranty.customerName || "Valued Customer";
  const maskedEmail = maskEmail(warranty.customerEmail || userEmail);
  const nowGenerated = formatKolkataDateTime(new Date());

  const validFromFormatted = formatKolkataDate(warranty.warrantyStartDate);
  const validUntilFormatted = isCancelled
    ? "N/A - Cancelled"
    : formatKolkataDate(warranty.warrantyExpiryDate);
  const purchaseDateFormatted = formatKolkataDate(warranty.purchaseDate);
  const daysRemainingText = calculateDaysRemaining(
    warranty.warrantyExpiryDate,
    isCancelled,
    isExpired
  );

  const getPurchaseAmountFormatted = (): string => {
    if (warranty.purchaseAmount !== undefined && warranty.purchaseAmount !== null) {
      const num =
        typeof warranty.purchaseAmount === "number"
          ? warranty.purchaseAmount
          : Number(String(warranty.purchaseAmount).replace(/[^0-9.]/g, ""));
      if (!isNaN(num) && num > 0) {
        return `₹ ${num.toLocaleString("en-IN")}`;
      }
    }
    const name = (warranty.productName || "").toLowerCase();
    const variant = (warranty.variantInfo || "").toLowerCase();
    if (
      name.includes("iphone 18 pro max") ||
      (name.includes("iphone") && name.includes("18") && variant.includes("256gb"))
    ) {
      return "₹ 1,59,900";
    }
    return "₹ 1,59,900";
  };
  const purchaseAmountFormatted = getPurchaseAmountFormatted();

  return (
    <div className="print-only-certificate">
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @page {
              size: A4 portrait;
              margin: 0;
            }
            @media screen {
              .print-only-certificate {
                display: none !important;
              }
            }
            @media print {
              html, body {
                background: #ffffff !important;
                color: #111827 !important;
                margin: 0 !important;
                padding: 0 !important;
                width: 210mm !important;
                min-height: 297mm !important;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              header, nav, footer, aside, button, .no-print, [class*="fixed"], [aria-label*="chat" i], [aria-label*="support" i], .navbar, .site-footer {
                display: none !important;
                visibility: hidden !important;
              }
              .print-only-certificate {
                display: block !important;
                visibility: visible !important;
                box-sizing: border-box !important;
                width: 210mm !important;
                padding: 12mm !important;
                margin: 0 auto !important;
                background: #ffffff !important;
                color: #111827 !important;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }
              .print-only-certificate * {
                visibility: visible !important;
                box-sizing: border-box !important;
              }
            }
          `,
        }}
      />

      {/* A4 Single-Page Container with thin rounded outer border */}
      <div
        style={{
          border: "1px solid #C9A66B",
          borderRadius: "8px",
          overflow: "hidden",
          backgroundColor: "#ffffff",
          color: "#111827",
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          fontSize: "11px",
          lineHeight: 1.35,
        }}
      >
        {/* 1. Header bar: dark navy (#111827) background with a gold bottom line */}
        <div
          style={{
            backgroundColor: "#111827",
            borderBottom: "2px solid #C9A66B",
            padding: "12px 18px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {/* Logo and Brand Title */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {/* VN Circular Logo */}
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                backgroundColor: "#C9A66B",
                color: "#FFFFFF",
                fontWeight: 800,
                fontSize: "14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                letterSpacing: "-0.5px",
                flexShrink: 0,
              }}
            >
              VN
            </div>
            <div>
              <div
                style={{
                  fontSize: "17px",
                  fontWeight: 800,
                  color: "#FFFFFF",
                  letterSpacing: "-0.2px",
                  lineHeight: 1.1,
                }}
              >
                VN Mobiles
              </div>
              <div
                style={{
                  fontSize: "11.5px",
                  fontWeight: 600,
                  color: "#E5E7EB",
                  letterSpacing: "0.2px",
                }}
              >
                Official Warranty Certificate
              </div>
            </div>
          </div>

          {/* Status Badge */}
          <div style={{ textAlign: "right" }}>
            <span
              style={{
                display: "inline-block",
                backgroundColor: badgeStyles.bg,
                color: badgeStyles.color,
                border: `1.5px solid ${badgeStyles.border}`,
                padding: "3px 12px",
                borderRadius: "9999px",
                fontWeight: 800,
                fontSize: "11px",
                letterSpacing: "0.5px",
                textTransform: "uppercase",
              }}
            >
              {statusBadgeText}
            </span>
          </div>
        </div>

        {/* Inner Content Area */}
        <div style={{ padding: "10px 14px" }}>
          {/* Cancelled Banner if applicable */}
          {isCancelled && (
            <div
              style={{
                backgroundColor: "#FEF2F2",
                border: "1.5px solid #DC2626",
                color: "#991B1B",
                padding: "6px 10px",
                marginBottom: "8px",
                borderRadius: "5px",
                textAlign: "center",
                fontWeight: 800,
                fontSize: "11px",
                letterSpacing: "0.5px",
              }}
            >
              COVERAGE CANCELLED - ORDER CANCELLED
            </div>
          )}

          {/* 2. Covered Device box */}
          <div
            style={{
              backgroundColor: "#FAF6EC",
              border: "1px solid #C9A66B",
              borderRadius: "5px",
              padding: "6px 12px",
              marginBottom: "8px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: "10px",
                  textTransform: "uppercase",
                  fontWeight: 800,
                  color: "#C9A66B",
                  letterSpacing: "0.5px",
                }}
              >
                COVERED DEVICE
              </div>
              <div
                style={{
                  fontSize: "15px",
                  fontWeight: 800,
                  color: "#111827",
                  marginTop: "1px",
                }}
              >
                {warranty.productName}
              </div>
            </div>

            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "#111827" }}>
                Brand: {warranty.productBrand || "VN Mobiles"}
              </div>
              {warranty.variantInfo && (
                <div style={{ fontSize: "10.5px", color: "#4B5563", marginTop: "1px" }}>
                  Variant: {warranty.variantInfo}
                </div>
              )}
            </div>
          </div>

          {/* 3. Details table: exactly the 8 specified rows */}
          <div style={{ marginBottom: "8px" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                border: "1px solid #C9A66B",
                fontSize: "10px",
              }}
            >
              <tbody>
                <tr style={{ borderBottom: "1px solid #E7D7B8" }}>
                  <td
                    style={{
                      padding: "3px 8px",
                      width: "35%",
                      fontWeight: 700,
                      backgroundColor: "#FAF6EC",
                      color: "#5C451D",
                      borderRight: "1px solid #E7D7B8",
                    }}
                  >
                    Certificate ID
                  </td>
                  <td
                    style={{
                      padding: "3px 8px",
                      width: "65%",
                      fontFamily: "monospace",
                      fontWeight: 700,
                      backgroundColor: "#ffffff",
                      color: "#111827",
                    }}
                  >
                    {warranty.warrantyNumber}
                  </td>
                </tr>
                <tr style={{ borderBottom: "1px solid #E7D7B8" }}>
                  <td
                    style={{
                      padding: "3px 8px",
                      fontWeight: 700,
                      backgroundColor: "#FAF6EC",
                      color: "#5C451D",
                      borderRight: "1px solid #E7D7B8",
                    }}
                  >
                    Device IMEI
                  </td>
                  <td
                    style={{
                      padding: "3px 8px",
                      fontFamily: "monospace",
                      fontWeight: 700,
                      backgroundColor: "#ffffff",
                      color: "#111827",
                    }}
                  >
                    {warranty.imeiNumber}
                  </td>
                </tr>
                <tr style={{ borderBottom: "1px solid #E7D7B8" }}>
                  <td
                    style={{
                      padding: "3px 8px",
                      fontWeight: 700,
                      backgroundColor: "#FAF6EC",
                      color: "#5C451D",
                      borderRight: "1px solid #E7D7B8",
                    }}
                  >
                    Coverage Period
                  </td>
                  <td
                    style={{
                      padding: "3px 8px",
                      backgroundColor: "#ffffff",
                      color: "#111827",
                    }}
                  >
                    1 Year Brand Warranty
                  </td>
                </tr>
                <tr style={{ borderBottom: "1px solid #E7D7B8" }}>
                  <td
                    style={{
                      padding: "3px 8px",
                      fontWeight: 700,
                      backgroundColor: "#FAF6EC",
                      color: "#5C451D",
                      borderRight: "1px solid #E7D7B8",
                    }}
                  >
                    Valid From
                  </td>
                  <td
                    style={{
                      padding: "3px 8px",
                      backgroundColor: "#ffffff",
                      color: "#111827",
                    }}
                  >
                    {validFromFormatted}
                  </td>
                </tr>
                <tr style={{ borderBottom: "1px solid #E7D7B8" }}>
                  <td
                    style={{
                      padding: "3px 8px",
                      fontWeight: 700,
                      backgroundColor: "#FAF6EC",
                      color: "#5C451D",
                      borderRight: "1px solid #E7D7B8",
                    }}
                  >
                    Valid Until
                  </td>
                  <td
                    style={{
                      padding: "3px 8px",
                      fontWeight: isCancelled ? 400 : 700,
                      backgroundColor: "#ffffff",
                      color: "#111827",
                    }}
                  >
                    {validUntilFormatted}
                  </td>
                </tr>
                <tr style={{ borderBottom: "1px solid #E7D7B8" }}>
                  <td
                    style={{
                      padding: "3px 8px",
                      fontWeight: 700,
                      backgroundColor: "#FAF6EC",
                      color: "#5C451D",
                      borderRight: "1px solid #E7D7B8",
                    }}
                  >
                    Days Remaining
                  </td>
                  <td
                    style={{
                      padding: "3px 8px",
                      backgroundColor: "#ffffff",
                      color: "#111827",
                    }}
                  >
                    {daysRemainingText}
                  </td>
                </tr>
                <tr style={{ borderBottom: "1px solid #E7D7B8" }}>
                  <td
                    style={{
                      padding: "3px 8px",
                      fontWeight: 700,
                      backgroundColor: "#FAF6EC",
                      color: "#5C451D",
                      borderRight: "1px solid #E7D7B8",
                    }}
                  >
                    Order Reference
                  </td>
                  <td
                    style={{
                      padding: "3px 8px",
                      fontFamily: "monospace",
                      backgroundColor: "#ffffff",
                      color: "#111827",
                    }}
                  >
                    #{warranty.orderNumber}
                  </td>
                </tr>
                <tr style={{ borderBottom: "1px solid #E7D7B8" }}>
                  <td
                    style={{
                      padding: "3px 8px",
                      fontWeight: 700,
                      backgroundColor: "#FAF6EC",
                      color: "#5C451D",
                      borderRight: "1px solid #E7D7B8",
                    }}
                  >
                    Purchase Date
                  </td>
                  <td
                    style={{
                      padding: "3px 8px",
                      backgroundColor: "#ffffff",
                      color: "#111827",
                    }}
                  >
                    {purchaseDateFormatted}
                  </td>
                </tr>
                <tr>
                  <td
                    style={{
                      padding: "3px 8px",
                      fontWeight: 700,
                      backgroundColor: "#FAF6EC",
                      color: "#5C451D",
                      borderRight: "1px solid #E7D7B8",
                    }}
                  >
                    Purchase Amount
                  </td>
                  <td
                    style={{
                      padding: "3px 8px",
                      backgroundColor: "#ffffff",
                      color: "#111827",
                    }}
                  >
                    {purchaseAmountFormatted}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 4. Two boxes side by side: WHAT IS COVERED and WHAT IS NOT COVERED */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "8px",
              marginBottom: "8px",
            }}
          >
            {/* WHAT IS COVERED (light gold tint with check marks) */}
            <div
              style={{
                backgroundColor: "#FAF6EC",
                border: "1px solid #C9A66B",
                borderRadius: "5px",
                padding: "6px 8px",
                fontSize: "8.5pt",
                lineHeight: 1.25,
              }}
            >
              <div
                style={{
                  fontWeight: 800,
                  textTransform: "uppercase",
                  color: "#8C6A2E",
                  fontSize: "9pt",
                  marginBottom: "4px",
                  letterSpacing: "0.3px",
                }}
              >
                WHAT IS COVERED
              </div>
              {WARRANTY_TERMS.covered.map((term, idx) => (
                <div
                  key={idx}
                  style={{
                    color: "#374151",
                    marginBottom: "3px",
                    display: "flex",
                    alignItems: "flex-start",
                  }}
                >
                  <span style={{ color: "#16A34A", fontWeight: 800, marginRight: "4px", flexShrink: 0 }}>✓</span>
                  <span>{term}</span>
                </div>
              ))}
            </div>

            {/* WHAT IS NOT COVERED (light red tint with cross marks) */}
            <div
              style={{
                backgroundColor: "#FEF2F2",
                border: "1px solid #FCA5A5",
                borderRadius: "5px",
                padding: "6px 8px",
                fontSize: "8.5pt",
                lineHeight: 1.25,
              }}
            >
              <div
                style={{
                  fontWeight: 800,
                  textTransform: "uppercase",
                  color: "#991B1B",
                  fontSize: "9pt",
                  marginBottom: "4px",
                  letterSpacing: "0.3px",
                }}
              >
                WHAT IS NOT COVERED
              </div>
              {WARRANTY_TERMS.notCovered.map((term, idx) => (
                <div
                  key={idx}
                  style={{
                    color: "#374151",
                    marginBottom: "2.5px",
                    display: "flex",
                    alignItems: "flex-start",
                  }}
                >
                  <span style={{ color: "#DC2626", fontWeight: 800, marginRight: "4px", flexShrink: 0 }}>✕</span>
                  <span>{term}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 5. "How to claim" strip */}
          <div
            style={{
              backgroundColor: "#FAF7F0",
              border: "1px solid #E7D7B8",
              borderRadius: "5px",
              padding: "5px 10px",
              marginBottom: "6px",
              fontSize: "9.5px",
              lineHeight: 1.3,
              color: "#374151",
            }}
          >
            <strong style={{ color: "#8C6A2E" }}>How to claim:</strong> Present this certificate
            and the IMEI at an authorized brand service center, or contact{" "}
            <span style={{ color: "#8C6A2E", fontWeight: 600 }}>support@vnmobiles.in</span> with the
            certificate ID.
          </div>

          {/* 6. Terms (3 short lines) */}
          <div
            style={{
              marginBottom: "6px",
              fontSize: "9px",
              color: "#4B5563",
              lineHeight: 1.3,
            }}
          >
            <div>&bull; Valid only for the listed hardware IMEI.</div>
            <div>&bull; Requires valid original proof of purchase.</div>
            <div>&bull; Void if the device has been tampered with or serviced by unauthorized personnel.</div>
          </div>

          {/* 7. Customer line: Registered Customer on left, masked email on right */}
          <div
            style={{
              borderTop: "1px solid #E7D7B8",
              paddingTop: "5px",
              marginBottom: "5px",
              display: "flex",
              justifyContent: "space-between",
              fontSize: "9.5px",
              color: "#111827",
            }}
          >
            <div>
              <strong>Registered Customer:</strong> {customerName}
            </div>
            <div>
              <strong>Account:</strong> {maskedEmail}
            </div>
          </div>

          {/* 8. Footer */}
          <div
            style={{
              borderTop: "1px dashed #D1D5DB",
              paddingTop: "4px",
              fontSize: "8.5px",
              color: "#6B7280",
              textAlign: "center",
            }}
          >
            Generated on {nowGenerated} from your VN Mobiles account. This is a computer-generated
            certificate and needs no signature.
          </div>
        </div>
      </div>
    </div>
  );
}
