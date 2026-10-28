import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendOrderStatusEmail, sendOrderConfirmationEmail } from "@/lib/email";
import { getAuthenticatedUser, requireAuth, requireAdmin } from "@/lib/auth";
import { isOrderCancelled } from "@/lib/orderStatus";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
    }

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
      },
    });

    if (!order) {
      return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
    }

    // IDOR Protection: Caller must be order owner or administrator
    const isAdmin = (authUser.role || "").toUpperCase() === "ADMIN";
    const isOwner = order.userId === authUser.id || order.customerEmail.toLowerCase() === authUser.email.toLowerCase();

    if (!isAdmin && !isOwner) {
      return NextResponse.json(
        { success: false, error: "Forbidden: You are not authorized to view this order." },
        { status: 403 }
      );
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
    const auth = await requireAuth(request);
    if (auth instanceof Response) {
      return auth;
    }
    const authUser = auth;
    const isAdmin = (authUser.role || "").toUpperCase() === "ADMIN";

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

    const isOwner =
      existingOrder.userId === authUser.id ||
      existingOrder.customerEmail.toLowerCase() === authUser.email.toLowerCase();

    // Check authorization: must be admin or order owner
    if (!isAdmin && !isOwner) {
      return NextResponse.json(
        { success: false, error: "Forbidden: You cannot modify this order." },
        { status: 403 }
      );
    }

    const isCancelling = isOrderCancelled(body.orderStatus) || body.action === "CANCEL_ORDER";

    // Non-admin customers can ONLY cancel their own order
    if (!isAdmin) {
      if (!isCancelling) {
        return NextResponse.json(
          { success: false, error: "Forbidden: Only administrators can update tracking or status." },
          { status: 403 }
        );
      }
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
        items: (existingOrder.items || []).map((i: { productName: string; quantity: number; price: number; selectedStorage?: string | null }) => ({
          productName: i.productName,
          quantity: i.quantity,
          price: i.price,
          selectedStorage: i.selectedStorage || undefined,
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
    let newStatus = isCancelling ? "CANCELLED" : (body.orderStatus || null);

    if (body.shippingCarrier !== undefined) updateData.shippingCarrier = body.shippingCarrier;
    if (body.trackingNumber !== undefined) updateData.trackingNumber = body.trackingNumber;
    if (body.estimatedDelivery !== undefined) {
      updateData.estimatedDelivery = body.estimatedDelivery ? new Date(body.estimatedDelivery) : null;
    }
    if (body.paymentStatus !== undefined) updateData.paymentStatus = body.paymentStatus;
    if (body.adminNotes !== undefined) updateData.adminNotes = body.adminNotes;

    if (isCancelling) {
      updateData.orderStatus = "CANCELLED";
      updateData.paymentStatus = "Refund Initiated";

      // Automatically cancel related warranties and order item warranty statuses in database
      try {
        await prisma.warranty.updateMany({
          where: { orderId: id },
          data: { warrantyStatus: "CANCELLED" },
        });
        await prisma.orderItem.updateMany({
          where: { orderId: id },
          data: { warrantyStatus: "CANCELLED" },
        });
      } catch (warrantyErr) {
        console.error("Failed to cancel warranties on order cancellation:", warrantyErr);
      }

      // Restore inventory stock (MobileProduct is single source of truth)
      if (!isOrderCancelled(oldStatus)) {
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
            } catch (stockErr) {
              console.error("Failed to restore stock on cancellation:", stockErr);
            }
          }
        }
      }
    } else if (newStatus && newStatus !== oldStatus) {
      updateData.orderStatus = newStatus;
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

    // Extract phone name(s) for user-friendly notifications
    const phoneNames =
      updatedOrder.items && updatedOrder.items.length > 0
        ? updatedOrder.items.map((i: { productName: string }) => i.productName).filter(Boolean).join(", ")
        : "Smartphone";

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
          note,
          {
            phoneName: phoneNames,
            items: (updatedOrder.items || []).map((i: { productName: string; quantity: number; price: number; selectedStorage?: string | null }) => ({
              productName: i.productName,
              quantity: i.quantity,
              price: i.price,
              selectedStorage: i.selectedStorage || undefined,
            })),
          }
        );
      } catch (emailErr) {
        console.error("[STATUS EMAIL WARNING] Failed to send status update email:", emailErr);
      }
    }

    const responseMessage = isCancelling
      ? `Your order for ${phoneNames} has been cancelled and the amount will be refunded.`
      : `Order #${updatedOrder.orderNumber} updated successfully.`;

    return NextResponse.json({
      success: true,
      order: updatedOrder,
      phoneName: phoneNames,
      message: responseMessage,
    });
  } catch (error) {
    console.error("Failed to update order:", error);
    return NextResponse.json({ success: false, error: "Failed to update order" }, { status: 500 });
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

    // Delete associated status history, warranties, email logs
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