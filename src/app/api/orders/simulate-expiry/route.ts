import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { orderItemId, action } = body;

    if (!orderItemId || !action) {
      return NextResponse.json(
        { success: false, error: "Missing orderItemId or action" },
        { status: 400 }
      );
    }

    const orderItem = await prisma.orderItem.findUnique({
      where: { id: orderItemId },
      include: { order: true },
    });

    if (!orderItem) {
      return NextResponse.json({ success: false, error: "Order item not found" }, { status: 404 });
    }

    const now = new Date();
    let newExpiryDate = new Date();
    let newStatus = "ACTIVE";
    let alertType = "CUSTOM_ALERT";
    let title = "";
    let messageBody = "";

    if (action === "SET_NEAR_EXPIRY") {
      // 5 days left
      newExpiryDate = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
      newStatus = "EXPIRING_SOON";
      alertType = "EXPIRY_WARNING_7D";
      title = "⚠️ Warranty Expiring Soon (5 Days Remaining)";
      messageBody = `[VN Mobiles ALERT] Dear ${orderItem.order.customerName}, warranty for ${orderItem.productName} (IMEI: ${orderItem.imeiNumber}) expires in 5 DAYS on ${newExpiryDate.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}! Book free inspection or extend coverage at vnmobiles.in`;
    } else if (action === "SET_URGENT_EXPIRY") {
      // 24 hours left
      newExpiryDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      newStatus = "EXPIRING_SOON";
      alertType = "EXPIRY_ALERT_24H";
      title = "🚨 FINAL EXPIRY WARNING: 24 Hours Remaining";
      messageBody = `[VN Mobiles URGENT] Final 24 hours! Your device shield for ${orderItem.productName} (IMEI: ${orderItem.imeiNumber}) expires TOMORROW! Last chance to claim coverage or extend protection.`;
    } else if (action === "SET_EXPIRED") {
      // Expired yesterday
      newExpiryDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      newStatus = "EXPIRED";
      alertType = "EXPIRED_NOTICE";
      title = "❌ Device Protection Expired";
      messageBody = `[VN Mobiles Notice] Your device protection for ${orderItem.productName} (IMEI: ${orderItem.imeiNumber}) has EXPIRED. Hardware repair protection is now void. Renew coverage at vnmobiles.in`;
    } else if (action === "EXTEND_WARRANTY") {
      // Extend 1 year from now
      newExpiryDate = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
      newStatus = "ACTIVE";
      alertType = "CUSTOM_ALERT";
      title = "🛡️ Warranty Extended (+12 Months)";
      messageBody = `[VN Mobiles] Great news! Device shield for your ${orderItem.productName} (IMEI: ${orderItem.imeiNumber}) has been extended for 12 additional months until ${newExpiryDate.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}.`;
    } else {
      return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
    }

    const updatedItem = await prisma.orderItem.update({
      where: { id: orderItemId },
      data: {
        warrantyExpiryDate: newExpiryDate,
        warrantyStatus: newStatus,
      },
    });

    const smsAlert = await prisma.smsAlert.create({
      data: {
        orderId: orderItem.orderId,
        customerPhone: orderItem.order.customerPhone,
        alertType,
        title,
        messageBody,
        isRead: false,
      },
    });

    return NextResponse.json({
      success: true,
      updatedItem,
      smsAlert,
      message: `Expiry status updated & SMS notification dispatched to ${orderItem.order.customerPhone}`,
    });
  } catch (error) {
    console.error("Failed to simulate expiry:", error);
    return NextResponse.json({ success: false, error: "Failed to simulate expiry" }, { status: 500 });
  }
}