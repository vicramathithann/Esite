import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser, requireAuth } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const authUser = await getAuthenticatedUser(request);
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get("phone");

    let where: Record<string, unknown> = {};

    // 1. Admin: verified by session role
    if (authUser && (authUser.role || "").toUpperCase() === "ADMIN") {
      if (phone) {
        const cleanPhone = phone.trim();
        where = { customerPhone: { contains: cleanPhone } };
      } else {
        where = {};
      }
    } else if (authUser) {
      // 2. Regular User: strictly isolated to their own authenticated phone
      const cleanPhone = authUser.phone.trim();
      const withoutCountryCode = cleanPhone.replace(/^\+91\s*/, "").trim();
      where = {
        OR: [
          { customerPhone: { equals: cleanPhone } },
          ...(withoutCountryCode ? [{ customerPhone: { contains: withoutCountryCode } }] : []),
        ],
      };
    } else if (phone) {
      // 3. Guest lookup strictly for their own matching phone
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
    const auth = await requireAuth(request);
    if (auth instanceof Response) {
      return auth;
    }
    const authUser = auth;
    const isAdmin = (authUser.role || "").toUpperCase() === "ADMIN";

    const body = await request.json();
    const { action, id } = body;

    const userPhone = authUser.phone.trim();
    const withoutCountryCode = userPhone.replace(/^\+91\s*/, "").trim();

    if (action === "MARK_READ" && id) {
      // IDOR Protection: ensure alert belongs to user or user is admin
      const alert = await prisma.smsAlert.findUnique({ where: { id } });
      if (!alert) {
        return NextResponse.json({ success: false, error: "Alert not found" }, { status: 404 });
      }

      if (!isAdmin && alert.customerPhone !== userPhone && !alert.customerPhone.includes(withoutCountryCode)) {
        return NextResponse.json({ success: false, error: "Forbidden: You cannot modify this alert" }, { status: 403 });
      }

      await prisma.smsAlert.update({
        where: { id },
        data: { isRead: true },
      });
      return NextResponse.json({ success: true, message: "Marked as read" });
    }

    if (action === "MARK_ALL_READ") {
      const condition = isAdmin
        ? { isRead: false }
        : {
            isRead: false,
            OR: [
              { customerPhone: { equals: userPhone } },
              ...(withoutCountryCode ? [{ customerPhone: { contains: withoutCountryCode } }] : []),
            ],
          };

      await prisma.smsAlert.updateMany({
        where: condition,
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