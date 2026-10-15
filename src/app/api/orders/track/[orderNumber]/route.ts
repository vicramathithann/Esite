import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/rateLimit";

function maskName(name: string): string {
  if (!name) return "Customer";
  return name
    .trim()
    .split(/\s+/)
    .map((word) => (word.length > 1 ? `${word[0]}${"*".repeat(Math.min(word.length - 1, 4))}` : word))
    .join(" ");
}

function maskPhone(phone: string): string {
  if (!phone) return "";
  const cleaned = phone.trim();
  return cleaned.replace(/\d(?=\d{3})/g, "*");
}

function maskEmail(email: string): string {
  if (!email || !email.includes("@")) return "";
  const [local, domain] = email.split("@");
  const maskedLocal = local.length > 2 ? `${local[0]}${"*".repeat(local.length - 2)}${local.slice(-1)}` : `${local[0]}*`;
  return `${maskedLocal}@${domain}`;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ orderNumber: string }> }
) {
  try {
    const rateLimitError = enforceRateLimit(request, {
      keyPrefix: "order_track",
      maxRequests: 30,
      windowSeconds: 60,
    });
    if (rateLimitError) return rateLimitError;

    const { orderNumber } = await params;
    const cleanOrderNumber = (orderNumber || "").trim();

    if (!cleanOrderNumber) {
      return NextResponse.json(
        { success: false, error: "Order tracking number is required." },
        { status: 400 }
      );
    }

    const order = await prisma.order.findUnique({
      where: { orderNumber: cleanOrderNumber },
      include: {
        items: true,
        smsAlerts: {
          orderBy: { sentAt: "desc" },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: "Order not found. Please verify your order number." },
        { status: 404 }
      );
    }

    const authUser = await getAuthenticatedUser(request);
    const isOwnerOrAdmin = authUser && (
      (authUser.role || "").toUpperCase() === "ADMIN" ||
      authUser.id === order.userId ||
      authUser.email.toLowerCase() === order.customerEmail.toLowerCase() ||
      authUser.phone.trim() === order.customerPhone.trim()
    );

    if (isOwnerOrAdmin) {
      return NextResponse.json({ success: true, order });
    }

    // Mask PII for public / unauthenticated tracking requests
    const maskedOrder = {
      ...order,
      customerName: maskName(order.customerName),
      customerPhone: maskPhone(order.customerPhone),
      customerEmail: maskEmail(order.customerEmail),
      address: "Residential Address (Protected for Privacy)",
      pincode: order.pincode ? `${order.pincode.slice(0, 3)}***` : "",
      smsAlerts: order.smsAlerts
        .filter((alert) => alert.alertType !== "OTP_VERIFICATION")
        .map((alert) => ({
          ...alert,
          customerPhone: maskPhone(alert.customerPhone),
        })),
    };

    return NextResponse.json({ success: true, order: maskedOrder });
  } catch (error) {
    console.error("Failed to track order:", error);
    return NextResponse.json(
      { success: false, error: "Failed to track order" },
      { status: 500 }
    );
  }
}

