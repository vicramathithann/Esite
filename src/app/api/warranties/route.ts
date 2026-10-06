import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendWarrantyActivationEmail } from "@/lib/email";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const email = searchParams.get("email");
    const role = searchParams.get("role");
    const admin = searchParams.get("admin");
    const search = searchParams.get("search");

    let where: Record<string, unknown> = {};

    if (admin === "true" || role === "ADMIN") {
      // Admin can search by order, customer, product, imei
      if (search) {
        where = {
          OR: [
            { customerName: { contains: search } },
            { customerEmail: { contains: search } },
            { productName: { contains: search } },
            { imeiNumber: { contains: search } },
            { order: { orderNumber: { contains: search } } },
          ],
        };
      }
    } else if (userId) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        return NextResponse.json({ success: true, count: 0, warranties: [] });
      }

      if (user.role === "ADMIN") {
        where = {};
      } else {
        // Normal user only sees their own warranties
        where = {
          OR: [
            { userId: user.id },
            { customerEmail: { equals: user.email } },
          ],
        };
      }
    } else if (email) {
      where = { customerEmail: { equals: email.trim().toLowerCase() } };
    } else {
      return NextResponse.json({ success: true, count: 0, warranties: [] });
    }

    const warranties = await prisma.warranty.findMany({
      where,
      orderBy: { purchaseDate: "desc" },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            customerName: true,
            customerEmail: true,
            orderStatus: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      count: warranties.length,
      warranties,
    });
  } catch (error) {
    console.error("Failed to fetch warranties:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch warranty records" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { warrantyId, action } = body;

    if (!warrantyId) {
      return NextResponse.json(
        { success: false, error: "warrantyId is required" },
        { status: 400 }
      );
    }

    const warranty = await prisma.warranty.findUnique({
      where: { id: warrantyId },
      include: { order: true },
    });

    if (!warranty) {
      return NextResponse.json(
        { success: false, error: "Warranty record not found" },
        { status: 404 }
      );
    }

    if (action === "RESEND_EMAIL") {
      const emailResult = await sendWarrantyActivationEmail({
        id: warranty.id,
        orderId: warranty.orderId,
        orderNumber: warranty.order.orderNumber,
        userId: warranty.userId,
        customerName: warranty.customerName,
        customerEmail: warranty.customerEmail,
        productName: warranty.productName,
        imeiNumber: warranty.imeiNumber,
        purchaseDate: warranty.purchaseDate,
        warrantyDuration: warranty.warrantyDuration,
        warrantyStartDate: warranty.warrantyStartDate,
        warrantyExpiryDate: warranty.warrantyExpiryDate,
      });

      await prisma.warranty.update({
        where: { id: warranty.id },
        data: { emailSent: emailResult.success },
      });

      return NextResponse.json({
        success: true,
        message: `Warranty email resent to ${warranty.customerEmail}.`,
        status: emailResult.status,
      });
    }

    return NextResponse.json({ success: true, warranty });
  } catch (error) {
    console.error("Failed to process warranty action:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process warranty action" },
      { status: 500 }
    );
  }
}
