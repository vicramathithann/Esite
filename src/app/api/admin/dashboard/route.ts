import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const auth = await requireAdmin(request);
    if (auth instanceof Response) {
      return auth;
    }

    const [
      totalProducts,
      totalSmartphones,
      totalAccessories,
      totalCustomers,
      totalOrders,
      confirmedOrders,
      processingOrders,
      shippedOrders,
      deliveredOrders,
      cancelledOrders,
      paidOrders,
      lowStockProducts,
      lowStockCount,
      outOfStockCount,
      totalWarranties,
      activeWarranties,
    ] = await Promise.all([
      prisma.mobileProduct.count(),
      prisma.mobileProduct.count({ where: { category: "SMARTPHONE" } }),
      prisma.mobileProduct.count({ where: { category: "ACCESSORY" } }),
      prisma.user.count({ where: { role: "USER" } }),
      prisma.order.count(),
      prisma.order.count({ where: { orderStatus: { in: ["Order Confirmed", "CONFIRMED"] } } }),
      prisma.order.count({ where: { orderStatus: { in: ["Processing", "PROCESSING"] } } }),
      prisma.order.count({ where: { orderStatus: { in: ["Shipped", "SHIPPED"] } } }),
      prisma.order.count({ where: { orderStatus: { in: ["Delivered", "DELIVERED"] } } }),
      prisma.order.count({ where: { orderStatus: { in: ["Cancelled", "CANCELLED"] } } }),
      prisma.order.findMany({
        where: { orderStatus: { notIn: ["Cancelled", "CANCELLED"] } },
        select: { totalAmount: true },
      }),
      prisma.mobileProduct.findMany({
        where: { stock: { lte: 5 } },
        select: {
          id: true,
          name: true,
          brand: true,
          model: true,
          stock: true,
          inStock: true,
          category: true,
        },
        take: 10,
      }),
      prisma.mobileProduct.count({ where: { stock: { lte: 5 } } }),
      prisma.mobileProduct.count({ where: { stock: 0 } }),
      prisma.warranty.count(),
      prisma.warranty.count({
        where: {
          warrantyStatus: "ACTIVE",
          order: {
            orderStatus: { notIn: ["CANCELLED", "Cancelled", "cancelled"] },
          },
        },
      }),
    ]);

    const totalSales = paidOrders.reduce((sum: number, o: { totalAmount: number | null }) => sum + (o.totalAmount || 0), 0);

    return NextResponse.json({
      success: true,
      metrics: {
        totalProducts,
        totalSmartphones,
        totalAccessories,
        totalUsers: totalCustomers,
        totalCustomers,
        totalOrders,
        confirmedOrders,
        processingOrders,
        shippedOrders,
        deliveredOrders,
        cancelledOrders,
        totalSales,
        lowStockCount,
        outOfStockCount,
        totalWarranties,
        activeWarranties,
      },
      lowStockProducts,
    });
  } catch (error) {
    console.error("Dashboard metrics error:", error);
    return NextResponse.json({ success: false, error: "Failed to load dashboard metrics" }, { status: 500 });
  }
}
