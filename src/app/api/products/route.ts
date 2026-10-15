import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

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

    if (!name || !brand || !basePrice) {
      return NextResponse.json(
        { success: false, error: "Name, brand, and base price are required." },
        { status: 400 }
      );
    }

    const priceNum = parseInt(String(basePrice), 10);
    const origPriceNum = originalPrice ? parseInt(String(originalPrice), 10) : Math.round(priceNum * 1.15);
    const stockNum = stock !== undefined ? parseInt(String(stock), 10) : 20;

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
        imageUrl: imageUrl || "/images/placeholder.png",
        galleryImages: JSON.stringify(galleryImages || [imageUrl || "/images/placeholder.png"]),
        colors: JSON.stringify(colors || [{ name: "Space Black", hex: "#1a1a1a" }]),
        storageOptions: JSON.stringify(storageOptions || [{ size: "256GB", price: priceNum }]),
        ram: ram || "12GB",
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
        inStock: inStock !== undefined ? Boolean(inStock) : stockNum > 0,
        isFeatured: Boolean(isFeatured),
        highlightFeatures: JSON.stringify(highlightFeatures || ["5G Connectivity", "Fast Charging", "IP68 Water Resistance"]),
      },
    });

    // Create variants if provided
    if (variants && Array.isArray(variants) && variants.length > 0) {
      for (const v of variants) {
        await prisma.productVariant.create({
          data: {
            productId: product.id,
            ram: v.ram || null,
            storage: v.storage || null,
            color: v.color || null,
            colorHex: v.colorHex || null,
            price: v.price ? parseInt(String(v.price), 10) : priceNum,
            stock: v.stock !== undefined ? parseInt(String(v.stock), 10) : 10,
            sku: v.sku || null,
          },
        });
      }
    }

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