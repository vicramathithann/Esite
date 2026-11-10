import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { sendWarrantyEmail } from "@/lib/mailer";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Dedicated Admin Endpoint: Dispatch Warranty Certificate Email
 * - Strict server-side Admin role enforcement via session cookies
 * - Dispatches certificate email with official PDF certificate attached
 * - Unlimited dispatches (no cooldown, no duplicate skip)
 */
export async function POST(request: Request) {
  try {
    // 1. Enforce Admin Role strictly on the server
    const auth = await requireAdmin(request);
    if (auth instanceof Response) {
      return auth;
    }

    const body = await request.json().catch(() => ({}));
    const { orderId, warrantyId } = body;

    if (!orderId && !warrantyId) {
      return NextResponse.json(
        { success: false, error: "Either orderId or warrantyId is required." },
        { status: 400 }
      );
    }

    let targetOrder: any = null;
    let targetWarranties: any[] = [];
    let targetItems: any[] = [];

    if (orderId) {
      targetOrder = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          items: true,
          warranties: true,
        },
      });

      if (!targetOrder) {
        // Fallback search by orderNumber
        targetOrder = await prisma.order.findFirst({
          where: { orderNumber: orderId },
          include: {
            items: true,
            warranties: true,
          },
        });
      }

      if (!targetOrder) {
        return NextResponse.json(
          { success: false, error: `Order "${orderId}" not found.` },
          { status: 404 }
        );
      }

      targetItems = targetOrder.items || [];
      targetWarranties = targetOrder.warranties || [];
    } else if (warrantyId) {
      const warranty = await prisma.warranty.findUnique({
        where: { id: warrantyId },
        include: {
          order: {
            include: {
              items: true,
              warranties: true,
            },
          },
          orderItem: true,
        },
      });

      if (!warranty) {
        return NextResponse.json(
          { success: false, error: `Warranty "${warrantyId}" not found.` },
          { status: 404 }
        );
      }

      targetOrder = warranty.order;
      targetWarranties = [warranty];
      targetItems = warranty.orderItem ? [warranty.orderItem] : targetOrder?.items || [];
    }

    if (!targetOrder) {
      return NextResponse.json(
        { success: false, error: "Associated order could not be resolved." },
        { status: 404 }
      );
    }

    // Ensure items exist
    if (targetItems.length === 0 && targetOrder.id) {
      targetItems = await prisma.orderItem.findMany({ where: { orderId: targetOrder.id } });
    }

    // Ensure warranties exist or generate for legacy orders
    if (targetWarranties.length === 0 && targetOrder.id) {
      targetWarranties = await prisma.warranty.findMany({ where: { orderId: targetOrder.id } });
      if (targetWarranties.length === 0 && targetItems.length > 0) {
        for (let i = 0; i < targetItems.length; i++) {
          const item = targetItems[i];
          const wNum = `WRT-${targetOrder.orderNumber}-${i + 1}`;
          try {
            const w = await prisma.warranty.create({
              data: {
                warrantyNumber: wNum,
                orderId: targetOrder.id,
                orderItemId: item.id,
                userId: targetOrder.userId,
                customerName: targetOrder.customerName,
                customerEmail: targetOrder.customerEmail,
                productName: item.productName,
                imeiNumber: item.imeiNumber || `86${crypto.randomInt(1000000000000, 10000000000000)}`,
                purchaseDate: targetOrder.createdAt || new Date(),
                warrantyDuration: `${Math.round((item.warrantyMonths || 12) / 12)} Year`,
                warrantyStartDate: item.warrantyStartDate || new Date(),
                warrantyExpiryDate: item.warrantyExpiryDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
                warrantyStatus: "ACTIVE",
                emailSent: false,
              },
            });
            targetWarranties.push(w);
          } catch (createErr) {
            console.warn("[ADMIN SEND CERTIFICATE] Warning creating missing warranty:", createErr);
          }
        }
      }
    }

    // Dispatch certificate email with attached PDF, forcing bypass of limits and cooldowns
    const result = await sendWarrantyEmail(
      targetOrder,
      targetItems,
      targetWarranties,
      request,
      { force: true, forceResend: true }
    );

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Failed to dispatch warranty certificate email via Gmail SMTP.",
          status: result.status,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Warranty certificate email dispatched to ${targetOrder.customerEmail}.`,
      status: result.status,
      customerEmail: targetOrder.customerEmail,
    });
  } catch (error: any) {
    console.error("[ADMIN SEND CERTIFICATE ERROR]", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Internal server error while dispatching warranty certificate.",
      },
      { status: 500 }
    );
  }
}

