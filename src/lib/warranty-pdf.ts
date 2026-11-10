import { PDFDocument, rgb, StandardFonts, PDFFont, PDFPage } from "pdf-lib";
import { WARRANTY_TERMS } from "./warranty-terms";

export interface WarrantyPdfDeviceItem {
  productId?: string;
  productName: string;
  productBrand?: string;
  variantInfo?: string;
  warrantyNumber: string;
  imeiNumber: string;
  coveragePeriod?: string;
  warrantyStartDate?: Date | string;
  warrantyExpiryDate?: Date | string;
  purchaseDate?: Date | string;
  orderNumber?: string;
  status?: string;
}

export interface WarrantyPdfOptions {
  customerName: string;
  customerEmail: string;
  orderNumber?: string;
  devices: WarrantyPdfDeviceItem[];
}

export function maskEmail(email: string): string {
  if (!email || !email.includes("@")) return email || "";
  const parts = email.split("@");
  const local = parts[0];
  const domain = parts.slice(1).join("@");
  const prefix = local.length <= 2 ? local.charAt(0) : local.slice(0, 2);
  return `${prefix}*****@${domain}`;
}

import { sanitizePdfText } from "./pdfSanitizer";
export { sanitizePdfText };

export function formatKolkataDate(dateInput: string | Date | number | undefined | null): string {
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

export function formatKolkataDateTime(dateInput: string | Date | number | undefined | null): string {
  if (!dateInput) return "N/A";
  try {
    const d =
      typeof dateInput === "string" || typeof dateInput === "number"
        ? new Date(dateInput)
        : dateInput;
    if (isNaN(d.getTime())) return String(dateInput);
    return (
      d.toLocaleDateString("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "numeric",
        month: "short",
        year: "numeric",
      }) +
      ", " +
      d.toLocaleTimeString("en-IN", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    );
  } catch {
    return String(dateInput);
  }
}

export function calculateDaysRemaining(
  expiryDateInput: string | Date | undefined | null,
  isCancelled = false
): string {
  if (isCancelled) return "N/A - Cancelled";
  if (!expiryDateInput) return "365 Days Remaining";
  try {
    const expiry =
      typeof expiryDateInput === "string"
        ? new Date(expiryDateInput)
        : expiryDateInput;
    if (isNaN(expiry.getTime())) return "365 Days Remaining";
    const now = new Date();
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return "Coverage Expired";
    return `${diffDays} ${diffDays === 1 ? "Day" : "Days"} Remaining`;
  } catch {
    return "365 Days Remaining";
  }
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function wrapText(text: string, maxWidth: number, font: PDFFont, fontSize: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = font.widthOfTextAtSize(testLine, fontSize);
    if (testWidth <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

/**
 * Draws crisp vector checkmark: ✓
 */
function drawVectorCheckmark(page: PDFPage, x: number, y: number, color = rgb(0.086, 0.639, 0.290)) {
  page.drawLine({
    start: { x, y: y + 2 },
    end: { x: x + 2.5, y: y - 1 },
    thickness: 1.2,
    color,
  });
  page.drawLine({
    start: { x: x + 2.5, y: y - 1 },
    end: { x: x + 6.5, y: y + 5 },
    thickness: 1.2,
    color,
  });
}

/**
 * Draws crisp vector crossmark: ✕
 */
function drawVectorCrossmark(page: PDFPage, x: number, y: number, color = rgb(0.863, 0.149, 0.149)) {
  page.drawLine({
    start: { x, y: y + 4 },
    end: { x: x + 5, y: y - 1 },
    thickness: 1.2,
    color,
  });
  page.drawLine({
    start: { x, y: y - 1 },
    end: { x: x + 5, y: y + 4 },
    thickness: 1.2,
    color,
  });
}

/**
 * Generates an official VN Mobiles Warranty Certificate PDF.
 * Uses pure JavaScript (pdf-lib), A4 portrait (595.28 x 841.89 pt),
 * exactly 1 page per device, matching the screen Print certificate design.
 */
export async function generateWarrantyCertificatePdf(
  options: WarrantyPdfOptions
): Promise<{ pdfBuffer: Buffer; filename: string }> {
  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const devices = options.devices && options.devices.length > 0 ? options.devices : [];
  const primaryDevice = devices[0];
  const primarySlug = primaryDevice ? slugify(primaryDevice.productName) : "official-device";
  const primaryCert = primaryDevice?.warrantyNumber || `WRT-${options.orderNumber || "REG"}-1`;
  const filename = `Warranty-Certificate-${primarySlug}-${primaryCert}.pdf`;

  const PAGE_WIDTH = 595.28;
  const PAGE_HEIGHT = 841.89;
  const MARGIN = 24;
  const contentW = PAGE_WIDTH - 2 * MARGIN;
  const nowGenerated = formatKolkataDateTime(new Date());

  for (const device of devices) {
    const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    const isCancelled = device.status === "CANCELLED";
    const isExpired = device.status === "EXPIRED";

    // 1. Outer Gold Border
    page.drawRectangle({
      x: MARGIN,
      y: MARGIN,
      width: contentW,
      height: PAGE_HEIGHT - 2 * MARGIN,
      borderColor: rgb(0.788, 0.651, 0.420), // #C9A66B
      borderWidth: 1,
    });

    // 2. Dark Navy Header Bar (#111827)
    const headerHeight = 46;
    const headerY = PAGE_HEIGHT - MARGIN - headerHeight;
    page.drawRectangle({
      x: MARGIN,
      y: headerY,
      width: contentW,
      height: headerHeight,
      color: rgb(0.067, 0.094, 0.153), // #111827
    });

    // Gold bottom line
    page.drawLine({
      start: { x: MARGIN, y: headerY },
      end: { x: MARGIN + contentW, y: headerY },
      thickness: 2,
      color: rgb(0.788, 0.651, 0.420), // #C9A66B
    });

    // Circular VN Gold Logo (exact brand emblem)
    const logoRadius = 14;
    const logoCenterX = MARGIN + 22;
    const logoCenterY = headerY + 23;
    page.drawCircle({
      x: logoCenterX,
      y: logoCenterY,
      size: logoRadius,
      color: rgb(0.788, 0.651, 0.420), // #C9A66B
    });
    page.drawText("VN", {
      x: logoCenterX - 7.5,
      y: logoCenterY - 3.8,
      size: 10,
      font: fontBold,
      color: rgb(1, 1, 1),
    });

    // Header Titles
    page.drawText("VN Mobiles", {
      x: MARGIN + 44,
      y: headerY + 26,
      size: 14,
      font: fontBold,
      color: rgb(1, 1, 1),
    });
    page.drawText("Official Warranty Certificate", {
      x: MARGIN + 44,
      y: headerY + 12,
      size: 9.5,
      font: fontRegular,
      color: rgb(0.898, 0.906, 0.922), // #E5E7EB
    });

    // Status Badge
    const badgeText = isCancelled ? "CANCELLED" : isExpired ? "EXPIRED" : "ACTIVE";
    const badgeBg = isCancelled
      ? rgb(0.996, 0.886, 0.886) // #FEE2E2
      : isExpired
      ? rgb(0.953, 0.957, 0.965) // #F3F4F6
      : rgb(0.863, 0.988, 0.906); // #DCFCE7
    const badgeBorder = isCancelled
      ? rgb(0.863, 0.149, 0.149) // #DC2626
      : isExpired
      ? rgb(0.612, 0.639, 0.686) // #9CA3AF
      : rgb(0.086, 0.639, 0.290); // #16A34A
    const badgeColor = isCancelled
      ? rgb(0.600, 0.106, 0.106) // #991B1B
      : isExpired
      ? rgb(0.294, 0.333, 0.388) // #4B5563
      : rgb(0.086, 0.396, 0.204); // #166534

    const badgeW = 68;
    const badgeH = 20;
    const badgeX = MARGIN + contentW - 14 - badgeW;
    const badgeY = headerY + 13;

    page.drawRectangle({
      x: badgeX,
      y: badgeY,
      width: badgeW,
      height: badgeH,
      color: badgeBg,
      borderColor: badgeBorder,
      borderWidth: 1,
    });
    if (!isCancelled && !isExpired) {
      drawVectorCheckmark(page, badgeX + 6, badgeY + 6, badgeColor);
    }
    page.drawText(badgeText, {
      x: badgeX + (isCancelled || isExpired ? 10 : 16),
      y: badgeY + 6,
      size: 8.5,
      font: fontBold,
      color: badgeColor,
    });

    // 3. Inner Container Content
    const innerX = MARGIN + 12;
    const innerW = contentW - 24;
    let currentY = headerY - 12;

    // Cancelled Banner if order cancelled
    if (isCancelled) {
      const bannerH = 22;
      currentY -= bannerH;
      page.drawRectangle({
        x: innerX,
        y: currentY,
        width: innerW,
        height: bannerH,
        color: rgb(0.996, 0.949, 0.949),
        borderColor: rgb(0.863, 0.149, 0.149),
        borderWidth: 1,
      });
      page.drawText("COVERAGE CANCELLED - ORDER CANCELLED", {
        x: innerX + innerW / 2 - 110,
        y: currentY + 7,
        size: 9,
        font: fontBold,
        color: rgb(0.600, 0.106, 0.106),
      });
      currentY -= 8;
    }

    // 4. Covered Device Box
    const deviceBoxH = 34;
    currentY -= deviceBoxH;
    page.drawRectangle({
      x: innerX,
      y: currentY,
      width: innerW,
      height: deviceBoxH,
      color: rgb(0.980, 0.965, 0.925), // #FAF6EC
      borderColor: rgb(0.788, 0.651, 0.420), // #C9A66B
      borderWidth: 1,
    });

    page.drawText("COVERED DEVICE", {
      x: innerX + 10,
      y: currentY + 22,
      size: 7.5,
      font: fontBold,
      color: rgb(0.788, 0.651, 0.420),
    });
    page.drawText(sanitizePdfText(device.productName || "Samsung Galaxy S24"), {
      x: innerX + 10,
      y: currentY + 7,
      size: 12,
      font: fontBold,
      color: rgb(0.067, 0.094, 0.153),
    });

    const brandText = `Brand: ${sanitizePdfText(device.productBrand || "VN Mobiles")}`;
    const brandWidth = fontBold.widthOfTextAtSize(brandText, 8.5);
    page.drawText(brandText, {
      x: innerX + innerW - 10 - brandWidth,
      y: currentY + 20,
      size: 8.5,
      font: fontBold,
      color: rgb(0.067, 0.094, 0.153),
    });

    if (device.variantInfo) {
      const variantText = `Variant: ${sanitizePdfText(device.variantInfo)}`;
      const variantWidth = fontRegular.widthOfTextAtSize(variantText, 8);
      page.drawText(variantText, {
        x: innerX + innerW - 10 - variantWidth,
        y: currentY + 7,
        size: 8,
        font: fontRegular,
        color: rgb(0.294, 0.333, 0.388),
      });
    }

    currentY -= 8;

    // 5. Details Table: Up to 9 Rows
    const tableRows = [
      {
        label: "Certificate ID",
        value: device.warrantyNumber,
        isMono: true,
      },
      {
        label: "Device IMEI",
        value: device.imeiNumber,
        isMono: true,
      },
      ...(device.productId
        ? [
            {
              label: "Product ID",
              value: device.productId,
              isMono: true,
            },
          ]
        : []),
      {
        label: "Coverage Period",
        value: device.coveragePeriod || "1 Year Brand Warranty",
      },
      {
        label: "Valid From",
        value: formatKolkataDate(device.warrantyStartDate || new Date()),
      },
      {
        label: "Valid Until",
        value: isCancelled
          ? "N/A - Cancelled"
          : formatKolkataDate(device.warrantyExpiryDate),
        isBold: !isCancelled,
      },
      {
        label: "Days Remaining",
        value: calculateDaysRemaining(device.warrantyExpiryDate, isCancelled),
      },
      {
        label: "Order Reference",
        value: `#${device.orderNumber || options.orderNumber || "N/A"}`,
        isMono: true,
      },
      {
        label: "Purchase Date",
        value: formatKolkataDate(device.purchaseDate || device.warrantyStartDate || new Date()),
      },
    ];

    const rowH = tableRows.length > 8 ? 13 : 14;
    const col1W = 160;
    const col2W = innerW - col1W;
    const tableH = rowH * tableRows.length;
    currentY -= tableH;
    const tableTop = currentY + tableH;

    for (let r = 0; r < tableRows.length; r++) {
      const row = tableRows[r];
      const rY = tableTop - (r + 1) * rowH;

      // Col 1 fill
      page.drawRectangle({
        x: innerX,
        y: rY,
        width: col1W,
        height: rowH,
        color: rgb(0.980, 0.965, 0.925), // #FAF6EC
      });
      // Col 2 fill
      page.drawRectangle({
        x: innerX + col1W,
        y: rY,
        width: col2W,
        height: rowH,
        color: rgb(1, 1, 1),
      });

      // Horizontal line
      page.drawLine({
        start: { x: innerX, y: rY },
        end: { x: innerX + innerW, y: rY },
        thickness: 0.75,
        color: rgb(0.906, 0.843, 0.722), // #E7D7B8
      });

      // Label text
      page.drawText(row.label, {
        x: innerX + 8,
        y: rY + 4,
        size: 8,
        font: fontBold,
        color: rgb(0.361, 0.271, 0.114), // #5C451D
      });

      // Value text
      page.drawText(sanitizePdfText(row.value), {
        x: innerX + col1W + 8,
        y: rY + 4,
        size: 8,
        font: row.isBold || row.isMono ? fontBold : fontRegular,
        color: rgb(0.067, 0.094, 0.153),
      });
    }

    // Vertical column divider
    page.drawLine({
      start: { x: innerX + col1W, y: currentY },
      end: { x: innerX + col1W, y: tableTop },
      thickness: 0.75,
      color: rgb(0.906, 0.843, 0.722),
    });

    // Outer table border
    page.drawRectangle({
      x: innerX,
      y: currentY,
      width: innerW,
      height: tableH,
      borderColor: rgb(0.788, 0.651, 0.420),
      borderWidth: 1,
    });

    currentY -= 8;

    // 6. Two Boxes Side by Side: WHAT IS COVERED & WHAT IS NOT COVERED
    const boxGap = 8;
    const halfW = (innerW - boxGap) / 2;
    const boxesHeight = 205;
    currentY -= boxesHeight;
    const boxesTop = currentY + boxesHeight;

    // --- Box 1 (Left): WHAT IS COVERED ---
    page.drawRectangle({
      x: innerX,
      y: currentY,
      width: halfW,
      height: boxesHeight,
      color: rgb(0.980, 0.965, 0.925), // #FAF6EC
      borderColor: rgb(0.788, 0.651, 0.420), // #C9A66B
      borderWidth: 1,
    });

    page.drawText("WHAT IS COVERED", {
      x: innerX + 8,
      y: boxesTop - 13,
      size: 8.5,
      font: fontBold,
      color: rgb(0.549, 0.416, 0.180), // #8C6A2E
    });

    let coveredItemY = boxesTop - 25;
    const coveredTextW = halfW - 22;

    for (const term of WARRANTY_TERMS.covered) {
      drawVectorCheckmark(page, innerX + 8, coveredItemY + 1, rgb(0.086, 0.639, 0.290));
      const lines = wrapText(term, coveredTextW, fontRegular, 6.8);
      for (const line of lines) {
        page.drawText(line, {
          x: innerX + 18,
          y: coveredItemY,
          size: 6.8,
          font: fontRegular,
          color: rgb(0.216, 0.255, 0.318), // #374151
        });
        coveredItemY -= 8.5;
      }
      coveredItemY -= 2;
    }

    // --- Box 2 (Right): WHAT IS NOT COVERED ---
    const rightBoxX = innerX + halfW + boxGap;
    page.drawRectangle({
      x: rightBoxX,
      y: currentY,
      width: halfW,
      height: boxesHeight,
      color: rgb(0.996, 0.949, 0.949), // #FEF2F2
      borderColor: rgb(0.988, 0.647, 0.647), // #FCA5A5
      borderWidth: 1,
    });

    page.drawText("WHAT IS NOT COVERED", {
      x: rightBoxX + 8,
      y: boxesTop - 13,
      size: 8.5,
      font: fontBold,
      color: rgb(0.600, 0.106, 0.106), // #991B1B
    });

    let notCoveredItemY = boxesTop - 24;
    const notCoveredTextW = halfW - 22;

    for (const term of WARRANTY_TERMS.notCovered) {
      drawVectorCrossmark(page, rightBoxX + 8, notCoveredItemY + 1, rgb(0.863, 0.149, 0.149));
      const lines = wrapText(term, notCoveredTextW, fontRegular, 6.4);
      for (const line of lines) {
        page.drawText(line, {
          x: rightBoxX + 18,
          y: notCoveredItemY,
          size: 6.4,
          font: fontRegular,
          color: rgb(0.216, 0.255, 0.318), // #374151
        });
        notCoveredItemY -= 7.8;
      }
      notCoveredItemY -= 1.8;
    }

    currentY -= 8;

    // 7. How to claim strip
    const claimH = 20;
    currentY -= claimH;
    page.drawRectangle({
      x: innerX,
      y: currentY,
      width: innerW,
      height: claimH,
      color: rgb(0.980, 0.969, 0.941), // #FAF7F0
      borderColor: rgb(0.906, 0.843, 0.722), // #E7D7B8
      borderWidth: 1,
    });

    page.drawText("How to claim:", {
      x: innerX + 8,
      y: currentY + 6.5,
      size: 7.5,
      font: fontBold,
      color: rgb(0.549, 0.416, 0.180),
    });
    page.drawText(
      "Present this certificate and IMEI at an authorized brand service center, or email support@vnmobiles.in.",
      {
        x: innerX + 64,
        y: currentY + 6.5,
        size: 7.5,
        font: fontRegular,
        color: rgb(0.216, 0.255, 0.318),
      }
    );

    currentY -= 6;

    // 8. Terms (3 bullet lines)
    const terms = [
      "• Valid only for the listed hardware IMEI.",
      "• Requires valid original proof of purchase.",
      "• Void if the device has been tampered with or serviced by unauthorized personnel.",
    ];
    for (const term of terms) {
      currentY -= 9.5;
      page.drawText(term, {
        x: innerX,
        y: currentY,
        size: 7.2,
        font: fontRegular,
        color: rgb(0.294, 0.333, 0.388),
      });
    }

    currentY -= 6;

    // 9. Customer Line
    page.drawLine({
      start: { x: innerX, y: currentY },
      end: { x: innerX + innerW, y: currentY },
      thickness: 0.75,
      color: rgb(0.906, 0.843, 0.722),
    });

    currentY -= 12;
    page.drawText("Registered Customer: ", {
      x: innerX,
      y: currentY,
      size: 8,
      font: fontBold,
      color: rgb(0.067, 0.094, 0.153),
    });
    page.drawText(sanitizePdfText(options.customerName || "Valued Customer"), {
      x: innerX + 88,
      y: currentY,
      size: 8,
      font: fontRegular,
      color: rgb(0.067, 0.094, 0.153),
    });

    const accountText = `Account: ${sanitizePdfText(maskEmail(options.customerEmail))}`;
    const accountWidth = fontRegular.widthOfTextAtSize(accountText, 8);
    page.drawText(accountText, {
      x: innerX + innerW - accountWidth,
      y: currentY,
      size: 8,
      font: fontRegular,
      color: rgb(0.067, 0.094, 0.153),
    });

    currentY -= 6;

    // 10. Footer Computer-Generated Note
    page.drawLine({
      start: { x: innerX, y: currentY },
      end: { x: innerX + innerW, y: currentY },
      thickness: 0.5,
      color: rgb(0.820, 0.835, 0.860),
    });

    currentY -= 10;
    const footerNote = `Generated on ${nowGenerated} from your VN Mobiles account. This is a computer-generated certificate and needs no signature.`;
    const footerW = fontRegular.widthOfTextAtSize(footerNote, 6.8);
    page.drawText(footerNote, {
      x: Math.max(innerX, MARGIN + (contentW - footerW) / 2),
      y: currentY,
      size: 6.8,
      font: fontRegular,
      color: rgb(0.420, 0.447, 0.502), // #6B7280
    });
  }

  const pdfBytes = await pdfDoc.save();
  return {
    pdfBuffer: Buffer.from(pdfBytes),
    filename,
  };
}
