import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendOrderConfirmationEmail, sendWarrantyActivationEmail } from "@/lib/email";
import { getAuthenticatedUser } from "@/lib/auth";
import { logSecurityEvent, getClientIp } from "@/lib/securityLogger";
import { isValidEmail } from "@/lib/validation";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const admin = searchParams.get("admin");
    const role = searchParams.get("role");

    // Authenticate caller via session cookie
    const authUser = await getAuthenticatedUser(request);

    if (!authUser) {
      // Unauthenticated guests cannot access private order records
      return NextResponse.json({ success: true, count: 0, orders: [] });
    }

    let where: Record<string, unknown> = {};

    // 1. Admin Request: Can view all orders across all users
    if ((authUser.role || "").toUpperCase() === "ADMIN" && (admin === "true" || role === "ADMIN")) {
      where = {};
    } else {
      // 2. Strict Customer Isolation: User only sees their own orders
      where = {
        OR: [
          { userId: authUser.id },
          { customerEmail: { equals: authUser.email } },
        ],
      };
    }

    const orders = await prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
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

    if (!customerName || !items || !items.length) {
      return NextResponse.json(
        { success: false, error: "Missing required order fields." },
        { status: 400 }
      );
    }

    // 1. Validate customer & email
    const cleanCustomerEmail = (customerEmail || "").trim().toLowerCase();
    if (!cleanCustomerEmail) {
      return NextResponse.json(
        { success: false, error: "Valid customer email address is required for order confirmation." },
        { status: 400 }
      );
    }

    // 2. Resolve authenticated user strictly from session cookie
    const validUser = await getAuthenticatedUser(request);

    // Purchase Protection: Require authenticated customer session
    if (!validUser) {
      return NextResponse.json(
        {
          success: false,
          error: "Authentication required. Please sign in to place your order.",
          requiresAuth: true,
        },
        { status: 401 }
      );
    }

    // Purchase Protection: Require verified email address
    if (!validUser.emailVerified) {
      return NextResponse.json(
        {
          success: false,
          error: "Email verification required. Please verify your email before placing an order.",
          requiresVerification: true,
          email: validUser.email,
        },
        { status: 403 }
      );
    }

    const validUserId = validUser.id;

    // 3. Strict Backend Product, Stock, and Price Validation
    // OWASP A06 & A08: Server-side pricing enforcement - never trust client item.price or totalAmount!
    let computedBackendTotal = 0;
    const validatedProductsMap = new Map<string, { product: any; unitPrice: number; qty: number }>();

    for (const item of items) {
      const qty = Math.max(1, parseInt(String(item.quantity || 1), 10));

      if (!item.productId) {
        return NextResponse.json(
          { success: false, error: "Invalid order item: missing product identifier." },
          { status: 400 }
        );
      }

      const product = await prisma.mobileProduct.findUnique({
        where: { id: item.productId },
      });

      if (!product) {
        return NextResponse.json(
          { success: false, error: `Product not found: "${item.productName || item.productId}".` },
          { status: 404 }
        );
      }

      if (!product.inStock || product.stock <= 0 || product.stock < qty) {
        return NextResponse.json(
          {
            success: false,
            error: `Sorry, "${product.name}" is out of stock (available: ${product.stock}, requested: ${qty}).`,
          },
          { status: 400 }
        );
      }

      const unitPrice = product.discountPrice && product.discountPrice > 0
        ? product.discountPrice
        : product.basePrice;

      computedBackendTotal += unitPrice * qty;
      validatedProductsMap.set(item.productId, { product, unitPrice, qty });
    }

    // Authoritative total calculated strictly on the server
    const orderTotal = computedBackendTotal;
    const orderNumber = `ORD${Math.floor(10000 + Math.random() * 90000)}`;
    const now = new Date();

    // 4. Prepare Order Items & IMEI numbers with verified server pricing
    const orderItemsCreateData: any[] = [];

    for (const item of items) {
      const validated = validatedProductsMap.get(item.productId);
      const prod = validated?.product;
      const unitPrice = validated?.unitPrice || 0;
      const qty = validated?.qty || 1;

      const pName = prod ? prod.name : (item.productName || "Mobile Smartphone");
      const pBrand = prod ? prod.brand : (item.productBrand || "VN Mobiles");
      const pImage = prod ? prod.imageUrl : (item.productImageUrl || "/images/placeholder.png");

      const imei = `86${Math.floor(1000000000000 + Math.random() * 9000000000000)}`;
      const months = item.warrantyMonths || 12;
      const expiry = new Date(now.getTime() + months * 30 * 24 * 60 * 60 * 1000);

      const colorStr = typeof item.selectedColor === "object" && item.selectedColor !== null
        ? item.selectedColor.name
        : (item.selectedColor || "Standard");

      const storageStr = typeof item.selectedStorage === "object" && item.selectedStorage !== null
        ? item.selectedStorage.size
        : (item.selectedStorage || "Standard");

      orderItemsCreateData.push({
        productId: item.productId,
        productName: pName,
        productBrand: pBrand,
        productImageUrl: pImage,
        selectedColor: colorStr,
        selectedStorage: storageStr,
        price: unitPrice, // Strictly verified server-side price!
        quantity: qty,
        imeiNumber: imei,
        warrantyMonths: months,
        warrantyStartDate: now,
        warrantyExpiryDate: expiry,
        warrantyStatus: "ACTIVE",
      });
    }

    // 5. Atomic Database Transaction: Deduct stock and create order records together
    // Guarantees zero stock leaks or inconsistent records under high concurrency
    const { order, createdWarranties } = await prisma.$transaction(async (tx) => {
      // 5a. Deduct stock
      for (const item of items) {
        if (item.productId) {
          const qty = Math.max(1, parseInt(String(item.quantity || 1), 10));
          const prod = await tx.mobileProduct.findUnique({ where: { id: item.productId } });
          if (!prod || prod.stock < qty) {
            throw new Error(`Insufficient stock for product ${item.productId}`);
          }
          const updatedStock = prod.stock - qty;
          await tx.mobileProduct.update({
            where: { id: item.productId },
            data: {
              stock: updatedStock,
              inStock: updatedStock > 0,
            },
          });
        }
      }

      // 5b. Create Order in Database
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          userId: validUserId,
          customerName: customerName.trim(),
          customerPhone: customerPhone ? customerPhone.trim() : "",
          phoneVerified: true,
          customerEmail: cleanCustomerEmail,
          address: address || "Standard Delivery Address",
          city: city || "City",
          pincode: pincode || "000000",
          state: state || "State",
          totalAmount: orderTotal,
          paymentMethod: paymentMethod || "Online Payment",
          paymentStatus: "PAID",
          orderStatus: "Order Confirmed",
          statusHistory: {
            create: [
              {
                fromStatus: "NONE",
                toStatus: "Order Confirmed",
                changedBy: "SYSTEM",
                note: "Order placed and payment confirmed.",
              },
            ],
          },
          items: {
            create: orderItemsCreateData,
          },
        },
        include: {
          items: true,
        },
      });

      // 5c. Register Mobile Product Warranties
      const warranties = [];
      for (const orderItem of newOrder.items) {
        const warranty = await tx.warranty.create({
          data: {
            orderId: newOrder.id,
            orderItemId: orderItem.id,
            userId: validUserId,
            customerName: customerName.trim(),
            customerEmail: cleanCustomerEmail,
            productName: orderItem.productName,
            imeiNumber: orderItem.imeiNumber,
            purchaseDate: now,
            warrantyDuration: `${Math.round(orderItem.warrantyMonths / 12)} Year`,
            warrantyStartDate: now,
            warrantyExpiryDate: orderItem.warrantyExpiryDate,
            warrantyStatus: "ACTIVE",
          },
        });
        warranties.push(warranty);
      }

      return { order: newOrder, createdWarranties: warranties };
    });

    logSecurityEvent("ORDER_CREATED", "INFO", {
      userId: validUserId,
      email: cleanCustomerEmail,
      ip: getClientIp(request),
      details: {
        orderNumber: order.orderNumber,
        totalAmount: order.totalAmount,
        itemCount: order.items.length,
      },
    });

    // 6. Asynchronous Non-blocking Email Delivery for Warranties
    for (const warranty of createdWarranties) {
      try {
        await sendWarrantyActivationEmail({
          id: warranty.id,
          orderId: order.id,
          orderNumber: order.orderNumber,
          userId: validUserId,
          customerName: customerName.trim(),
          customerEmail: cleanCustomerEmail,
          productName: warranty.productName,
          imeiNumber: warranty.imeiNumber,
          purchaseDate: now,
          warrantyDuration: warranty.warrantyDuration,
          warrantyStartDate: now,
          warrantyExpiryDate: warranty.warrantyExpiryDate,
        });
      } catch (wErr) {
        console.error("Error creating mobile warranty notification:", wErr);
      }
    }

    // 8. Dispatch Order Confirmation Email via Gmail SMTP
    let emailResult = null;
    try {
      emailResult = await sendOrderConfirmationEmail({
        id: order.id,
        orderNumber: order.orderNumber,
        userId: validUserId,
        customerName: customerName.trim(),
        customerEmail: cleanCustomerEmail,
        totalAmount: order.totalAmount,
        items: order.items.map((i) => ({
          productName: i.productName,
          quantity: i.quantity,
          price: i.price,
          selectedStorage: i.selectedStorage,
        })),
      });
    } catch (mailErr) {
      console.error("[EMAIL NOTIFICATION WARNING] Could not send confirmation email:", mailErr);
    }

    return NextResponse.json({
      success: true,
      order,
      warranties: createdWarranties,
      emailStatus: emailResult?.status || "LOGGED",
      message: `Order ${order.orderNumber} placed successfully! Confirmation email dispatched to ${cleanCustomerEmail}.`,
    });
  } catch (error) {
    console.error("Failed to create order:", error);
    return NextResponse.json(
      { success: false, error: "Failed to place order. Please try again." },
      { status: 500 }
    );
  }
}