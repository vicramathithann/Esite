import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMainAdmin } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const auth = await requireMainAdmin(request);
    if (auth instanceof Response) {
      return auth;
    }

    const body = await request.json();
    const { ids } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, error: "An array of log IDs is required." },
        { status: 400 }
      );
    }

    const deleteResult = await prisma.emailNotification.deleteMany({
      where: {
        id: { in: ids },
      },
    });

    return NextResponse.json({
      success: true,
      count: deleteResult.count,
      message: `${deleteResult.count} email log(s) deleted successfully.`,
    });
  } catch (error) {
    console.error("Bulk delete email logs error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete email logs." },
      { status: 500 }
    );
  }
}

