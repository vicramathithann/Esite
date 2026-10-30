import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { sendWarrantyEmail } from "@/lib/mailer";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Authenticate user
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: "Authentication required to resend warranty certificates." },
        { status: 401 }
      );
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { success: false, error: "Missing required order identifier." },
        { status: 400 }
      );
    }

    // 2. Fetch order with items and warranties
    let order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: true,
        warranties: true,
      },
    });

    if (!order) {
      order = await prisma.order.findFirst({
        where: { orderNumber: id },
        include: {
          items: true,
          warranties: true,
        },
      });
    }

    if (!order) {
      return NextResponse.json(
        { success: false, error: `Order "${id}" not found.` },
        { status: 404 }
      );
    }

    // 3. Authorization Check: Admin or Order Owner
    const isAdmin = (authUser.role || "").toUpperCase() === "ADMIN";
    const isOwner =
      order.userId === authUser.id ||
      order.customerEmail.toLowerCase() === authUser.email.toLowerCase();

    if (!isAdmin && !isOwner) {
      return NextResponse.json(
        { success: false, error: "Forbidden: You do not have permission to resend warranty for this order." },
        { status: 403 }
      );
    }

    // 4. Enforce 60-second Cooldown
    const recentWarrantyEmail = await prisma.emailNotification.findFirst({
      where: {
        orderId: order.id,
        emailType: "WARRANTY",
      },
      orderBy: { createdAt: "desc" },
    });

    const lastSentAt =
      recentWarrantyEmail?.sentAt ||
      recentWarrantyEmail?.createdAt ||
      (order as any).warrantyEmailSentAt;

    if (lastSentAt) {
      const elapsedMs = Date.now() - new Date(lastSentAt).getTime();
      const COOLDOWN_MS = 60 * 1000;
      if (elapsedMs < COOLDOWN_MS) {
        const remainingSeconds = Math.ceil((COOLDOWN_MS - elapsedMs) / 1000);
        return NextResponse.json(
          {
            success: false,
            error: `Please wait ${remainingSeconds} seconds before requesting another warranty email.`,
            cooldownSeconds: remainingSeconds,
          },
          { status: 429 }
        );
      }
    }

    // 5. Fetch or generate warranties if none exist yet
    let warranties = (order as any).warranties || [];
    if (warranties.length === 0) {
      warranties = await prisma.warranty.findMany({ where: { orderId: order.id } });
    }

    if (warranties.length === 0 && order.items && order.items.length > 0) {
      for (let i = 0; i < order.items.length; i++) {
        const item = order.items[i];
        const wNum = `WRT-${order.orderNumber}-${i + 1}`;
        try {
          const w = await prisma.warranty.create({
            data: {
              warrantyNumber: wNum,
              orderId: order.id,
              orderItemId: item.id,
              userId: order.userId || authUser.id,
              customerName: order.customerName,
              customerEmail: order.customerEmail,
              productName: item.productName,
              imeiNumber: item.imeiNumber || `86${Math.floor(1000000000000 + Math.random() * 9000000000000)}`,
              purchaseDate: order.createdAt || new Date(),
              warrantyDuration: `${Math.round((item.warrantyMonths || 12) / 12)} Year`,
              warrantyStartDate: item.warrantyStartDate || order.createdAt || new Date(),
              warrantyExpiryDate: item.warrantyExpiryDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
              warrantyStatus: "ACTIVE",
              emailSent: false,
            },
          });
          warranties.push(w);
        } catch (warCreateErr) {
          console.warn("[WARRANTY GENERATION WARNING] Could not persist warranty row:", warCreateErr);
        }
      }
    }

    // 6. Dispatch Warranty Email
    const emailResult = await sendWarrantyEmail(
      order,
      order.items || [],
      warranties,
      request,
      { forceResend: true }
    );

    if (!emailResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: emailResult.error || "Failed to deliver warranty email via Gmail SMTP.",
          emailStatus: emailResult.status,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Warranty certificate resent to ${order.customerEmail}.`,
      emailStatus: emailResult.status,
      deliveredTo: order.customerEmail,
      warrantyCount: warranties.length,
    });
  } catch (error) {
    console.error("[RESEND WARRANTY ERROR]", error);
    return NextResponse.json(
      { success: false, error: "Internal server error while resending warranty email." },
      { status: 500 }
    );
  }
}

