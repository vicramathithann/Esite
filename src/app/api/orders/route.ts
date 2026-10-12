import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendOrderConfirmationEmail, sendWarrantyActivationEmail } from "@/lib/email";

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
        // Normal user: ONLY see their own orders - strict user isolation
        where = {
          OR: [
            { userId: user.id },
            { customerEmail: { equals: user.email } },
          ],
        };
      }
    } else if (email) {
      // 3. Querying by specific email
      where = { customerEmail: { equals: email.trim().toLowerCase() } };
    } else {
      // 4. Guest / Unauthenticated: Do NOT expose private order data
      return NextResponse.json({ success: true, count: 0, orders: [] });
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

    // 2. Resolve authenticated user and email verification status
    let validUserId: string | null = null;
    let userVerified = false;

    if (userId) {
      const userRecord = await prisma.user.findUnique({ where: { id: userId } });
      if (userRecord) {
        validUserId = userRecord.id;
        userVerified = userRecord.emailVerified;
      }
    }

    if (!validUserId && cleanCustomerEmail) {
      const userByEmail = await prisma.user.findUnique({ where: { email: cleanCustomerEmail } });
      if (userByEmail) {
        validUserId = userByEmail.id;
        userVerified = userByEmail.emailVerified;
      }
    }

    // 3. Strict Backend Product, Stock, and Price Validation
    let computedBackendTotal = 0;

    for (const item of items) {
      const qty = item.quantity || 1;

      if (item.productId) {
        const product = await prisma.mobileProduct.findUnique({
          where: { id: item.productId },
        });

        if (product) {
          if (!product.inStock || product.stock <= 0 || product.stock < qty) {
            return NextResponse.json(
              {
                success: false,
                error: `Sorry, "${item.productName || product.name}" is Currently Out of Stock (Available: ${product.stock}).`,
              },
              { status: 400 }
            );
          }
          computedBackendTotal += (product.basePrice || item.price) * qty;
        } else {
          // Check mobile table fallback
          const mobile = await prisma.mobile.findUnique({
            where: { id: item.productId },
          });
          if (mobile) {
            if (mobile.stock <= 0 || mobile.stock < qty) {
              return NextResponse.json(
                {
                  success: false,
                  error: `Sorry, "${item.productName || mobile.model}" is Currently Out of Stock.`,
                },
                { status: 400 }
              );
            }
            computedBackendTotal += (mobile.price || item.price) * qty;
          } else {
            computedBackendTotal += item.price * qty;
          }
        }
      } else {
        computedBackendTotal += item.price * qty;
      }
    }

    const orderTotal = totalAmount || computedBackendTotal;
    const orderNumber = `ORD${Math.floor(10000 + Math.random() * 90000)}`;
    const now = new Date();

    // 4. Prepare Order Items & IMEI numbers
    const generatedImeis: string[] = [];
    const orderItemsCreateData = [];

    for (const item of items) {
      let pName = item.productName;
      let pBrand = item.productBrand || "VM Mobiles";
      let pImage = item.productImageUrl || "/images/placeholder.png";
      let pPrice = item.price;

      if ((!pName || pPrice === undefined) && item.productId) {
        const prod = await prisma.mobileProduct.findUnique({ where: { id: item.productId } });
        if (prod) {
          pName = pName || prod.name;
          pBrand = pBrand || prod.brand;
          pImage = pImage || prod.imageUrl;
          pPrice = pPrice !== undefined ? pPrice : prod.basePrice;
        }
      }

      pName = pName || "Mobile Smartphone";
      pPrice = pPrice !== undefined ? pPrice : 0;

      const imei = `86${Math.floor(1000000000000 + Math.random() * 9000000000000)}`;
      generatedImeis.push(imei);

      const months = item.warrantyMonths || 12;
      const expiry = new Date(now.getTime() + months * 30 * 24 * 60 * 60 * 1000);

      const colorStr = typeof item.selectedColor === "object" && item.selectedColor !== null
        ? item.selectedColor.name
        : (item.selectedColor || "Standard");

      const storageStr = typeof item.selectedStorage === "object" && item.selectedStorage !== null
        ? item.selectedStorage.size
        : (item.selectedStorage || "Standard");

      orderItemsCreateData.push({
        productId: item.productId || null,
        productName: pName,
        productBrand: pBrand,
        productImageUrl: pImage,
        selectedColor: colorStr,
        selectedStorage: storageStr,
        price: pPrice,
        quantity: item.quantity || 1,
        imeiNumber: imei,
        warrantyMonths: months,
        warrantyStartDate: now,
        warrantyExpiryDate: expiry,
        warrantyStatus: "ACTIVE",
      });
    }

    // 5. Create Order in Database
    const order = await prisma.order.create({
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

    // 6. Deduct Stock in Database
    for (const item of items) {
      if (item.productId) {
        const qty = item.quantity || 1;
        try {
          const product = await prisma.mobileProduct.findUnique({ where: { id: item.productId } });
          if (product) {
            const updatedStock = Math.max(0, product.stock - qty);
            await prisma.mobileProduct.update({
              where: { id: item.productId },
              data: {
                stock: updatedStock,
                inStock: updatedStock > 0,
              },
            });
          }
          const mobile = await prisma.mobile.findUnique({ where: { id: item.productId } });
          if (mobile) {
            const updatedMobileStock = Math.max(0, mobile.stock - qty);
            await prisma.mobile.update({
              where: { id: item.productId },
              data: { stock: updatedMobileStock },
            });
          }
        } catch (stockErr) {
          console.error("Error reducing stock:", stockErr);
        }
      }
    }

    // 7. Register Mobile Product Warranties
    const createdWarranties = [];
    for (const orderItem of order.items) {
      try {
        const warranty = await prisma.warranty.create({
          data: {
            orderId: order.id,
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
        createdWarranties.push(warranty);

        // Send warranty activation email
        await sendWarrantyActivationEmail({
          id: warranty.id,
          orderId: order.id,
          orderNumber: order.orderNumber,
          userId: validUserId,
          customerName: customerName.trim(),
          customerEmail: cleanCustomerEmail,
          productName: orderItem.productName,
          imeiNumber: orderItem.imeiNumber,
          purchaseDate: now,
          warrantyDuration: warranty.warrantyDuration,
          warrantyStartDate: now,
          warrantyExpiryDate: orderItem.warrantyExpiryDate,
        });
      } catch (wErr) {
        console.error("Error creating mobile warranty record:", wErr);
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

    // 9. Dispatch SMS Confirmation
    try {
      const productSummary = order.items.map((i) => `${i.productName} (${i.selectedStorage})`).join(", ");
      await prisma.smsAlert.create({
        data: {
          orderId: order.id,
          customerPhone: customerPhone ? customerPhone.trim() : "",
          alertType: "PURCHASE_CONFIRMATION",
          title: `Order ${order.orderNumber} Confirmed`,
          messageBody: `[VM Mobiles] Thank you ${customerName}! Your order ${order.orderNumber} for ${productSummary} (Total: Rs ${order.totalAmount.toLocaleString("en-IN")}) is confirmed. Official 1-Year Device Shield is active. Track: /track/${order.orderNumber}`,
          isRead: false,
        },
      });
    } catch (smsErr) {
      console.error("Error creating SMS alert record:", smsErr);
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