import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get("phone");
    const userId = searchParams.get("userId");
    const admin = searchParams.get("admin");
    const role = searchParams.get("role");

    let where: Record<string, unknown> = {};

    if (admin === "true" || role === "ADMIN") {
      where = {};
    } else if (userId) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        return NextResponse.json({ success: true, count: 0, unreadCount: 0, alerts: [] });
      }
      if (user.role === "ADMIN") {
        where = {};
      } else {
        const cleanPhone = user.phone.trim();
        const withoutCountryCode = cleanPhone.replace(/^\+91\s*/, "").trim();
        where = {
          OR: [
            { customerPhone: { equals: cleanPhone } },
            ...(withoutCountryCode ? [{ customerPhone: { contains: withoutCountryCode } }] : []),
          ],
        };
      }
    } else if (phone) {
      const cleanPhone = phone.trim();
      const withoutCountryCode = cleanPhone.replace(/^\+91\s*/, "").trim();
      where = {
        OR: [
          { customerPhone: { equals: cleanPhone } },
          ...(withoutCountryCode ? [{ customerPhone: { contains: withoutCountryCode } }] : []),
        ],
      };
    } else {
      return NextResponse.json({ success: true, count: 0, unreadCount: 0, alerts: [] });
    }

    const alerts = await prisma.smsAlert.findMany({
      where,
      orderBy: { sentAt: "desc" },
      take: 50,
    });

    const unreadCount = await prisma.smsAlert.count({
      where: {
        ...where,
        isRead: false,
      },
    });

    return NextResponse.json({ success: true, count: alerts.length, unreadCount, alerts });
  } catch (error) {
    console.error("Failed to fetch SMS alerts:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch SMS alerts" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, id } = body;

    if (action === "MARK_READ" && id) {
      await prisma.smsAlert.update({
        where: { id },
        data: { isRead: true },
      });
      return NextResponse.json({ success: true, message: "Marked as read" });
    }

    if (action === "MARK_ALL_READ") {
      await prisma.smsAlert.updateMany({
        where: { isRead: false },
        data: { isRead: true },
      });
      return NextResponse.json({ success: true, message: "All marked as read" });
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Failed to update SMS status:", error);
    return NextResponse.json({ success: false, error: "Failed to update SMS status" }, { status: 500 });
  }
}