import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const brand = searchParams.get("brand");
    const search = searchParams.get("search");
    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");
    const ram = searchParams.get("ram");
    const storage = searchParams.get("storage");
    const os = searchParams.get("os");
    const sort = searchParams.get("sort");

    const where: Record<string, unknown> = {};

    // 1. Filter by Brand
    if (brand && brand !== "All") {
      where.brand = { equals: brand };
    }

    // 2. Search by brand + model or specs
    if (search) {
      const searchTerms = search.trim().split(/\s+/);
      // Support matching multiple words (e.g. "iPhone 16 Pro", "Samsung S24 Ultra")
      where.AND = searchTerms.map((term) => ({
        OR: [
          { brand: { contains: term } },
          { model: { contains: term } },
          { variant: { contains: term } },
          { processor: { contains: term } },
          { description: { contains: term } },
        ],
      }));
    }

    // 3. Filter by Price Range
    if (minPrice || maxPrice) {
      const priceFilter: Record<string, number> = {};
      if (minPrice) priceFilter.gte = parseInt(minPrice, 10);
      if (maxPrice) priceFilter.lte = parseInt(maxPrice, 10);
      where.price = priceFilter;
    }

    // 4. Filter by RAM
    if (ram && ram !== "All") {
      where.ram = { contains: ram };
    }

    // 5. Filter by Storage
    if (storage && storage !== "All") {
      where.storage = { contains: storage };
    }

    // 6. Filter by Operating System
    if (os && os !== "All") {
      where.operatingSystem = { contains: os };
    }

    // Sorting
    let orderBy: Record<string, string> = { price: "desc" };
    if (sort === "price-asc") orderBy = { price: "asc" };
    else if (sort === "price-desc") orderBy = { price: "desc" };
    else if (sort === "rating") orderBy = { rating: "desc" };
    else if (sort === "newest") orderBy = { createdAt: "desc" };

    const mobiles = await prisma.mobile.findMany({
      where,
      orderBy,
    });

    return NextResponse.json({
      success: true,
      count: mobiles.length,
      mobiles,
    });
  } catch (error) {
    console.error("Failed to fetch mobiles from SQL:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch mobiles from database" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      brand,
      model,
      variant,
      ram,
      storage,
      price,
      originalPrice,
      imageUrl,
      displaySize,
      processor,
      camera,
      battery,
      operatingSystem,
      description,
      stock,
    } = body;

    if (!brand || !model || !price) {
      return NextResponse.json(
        { success: false, error: "Brand, model, and price are required." },
        { status: 400 }
      );
    }

    const newMobile = await prisma.mobile.create({
      data: {
        brand: brand.trim(),
        model: model.trim(),
        variant: variant?.trim() || "Standard",
        ram: ram?.trim() || "8GB",
        storage: storage?.trim() || "128GB",
        price: parseInt(String(price), 10),
        originalPrice: originalPrice ? parseInt(String(originalPrice), 10) : Math.round(parseInt(String(price), 10) * 1.15),
        imageUrl: imageUrl?.trim() || "/phones/apple-iphone-16.jpg",
        displaySize: displaySize?.trim() || '6.7" OLED 120Hz',
        processor: processor?.trim() || "Flagship Octa-Core Processor",
        camera: camera?.trim() || "50MP Main OIS + Ultra-wide",
        battery: battery?.trim() || "5000 mAh, Fast Charging",
        operatingSystem: operatingSystem?.trim() || "Android 14",
        description: description?.trim() || `${brand} ${model} with high performance specs and vibrant display.`,
        stock: stock ? parseInt(String(stock), 10) : 50,
      },
    });

    // Also sync to MobileProduct for warranty system
    try {
      await prisma.mobileProduct.create({
        data: {
          id: newMobile.id,
          name: `${newMobile.brand} ${newMobile.model}`,
          brand: newMobile.brand,
          series: newMobile.brand,
          tagline: newMobile.description.slice(0, 80),
          basePrice: newMobile.price,
          originalPrice: newMobile.originalPrice || newMobile.price,
          imageUrl: newMobile.imageUrl,
          galleryImages: JSON.stringify([newMobile.imageUrl]),
          colors: JSON.stringify([{ name: newMobile.variant, hex: "#333333", inStock: true }]),
          storageOptions: JSON.stringify([{ size: newMobile.storage, priceDiff: 0 }]),
          ram: newMobile.ram,
          display: newMobile.displaySize,
          processor: newMobile.processor,
          camera: newMobile.camera,
          battery: newMobile.battery,
          os: newMobile.operatingSystem,
          network5G: "Dual 5G",
          warrantyMonths: 12,
          inStock: newMobile.stock > 0,
          highlightFeatures: JSON.stringify([newMobile.displaySize, newMobile.processor, newMobile.camera]),
        },
      });
    } catch (e) {
      // Ignored if duplicate id
    }

    return NextResponse.json({
      success: true,
      mobile: newMobile,
      message: "Product added successfully!",
    });
  } catch (error) {
    console.error("Failed to add mobile:", error);
    return NextResponse.json(
      { success: false, error: "Failed to add product" },
      { status: 500 }
    );
  }
}

