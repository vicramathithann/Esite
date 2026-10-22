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
      return NextResponse.json({ success: false, error: "Log ID is required." }, { status: 400 });
    }

    const existing = await prisma.emailNotification.findUnique({
      where: { id },
      select: { id: true, recipientEmail: true, subject: true },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: "Email log not found." }, { status: 404 });
    }

    await prisma.emailNotification.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: `Email log for ${existing.recipientEmail} deleted successfully.`,
    });
  } catch (error) {
    console.error("Delete email log error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete email log." },
      { status: 500 }
    );
  }
}

