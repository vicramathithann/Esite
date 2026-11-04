import React from "react";
import { EnrichedWarranty } from "./WarrantiesClient";

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

  return (
    <div className="print-only-certificate">
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @page {
              size: A4 portrait;
              margin: 14mm;
            }
            @media screen {
              .print-only-certificate {
                display: none !important;
              }
            }
            @media print {
              html, body {
                background: #ffffff !important;
                color: #000000 !important;
                margin: 0 !important;
                padding: 0 !important;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
                font-size: 11px !important;
                line-height: 1.35 !important;
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
                width: 100% !important;
                max-width: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
                background: #ffffff !important;
                color: #000000 !important;
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

      <div
        style={{
          border: "2px solid #000000",
          borderRadius: "6px",
          padding: "16px 20px",
          backgroundColor: "#ffffff",
          color: "#000000",
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          fontSize: "11px",
          lineHeight: 1.35,
        }}
      >
        {/* 1. Header: VN Mobiles logo, Official Warranty Certificate, status badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "2px solid #000000",
            paddingBottom: "10px",
            marginBottom: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "34px",
                height: "34px",
                borderRadius: "50%",
                backgroundColor: "#000000",
                color: "#ffffff",
                fontWeight: 800,
                fontSize: "13px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                letterSpacing: "-0.5px",
              }}
            >
              VN
            </div>
            <div>
              <div
                style={{
                  fontSize: "16px",
                  fontWeight: 800,
                  letterSpacing: "-0.2px",
                  lineHeight: 1.1,
                }}
              >
                VN Mobiles
              </div>
              <div style={{ fontSize: "12px", fontWeight: 700, color: "#333333" }}>
                Official Warranty Certificate
              </div>
            </div>
          </div>

          <div style={{ textAlign: "right" }}>
            <span
              style={{
                display: "inline-block",
                border: "2px solid #000000",
                padding: "3px 10px",
                borderRadius: "4px",
                fontWeight: 800,
                fontSize: "11px",
                letterSpacing: "0.5px",
                textTransform: "uppercase",
                backgroundColor: isCancelled ? "#f0f0f0" : "#ffffff",
              }}
            >
              {statusBadgeText}
            </span>
          </div>
        </div>

        {/* Cancelled Banner if applicable */}
        {isCancelled && (
          <div
            style={{
              border: "1.5px solid #000000",
              backgroundColor: "#f5f5f5",
              padding: "8px 12px",
              marginBottom: "12px",
              borderRadius: "4px",
              textAlign: "center",
              fontWeight: 800,
              fontSize: "12px",
              letterSpacing: "0.5px",
            }}
          >
            COVERAGE CANCELLED - ORDER CANCELLED
          </div>
        )}

        {/* 2. Device: real product name, brand, variant */}
        <div
          style={{
            backgroundColor: "#fafafa",
            border: "1px solid #000000",
            borderRadius: "4px",
            padding: "8px 12px",
            marginBottom: "12px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ fontSize: "10px", textTransform: "uppercase", fontWeight: 700, color: "#555555" }}>
              Covered Device
            </div>
            <div style={{ fontSize: "14px", fontWeight: 800 }}>
              {warranty.productName}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "11px", fontWeight: 600 }}>
              Brand: {warranty.productBrand || "VN Mobiles"}
            </div>
            {warranty.variantInfo && (
              <div style={{ fontSize: "10px", color: "#444444" }}>
                Variant: {warranty.variantInfo}
              </div>
            )}
          </div>
        </div>

        {/* 3. Details table: exactly the 8 specified rows */}
        <div style={{ marginBottom: "12px" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              border: "1px solid #000000",
              fontSize: "10.5px",
            }}
          >
            <tbody>
              <tr style={{ borderBottom: "1px solid #000000" }}>
                <td style={{ padding: "4px 8px", width: "35%", fontWeight: 700, backgroundColor: "#f5f5f5" }}>
                  Certificate ID
                </td>
                <td style={{ padding: "4px 8px", width: "65%", fontFamily: "monospace", fontWeight: 700 }}>
                  {warranty.warrantyNumber}
                </td>
              </tr>
              <tr style={{ borderBottom: "1px solid #000000" }}>
                <td style={{ padding: "4px 8px", fontWeight: 700, backgroundColor: "#f5f5f5" }}>
                  Device IMEI
                </td>
                <td style={{ padding: "4px 8px", fontFamily: "monospace", fontWeight: 700 }}>
                  {warranty.imeiNumber}
                </td>
              </tr>
              <tr style={{ borderBottom: "1px solid #000000" }}>
                <td style={{ padding: "4px 8px", fontWeight: 700, backgroundColor: "#f5f5f5" }}>
                  Coverage Period
                </td>
                <td style={{ padding: "4px 8px" }}>
                  1 Year Brand Warranty
                </td>
              </tr>
              <tr style={{ borderBottom: "1px solid #000000" }}>
                <td style={{ padding: "4px 8px", fontWeight: 700, backgroundColor: "#f5f5f5" }}>
                  Valid From
                </td>
                <td style={{ padding: "4px 8px" }}>
                  {validFromFormatted}
                </td>
              </tr>
              <tr style={{ borderBottom: "1px solid #000000" }}>
                <td style={{ padding: "4px 8px", fontWeight: 700, backgroundColor: "#f5f5f5" }}>
                  Valid Until
                </td>
                <td style={{ padding: "4px 8px", fontWeight: isCancelled ? 400 : 700 }}>
                  {validUntilFormatted}
                </td>
              </tr>
              <tr style={{ borderBottom: "1px solid #000000" }}>
                <td style={{ padding: "4px 8px", fontWeight: 700, backgroundColor: "#f5f5f5" }}>
                  Days Remaining
                </td>
                <td style={{ padding: "4px 8px" }}>
                  {daysRemainingText}
                </td>
              </tr>
              <tr style={{ borderBottom: "1px solid #000000" }}>
                <td style={{ padding: "4px 8px", fontWeight: 700, backgroundColor: "#f5f5f5" }}>
                  Order Reference
                </td>
                <td style={{ padding: "4px 8px", fontFamily: "monospace" }}>
                  #{warranty.orderNumber}
                </td>
              </tr>
              <tr>
                <td style={{ padding: "4px 8px", fontWeight: 700, backgroundColor: "#f5f5f5" }}>
                  Purchase Date
                </td>
                <td style={{ padding: "4px 8px" }}>
                  {purchaseDateFormatted}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 4. WHAT IS COVERED and WHAT IS NOT COVERED: exact wording */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "10px",
            marginBottom: "10px",
          }}
        >
          <div
            style={{
              border: "1px solid #000000",
              borderRadius: "4px",
              padding: "7px 10px",
              fontSize: "9.5px",
              lineHeight: 1.3,
            }}
          >
            <div style={{ fontWeight: 800, textTransform: "uppercase", marginBottom: "4px", fontSize: "10px" }}>
              WHAT IS COVERED
            </div>
            <div>&bull; Internal hardware and motherboard defects</div>
            <div>&bull; Touchscreen, display panel, and camera sensor failures</div>
            <div>&bull; Battery degradation falling below 80% capacity within 12 months</div>
            <div>&bull; Authorized pan-India brand service center repairs and genuine parts</div>
          </div>

          <div
            style={{
              border: "1px solid #000000",
              borderRadius: "4px",
              padding: "7px 10px",
              fontSize: "9.5px",
              lineHeight: 1.3,
            }}
          >
            <div style={{ fontWeight: 800, textTransform: "uppercase", marginBottom: "4px", fontSize: "10px" }}>
              WHAT IS NOT COVERED
            </div>
            <div>&bull; Liquid immersion or water exposure beyond IP rating</div>
            <div>&bull; Physical damage caused by drops, crushing, or accidents</div>
            <div>&bull; Unauthorized third-party repairs or software modifications</div>
          </div>
        </div>

        {/* 5. How to claim */}
        <div
          style={{
            border: "1px solid #000000",
            backgroundColor: "#f9f9f9",
            borderRadius: "4px",
            padding: "6px 10px",
            marginBottom: "10px",
            fontSize: "10px",
            lineHeight: 1.3,
          }}
        >
          <strong>How to claim:</strong> Present this certificate and the IMEI at an authorized brand service center, or contact support@vnmobiles.in with the certificate ID.
        </div>

        {/* 6. Terms (3 short lines) */}
        <div
          style={{
            marginBottom: "10px",
            fontSize: "9.5px",
            color: "#333333",
            lineHeight: 1.35,
          }}
        >
          <div>&bull; Valid only for the listed hardware IMEI.</div>
          <div>&bull; Requires valid original proof of purchase.</div>
          <div>&bull; Void if the device has been tampered with or serviced by unauthorized personnel.</div>
        </div>

        {/* 7. Customer info: name, masked email */}
        <div
          style={{
            borderTop: "1px solid #000000",
            paddingTop: "6px",
            marginBottom: "8px",
            display: "flex",
            justifyContent: "space-between",
            fontSize: "10px",
          }}
        >
          <div>
            <strong>Registered Customer:</strong> {customerName}
          </div>
          <div>
            <strong>Account:</strong> {maskedEmail}
          </div>
        </div>

        {/* 8. Footer note */}
        <div
          style={{
            borderTop: "1px dashed #888888",
            paddingTop: "5px",
            fontSize: "9px",
            color: "#555555",
            textAlign: "center",
          }}
        >
          Generated on {nowGenerated} from your VN Mobiles account. This is a computer-generated certificate and needs no signature.
        </div>
      </div>
    </div>
  );
}

