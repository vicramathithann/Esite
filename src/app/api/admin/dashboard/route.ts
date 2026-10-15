import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const auth = await requireAdmin(request);
    if (auth instanceof Response) {
      return auth;
    }

    const totalProducts = await prisma.mobileProduct.count();
    const totalSmartphones = await prisma.mobileProduct.count({
      where: { category: "SMARTPHONE" },
    });
    const totalAccessories = await prisma.mobileProduct.count({
      where: { category: "ACCESSORY" },
    });

    const totalCustomers = await prisma.user.count({
      where: { role: "USER" },
    });

    const totalOrders = await prisma.order.count();
    const confirmedOrders = await prisma.order.count({ where: { orderStatus: { in: ["Order Confirmed", "CONFIRMED"] } } });
    const processingOrders = await prisma.order.count({ where: { orderStatus: { in: ["Processing", "PROCESSING"] } } });
    const shippedOrders = await prisma.order.count({ where: { orderStatus: { in: ["Shipped", "SHIPPED"] } } });
    const deliveredOrders = await prisma.order.count({ where: { orderStatus: { in: ["Delivered", "DELIVERED"] } } });
    const cancelledOrders = await prisma.order.count({ where: { orderStatus: { in: ["Cancelled", "CANCELLED"] } } });

    // Total sales calculation
    const paidOrders = await prisma.order.findMany({
      where: {
        orderStatus: { notIn: ["Cancelled", "CANCELLED"] },
      },
      select: { totalAmount: true },
    });
    const totalSales = paidOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

    // Low stock products (stock <= 5)
    const lowStockProducts = await prisma.mobileProduct.findMany({
      where: {
        stock: { lte: 5 },
      },
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
    });

    const lowStockCount = await prisma.mobileProduct.count({
      where: { stock: { lte: 5 } },
    });

    const outOfStockCount = await prisma.mobileProduct.count({
      where: { stock: 0 },
    });

    const totalWarranties = await prisma.warranty.count();
    const activeWarranties = await prisma.warranty.count({ where: { warrantyStatus: "ACTIVE" } });

    return NextResponse.json({
      success: true,
      metrics: {
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
