import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const product = await prisma.mobileProduct.findUnique({
      where: { id },
    });

    if (!product) {
      return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 });
    }

    const parsed = {
      ...product,
      galleryImages: JSON.parse(product.galleryImages || "[]"),
      colors: JSON.parse(product.colors || "[]"),
      storageOptions: JSON.parse(product.storageOptions || "[]"),
      highlightFeatures: JSON.parse(product.highlightFeatures || "[]"),
    };

    return NextResponse.json({ success: true, product: parsed });
  } catch (error) {
    console.error("Failed to fetch product:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch product" }, { status: 500 });
  }
}