import { NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendWarrantyEmail } from "@/lib/mailer";
import { getAuthenticatedUser } from "@/lib/auth";
import { logSecurityEvent, getClientIp } from "@/lib/securityLogger";
import { revalidateProducts } from "@/lib/revalidate";

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

    // Purchase Protection: Require verified email address (Admin-created users skip OTP)
    const isPrivileged = validUser.signupSource === "admin" || (validUser.role || "").toUpperCase() === "ADMIN";
    if (!validUser.emailVerified && !isPrivileged) {
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

    // 3. Strict Server-Side Delivery Address Validation
    const cleanAddress = (address || "").trim();
    const cleanCity = (city || "").trim();
    const cleanState = (state || "").trim();
    const cleanPincode = (pincode || "").trim();

    if (!cleanAddress) {
      return NextResponse.json(
        { success: false, error: "Please enter your street address." },
        { status: 400 }
      );
    }
    if (!cleanCity) {
      return NextResponse.json(
        { success: false, error: "Please enter your city." },
        { status: 400 }
      );
    }
    if (!cleanState) {
      return NextResponse.json(
        { success: false, error: "Please enter your state." },
        { status: 400 }
      );
    }
    if (!cleanPincode) {
      return NextResponse.json(
        { success: false, error: "Please enter your PIN code." },
        { status: 400 }
      );
    }
    if (!/^[1-9][0-9]{5}$/.test(cleanPincode)) {
      return NextResponse.json(
        { success: false, error: "Enter a valid 6-digit PIN code (cannot start with 0)." },
        { status: 400 }
      );
    }

    // 4. Idempotency Check: Prevent duplicate orders from fast double-clicks
    const idempotencyKey =
      request.headers.get("x-idempotency-key") ||
      request.headers.get("idempotency-key") ||
      body.idempotencyKey ||
      null;

    if (idempotencyKey && typeof idempotencyKey === "string") {
      const existingOrder = await prisma.order.findFirst({
        where: {
          userId: validUserId,
          adminNotes: `IDEMPOTENCY:${idempotencyKey.slice(0, 64)}`,
        },
        include: { items: true },
      });
      if (existingOrder) {
        return NextResponse.json({
          success: true,
          order: existingOrder,
          idempotentReplay: true,
          message: "Order already placed.",
        });
      }
    }

    // 5. Parallel Product Lookups with Variants
    const productIds: string[] = Array.from(
      new Set(items.map((i: any) => i.productId).filter(Boolean))
    );
    const dbProducts = await prisma.mobileProduct.findMany({
      where: { id: { in: productIds } },
      include: { variants: true },
    });
    const productMap = new Map(dbProducts.map((p: any) => [p.id, p]));

    let computedBackendTotal = 0;
    const validatedProductsMap = new Map<string, { product: any; variant: any; unitPrice: number; qty: number }>();

    for (const item of items) {
      const qty = Math.max(1, parseInt(String(item.quantity || 1), 10));

      if (!item.productId) {
        return NextResponse.json(
          { success: false, error: "Invalid order item: missing product identifier." },
          { status: 400 }
        );
      }

      const product = productMap.get(item.productId);

      if (!product) {
        return NextResponse.json(
          { success: false, error: `Product not found: "${item.productName || item.productId}".` },
          { status: 404 }
        );
      }

      // Resolve specific variant
      const rawStorage = typeof item.selectedStorage === "object" && item.selectedStorage !== null
        ? item.selectedStorage.size
        : String(item.selectedStorage || "");
      const rawRam = String(item.selectedRam || "").trim();

      let matchedVariant: any = null;
      if (item.variantId && Array.isArray(product.variants)) {
        matchedVariant = product.variants.find((v: any) => v.id === item.variantId);
      }
      if (!matchedVariant && Array.isArray(product.variants) && product.variants.length > 0) {
        matchedVariant = product.variants.find((v: any) =>
          (rawStorage ? (v.storage || "").toLowerCase() === rawStorage.toLowerCase() : true) &&
          (rawRam ? (v.ram || "").toLowerCase().includes(rawRam.toLowerCase()) : true)
        );
        if (!matchedVariant && rawStorage) {
          matchedVariant = product.variants.find((v: any) => (v.storage || "").toLowerCase() === rawStorage.toLowerCase());
        }
        if (!matchedVariant) {
          matchedVariant = product.variants.find((v: any) => v.isDefault) || product.variants[0];
        }
      }

      const availableStock = matchedVariant ? matchedVariant.stock : product.stock;
      if (availableStock === undefined || availableStock <= 0 || availableStock < qty) {
        const varLabel = matchedVariant ? ` (${matchedVariant.storage})` : "";
        return NextResponse.json(
          {
            success: false,
            error: `Sorry, "${product.name}${varLabel}" is out of stock (available: ${availableStock ?? 0}, requested: ${qty}).`,
          },
          { status: 400 }
        );
      }

      const unitPrice = matchedVariant
        ? (matchedVariant.basePrice || matchedVariant.price)
        : (product.discountPrice && product.discountPrice > 0 ? product.discountPrice : product.basePrice);

      computedBackendTotal += unitPrice * qty;
      const itemKey = item.variantId ? `${item.productId}_${item.variantId}` : `${item.productId}_${rawStorage}`;
      validatedProductsMap.set(itemKey, { product, variant: matchedVariant, unitPrice, qty });
    }

    // Authoritative total calculated strictly on the server
    const orderTotal = computedBackendTotal;
    const orderNumber = `ORD${Math.floor(10000 + Math.random() * 90000)}`;
    const now = new Date();

    // 6. Prepare Order Items & IMEI numbers with verified server pricing
    const orderItemsCreateData: any[] = [];

    for (const item of items) {
      const rawStorage = typeof item.selectedStorage === "object" && item.selectedStorage !== null
        ? item.selectedStorage.size
        : String(item.selectedStorage || "");
      const itemKey = item.variantId ? `${item.productId}_${item.variantId}` : `${item.productId}_${rawStorage}`;
      const validated = validatedProductsMap.get(itemKey);
      const prod = validated?.product;
      const matchedVariant = validated?.variant;
      const unitPrice = validated?.unitPrice || 0;
      const qty = validated?.qty || 1;

      // Authoritative real product model name from database
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
        realModelName = (prod?.brand && prod?.model)
          ? `${prod.brand} ${prod.model}`
          : (prod?.name || "Samsung Galaxy S24");
      }

      const storageLabel = matchedVariant ? matchedVariant.storage : (typeof item.selectedStorage === "object" ? item.selectedStorage.size : (item.selectedStorage || ""));
      const pName = storageLabel && !realModelName.includes(storageLabel) ? `${realModelName} ${storageLabel}` : realModelName;
      const pBrand = prod ? prod.brand : (item.productBrand || "VN Mobiles");
      const pImage = prod ? prod.imageUrl : (item.productImageUrl || "/images/placeholder.png");

      const imei = `86${Math.floor(1000000000000 + Math.random() * 9000000000000)}`;
      const months = item.warrantyMonths || 12;
      const expiry = new Date(now);
      expiry.setFullYear(expiry.getFullYear() + Math.max(1, Math.round(months / 12)));

      const colorStr =
        typeof item.selectedColor === "object" && item.selectedColor !== null
          ? item.selectedColor.name
          : (item.selectedColor || "Standard");

      const storageStr =
        typeof item.selectedStorage === "object" && item.selectedStorage !== null
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

    // 7. Atomic Database Transaction: Deduct stock, create order, create warranties, and update profile
    const fullDeliveryAddress = `${cleanAddress}, ${cleanCity}, ${cleanState} - ${cleanPincode}`;

    const { order, createdWarranties } = await prisma.$transaction(async (tx: any) => {
      // 7a. Deduct stock in parallel (both variant-level and product-level)
      await Promise.all(
        items.map(async (item: any) => {
          const rawStorage = typeof item.selectedStorage === "object" && item.selectedStorage !== null
            ? item.selectedStorage.size
            : String(item.selectedStorage || "");
          const itemKey = item.variantId ? `${item.productId}_${item.variantId}` : `${item.productId}_${rawStorage}`;
          const validated = validatedProductsMap.get(itemKey);
          const qty = Math.max(1, parseInt(String(item.quantity || 1), 10));
          const prod = validated?.product;
          const variant = validated?.variant;

          if (variant?.id) {
            const updatedVarStock = Math.max(0, (variant.stock || 0) - qty);
            try {
              await tx.productVariant.update({
                where: { id: variant.id },
                data: { stock: updatedVarStock },
              });
            } catch (vErr) {
              console.warn("Could not update variant stock row:", vErr);
            }
          }

          const updatedStock = Math.max(0, (prod?.stock || 0) - qty);
          return tx.mobileProduct.update({
            where: { id: item.productId },
            data: {
              stock: updatedStock,
              inStock: updatedStock > 0,
            },
          });
        })
      );

      // 7b. Create Order in Database
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          userId: validUserId,
          customerName: customerName.trim(),
          customerPhone: customerPhone ? customerPhone.trim() : "",
          phoneVerified: true,
          customerEmail: cleanCustomerEmail,
          address: cleanAddress,
          city: cleanCity,
          pincode: cleanPincode,
          state: cleanState,
          totalAmount: orderTotal,
          paymentMethod: paymentMethod || "Online Payment",
          adminNotes: idempotencyKey ? `IDEMPOTENCY:${idempotencyKey.slice(0, 64)}` : null,
          paymentStatus:
            paymentMethod &&
            (paymentMethod.toUpperCase().includes("COD") ||
              paymentMethod.toUpperCase().includes("CASH ON DELIVERY") ||
              paymentMethod.toUpperCase().includes("PAY ON DELIVERY"))
              ? "PENDING"
              : "PAID",
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

      // 7c. Register Mobile Product Warranties in parallel
      const warranties = await Promise.all(
        newOrder.items.map((orderItem: any, i: number) => {
          const warrantyNumber = `WRT-${newOrder.orderNumber}-${i + 1}`;
          return tx.warranty.create({
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
        })
      );

      // 7d. Automatically save address to user's profile inside the same transaction
      try {
        await tx.user.update({
          where: { id: validUserId },
          data: {
            address: fullDeliveryAddress,
          },
        });
      } catch (profileErr) {
        console.warn("[CHECKOUT] Could not update profile address in transaction:", profileErr);
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

    try {
      items.forEach((it: any) => {
        if (it?.productId) revalidateProducts(it.productId);
      });
    } catch {}

    // 8. Non-blocking Asynchronous Background Work:
    // Move email and PDF certificate generation OUT of the critical HTTP response path!
    // The client gets an instant response, while Next.js / Vercel runs after() in the background.
    after(async () => {
      try {
        const itemsForEmail =
          order.items && order.items.length > 0 ? order.items : orderItemsCreateData;
        await sendWarrantyEmail(
          order,
          itemsForEmail,
          createdWarranties || [],
          request,
          { force: true }
        );
        console.log(`[ORDER DISPATCH] Order #${order.orderNumber} warranty confirmation sent in background.`);
      } catch (mailErr) {
        console.error("[AUTOMATIC EMAIL WARNING] Could not send background order/warranty certificate email:", mailErr);
      }
    });

    // 9. Instant HTTP Response:
    // Returns immediately without waiting for PDF synthesis or SMTP network round-trips!
    return NextResponse.json({
      success: true,
      order,
      warranties: createdWarranties,
      savedAddress: {
        address: cleanAddress,
        city: cleanCity,
        state: cleanState,
        pincode: cleanPincode,
        fullAddress: fullDeliveryAddress,
      },
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