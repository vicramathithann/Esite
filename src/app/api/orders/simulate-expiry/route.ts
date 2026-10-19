import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { sendWarrantyReminder6MonthsEmail, sendWarrantyReminder1DayEmail } from "@/lib/email";
import { isOrderCancelled } from "@/lib/orderStatus";

export async function POST(request: Request) {
  try {
    const auth = await requireAdmin(request);
    if (auth instanceof Response) {
      return auth;
    }

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
      include: { order: true, warranty: true },
    });

    if (!orderItem) {
      return NextResponse.json({ success: false, error: "Order item not found" }, { status: 404 });
    }

    if (
      orderItem.warrantyStatus === "CANCELLED" ||
      isOrderCancelled(orderItem.order?.orderStatus)
    ) {
      return NextResponse.json(
        { success: false, error: "Cannot simulate warranty expiry for a cancelled order." },
        { status: 400 }
      );
    }

    const now = new Date();
    let newExpiryDate = new Date();
    let newStatus = "ACTIVE";
    let emailDispatched = false;

    if (action === "SET_NEAR_EXPIRY") {
      // 6 months left
      newExpiryDate = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000);
      newStatus = "EXPIRING_SOON";

      if (orderItem.warranty) {
        await sendWarrantyReminder6MonthsEmail({
          id: orderItem.warranty.id,
          orderId: orderItem.orderId,
          orderNumber: orderItem.order?.orderNumber,
          userId: orderItem.order?.userId,
          customerName: orderItem.order.customerName,
          customerEmail: orderItem.order.customerEmail,
          productName: orderItem.productName,
          imeiNumber: orderItem.imeiNumber,
          warrantyExpiryDate: newExpiryDate,
          warrantyDuration: orderItem.warranty.warrantyDuration,
        });
        emailDispatched = true;
      }
    } else if (action === "SET_URGENT_EXPIRY") {
      // 24 hours left (1 day before)
      newExpiryDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      newStatus = "EXPIRING_SOON";

      if (orderItem.warranty) {
        await sendWarrantyReminder1DayEmail({
          id: orderItem.warranty.id,
          orderId: orderItem.orderId,
          orderNumber: orderItem.order?.orderNumber,
          userId: orderItem.order?.userId,
          customerName: orderItem.order.customerName,
          customerEmail: orderItem.order.customerEmail,
          productName: orderItem.productName,
          imeiNumber: orderItem.imeiNumber,
          warrantyExpiryDate: newExpiryDate,
          warrantyDuration: orderItem.warranty.warrantyDuration,
        });
        emailDispatched = true;
      }
    } else if (action === "SET_EXPIRED") {
      // Expired yesterday
      newExpiryDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      newStatus = "EXPIRED";
    } else if (action === "EXTEND_WARRANTY") {
      // Extend 1 year from now
      newExpiryDate = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
      newStatus = "ACTIVE";
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

    if (orderItem.warranty) {
      await prisma.warranty.update({
        where: { id: orderItem.warranty.id },
        data: {
          warrantyExpiryDate: newExpiryDate,
          warrantyStatus: newStatus,
          ...(action === "SET_NEAR_EXPIRY" ? { reminded6MonthsAt: now } : {}),
          ...(action === "SET_URGENT_EXPIRY" ? { reminded1DayAt: now } : {}),
        },
      });
    }

    return NextResponse.json({
      success: true,
      updatedItem,
      emailDispatched,
      message: `Warranty status updated to ${newStatus}.${emailDispatched ? " Reminder email dispatched to customer." : ""}`,
    });
  } catch (error) {
    console.error("Failed to simulate expiry:", error);
    return NextResponse.json({ success: false, error: "Failed to simulate expiry" }, { status: 500 });
  }
}