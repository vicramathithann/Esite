import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendOrderStatusEmail, sendOrderConfirmationEmail } from "@/lib/email";

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
        warranties: true,
        statusHistory: {
          orderBy: { createdAt: "asc" },
        },
        emailNotifications: {
          orderBy: { createdAt: "desc" },
        },
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
      include: {
        items: true,
        warranties: true,
      },
    });

    if (!existingOrder) {
      return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
    }

    // Action 1: Resend confirmation email
    if (body.action === "RESEND_EMAIL" || body.resendEmail) {
      const emailRes = await sendOrderConfirmationEmail({
        id: existingOrder.id,
        orderNumber: existingOrder.orderNumber,
        userId: existingOrder.userId,
        customerName: existingOrder.customerName,
        customerEmail: existingOrder.customerEmail,
        totalAmount: existingOrder.totalAmount,
        items: existingOrder.items.map((i) => ({
          productName: i.productName,
          quantity: i.quantity,
          price: i.price,
          selectedStorage: i.selectedStorage,
        })),
      });

      return NextResponse.json({
        success: true,
        message: `Order confirmation email resent to ${existingOrder.customerEmail}.`,
        emailStatus: emailRes.status,
      });
    }

    const updateData: Record<string, unknown> = {};
    const oldStatus = existingOrder.orderStatus;
    const newStatus = body.orderStatus || (body.action === "CANCEL_ORDER" ? "Cancelled" : null);

    const isCancelling = newStatus === "Cancelled" || newStatus === "CANCELLED" || body.action === "CANCEL_ORDER";

    if (newStatus && newStatus !== oldStatus) {
      updateData.orderStatus = newStatus;
    }

    if (body.shippingCarrier !== undefined) updateData.shippingCarrier = body.shippingCarrier;
    if (body.trackingNumber !== undefined) updateData.trackingNumber = body.trackingNumber;
    if (body.estimatedDelivery !== undefined) {
      updateData.estimatedDelivery = body.estimatedDelivery ? new Date(body.estimatedDelivery) : null;
    }
    if (body.paymentStatus !== undefined) updateData.paymentStatus = body.paymentStatus;
    if (body.adminNotes !== undefined) updateData.adminNotes = body.adminNotes;

    if (isCancelling) {
      updateData.orderStatus = "Cancelled";
      updateData.paymentStatus = "Refund Initiated";

      // Restore inventory stock
      if (oldStatus !== "Cancelled" && oldStatus !== "CANCELLED") {
        for (const item of existingOrder.items) {
          if (item.productId) {
            try {
              const product = await prisma.mobileProduct.findUnique({ where: { id: item.productId } });
              if (product) {
                await prisma.mobileProduct.update({
                  where: { id: item.productId },
                  data: {
                    stock: product.stock + (item.quantity || 1),
                    inStock: true,
                  },
                });
              }
              const mobile = await prisma.mobile.findUnique({ where: { id: item.productId } });
              if (mobile) {
                await prisma.mobile.update({
                  where: { id: item.productId },
                  data: { stock: mobile.stock + (item.quantity || 1) },
                });
              }
            } catch (stockErr) {
              console.error("Failed to restore stock on cancellation:", stockErr);
            }
          }
        }
      }
    }

    // Save order changes
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: updateData,
      include: {
        items: true,
        warranties: true,
        statusHistory: true,
        emailNotifications: { orderBy: { createdAt: "desc" } },
      },
    });

    // Record Status History & Send Status Email if status changed
    if (newStatus && newStatus !== oldStatus) {
      const changedBy = body.changedBy || (isCancelling ? "CUSTOMER" : "ADMIN");
      const note = body.note || body.cancelReason || `Order status updated from ${oldStatus} to ${newStatus}.`;

      try {
        await prisma.orderStatusHistory.create({
          data: {
            orderId: updatedOrder.id,
            fromStatus: oldStatus,
            toStatus: newStatus,
            changedBy,
            note,
          },
        });
      } catch (histErr) {
        console.error("Error creating status history:", histErr);
      }

      // Dispatch Order Status Email via Gmail SMTP
      try {
        await sendOrderStatusEmail(
          {
            id: updatedOrder.id,
            orderNumber: updatedOrder.orderNumber,
            userId: updatedOrder.userId,
            customerName: updatedOrder.customerName,
            customerEmail: updatedOrder.customerEmail,
            totalAmount: updatedOrder.totalAmount,
            orderStatus: newStatus,
            shippingCarrier: updatedOrder.shippingCarrier,
            trackingNumber: updatedOrder.trackingNumber,
          },
          newStatus,
          note
        );
      } catch (emailErr) {
        console.error("[STATUS EMAIL WARNING] Failed to send status update email:", emailErr);
      }

      // Dispatch SMS
      try {
        await prisma.smsAlert.create({
          data: {
            orderId: updatedOrder.id,
            customerPhone: updatedOrder.customerPhone,
            alertType: newStatus,
            title: `Order #${updatedOrder.orderNumber} Status: ${newStatus}`,
            messageBody: `[VM Mobiles] Your order #${updatedOrder.orderNumber} status is now: ${newStatus}. Note: ${note} - VM Mobiles.in`,
            isRead: false,
          },
        });
      } catch (smsErr) {
        console.error("Error creating status SMS:", smsErr);
      }
    }

    return NextResponse.json({
      success: true,
      order: updatedOrder,
      message: `Order #${updatedOrder.orderNumber} updated successfully.`,
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

    // Delete associated alerts, status history, warranties, email logs
    await prisma.smsAlert.deleteMany({ where: { orderId: id } });
    await prisma.orderStatusHistory.deleteMany({ where: { orderId: id } });
    await prisma.warranty.deleteMany({ where: { orderId: id } });
    await prisma.emailNotification.deleteMany({ where: { orderId: id } });

    // Delete order (cascades OrderItems)
    await prisma.order.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: "Order deleted successfully!",
    });
  } catch (error) {
    console.error("Failed to delete order:", error);
    return NextResponse.json({ success: false, error: "Failed to delete order" }, { status: 500 });
  }
}