import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMainAdmin, ADMIN_EMAIL } from "@/lib/auth";

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
      return NextResponse.json({ success: false, error: "User ID is required." }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id },
      include: {
        orders: {
          select: { id: true },
        },
      },
    });

    if (!targetUser) {
      return NextResponse.json({ success: false, error: "User account not found." }, { status: 404 });
    }

    // Protection: Primary admin cannot be deleted
    if (
      targetUser.email.toLowerCase() === ADMIN_EMAIL.toLowerCase() ||
      targetUser.role.toUpperCase() === "ADMIN"
    ) {
      return NextResponse.json(
        { success: false, error: "The primary administrator account cannot be deleted." },
        { status: 403 }
      );
    }

    const orderIds = targetUser.orders.map((o) => o.id);

    // Clean up all related data in an atomic database transaction
    await prisma.$transaction(async (tx) => {
      // 1. Delete warranties associated with orders or this user
      await tx.warranty.deleteMany({
        where: {
          OR: [
            ...(orderIds.length > 0 ? [{ orderId: { in: orderIds } }] : []),
            { userId: targetUser.id },
            { customerEmail: targetUser.email },
          ],
        },
      });

      // 2. Delete order status histories for this user's orders
      if (orderIds.length > 0) {
        await tx.orderStatusHistory.deleteMany({
          where: { orderId: { in: orderIds } },
        });

        // 3. Delete order items for this user's orders
        await tx.orderItem.deleteMany({
          where: { orderId: { in: orderIds } },
        });
      }

      // 4. Delete email notifications for this user or their orders
      await tx.emailNotification.deleteMany({
        where: {
          OR: [
            ...(orderIds.length > 0 ? [{ orderId: { in: orderIds } }] : []),
            { userId: targetUser.id },
            { recipientEmail: targetUser.email },
          ],
        },
      });

      // 5. Delete orders for this user
      await tx.order.deleteMany({
        where: {
          OR: [
            { userId: targetUser.id },
            { customerEmail: targetUser.email },
          ],
        },
      });

      // 6. Delete wishlist items
      await tx.wishlist.deleteMany({
        where: { userId: targetUser.id },
      });

      // 7. Delete reviews
      await tx.review.deleteMany({
        where: { userId: targetUser.id },
      });

      // 8. Delete user account
      await tx.user.delete({
        where: { id: targetUser.id },
      });
    });

    return NextResponse.json({
      success: true,
      message: `User "${targetUser.name}" (${targetUser.email}) and all related orders, warranties, and logs have been permanently deleted.`,
    });
  } catch (error) {
    console.error("Delete user account error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete user account." },
      { status: 500 }
    );
  }
}

