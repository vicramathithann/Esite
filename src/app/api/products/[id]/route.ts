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

    return NextResponse.json(
      { success: true, product: parsed },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
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
    if (!id) {
      return NextResponse.json(
        { success: false, error: "Product ID is required" },
        { status: 400 }
      );
    }

    const body = await request.json();

    const existing = await prisma.mobileProduct.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: `Product with ID "${id}" was not found.` },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {};

    // Helper for safe string trimming that never throws on null/undefined/number
    const safeTrim = (val: unknown): string | null => {
      if (val === undefined) return null;
      if (val === null) return null;
      if (typeof val === "string") return val.trim();
      return String(val).trim();
    };

    // Helper for safe JSON stringification preventing double-encoding
    const safeJsonString = (val: unknown): string => {
      if (val === undefined || val === null) return "[]";
      if (typeof val === "string") {
        try {
          JSON.parse(val);
          return val;
        } catch {
          return JSON.stringify([val]);
        }
      }
      return JSON.stringify(val);
    };

    // 1. Text & Identity fields
    if (body.name !== undefined) updateData.name = safeTrim(body.name) || existing.name;
    if (body.brand !== undefined) updateData.brand = safeTrim(body.brand) || existing.brand;
    if (body.model !== undefined) updateData.model = safeTrim(body.model);
    if (body.series !== undefined) updateData.series = safeTrim(body.series) || "";
    if (body.tagline !== undefined) updateData.tagline = safeTrim(body.tagline) || "";
    if (body.category !== undefined) {
      const cat = safeTrim(body.category);
      updateData.category = cat ? cat.toUpperCase() : "SMARTPHONE";
    }

    // 2. Pricing fields
    if (body.basePrice !== undefined) {
      const priceNum = parseInt(String(body.basePrice), 10);
      if (isNaN(priceNum) || priceNum < 0) {
        return NextResponse.json(
          { success: false, error: "Base Price must be a valid non-negative number." },
          { status: 400 }
        );
      }
      updateData.basePrice = priceNum;
    }

    if (body.discountPrice !== undefined) {
      if (body.discountPrice === null || body.discountPrice === "" || isNaN(Number(body.discountPrice))) {
        updateData.discountPrice = null;
      } else {
        const discNum = parseInt(String(body.discountPrice), 10);
        updateData.discountPrice = discNum >= 0 ? discNum : null;
      }
    }

    if (body.originalPrice !== undefined) {
      if (body.originalPrice === null || body.originalPrice === "" || isNaN(Number(body.originalPrice))) {
        updateData.originalPrice = updateData.basePrice ?? existing.basePrice;
      } else {
        const origNum = parseInt(String(body.originalPrice), 10);
        updateData.originalPrice = isNaN(origNum) ? (updateData.basePrice ?? existing.basePrice) : origNum;
      }
    }

    // 3. Stock & Visibility
    if (body.stock !== undefined) {
      const stockInt = parseInt(String(body.stock), 10);
      if (isNaN(stockInt) || stockInt < 0) {
        return NextResponse.json(
          { success: false, error: "Stock must be a valid non-negative integer." },
          { status: 400 }
        );
      }
      updateData.stock = stockInt;
      // Auto-update inStock if not explicitly passed
      if (body.inStock === undefined) {
        updateData.inStock = stockInt > 0;
      }
    }

    if (body.inStock !== undefined) {
      updateData.inStock = Boolean(body.inStock);
    }

    if (body.isFeatured !== undefined) {
      updateData.isFeatured = Boolean(body.isFeatured);
    }

    if (body.warrantyMonths !== undefined) {
      const wm = parseInt(String(body.warrantyMonths), 10);
      updateData.warrantyMonths = isNaN(wm) ? 12 : wm;
    }

    // 4. Specifications
    if (body.imageUrl !== undefined) updateData.imageUrl = safeTrim(body.imageUrl) || existing.imageUrl;
    if (body.ram !== undefined) updateData.ram = safeTrim(body.ram) || "";
    if (body.display !== undefined) updateData.display = safeTrim(body.display) || "";
    if (body.displayType !== undefined) updateData.displayType = safeTrim(body.displayType);
    if (body.processor !== undefined) updateData.processor = safeTrim(body.processor) || "";
    if (body.camera !== undefined) updateData.camera = safeTrim(body.camera) || "";
    if (body.rearCamera !== undefined) updateData.rearCamera = safeTrim(body.rearCamera);
    if (body.frontCamera !== undefined) updateData.frontCamera = safeTrim(body.frontCamera);
    if (body.battery !== undefined) updateData.battery = safeTrim(body.battery) || "";
    if (body.batteryCapacity !== undefined) updateData.batteryCapacity = safeTrim(body.batteryCapacity);
    if (body.os !== undefined) updateData.os = safeTrim(body.os) || "";
    if (body.network5G !== undefined) updateData.network5G = safeTrim(body.network5G) || "";

    // 5. JSON fields
    if (body.galleryImages !== undefined) updateData.galleryImages = safeJsonString(body.galleryImages);
    if (body.colors !== undefined) updateData.colors = safeJsonString(body.colors);
    if (body.storageOptions !== undefined) updateData.storageOptions = safeJsonString(body.storageOptions);
    if (body.highlightFeatures !== undefined) updateData.highlightFeatures = safeJsonString(body.highlightFeatures);

    const updated = await prisma.mobileProduct.update({
      where: { id },
      data: updateData,
    });

    // 6. Dual catalog synchronization: keep Mobile table in sync
    try {
      const mobileSyncData: Record<string, unknown> = {};
      if (updateData.basePrice !== undefined) mobileSyncData.price = updateData.basePrice;
      if (updateData.originalPrice !== undefined) mobileSyncData.originalPrice = updateData.originalPrice;
      if (updateData.stock !== undefined) mobileSyncData.stock = updateData.stock;
      if (updateData.brand !== undefined && typeof updateData.brand === "string") mobileSyncData.brand = updateData.brand;
      if (updateData.processor !== undefined && typeof updateData.processor === "string") mobileSyncData.processor = updateData.processor;
      if (updateData.ram !== undefined && typeof updateData.ram === "string") mobileSyncData.ram = updateData.ram;
      if (updateData.name !== undefined && typeof updateData.name === "string") mobileSyncData.model = updateData.name;
      if (updateData.camera !== undefined && typeof updateData.camera === "string") mobileSyncData.camera = updateData.camera;
      if (updateData.battery !== undefined && typeof updateData.battery === "string") mobileSyncData.battery = updateData.battery;
      if (updateData.display !== undefined && typeof updateData.display === "string") mobileSyncData.displaySize = updateData.display;
      if (updateData.os !== undefined && typeof updateData.os === "string") mobileSyncData.operatingSystem = updateData.os;
      if (updateData.tagline !== undefined && typeof updateData.tagline === "string") mobileSyncData.description = updateData.tagline;
      if (updateData.imageUrl !== undefined && typeof updateData.imageUrl === "string") mobileSyncData.imageUrl = updateData.imageUrl;

      if (Object.keys(mobileSyncData).length > 0) {
        await prisma.mobile.updateMany({
          where: { id },
          data: mobileSyncData,
        });
      }
    } catch (syncErr) {
      console.warn("Non-fatal sync warning for Mobile table:", syncErr);
    }

    return NextResponse.json({
      success: true,
      product: updated,
      message: "Product updated successfully!",
    });
  } catch (error: any) {
    console.error("Failed to update product:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to update product. Please check server logs.",
      },
      { status: 500 }
    );
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

    try {
      await prisma.mobile.deleteMany({ where: { id } });
    } catch (e) {
      console.warn("Non-fatal sync delete warning for Mobile table:", e);
    }

    return NextResponse.json({
      success: true,
      message: "Product deleted successfully!",
    });
  } catch (error: any) {
    console.error("Failed to delete product:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to delete product. Please check server logs.",
      },
      { status: 500 }
    );
  }
}