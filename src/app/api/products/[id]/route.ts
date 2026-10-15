import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const product = await prisma.mobileProduct.findUnique({
      where: { id },
      include: {
        variants: true,
        reviews: {
          orderBy: { createdAt: "desc" },
        },
      },
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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin(request);
    if (auth instanceof Response) {
      return auth;
    }

    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.mobileProduct.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};

    if (body.name !== undefined) updateData.name = body.name.trim();
    if (body.brand !== undefined) updateData.brand = body.brand.trim();
    if (body.model !== undefined) updateData.model = body.model.trim();
    if (body.series !== undefined) updateData.series = body.series.trim();
    if (body.tagline !== undefined) updateData.tagline = body.tagline.trim();
    if (body.category !== undefined) updateData.category = body.category.toUpperCase();
    if (body.basePrice !== undefined) updateData.basePrice = parseInt(String(body.basePrice), 10);
    if (body.discountPrice !== undefined) updateData.discountPrice = body.discountPrice ? parseInt(String(body.discountPrice), 10) : null;
    if (body.originalPrice !== undefined) updateData.originalPrice = parseInt(String(body.originalPrice), 10);
    if (body.imageUrl !== undefined) updateData.imageUrl = body.imageUrl;
    if (body.galleryImages !== undefined) updateData.galleryImages = JSON.stringify(body.galleryImages);
    if (body.colors !== undefined) updateData.colors = JSON.stringify(body.colors);
    if (body.storageOptions !== undefined) updateData.storageOptions = JSON.stringify(body.storageOptions);
    if (body.ram !== undefined) updateData.ram = body.ram;
    if (body.display !== undefined) updateData.display = body.display;
    if (body.displayType !== undefined) updateData.displayType = body.displayType;
    if (body.processor !== undefined) updateData.processor = body.processor;
    if (body.camera !== undefined) updateData.camera = body.camera;
    if (body.rearCamera !== undefined) updateData.rearCamera = body.rearCamera;
    if (body.frontCamera !== undefined) updateData.frontCamera = body.frontCamera;
    if (body.battery !== undefined) updateData.battery = body.battery;
    if (body.batteryCapacity !== undefined) updateData.batteryCapacity = body.batteryCapacity;
    if (body.os !== undefined) updateData.os = body.os;
    if (body.network5G !== undefined) updateData.network5G = body.network5G;
    if (body.warrantyMonths !== undefined) updateData.warrantyMonths = parseInt(String(body.warrantyMonths), 10);
    if (body.stock !== undefined) {
      const stockInt = parseInt(String(body.stock), 10);
      updateData.stock = stockInt;
      updateData.inStock = stockInt > 0;
    }
    if (body.inStock !== undefined) updateData.inStock = Boolean(body.inStock);
    if (body.isFeatured !== undefined) updateData.isFeatured = Boolean(body.isFeatured);
    if (body.highlightFeatures !== undefined) updateData.highlightFeatures = JSON.stringify(body.highlightFeatures);

    const updated = await prisma.mobileProduct.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      product: updated,
      message: "Product updated successfully!",
    });
  } catch (error) {
    console.error("Failed to update product:", error);
    return NextResponse.json({ success: false, error: "Failed to update product" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin(request);
    if (auth instanceof Response) {
      return auth;
    }

    const { id } = await params;

    // Delete variants and reviews first
    await prisma.productVariant.deleteMany({ where: { productId: id } });
    await prisma.review.deleteMany({ where: { productId: id } });
    await prisma.wishlist.deleteMany({ where: { productId: id } });

    await prisma.mobileProduct.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Product deleted successfully!",
    });
  } catch (error) {
    console.error("Failed to delete product:", error);
    return NextResponse.json({ success: false, error: "Failed to delete product" }, { status: 500 });
  }
}