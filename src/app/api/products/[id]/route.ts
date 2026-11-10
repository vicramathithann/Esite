import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { revalidateProducts } from "@/lib/revalidate";
import { validateSafeImageUrl } from "@/lib/ssrf";

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

    let parsedImages: any[] = [];
    try {
      const parsedGallery = JSON.parse(product.galleryImages || "[]");
      if (Array.isArray(parsedGallery) && parsedGallery.length > 0) {
        if (typeof parsedGallery[0] === "object" && parsedGallery[0] !== null && parsedGallery[0].url) {
          parsedImages = parsedGallery;
        } else {
          parsedImages = parsedGallery.map((u: string, idx: number) => ({
            url: u,
            alt: `${product.name} Photo ${idx + 1}`,
            isPrimary: idx === 0,
            order: idx,
          }));
        }
      }
    } catch {}
    if (parsedImages.length === 0 && product.imageUrl) {
      parsedImages = [
        {
          url: product.imageUrl,
          alt: product.name,
          isPrimary: true,
          order: 0,
        },
      ];
    }

    const parsed = {
      ...product,
      galleryImages: JSON.parse(product.galleryImages || "[]"),
      images: parsedImages,
      colors: JSON.parse(product.colors || "[]"),
      storageOptions: JSON.parse(product.storageOptions || "[]"),
      highlightFeatures: JSON.parse(product.highlightFeatures || "[]"),
      variants: product.variants || [],
    };

    return NextResponse.json(
      { success: true, product: parsed },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          "Pragma": "no-cache",
          "Expires": "0",
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

    // 2. Pricing & Variants fields
    let processedVariants: any[] | null = null;
    if (body.variants !== undefined) {
      if (!Array.isArray(body.variants) || body.variants.length === 0) {
        return NextResponse.json(
          { success: false, error: "At least one variant is required." },
          { status: 400 }
        );
      }

      const seenPairs = new Set<string>();
      processedVariants = [];

      for (let i = 0; i < body.variants.length; i++) {
        const v = body.variants[i];
        const ram = String(v.ram || "").trim();
        const storage = String(v.storage || "").trim();
        if (!ram) {
          return NextResponse.json(
            { success: false, error: `Row ${i + 1}: RAM is required.` },
            { status: 400 }
          );
        }
        if (!storage) {
          return NextResponse.json(
            { success: false, error: `Row ${i + 1}: Storage is required.` },
            { status: 400 }
          );
        }

        const pairKey = `${ram.toLowerCase()}_${storage.toLowerCase()}`;
        if (seenPairs.has(pairKey)) {
          return NextResponse.json(
            { success: false, error: `Row ${i + 1}: Duplicate RAM (${ram}) and Storage (${storage}) variant.` },
            { status: 400 }
          );
        }
        seenPairs.add(pairKey);

        const bp = parseInt(String(v.basePrice), 10);
        if (isNaN(bp) || bp <= 0) {
          return NextResponse.json(
            { success: false, error: `Row ${i + 1}: Base price must be greater than 0.` },
            { status: 400 }
          );
        }

        const opStr = v.originalPrice !== undefined && v.originalPrice !== null ? String(v.originalPrice).trim() : "";
        let op = bp;
        if (opStr !== "") {
          const parsedOp = parseInt(opStr, 10);
          if (isNaN(parsedOp) || parsedOp < bp) {
            return NextResponse.json(
              { success: false, error: `Row ${i + 1}: Original price must be greater than or equal to Base price.` },
              { status: 400 }
            );
          }
          op = parsedOp;
        }

        const stStr = v.stock !== undefined && v.stock !== null ? String(v.stock).trim() : "0";
        const st = parseInt(stStr, 10);
        if (isNaN(st) || st < 0) {
          return NextResponse.json(
            { success: false, error: `Row ${i + 1}: Stock cannot be negative.` },
            { status: 400 }
          );
        }

        const isDefault = Boolean(v.isDefault);
        const inStock = v.inStock !== undefined ? Boolean(v.inStock) : st > 0;
        const sku = String(v.sku || "").trim();
        const vid = v.id && !v.id.startsWith("temp-") ? v.id : `${id}-${ram.toLowerCase().replace(/[^a-z0-9]/g, '')}-${storage.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

        processedVariants.push({
          id: vid,
          productId: id,
          ram,
          storage,
          basePrice: bp,
          originalPrice: op,
          stock: st,
          inStock,
          sku,
          isDefault,
        });
      }

      if (!processedVariants.some((v) => v.isDefault)) {
        processedVariants[0].isDefault = true;
      }

      const defaultVariant = processedVariants.find((v) => v.isDefault) || processedVariants[0];
      const lowestVariant = [...processedVariants].sort((a, b) => a.basePrice - b.basePrice)[0];

      updateData.basePrice = lowestVariant.basePrice;
      updateData.originalPrice = defaultVariant.originalPrice || lowestVariant.originalPrice;
      updateData.stock = processedVariants.reduce((sum, v) => sum + v.stock, 0);
      updateData.inStock = processedVariants.some((v) => v.stock > 0 && v.inStock);

      const uniqueRams = Array.from(new Set(processedVariants.map((v) => v.ram)));
      updateData.ram = uniqueRams.join(" / ");

      updateData.storageOptions = JSON.stringify(
        processedVariants.map((v) => ({
          id: v.id,
          size: v.storage,
          storage: v.storage,
          ram: v.ram,
          basePrice: v.basePrice,
          price: v.basePrice,
          originalPrice: v.originalPrice,
          stock: v.stock,
          inStock: v.inStock,
          sku: v.sku,
          isDefault: v.isDefault,
        }))
      );
    } else {
      // Legacy fallback for single price/stock/ram update
      if (body.basePrice !== undefined) {
        if (body.basePrice === null || String(body.basePrice).trim() === "") {
          return NextResponse.json(
            { success: false, error: "Base Price is required." },
            { status: 400 }
          );
        }
        const priceNum = parseInt(String(body.basePrice), 10);
        if (isNaN(priceNum) || priceNum <= 0) {
          return NextResponse.json(
            { success: false, error: "Base Price must be a valid number greater than 0." },
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
        if (body.originalPrice === null || String(body.originalPrice).trim() === "") {
          updateData.originalPrice = updateData.basePrice ?? existing.basePrice;
        } else {
          const origNum = parseInt(String(body.originalPrice), 10);
          const effectiveBasePrice = (updateData.basePrice as number) ?? existing.basePrice;
          if (isNaN(origNum) || origNum < effectiveBasePrice) {
            return NextResponse.json(
              { success: false, error: "Original Price must be greater than or equal to Base Price." },
              { status: 400 }
            );
          }
          updateData.originalPrice = origNum;
        }
      }

      // Stock & Visibility
      if (body.stock !== undefined) {
        if (body.stock === null || String(body.stock).trim() === "") {
          return NextResponse.json(
            { success: false, error: "Available stock is required." },
            { status: 400 }
          );
        }
        const stockInt = parseInt(String(body.stock), 10);
        if (isNaN(stockInt) || stockInt < 0) {
          return NextResponse.json(
            { success: false, error: "Stock must be a valid non-negative integer." },
            { status: 400 }
          );
        }
        updateData.stock = stockInt;
        if (body.inStock === undefined) {
          updateData.inStock = stockInt > 0;
        }
      }

      if (body.inStock !== undefined) {
        updateData.inStock = Boolean(body.inStock);
      }
    }

    if (body.isFeatured !== undefined) {
      updateData.isFeatured = Boolean(body.isFeatured);
    }

    if (body.warrantyMonths !== undefined) {
      const wm = parseInt(String(body.warrantyMonths), 10);
      updateData.warrantyMonths = isNaN(wm) ? 12 : wm;
    }

    // 4. Product Images
    if (body.images !== undefined) {
      if (!Array.isArray(body.images) || body.images.length === 0) {
        return NextResponse.json(
          { success: false, error: "At least one product image is required." },
          { status: 400 }
        );
      }
      if (body.images.length > 8) {
        return NextResponse.json(
          { success: false, error: "A maximum of 8 product images is allowed." },
          { status: 400 }
        );
      }

      for (let i = 0; i < body.images.length; i++) {
        const img = body.images[i];
        if (!img || !img.url || typeof img.url !== "string" || !img.url.trim()) {
          return NextResponse.json(
            { success: false, error: `Image #${i + 1} has an invalid or empty URL.` },
            { status: 400 }
          );
        }
        const imgCheck = validateSafeImageUrl(img.url);
        if (!imgCheck.valid) {
          return NextResponse.json(
            { success: false, error: `Image #${i + 1}: ${imgCheck.error}` },
            { status: 400 }
          );
        }
      }

      const primaryImg = body.images.find((img: any) => img.isPrimary) || body.images[0];
      const normalizedImages = body.images.map((img: any, idx: number) => ({
        url: img.url.trim(),
        alt: img.alt ? String(img.alt).trim() : `${body.name || existing.name} photo ${idx + 1}`,
        isPrimary: img.url.trim() === primaryImg.url.trim(),
        order: idx,
        colorKey: img.colorKey ? String(img.colorKey).trim() : undefined,
      }));

      updateData.imageUrl = primaryImg.url.trim();
      updateData.galleryImages = JSON.stringify(normalizedImages);
    } else if (body.imageUrl !== undefined) {
      const trimmedUrl = safeTrim(body.imageUrl);
      if (trimmedUrl) {
        const imgCheck = validateSafeImageUrl(trimmedUrl);
        if (!imgCheck.valid) {
          return NextResponse.json(
            { success: false, error: `Product image: ${imgCheck.error}` },
            { status: 400 }
          );
        }
        updateData.imageUrl = trimmedUrl;
      } else {
        updateData.imageUrl = existing.imageUrl;
      }
    }

    // 5. Specifications
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

    // 5b. Sync ProductVariant table rows
    if (processedVariants && processedVariants.length > 0) {
      try {
        await prisma.productVariant.deleteMany({
          where: { productId: id },
        });
        for (const pv of processedVariants) {
          await prisma.productVariant.create({
            data: {
              id: pv.id,
              productId: id,
              ram: pv.ram,
              storage: pv.storage,
              price: pv.basePrice,
              stock: pv.stock,
              sku: pv.sku || null,
            },
          });
        }
      } catch (pvErr) {
        console.warn("Non-fatal sync warning for ProductVariant records:", pvErr);
      }
    }

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

    // Invalidate server and static page caches immediately
    revalidateProducts(id);

    return NextResponse.json({
      success: true,
      product: updated,
      message: "Product updated successfully!",
    });
  } catch (error: any) {
    const errorId = `ERR_${Date.now()}`;
    console.error(`Failed to update product [${errorId}]:`, error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update product. Please try again later.",
        errorId,
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

    // Invalidate server and static page caches immediately
    revalidateProducts(id);

    return NextResponse.json({
      success: true,
      message: "Product deleted successfully!",
    });
  } catch (error: any) {
    const errorId = `ERR_${Date.now()}`;
    console.error(`Failed to delete product [${errorId}]:`, error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete product. Please try again later.",
        errorId,
      },
      { status: 500 }
    );
  }
}