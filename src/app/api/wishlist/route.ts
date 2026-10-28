import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser, requireAuth } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const authUser = await getAuthenticatedUser(request);
    const { searchParams } = new URL(request.url);
    const requestedUserId = searchParams.get("userId");

    // Must be authenticated to access private wishlist
    const targetUserId = authUser ? authUser.id : requestedUserId;

    if (!targetUserId) {
      return NextResponse.json({ success: true, wishlist: [] });
    }

    // IDOR Protection: regular users can only see their own wishlist
    if (authUser && requestedUserId && requestedUserId !== authUser.id && (authUser.role || "").toUpperCase() !== "ADMIN") {
      return NextResponse.json({ success: true, count: 0, products: [] });
    }

    const items = await prisma.wishlist.findMany({
      where: { userId: targetUserId },
      include: {
        product: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const products = items.map((item: {
      product: {
        galleryImages?: string | null;
        colors?: string | null;
        storageOptions?: string | null;
        highlightFeatures?: string | null;
        [key: string]: any;
      };
    }) => {
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
    const auth = await requireAuth(request);
    if (auth instanceof Response) {
      return auth;
    }
    const authUser = auth;

    const body = await request.json();
    const { productId } = body;

    if (!productId) {
      return NextResponse.json(
        { success: false, error: "productId is required." },
        { status: 400 }
      );
    }

    // Always use session identity to prevent IDOR
    const userId = authUser.id;

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
