import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/rateLimit";

export async function POST(request: Request) {
  try {
    const rateLimitError = enforceRateLimit(request, {
      keyPrefix: "sms_check_expiry",
      maxRequests: 5,
      windowSeconds: 60,
    });
    if (rateLimitError) return rateLimitError;

    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Find all items whose warranty expires within 7 days and is currently marked ACTIVE
    const expiringSoonItems = await prisma.orderItem.findMany({
      where: {
        warrantyExpiryDate: {
          gt: now,
          lte: in7Days,
        },
        warrantyStatus: "ACTIVE",
      },
      include: {
        order: true,
      },
    });

    let sentCount = 0;

    for (const item of expiringSoonItems) {
      // Check if we already sent a 7-day warning
      const existingWarning = await prisma.smsAlert.findFirst({
        where: {
          orderId: item.orderId,
          alertType: "EXPIRY_WARNING_7D",
        },
      });

      if (!existingWarning) {
        const daysLeft = Math.ceil(
          (new Date(item.warrantyExpiryDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );

        await prisma.smsAlert.create({
          data: {
            orderId: item.orderId,
            customerPhone: item.order.customerPhone,
            alertType: "EXPIRY_WARNING_7D",
            title: `⚠️ Warranty Expiring in ${daysLeft} Days`,
            messageBody: `[NovaMobile Expiry Alert] Dear ${item.order.customerName}, protection for ${item.productName} (IMEI: ${item.imeiNumber}) expires in ${daysLeft} days! Inspect hardware or extend warranty at novamobile.in`,
            isRead: false,
          },
        });

        await prisma.orderItem.update({
          where: { id: item.id },
          data: { warrantyStatus: "EXPIRING_SOON" },
        });

        sentCount++;
      }
    }

    // Also find any expired items that haven't been marked EXPIRED
    const expiredItems = await prisma.orderItem.findMany({
      where: {
        warrantyExpiryDate: {
          lte: now,
        },
        warrantyStatus: {
          not: "EXPIRED",
        },
      },
      include: {
        order: true,
      },
    });

    for (const item of expiredItems) {
      await prisma.orderItem.update({
        where: { id: item.id },
        data: { warrantyStatus: "EXPIRED" },
      });

      const existingNotice = await prisma.smsAlert.findFirst({
        where: {
          orderId: item.orderId,
          alertType: "EXPIRED_NOTICE",
        },
      });

      if (!existingNotice) {
        await prisma.smsAlert.create({
          data: {
            orderId: item.orderId,
            customerPhone: item.order.customerPhone,
            alertType: "EXPIRED_NOTICE",
            title: "❌ Warranty Expired",
            messageBody: `[NovaMobile] Your warranty for ${item.productName} (IMEI: ${item.imeiNumber}) has ended. Tap to renew protection.`,
            isRead: false,
          },
        });
        sentCount++;
      }
    }

    return NextResponse.json({
      success: true,
      checkedExpiring: expiringSoonItems.length,
      checkedExpired: expiredItems.length,
      smsDispatched: sentCount,
    });
  } catch (error) {
    console.error("Failed to check expiry:", error);
    return NextResponse.json({ success: false, error: "Failed to check expiry" }, { status: 500 });
  }
}