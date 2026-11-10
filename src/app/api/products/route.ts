import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { revalidateProducts } from "@/lib/revalidate";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const brand = searchParams.get("brand");
    const category = searchParams.get("category");
    const search = searchParams.get("search");
    const sort = searchParams.get("sort");
    const maxPrice = searchParams.get("maxPrice");
    const minPrice = searchParams.get("minPrice");
    const ram = searchParams.get("ram");
    const storage = searchParams.get("storage");
    const os = searchParams.get("os");
    const minRating = searchParams.get("minRating");
    const featured = searchParams.get("featured");

    const where: Record<string, unknown> = {};

    if (category && category !== "all" && category !== "All") {
      where.category = { equals: category.toUpperCase() };
    }

    if (brand && brand !== "All" && brand !== "All Mobiles") {
      where.brand = { equals: brand };
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { brand: { contains: search } },
        { model: { contains: search } },
        { processor: { contains: search } },
        { tagline: { contains: search } },
      ];
    }

    if (maxPrice || minPrice) {
      where.basePrice = {};
      if (maxPrice) (where.basePrice as Record<string, number>).lte = parseInt(maxPrice, 10);
      if (minPrice) (where.basePrice as Record<string, number>).gte = parseInt(minPrice, 10);
    }

    if (ram && ram !== "All") {
      where.ram = { contains: ram };
    }

    if (storage && storage !== "All") {
      where.storageOptions = { contains: storage };
    }

    if (os && os !== "All") {
      where.os = { contains: os };
    }

    if (minRating) {
      where.rating = { gte: parseFloat(minRating) };
    }

    if (featured === "true") {
      where.isFeatured = true;
    }

    let orderBy: Record<string, string> = { createdAt: "desc" };
    if (sort === "price-asc") orderBy = { basePrice: "asc" };
    else if (sort === "price-desc") orderBy = { basePrice: "desc" };
    else if (sort === "rating") orderBy = { rating: "desc" };

    const products = await prisma.mobileProduct.findMany({
      where,
      orderBy,
      include: {
        variants: true,
      },
    });

    const parsed = products.map((p: any) => {
      let parsedImages: any[] = [];
      try {
        const parsedGallery = JSON.parse(p.galleryImages || "[]");
        if (Array.isArray(parsedGallery) && parsedGallery.length > 0) {
          if (typeof parsedGallery[0] === "object" && parsedGallery[0] !== null && parsedGallery[0].url) {
            parsedImages = parsedGallery;
          } else {
            parsedImages = parsedGallery.map((u: string, idx: number) => ({
              url: u,
              alt: `${p.name} Photo ${idx + 1}`,
              isPrimary: idx === 0,
              order: idx,
            }));
          }
        }
      } catch {}
      if (parsedImages.length === 0 && p.imageUrl) {
        parsedImages = [
          {
            url: p.imageUrl,
            alt: p.name,
            isPrimary: true,
            order: 0,
          },
        ];
      }

      return {
        ...p,
        galleryImages: JSON.parse(p.galleryImages || "[]"),
        images: parsedImages,
        colors: JSON.parse(p.colors || "[]"),
        storageOptions: JSON.parse(p.storageOptions || "[]"),
        highlightFeatures: JSON.parse(p.highlightFeatures || "[]"),
        variants: p.variants || [],
      };
    });

    return NextResponse.json(
      { success: true, count: parsed.length, products: parsed },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          "Pragma": "no-cache",
          "Expires": "0",
        },
      }
    );
  } catch (error) {
    console.error("Failed to fetch products:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch products" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAdmin(request);
    if (auth instanceof Response) {
      return auth;
    }

    const body = await request.json();
    const {
      name,
      brand,
      model,
      series,
      tagline,
      category,
      basePrice,
      discountPrice,
      originalPrice,
      rating,
      reviewCount,
      imageUrl,
      galleryImages,
      colors,
      storageOptions,
      ram,
      display,
      displayType,
      processor,
      camera,
      rearCamera,
      frontCamera,
      battery,
      batteryCapacity,
      os,
      network5G,
      warrantyMonths,
      stock,
      inStock,
      isFeatured,
      highlightFeatures,
      variants,
    } = body;

    let processedVariants: any[] | null = null;
    let priceNum = 0;
    let origPriceNum = 0;
    let stockNum = 0;
    let autoInStock = true;
    let derivedRam = ram || "8GB";
    let serializedStorageOptions = JSON.stringify(storageOptions || [{ size: "256GB", price: 49999 }]);

    if (variants && Array.isArray(variants) && variants.length > 0) {
      const seenPairs = new Set<string>();
      processedVariants = [];

      for (let i = 0; i < variants.length; i++) {
        const v = variants[i];
        const vRam = String(v.ram || "").trim();
        const vStorage = String(v.storage || "").trim();
        if (!vRam) {
          return NextResponse.json(
            { success: false, error: `Row ${i + 1}: RAM is required.` },
            { status: 400 }
          );
        }
        if (!vStorage) {
          return NextResponse.json(
            { success: false, error: `Row ${i + 1}: Storage is required.` },
            { status: 400 }
          );
        }

        const pairKey = `${vRam.toLowerCase()}_${vStorage.toLowerCase()}`;
        if (seenPairs.has(pairKey)) {
          return NextResponse.json(
            { success: false, error: `Row ${i + 1}: Duplicate RAM (${vRam}) and Storage (${vStorage}) variant.` },
            { status: 400 }
          );
        }
        seenPairs.add(pairKey);

        const bp = parseInt(String(v.basePrice ?? v.price), 10);
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

        processedVariants.push({
          ram: vRam,
          storage: vStorage,
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

      priceNum = lowestVariant.basePrice;
      origPriceNum = defaultVariant.originalPrice || lowestVariant.originalPrice;
      stockNum = processedVariants.reduce((sum, v) => sum + v.stock, 0);
      autoInStock = processedVariants.some((v) => v.stock > 0 && v.inStock);

      const uniqueRams = Array.from(new Set(processedVariants.map((v) => v.ram)));
      derivedRam = uniqueRams.join(" / ");

      serializedStorageOptions = JSON.stringify(
        processedVariants.map((v) => ({
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
      if (basePrice === undefined || basePrice === null || String(basePrice).trim() === "") {
        return NextResponse.json(
          { success: false, error: "Base price is required." },
          { status: 400 }
        );
      }
      priceNum = parseInt(String(basePrice), 10);
      if (isNaN(priceNum) || priceNum <= 0) {
        return NextResponse.json(
          { success: false, error: "Base Price must be a valid number greater than 0." },
          { status: 400 }
        );
      }

      if (stock === undefined || stock === null || String(stock).trim() === "") {
        return NextResponse.json(
          { success: false, error: "Available stock is required." },
          { status: 400 }
        );
      }
      stockNum = parseInt(String(stock), 10);
      if (isNaN(stockNum) || stockNum < 0) {
        return NextResponse.json(
          { success: false, error: "Stock must be a valid non-negative integer." },
          { status: 400 }
        );
      }

      origPriceNum = priceNum;
      if (originalPrice !== undefined && originalPrice !== null && String(originalPrice).trim() !== "") {
        const parsedOrig = parseInt(String(originalPrice), 10);
        if (isNaN(parsedOrig) || parsedOrig < priceNum) {
          return NextResponse.json(
            { success: false, error: "Original Price must be greater than or equal to Base Price." },
            { status: 400 }
          );
        }
        origPriceNum = parsedOrig;
      }
      autoInStock = inStock !== undefined ? Boolean(inStock) : stockNum > 0;
    }

    if (!name || !brand) {
      return NextResponse.json(
        { success: false, error: "Name and brand are required." },
        { status: 400 }
      );
    }

    let finalImageUrl = imageUrl || "";
    let finalGalleryImages = "[]";

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
      }

      const primaryImg = body.images.find((img: any) => img.isPrimary) || body.images[0];
      const normalizedImages = body.images.map((img: any, idx: number) => ({
        url: img.url.trim(),
        alt: img.alt ? String(img.alt).trim() : `${name} photo ${idx + 1}`,
        isPrimary: img.url.trim() === primaryImg.url.trim(),
        order: idx,
        colorKey: img.colorKey ? String(img.colorKey).trim() : undefined,
      }));

      finalImageUrl = primaryImg.url.trim();
      finalGalleryImages = JSON.stringify(normalizedImages);
    } else {
      if (!imageUrl || !String(imageUrl).trim()) {
        return NextResponse.json(
          { success: false, error: "At least one product image is required." },
          { status: 400 }
        );
      }
      finalImageUrl = String(imageUrl).trim();
      finalGalleryImages = JSON.stringify(galleryImages || [finalImageUrl]);
    }

    const product = await prisma.mobileProduct.create({
      data: {
        name: name.trim(),
        brand: brand.trim(),
        model: model ? model.trim() : name.trim(),
        series: series ? series.trim() : "Flagship Series",
        tagline: tagline ? tagline.trim() : "Performance Engineered for Tomorrow",
        category: category ? category.toUpperCase() : "SMARTPHONE",
        basePrice: priceNum,
        discountPrice: discountPrice ? parseInt(String(discountPrice), 10) : null,
        originalPrice: origPriceNum,
        rating: rating !== undefined ? parseFloat(String(rating)) : 4.8,
        reviewCount: reviewCount !== undefined ? parseInt(String(reviewCount), 10) : 100,
        imageUrl: finalImageUrl,
        galleryImages: finalGalleryImages,
        colors: JSON.stringify(colors || [{ name: "Space Black", hex: "#1a1a1a" }]),
        storageOptions: serializedStorageOptions,
        ram: derivedRam,
        display: display || "6.7\" Super Retina AMOLED",
        displayType: displayType || "OLED / AMOLED 120Hz",
        processor: processor || "Flagship 4nm Processor",
        camera: camera || "50MP Triple Pro System",
        rearCamera: rearCamera || camera || "50MP Main + 48MP Ultra-Wide + 12MP Telephoto",
        frontCamera: frontCamera || "32MP TrueDepth Front Camera",
        battery: battery || "5000 mAh All-Day Battery",
        batteryCapacity: batteryCapacity || "5000 mAh",
        os: os || "Android 15",
        network5G: network5G || "Sub-6GHz + mmWave 5G",
        warrantyMonths: warrantyMonths ? parseInt(String(warrantyMonths), 10) : 12,
        stock: stockNum,
        inStock: autoInStock,
        isFeatured: Boolean(isFeatured),
        highlightFeatures: JSON.stringify(highlightFeatures || ["5G Connectivity", "Fast Charging", "IP68 Water Resistance"]),
      },
    });

    // Create variants in ProductVariant table if provided
    if (processedVariants && processedVariants.length > 0) {
      for (const v of processedVariants) {
        const vid = `${product.id}-${v.ram.toLowerCase().replace(/[^a-z0-9]/g, '')}-${v.storage.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
        await prisma.productVariant.create({
          data: {
            id: vid,
            productId: product.id,
            ram: v.ram,
            storage: v.storage,
            price: v.basePrice,
            stock: v.stock,
            sku: v.sku || null,
          },
        });
      }
    }

    // Invalidate server and static page caches immediately
    revalidateProducts(product.id);

    return NextResponse.json({
      success: true,
      product,
      message: "Product created successfully!",
    });
  } catch (error) {
    console.error("Failed to create product:", error);
    return NextResponse.json({ success: false, error: "Failed to create product" }, { status: 500 });
  }
}