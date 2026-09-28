import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: true,
        smsAlerts: {
          orderBy: { sentAt: "desc" },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, order });
  } catch (error) {
    console.error("Failed to fetch order:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch order" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existingOrder = await prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!existingOrder) {
      return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};

    // Lifecycle status updates
    if (body.orderStatus) updateData.orderStatus = body.orderStatus;
    if (body.shippingCarrier !== undefined) updateData.shippingCarrier = body.shippingCarrier;
    if (body.trackingNumber !== undefined) updateData.trackingNumber = body.trackingNumber;
    if (body.estimatedDelivery !== undefined) {
      updateData.estimatedDelivery = body.estimatedDelivery ? new Date(body.estimatedDelivery) : null;
    }
    if (body.adminNotes !== undefined) updateData.adminNotes = body.adminNotes;
    if (body.paymentStatus) updateData.paymentStatus = body.paymentStatus;

    if (body.orderStatus === "SHIPPED" && !existingOrder.shippedAt) {
      updateData.shippedAt = new Date();
    }
    if (body.orderStatus === "DELIVERED" && !existingOrder.deliveredAt) {
      updateData.deliveredAt = new Date();
    }

    // Alter customer / delivery details
    if (body.customerName) updateData.customerName = body.customerName.trim();
    if (body.customerPhone) updateData.customerPhone = body.customerPhone.trim();
    if (body.customerEmail) updateData.customerEmail = body.customerEmail.trim();
    if (body.address) updateData.address = body.address.trim();
    if (body.city) updateData.city = body.city.trim();
    if (body.pincode) updateData.pincode = body.pincode.trim();
    if (body.state) updateData.state = body.state.trim();
    if (body.totalAmount !== undefined) updateData.totalAmount = parseInt(String(body.totalAmount), 10);

    // Detect all specific alterations made by Admin/Support or User
    const changes: string[] = [];

    const isCancelling = body.orderStatus === "CANCELLED" || body.action === "CANCEL_ORDER";

    if (isCancelling) {
      updateData.orderStatus = "CANCELLED";
      updateData.paymentStatus = "REFUNDED";

      const cancelReason = body.cancelReason || "Cancelled by customer request";
      changes.push(`Order CANCELLED (Reason: ${cancelReason}). Full refund initiated and stock restored to inventory.`);

      // Restock inventory for cancelled order
      if (existingOrder.orderStatus !== "CANCELLED") {
        for (const item of existingOrder.items) {
          if (item.productId) {
            try {
              const mobile = await prisma.mobile.findUnique({ where: { id: item.productId } });
              if (mobile) {
                const restoredStock = mobile.stock + (item.quantity || 1);
                await prisma.mobile.update({
                  where: { id: item.productId },
                  data: { stock: restoredStock },
                });
                await prisma.mobileProduct.updateMany({
                  where: { id: item.productId },
                  data: { inStock: true },
                });
              }
            } catch (restockErr) {
              console.error("Failed to restore stock on cancellation:", restockErr);
            }
          }
        }
      }
    } else {
      if (body.orderStatus && body.orderStatus !== existingOrder.orderStatus) {
        changes.push(`Status changed to ${body.orderStatus.replace(/_/g, " ")}`);
      }
    }

    if (body.shippingCarrier && body.shippingCarrier !== existingOrder.shippingCarrier) {
      changes.push(`Carrier set to ${body.shippingCarrier}`);
    }
    if (body.trackingNumber && body.trackingNumber !== existingOrder.trackingNumber) {
      changes.push(`Tracking AWB: ${body.trackingNumber}`);
    }
    if (body.estimatedDelivery) {
      const formattedDate = new Date(body.estimatedDelivery).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
      changes.push(`Estimated Delivery: ${formattedDate}`);
    }
    if (body.address && body.address !== existingOrder.address) {
      changes.push(`Delivery Address updated to: ${body.address}, ${body.city || existingOrder.city}`);
    }
    if (body.totalAmount !== undefined && body.totalAmount !== existingOrder.totalAmount) {
      changes.push(`Amount adjusted to Rs ${body.totalAmount.toLocaleString("en-IN")}`);
    }
    if (body.adminNotes && body.adminNotes !== existingOrder.adminNotes) {
      changes.push(`Note: ${body.adminNotes}`);
    }

    const timestamp = new Date().toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

    if (changes.length > 0) {
      const changeText = isCancelling
        ? `[Cancellation Log ${timestamp}]: ${changes.join(" • ")}`
        : `[Support Update ${timestamp}]: ${changes.join(" • ")}`;

      updateData.adminNotes = existingOrder.adminNotes
        ? `${existingOrder.adminNotes} | ${changeText}`
        : changeText;
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: updateData,
      include: {
        items: true,
        smsAlerts: { orderBy: { sentAt: "desc" } },
      },
    });

    // Auto-dispatch SMS Alert on ANY change or cancellation
    try {
      let smsTitle = "Order Updated by Support";
      let smsBody = "";
      const alertType = isCancelling ? "ORDER_CANCELLED" : body.orderStatus || "ORDER_UPDATED";

      if (isCancelling) {
        smsTitle = "Order Cancelled & Refund Initiated";
        smsBody = `[VM Mobiles] Order #${updatedOrder.orderNumber} has been successfully CANCELLED as per request. If paid, your refund of Rs ${updatedOrder.totalAmount.toLocaleString("en-IN")} is being processed back to your original payment method. Reserved smartphone stock has been restored to warehouse inventory. - VM Mobiles.in`;
      } else if (body.orderStatus === "PROCESSING") {
        smsTitle = "Order Processing Update";
        smsBody = `[VM Mobiles] Order #${updatedOrder.orderNumber} is now being processed at our secure fulfillment center. Quality check & IMEI verification in progress. - VM Mobiles.in`;
      } else if (body.orderStatus === "SHIPPED") {
        smsTitle = "Shipment Dispatched";
        const carrier = body.shippingCarrier || updatedOrder.shippingCarrier || "Express Logistics";
        const tracking = body.trackingNumber || updatedOrder.trackingNumber || `TRK-${Math.floor(100000 + Math.random() * 900000)}`;
        smsBody = `[VM Mobiles] Great news! Order #${updatedOrder.orderNumber} has SHIPPED via ${carrier}. Tracking Number: ${tracking}. Track live: https://vmmobiles.in/track/${updatedOrder.orderNumber} - VM Mobiles.in`;
      } else if (body.orderStatus === "OUT_FOR_DELIVERY") {
        smsTitle = "Out For Delivery";
        smsBody = `[VM Mobiles] Order #${updatedOrder.orderNumber} is OUT FOR DELIVERY today to ${updatedOrder.city}! Please keep your phone reachable. - VM Mobiles.in`;
      } else if (body.orderStatus === "DELIVERED") {
        smsTitle = "Order Delivered & Warranty Active";
        smsBody = `[VM Mobiles] Delivered! Your order #${updatedOrder.orderNumber} has been delivered. Official 1-Year Device Shield & Warranty is fully ACTIVE. Thank you for shopping with VM Mobiles.in!`;
      } else if (changes.length > 0) {
        smsTitle = "Order Details Updated by Support";
        smsBody = `[VM Mobiles] Order #${updatedOrder.orderNumber} has been updated by VM Mobiles Support: ${changes.join(", ")}. Deliver to: ${updatedOrder.address}, ${updatedOrder.city}. - VM Mobiles.in`;
      }

      if (smsTitle && smsBody) {
        await prisma.smsAlert.create({
          data: {
            orderId: updatedOrder.id,
            customerPhone: updatedOrder.customerPhone,
            alertType,
            title: smsTitle,
            messageBody: smsBody,
            isRead: false,
          },
        });
      }
    } catch (smsErr) {
      console.error("Failed to append status SMS:", smsErr);
    }

    return NextResponse.json({
      success: true,
      order: updatedOrder,
      message: "Order updated successfully!",
    });
  } catch (error) {
    console.error("Failed to update order:", error);
    return NextResponse.json({ success: false, error: "Failed to update order" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Delete associated alerts first
    await prisma.smsAlert.deleteMany({
      where: { orderId: id },
    });

    // Delete order (cascades OrderItems)
    await prisma.order.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Order deleted successfully from database!",
    });
  } catch (error) {
    console.error("Failed to delete order:", error);
    return NextResponse.json({ success: false, error: "Failed to delete order" }, { status: 500 });
  }
}