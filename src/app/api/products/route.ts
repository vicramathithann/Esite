import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const brand = searchParams.get("brand");
    const search = searchParams.get("search");
    const sort = searchParams.get("sort");
    const maxPrice = searchParams.get("maxPrice");

    const where: Record<string, unknown> = {};

    if (brand && brand !== "All") {
      where.brand = { equals: brand };
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { brand: { contains: search } },
        { processor: { contains: search } },
        { tagline: { contains: search } },
      ];
    }

    if (maxPrice) {
      where.basePrice = { lte: parseInt(maxPrice, 10) };
    }

    let orderBy: Record<string, string> = { createdAt: "desc" };
    if (sort === "price-asc") orderBy = { basePrice: "asc" };
    else if (sort === "price-desc") orderBy = { basePrice: "desc" };
    else if (sort === "rating") orderBy = { rating: "desc" };

    const products = await prisma.mobileProduct.findMany({
      where,
      orderBy,
    });

    const parsed = products.map((p) => ({
      ...p,
      galleryImages: JSON.parse(p.galleryImages || "[]"),
      colors: JSON.parse(p.colors || "[]"),
      storageOptions: JSON.parse(p.storageOptions || "[]"),
      highlightFeatures: JSON.parse(p.highlightFeatures || "[]"),
    }));

    return NextResponse.json({ success: true, count: parsed.length, products: parsed });
  } catch (error) {
    console.error("Failed to fetch products:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch products" }, { status: 500 });
  }
}