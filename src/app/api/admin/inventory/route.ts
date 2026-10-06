import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const status = searchParams.get("status"); // "all", "available", "low", "out"
    const category = searchParams.get("category");

    const where: Record<string, unknown> = {};

    if (category && category !== "all") {
      where.category = { equals: category.toUpperCase() };
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { brand: { contains: search } },
        { model: { contains: search } },
      ];
    }

    if (status === "out") {
      where.stock = 0;
    } else if (status === "low") {
      where.stock = { gt: 0, lte: 5 };
    } else if (status === "available") {
      where.stock = { gt: 5 };
    }

    const items = await prisma.mobileProduct.findMany({
      where,
      orderBy: { stock: "asc" },
      select: {
        id: true,
        name: true,
        brand: true,
        model: true,
        category: true,
        basePrice: true,
        stock: true,
        inStock: true,
        imageUrl: true,
        createdAt: true,
      },
    });

    const enriched = items.map((p) => {
      let inventoryStatus: "Available" | "Low Stock" | "Out of Stock" = "Available";
      if (p.stock <= 0) {
        inventoryStatus = "Out of Stock";
      } else if (p.stock <= 5) {
        inventoryStatus = "Low Stock";
      }

      return {
        ...p,
        status: inventoryStatus,
      };
    });

    return NextResponse.json({
      success: true,
      count: enriched.length,
      inventory: enriched,
    });
  } catch (error) {
    console.error("Inventory fetch error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch inventory" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, stock } = body;

    if (!id || stock === undefined) {
      return NextResponse.json(
        { success: false, error: "Product id and stock are required." },
        { status: 400 }
      );
    }

    const newStock = Math.max(0, parseInt(String(stock), 10));

    const updated = await prisma.mobileProduct.update({
      where: { id },
      data: {
        stock: newStock,
        inStock: newStock > 0,
      },
    });

    return NextResponse.json({
      success: true,
      product: updated,
      message: `Stock updated to ${newStock} for "${updated.name}".`,
    });
  } catch (error) {
    console.error("Inventory update error:", error);
    return NextResponse.json({ success: false, error: "Failed to update stock" }, { status: 500 });
  }
}
