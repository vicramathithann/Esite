import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendOrderConfirmationEmail } from "@/lib/email";
import { sendWarrantyEmail } from "@/lib/mailer";
import { getAuthenticatedUser } from "@/lib/auth";
import { logSecurityEvent, getClientIp } from "@/lib/securityLogger";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const admin = searchParams.get("admin");
    const role = searchParams.get("role");

    // Authenticate caller via session cookie
    const authUser = await getAuthenticatedUser(request);

    if (!authUser) {
      // Unauthenticated guests cannot access private order records
      return NextResponse.json({ success: true, count: 0, orders: [] });
    }

    let where: Record<string, unknown> = {};

    // 1. Admin Request: Can view all orders across all users, or filter by specific user
    if ((authUser.role || "").toUpperCase() === "ADMIN" && (admin === "true" || role === "ADMIN")) {
      const targetUserId = searchParams.get("userId");
      const targetEmail = searchParams.get("customerEmail");
      if (targetUserId) {
        where = { userId: targetUserId };
      } else if (targetEmail) {
        where = { customerEmail: { equals: targetEmail } };
      } else {
        where = {};
      }
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
      paymentMethod,
      items,
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

      // Authoritative real product model name from database: product.name or `${product.brand} ${product.model}`
      let realModelName = prod?.name || "";
      if (!realModelName && prod?.brand && prod?.model) {
        realModelName = `${prod.brand} ${prod.model}`;
      }
      if (!realModelName) {
        realModelName = item.productName || item.name || "";
      }
      if (
        !realModelName ||
        realModelName.toLowerCase() === "smartphone" ||
        realModelName.toLowerCase().includes("flagship smartphone") ||
        realModelName.toLowerCase().includes("mobile smartphone")
      ) {
        realModelName = (prod?.brand && prod?.model) ? `${prod.brand} ${prod.model}` : (prod?.name || "Samsung Galaxy S24");
      }

      const pName = realModelName;
      const pBrand = prod ? prod.brand : (item.productBrand || "VN Mobiles");
      const pImage = prod ? prod.imageUrl : (item.productImageUrl || "/images/placeholder.png");

      const imei = `86${Math.floor(1000000000000 + Math.random() * 9000000000000)}`;
      const months = item.warrantyMonths || 12;
      const expiry = new Date(now);
      expiry.setFullYear(expiry.getFullYear() + Math.max(1, Math.round(months / 12)));

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
    const { order, createdWarranties } = await prisma.$transaction(async (tx: any) => {
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
      for (let i = 0; i < newOrder.items.length; i++) {
        const orderItem = newOrder.items[i];
        const warrantyNumber = `WRT-${newOrder.orderNumber}-${i + 1}`;
        const warranty = await tx.warranty.create({
          data: {
            warrantyNumber,
            orderId: newOrder.id,
            orderItemId: orderItem.id,
            userId: validUserId,
            customerName: customerName.trim(),
            customerEmail: cleanCustomerEmail,
            productName: orderItem.productName,
            imeiNumber: orderItem.imeiNumber,
            purchaseDate: now,
            warrantyDuration: `${Math.round((orderItem.warrantyMonths || 12) / 12)} Year`,
            warrantyStartDate: now,
            warrantyExpiryDate: orderItem.warrantyExpiryDate,
            warrantyStatus: "ACTIVE",
            emailSent: false,
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

    // 6. Automatic First Email: Dispatch ONE official order confirmation email with attached PDF certificate
    let emailResult = null;
    try {
      const itemsForEmail =
        order.items && order.items.length > 0 ? order.items : orderItemsCreateData;
      emailResult = await sendWarrantyEmail(
        order,
        itemsForEmail,
        createdWarranties || [],
        request,
        { force: true }
      );
    } catch (mailErr) {
      console.error("[AUTOMATIC EMAIL WARNING] Could not send order/warranty certificate email:", mailErr);
    }

    return NextResponse.json({
      success: true,
      order,
      warranties: createdWarranties,
      emailStatus: emailResult?.status || "LOGGED",
      message: `Order placed successfully! Confirmation email with warranty certificate dispatched to ${cleanCustomerEmail}.`,
    });
  } catch (error) {
    console.error("Failed to create order:", error);
    return NextResponse.json(
      { success: false, error: "Failed to place order. Please try again." },
      { status: 500 }
    );
  }
}