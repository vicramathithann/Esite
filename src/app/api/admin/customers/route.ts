import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const auth = await requireAdmin(request);
    if (auth instanceof Response) {
      return auth;
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");

    const where: Record<string, unknown> = {
      role: "USER",
    };

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        emailVerified: true,
        createdAt: true,
        orders: {
          select: {
            id: true,
            totalAmount: true,
            orderStatus: true,
          },
        },
      },
    });

    const customers = users.map((u) => {
      const orderCount = u.orders.length;
      const totalSpent = u.orders
        .filter((o) => o.orderStatus !== "Cancelled" && o.orderStatus !== "CANCELLED")
        .reduce((sum, o) => sum + (o.totalAmount || 0), 0);

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        emailVerified: u.emailVerified,
        orderCount,
        totalSpent,
        registeredAt: u.createdAt,
      };
    });

    return NextResponse.json({
      success: true,
      count: customers.length,
      users: customers,
      customers,
    });
  } catch (error) {
    console.error("Users/Customers fetch error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch user list" }, { status: 500 });
  }
}
