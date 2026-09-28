import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const mobile = await prisma.mobile.findUnique({
      where: { id },
    });

    if (!mobile) {
      return NextResponse.json(
        { success: false, error: "Mobile not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, mobile });
  } catch (error) {
    console.error("Failed to fetch mobile:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch mobile details" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const updateData: Record<string, unknown> = {};
    if (body.stock !== undefined) updateData.stock = parseInt(String(body.stock), 10);
    if (body.inStock !== undefined) {
      if (!body.inStock) {
        updateData.stock = 0;
      } else if (updateData.stock === undefined) {
        updateData.stock = 25;
      }
    }
    if (body.price !== undefined) updateData.price = parseInt(String(body.price), 10);
    if (body.originalPrice !== undefined) updateData.originalPrice = parseInt(String(body.originalPrice), 10);
    if (body.brand) updateData.brand = body.brand;
    if (body.model) updateData.model = body.model;
    if (body.variant) updateData.variant = body.variant;
    if (body.ram) updateData.ram = body.ram;
    if (body.storage) updateData.storage = body.storage;
    if (body.description) updateData.description = body.description;
    if (body.imageUrl) updateData.imageUrl = body.imageUrl;

    const updated = await prisma.mobile.update({
      where: { id },
      data: updateData,
    });

    // Sync stock/price to MobileProduct if exists
    try {
      await prisma.mobileProduct.updateMany({
        where: { id },
        data: {
          ...(body.price !== undefined ? { basePrice: parseInt(String(body.price), 10) } : {}),
          ...(body.stock !== undefined ? { inStock: parseInt(String(body.stock), 10) > 0 } : {}),
          ...(body.inStock !== undefined ? { inStock: Boolean(body.inStock) } : {}),
        },
      });
    } catch (e) {}

    return NextResponse.json({
      success: true,
      mobile: updated,
      message: "Product updated successfully!",
    });
  } catch (error) {
    console.error("Failed to update mobile:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update product details" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.mobile.delete({
      where: { id },
    });

    try {
      await prisma.mobileProduct.delete({
        where: { id },
      });
    } catch (e) {}

    return NextResponse.json({
      success: true,
      message: "Product deleted successfully!",
    });
  } catch (error) {
    console.error("Failed to delete mobile:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete product" },
      { status: 500 }
    );
  }
}

