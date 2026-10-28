import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
export const revalidate = 30;

export async function GET() {
  try {
    const rows = await prisma.siteSetting.findMany();
    const settingsMap: Record<string, string> = { ...DEFAULT_SETTINGS };

    rows.forEach((r: { key: string; value: string }) => {
      settingsMap[r.key] = r.value;
    });

    return NextResponse.json(
      {
        success: true,
        settings: settingsMap,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120",
        },
      }
    );
  } catch (error) {
    console.error("Public settings fetch error:", error);
    return NextResponse.json(
      {
        success: true,
        settings: DEFAULT_SETTINGS,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120",
        },
      }
    );
  }
}


