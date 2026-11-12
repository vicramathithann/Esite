import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/rateLimit";
import { logSecurityEvent, getClientIp } from "@/lib/securityLogger";
import { isOrderCancelled } from "@/lib/orderStatus";
import {
  calculateNewWarrantyExpiry,
  WarrantyDurationUnit,
  WarrantyCalculateFrom,
} from "@/lib/warrantyDateHelpers";
import { sendWarrantyUpdatedEmail } from "@/lib/email";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin(request);
    if (auth instanceof Response) {
      return auth;
    }

    const rateLimitRes = enforceRateLimit(request, {
      keyPrefix: "admin:warranties:patch",
      windowSeconds: 60,
      maxRequests: 30,
    });
    if (rateLimitRes) {
      return rateLimitRes;
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { success: false, error: "Warranty ID is required." },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { durationValue, durationUnit, calculateFrom } = body;

    // Validate duration value
    const parsedValue = Number(durationValue);
    if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
      return NextResponse.json(
        { success: false, error: "Duration value must be a positive whole number." },
        { status: 400 }
      );
    }

    // Validate duration unit
    const validUnits: WarrantyDurationUnit[] = ["DAYS", "MONTHS", "YEARS"];
    if (!validUnits.includes(durationUnit)) {
      return NextResponse.json(
        { success: false, error: "Duration unit must be DAYS, MONTHS, or YEARS." },
        { status: 400 }
      );
    }

    // Upper bounds (5 years max)
    if (
      (durationUnit === "DAYS" && parsedValue > 1825) ||
      (durationUnit === "MONTHS" && parsedValue > 60) ||
      (durationUnit === "YEARS" && parsedValue > 5)
    ) {
      return NextResponse.json(
        { success: false, error: "Duration exceeds maximum limit of 5 years." },
        { status: 400 }
      );
    }

    // Validate calculateFrom
    const validCalcFrom: WarrantyCalculateFrom[] = ["START_DATE", "TODAY"];
    if (!validCalcFrom.includes(calculateFrom)) {
      return NextResponse.json(
        { success: false, error: "calculateFrom must be START_DATE or TODAY." },
        { status: 400 }
      );
    }

    // Fetch existing warranty
    const warranty = await prisma.warranty.findUnique({
      where: { id },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            orderStatus: true,
            customerName: true,
            customerEmail: true,
          },
        },
        orderItem: true,
      },
    });

    if (!warranty) {
      return NextResponse.json(
        { success: false, error: "Warranty record not found." },
        { status: 404 }
      );
    }

    // Block editing for CANCELLED warranties or voided orders
    const isOrderCanc = warranty.order ? isOrderCancelled(warranty.order.orderStatus) : false;
    if (warranty.warrantyStatus === "CANCELLED" || isOrderCanc) {
      return NextResponse.json(
        { success: false, error: "Cancelled warranties cannot be edited." },
        { status: 400 }
      );
    }

    // Authoritatively calculate new expiration on the server in IST
    const calculation = calculateNewWarrantyExpiry({
      startDate: warranty.warrantyStartDate || warranty.purchaseDate || new Date(),
      currentExpiryDate: warranty.warrantyExpiryDate,
      durationValue: parsedValue,
      durationUnit,
      calculateFrom,
    });

    // If new expiry equals old expiry ("No change in expiry"), reject save
    if (!calculation.isExtended && !calculation.isReduced) {
      return NextResponse.json(
        { success: false, error: "The new warranty duration produces the exact same expiration date. No change to save." },
        { status: 400 }
      );
    }

    const now = new Date();
    let newStatus = "ACTIVE";
    if (calculation.newExpiryDate <= now) {
      newStatus = "EXPIRED";
    } else {
      const daysRemaining = Math.floor(
        (calculation.newExpiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysRemaining <= 185) {
        newStatus = "EXPIRING_SOON";
      } else {
        newStatus = "ACTIVE";
      }
    }

    // Reset or update reminder email timestamps
    const daysUntilExpiry =
      (calculation.newExpiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

    let reminded6MonthsAt: string | null = null;
    let reminded1DayAt: string | null = null;

    if (daysUntilExpiry <= 0) {
      reminded6MonthsAt = now.toISOString();
      reminded1DayAt = now.toISOString();
    } else if (daysUntilExpiry <= 1) {
      reminded6MonthsAt = now.toISOString();
      reminded1DayAt = null;
    } else if (daysUntilExpiry <= 185) {
      reminded6MonthsAt = now.toISOString();
      reminded1DayAt = null;
    } else {
      reminded6MonthsAt = null;
      reminded1DayAt = null;
    }

    // Build history entry without reason or customer visibility flag
    const historyEntry = {
      id: crypto.randomUUID(),
      oldDuration: warranty.warrantyDuration || "1 Year",
      newDuration: calculation.newDuration,
      oldExpiry:
        typeof warranty.warrantyExpiryDate === "string"
          ? warranty.warrantyExpiryDate
          : new Date(warranty.warrantyExpiryDate).toISOString(),
      newExpiry: calculation.newExpiryDateISO,
      calculateFrom,
      changedBy: (auth as any).email || "Admin",
      changedAt: now.toISOString(),
      emailSent: false,
    };

    const existingHistory = Array.isArray(warranty.changeHistory)
      ? warranty.changeHistory
      : [];
    const updatedHistory = [...existingHistory, historyEntry];

    // Update DB record
    const updatedWarranty = await prisma.warranty.update({
      where: { id },
      data: {
        warrantyDuration: calculation.newDuration,
        warrantyExpiryDate: calculation.newExpiryDateISO,
        warrantyStatus: newStatus,
        reminded6MonthsAt,
        reminded1DayAt,
        changeHistory: updatedHistory,
      },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            orderStatus: true,
            customerName: true,
            customerEmail: true,
          },
        },
        orderItem: true,
      },
    });

    // Write audit log
    logSecurityEvent("ADMIN_ACTION", "INFO", {
      userId: (auth as any).id,
      email: (auth as any).email,
      role: (auth as any).role,
      route: `/api/admin/warranties/${id}`,
      method: "PATCH",
      ip: getClientIp(request),
      details: {
        action: "UPDATE_WARRANTY_DURATION",
        warrantyId: id,
        productName: warranty.productName,
        imeiNumber: warranty.imeiNumber,
        oldDuration: historyEntry.oldDuration,
        newDuration: historyEntry.newDuration,
        oldExpiry: historyEntry.oldExpiry,
        newExpiry: historyEntry.newExpiry,
        calculateFrom: historyEntry.calculateFrom,
      },
    });

    // Revalidate relevant pages
    try {
      revalidatePath("/admin/warranties");
      revalidatePath("/account/warranties");
    } catch {}

    // Automatically dispatch customer email in the background after save
    sendWarrantyUpdatedEmail({
      warrantyId: id,
      orderId: warranty.orderId,
      orderNumber: warranty.order?.orderNumber,
      userId: warranty.userId,
      customerName: warranty.customerName,
      customerEmail: warranty.customerEmail,
      productName: warranty.productName,
      imeiNumber: warranty.imeiNumber,
      purchaseDate: warranty.purchaseDate,
      oldDuration: historyEntry.oldDuration,
      newDuration: historyEntry.newDuration,
      oldExpiryDate: historyEntry.oldExpiry,
      newExpiryDate: historyEntry.newExpiry,
      warrantyStartDate: warranty.warrantyStartDate || warranty.purchaseDate || now,
      isExtended: calculation.isExtended,
    })
      .then(async (result) => {
        if (result.success) {
          try {
            const fresh = await prisma.warranty.findUnique({ where: { id } });
            if (fresh && Array.isArray(fresh.changeHistory)) {
              const h = fresh.changeHistory.map((item: any) =>
                item.id === historyEntry.id ? { ...item, emailSent: true } : item
              );
              await prisma.warranty.update({
                where: { id },
                data: { changeHistory: h },
              });
            }
          } catch {}
        } else {
          console.error(`[WARRANTY UPDATE EMAIL FAILED] ID ${id}:`, result.error);
        }
      })
      .catch((emailErr) => {
        console.error(`[WARRANTY UPDATE EMAIL EXCEPTION] ID ${id}:`, emailErr);
      });

    return NextResponse.json({
      success: true,
      message: `Warranty duration successfully updated to ${calculation.newDuration}.`,
      warranty: updatedWarranty,
      calculation,
    });
  } catch (error: any) {
    console.error("Update warranty duration error:", error);
    const safeError = error?.message ? String(error.message) : "Failed to update warranty duration.";
    return NextResponse.json(
      { success: false, error: safeError },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin(request);
    if (auth instanceof Response) {
      return auth;
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { success: false, error: "Warranty ID is required." },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    if (body.action !== "resend-update") {
      return NextResponse.json(
        { success: false, error: "Unknown action." },
        { status: 400 }
      );
    }

    const warranty = await prisma.warranty.findUnique({
      where: { id },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            orderStatus: true,
            customerName: true,
            customerEmail: true,
          },
        },
        orderItem: true,
      },
    });

    if (!warranty) {
      return NextResponse.json(
        { success: false, error: "Warranty record not found." },
        { status: 404 }
      );
    }

    const history = Array.isArray(warranty.changeHistory) ? warranty.changeHistory : [];
    if (history.length === 0) {
      return NextResponse.json(
        { success: false, error: "No edit history found for this warranty." },
        { status: 400 }
      );
    }

    const targetHistory = body.historyId
      ? history.find((h: any) => h.id === body.historyId) || history[history.length - 1]
      : history[history.length - 1];

    const result = await sendWarrantyUpdatedEmail({
      warrantyId: id,
      orderId: warranty.orderId,
      orderNumber: warranty.order?.orderNumber,
      userId: warranty.userId,
      customerName: warranty.customerName,
      customerEmail: warranty.customerEmail,
      productName: warranty.productName,
      imeiNumber: warranty.imeiNumber,
      purchaseDate: warranty.purchaseDate,
      oldDuration: targetHistory.oldDuration,
      newDuration: targetHistory.newDuration,
      oldExpiryDate: targetHistory.oldExpiry,
      newExpiryDate: targetHistory.newExpiry,
      warrantyStartDate: warranty.warrantyStartDate || warranty.purchaseDate || new Date(),
      isExtended: new Date(targetHistory.newExpiry) > new Date(targetHistory.oldExpiry),
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || "Failed to dispatch warranty update email." },
        { status: 500 }
      );
    }

    // Mark emailSent in history
    try {
      const h = history.map((item: any) =>
        item.id === targetHistory.id ? { ...item, emailSent: true } : item
      );
      await prisma.warranty.update({
        where: { id },
        data: { changeHistory: h },
      });
    } catch {}

    return NextResponse.json({
      success: true,
      message: `Warranty update notification re-emailed to ${warranty.customerEmail}.`,
    });
  } catch (error: any) {
    console.error("Resend update email error:", error);
    const safeError = error?.message ? String(error.message) : "Failed to resend warranty update email.";
    return NextResponse.json(
      { success: false, error: safeError },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin(request);
    if (auth instanceof Response) {
      return auth;
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ success: false, error: "Warranty ID is required." }, { status: 400 });
    }

    const warranty = await prisma.warranty.findUnique({
      where: { id },
      select: {
        id: true,
        productName: true,
        imeiNumber: true,
        customerName: true,
      },
    });

    if (!warranty) {
      return NextResponse.json({ success: false, error: "Warranty record not found." }, { status: 404 });
    }

    await prisma.warranty.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: `Warranty for ${warranty.productName} (IMEI: ${warranty.imeiNumber}) deleted successfully.`,
    });
  } catch (error: any) {
    console.error("Delete warranty error:", error);
    const safeError = error?.message ? String(error.message) : "Failed to delete warranty record.";
    return NextResponse.json(
      { success: false, error: safeError },
      { status: 500 }
    );
  }
}
