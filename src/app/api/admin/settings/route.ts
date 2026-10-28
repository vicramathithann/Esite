import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

const DEFAULT_SETTINGS: Record<string, string> = {
  showWishlist: "true",
  showCompare: "true",
  showDealsBanner: "true",
  showReviews: "true",
  showDealsCountdown: "true",
  showAnnouncement: "true",
  announcementText: "⚡ Free Express Delivery across India | 1-Year Official Brand Warranty",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const auth = await requireAdmin(request);
    if (auth instanceof Response) {
      return auth;
    }

    const rows = await prisma.siteSetting.findMany();
    const settingsMap: Record<string, string> = { ...DEFAULT_SETTINGS };

    rows.forEach((r: { key: string; value: string }) => {
      settingsMap[r.key] = r.value;
    });

    return NextResponse.json({
      success: true,
      settings: settingsMap,
    });
  } catch (error) {
    console.error("Admin settings fetch error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load store settings." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAdmin(request);
    if (auth instanceof Response) {
      return auth;
    }

    const body = await request.json();
    const { settings } = body;

    if (!settings || typeof settings !== "object") {
      return NextResponse.json(
        { success: false, error: "Invalid settings payload." },
        { status: 400 }
      );
    }

    const updates = Object.entries(settings).map(([key, value]) => {
      const strValue = String(value);
      return prisma.siteSetting.upsert({
        where: { key },
        update: { value: strValue },
        create: { key, value: strValue },
      });
    });

    await prisma.$transaction(updates);

    // Fetch updated
    const rows = await prisma.siteSetting.findMany();
    const settingsMap: Record<string, string> = { ...DEFAULT_SETTINGS };
    rows.forEach((r: { key: string; value: string }) => {
      settingsMap[r.key] = r.value;
    });

    return NextResponse.json({
      success: true,
      message: "Storefront settings updated successfully.",
      settings: settingsMap,
    });
  } catch (error) {
    console.error("Admin settings save error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to save storefront settings." },
      { status: 500 }
    );
  }
}

