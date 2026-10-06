import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ success: true, wishlist: [] });
    }

    const items = await prisma.wishlist.findMany({
      where: { userId },
      include: {
        product: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const products = items.map((item) => {
      const p = item.product;
      return {
        ...p,
        galleryImages: JSON.parse(p.galleryImages || "[]"),
        colors: JSON.parse(p.colors || "[]"),
        storageOptions: JSON.parse(p.storageOptions || "[]"),
        highlightFeatures: JSON.parse(p.highlightFeatures || "[]"),
      };
    });

    return NextResponse.json({ success: true, count: products.length, products });
  } catch (error) {
    console.error("Failed to fetch wishlist:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch wishlist" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, productId } = body;

    if (!userId || !productId) {
      return NextResponse.json(
        { success: false, error: "userId and productId are required." },
        { status: 400 }
      );
    }

    const existing = await prisma.wishlist.findUnique({
      where: {
        userId_productId: { userId, productId },
      },
    });

    if (existing) {
      // Remove
      await prisma.wishlist.delete({
        where: { id: existing.id },
      });
      return NextResponse.json({ success: true, action: "REMOVED" });
    } else {
      // Add
      await prisma.wishlist.create({
        data: { userId, productId },
      });
      return NextResponse.json({ success: true, action: "ADDED" });
    }
  } catch (error) {
    console.error("Failed to toggle wishlist:", error);
    return NextResponse.json({ success: false, error: "Failed to update wishlist" }, { status: 500 });
  }
}
