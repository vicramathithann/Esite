import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendWarrantyActivationEmail } from "@/lib/email";
import { getAuthenticatedUser, requireAuth } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");

    // Authenticate caller via session cookie
    const authUser = await getAuthenticatedUser(request);

    if (!authUser) {
      return NextResponse.json(
        { success: false, error: "Authentication required to access warranties." },
        { status: 401 }
      );
    }

    let where: Record<string, unknown> = {};

    // 1. Admin: verified by session role (not by unverified query parameters)
    if ((authUser.role || "").toUpperCase() === "ADMIN") {
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
      } else {
        where = {};
      }
    } else {
      // 2. Regular User: strictly isolated to their own warranties based on session identity
      where = {
        OR: [
          { userId: authUser.id },
          { customerEmail: { equals: authUser.email } },
        ],
      };
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
    const auth = await requireAuth(request);
    if (auth instanceof Response) {
      return auth;
    }
    const authUser = auth;

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

    // IDOR Protection: User must own the warranty or be an administrator
    const isAdmin = (authUser.role || "").toUpperCase() === "ADMIN";
    const isOwner = warranty.userId === authUser.id || warranty.customerEmail.toLowerCase() === authUser.email.toLowerCase();

    if (!isAdmin && !isOwner) {
      return NextResponse.json(
        { success: false, error: "Forbidden: You are not authorized to manage this warranty." },
        { status: 403 }
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
