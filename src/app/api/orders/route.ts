import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const email = searchParams.get("email");
    const phone = searchParams.get("phone");
    const admin = searchParams.get("admin");
    const role = searchParams.get("role");

    let where: Record<string, unknown> = {};

    // 1. Admin Request: Can view all orders across all users
    if (admin === "true" || role === "ADMIN") {
      where = {};
    } else if (userId) {
      // 2. Querying by authenticated User ID
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return NextResponse.json({ success: true, count: 0, orders: [] });
      }

      if (user.role === "ADMIN") {
        where = {}; // Admin sees all
      } else {
        // Normal user: ONLY see their own orders
        where = {
          OR: [
            { userId: user.id },
            { customerEmail: { equals: user.email } },
            { customerPhone: { equals: user.phone } },
          ],
        };
      }
    } else if (email || phone) {
      // 3. Querying by specific email or phone
      const orConditions: Array<Record<string, unknown>> = [];
      if (email) {
        orConditions.push({ customerEmail: { equals: email.trim().toLowerCase() } });
      }
      if (phone) {
        const cleanPhone = phone.trim();
        orConditions.push({ customerPhone: { equals: cleanPhone } });
        const withoutCountryCode = cleanPhone.replace(/^\+91\s*/, "").trim();
        if (withoutCountryCode) {
          orConditions.push({ customerPhone: { contains: withoutCountryCode } });
        }
      }
      where = { OR: orConditions };
    } else {
      // 4. Guest / Unauthenticated: Do NOT expose private order data
      return NextResponse.json({ success: true, count: 0, orders: [] });
    }

    const orders = await prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        items: true,
        smsAlerts: {
          orderBy: { sentAt: "desc" },
        },
      },
    });

    return NextResponse.json({ success: true, count: orders.length, orders });
  } catch (error) {
    console.error("Failed to fetch orders:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch orders" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      customerName,
      customerPhone,
      customerEmail,
      address,
      city,
      pincode,
      state,
      totalAmount,
      paymentMethod,
      items,
      userId,
    } = body;

    if (!customerName || !customerPhone || !items || !items.length) {
      return NextResponse.json(
        { success: false, error: "Missing required order fields" },
        { status: 400 }
      );
    }

    // Strict Out-of-Stock Backend Check
    for (const item of items) {
      if (item.productId) {
        // Check in mobile table
        const mobile = await prisma.mobile.findUnique({
          where: { id: item.productId },
        });
        if (mobile && mobile.stock <= 0) {
          return NextResponse.json(
            {
              success: false,
              error: `Sorry, "${item.productName || mobile.model}" is Currently Out of Stock and cannot be purchased.`,
            },
            { status: 400 }
          );
        }

        // Check in mobileProduct table
        const product = await prisma.mobileProduct.findUnique({
          where: { id: item.productId },
        });
        if (product && product.inStock === false) {
          return NextResponse.json(
            {
              success: false,
              error: `Sorry, "${item.productName || product.name}" is Currently Out of Stock and cannot be purchased.`,
            },
            { status: 400 }
          );
        }
      }
    }

    const orderNumber = `VMM-${Math.floor(100000 + Math.random() * 900000)}`;

    const generatedImeis: string[] = [];
    const now = new Date();
    
    // Default 12 months (365 days)
    const expiryDate = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
    const expiryFormatted = expiryDate.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

    const orderItemsData = items.map((item: {
      productId: string;
      productName: string;
      productBrand: string;
      productImageUrl: string;
      selectedColor: string;
      selectedStorage: string;
      price: number;
      quantity?: number;
      warrantyMonths?: number;
    }) => {
      const imei = `86${Math.floor(1000000000000 + Math.random() * 9000000000000)}`;
      generatedImeis.push(imei);
      const months = item.warrantyMonths || 12;
      const itemExpiry = new Date(now.getTime() + months * 30 * 24 * 60 * 60 * 1000);

      return {
        productId: item.productId,
        productName: item.productName,
        productBrand: item.productBrand,
        productImageUrl: item.productImageUrl,
        selectedColor: item.selectedColor,
        selectedStorage: item.selectedStorage,
        price: item.price,
        quantity: item.quantity || 1,
        imeiNumber: imei,
        warrantyMonths: months,
        warrantyStartDate: now,
        warrantyExpiryDate: itemExpiry,
        warrantyStatus: "ACTIVE",
      };
    });

    let validUserId: string | null = null;
    if (userId) {
      const userExists = await prisma.user.findUnique({ where: { id: userId } });
      if (userExists) {
        validUserId = userId;
      }
    }
    if (!validUserId && customerEmail) {
      const userByEmail = await prisma.user.findUnique({
        where: { email: customerEmail.trim().toLowerCase() },
      });
      if (userByEmail) {
        validUserId = userByEmail.id;
      }
    }
    if (!validUserId && customerPhone) {
      const userByPhone = await prisma.user.findUnique({
        where: { phone: customerPhone.trim() },
      });
      if (userByPhone) {
        validUserId = userByPhone.id;
      }
    }

    const order = await prisma.order.create({
      data: {
        orderNumber,
        userId: validUserId,
        customerName,
        customerPhone,
        phoneVerified: true,
        customerEmail: customerEmail || `${customerPhone}@customer.vmmobiles.in`,
        address,
        city,
        pincode,
        state,
        totalAmount,
        paymentMethod: paymentMethod || "Amazon Pay UPI",
        paymentStatus: "PAID",
        orderStatus: "CONFIRMED",
        items: {
          create: orderItemsData,
        },
      },
      include: {
        items: true,
      },
    });

    // Automatically decrement stock in database
    for (const item of items) {
      if (item.productId) {
        try {
          const mobile = await prisma.mobile.findUnique({ where: { id: item.productId } });
          if (mobile) {
            const qty = item.quantity || 1;
            const newStock = Math.max(0, mobile.stock - qty);
            await prisma.mobile.update({
              where: { id: item.productId },
              data: { stock: newStock },
            });
            await prisma.mobileProduct.updateMany({
              where: { id: item.productId },
              data: { inStock: newStock > 0 },
            });
          }
        } catch (stockErr) {
          console.error("Failed to decrement stock:", stockErr);
        }
      }
    }

    // Create immediate Purchase Confirmation SMS
    const itemSummary = items
      .map((i: { productName: string; selectedStorage: string }) => `${i.productName} (${i.selectedStorage})`)
      .join(", ");

    const smsMessage = `[VM Mobiles] Order #${orderNumber} Confirmed! Dear ${customerName}, your purchase of ${itemSummary} for Rs ${totalAmount.toLocaleString("en-IN")} is successful. Registered IMEI: ${generatedImeis.join(", ")}. Official Device Shield is ACTIVE until ${expiryFormatted}. We will alert you via SMS before your warranty expires! - VM Mobiles.in`;

    const smsAlert = await prisma.smsAlert.create({
      data: {
        orderId: order.id,
        customerPhone,
        alertType: "PURCHASE_CONFIRMATION",
        title: "Order Confirmed & Device Shield Active",
        messageBody: smsMessage,
        isRead: false,
      },
    });

    return NextResponse.json({
      success: true,
      order,
      smsAlert,
      message: "Order placed successfully. Warranty registered and SMS confirmation dispatched!",
    });
  } catch (error) {
    console.error("Failed to create order:", error);
    return NextResponse.json({ success: false, error: "Failed to place order" }, { status: 500 });
  }
}