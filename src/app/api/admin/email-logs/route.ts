import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { retryEmailNotification } from "@/lib/email";
import { requireAdmin, requireMainAdmin } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const auth = await requireAdmin(request);
    if (auth instanceof Response) {
      return auth;
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const emailType = searchParams.get("emailType");
    const search = searchParams.get("search");

    const where: Record<string, unknown> = {};

    if (status) where.status = status;
    if (emailType) where.emailType = emailType;
    if (search) {
      where.OR = [
        { recipientEmail: { contains: search } },
        { recipientName: { contains: search } },
        { subject: { contains: search } },
        { orderId: { contains: search } },
      ];
    }

    const logs = await prisma.emailNotification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        order: {
          select: { orderNumber: true, totalAmount: true },
        },
      },
    });

    const total = await prisma.emailNotification.count();
    const sentCount = await prisma.emailNotification.count({ where: { status: "SENT" } });
    const failedCount = await prisma.emailNotification.count({ where: { status: "FAILED" } });

    return NextResponse.json({
      success: true,
      count: logs.length,
      stats: { total, sentCount, failedCount },
      logs,
    });
  } catch (error) {
    console.error("Failed to fetch email logs:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch email logs" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAdmin(request);
    if (auth instanceof Response) {
      return auth;
    }

    const body = await request.json();
    const { notificationId } = body;

    if (!notificationId) {
      return NextResponse.json(
        { success: false, error: "notificationId is required." },
        { status: 400 }
      );
    }

    const result = await retryEmailNotification(notificationId);

    return NextResponse.json({
      success: result.success,
      status: result.status,
      message: result.message,
      error: result.error,
    });
  } catch (error) {
    console.error("Failed to retry email notification:", error);
    return NextResponse.json(
      { success: false, error: "Failed to retry email." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await requireMainAdmin(request);
    if (auth instanceof Response) {
      return auth;
    }

    const deleteResult = await prisma.emailNotification.deleteMany({});

    return NextResponse.json({
      success: true,
      count: deleteResult.count,
      message: `All email logs (${deleteResult.count}) cleared successfully.`,
    });
  } catch (error) {
    console.error("Clear all email logs error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to clear email logs." },
      { status: 500 }
    );
  }
}
