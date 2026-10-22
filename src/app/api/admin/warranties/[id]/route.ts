import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMainAdmin } from "@/lib/auth";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireMainAdmin(request);
    if (auth instanceof Response) {
      return auth;
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ success: false, error: "Warranty ID is required." }, { status: 400 });
    }

    const warranty = await prisma.warranty.findUnique({
      where: { id },
      select: {
        id: true,
        productName: true,
        imeiNumber: true,
        customerName: true,
      },
    });

    if (!warranty) {
      return NextResponse.json({ success: false, error: "Warranty record not found." }, { status: 404 });
    }

    await prisma.warranty.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: `Warranty for ${warranty.productName} (IMEI: ${warranty.imeiNumber}) deleted successfully.`,
    });
  } catch (error) {
    console.error("Delete warranty error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete warranty record." },
      { status: 500 }
    );
  }
}

