import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAdmin, ADMIN_EMAIL } from "@/lib/auth";
import { logSecurityEvent, getClientIp } from "@/lib/securityLogger";

const ACTIVE_ORDER_STATUSES = new Set([
  "PENDING",
  "PROCESSING",
  "CONFIRMED",
  "SHIPPED",
  "IN_TRANSIT",
  "OUT_FOR_DELIVERY",
]);

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin(request);
    if (auth instanceof Response) {
      return auth;
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ success: false, error: "User ID is required." }, { status: 400 });
    }

    // 1. Fetch target user
    const { data: targetUser, error: fetchErr } = await supabaseAdmin
      .from("User")
      .select("id, name, email, role")
      .eq("id", id)
      .maybeSingle();

    if (fetchErr) {
      console.error("[ADMIN_DELETE_USER] Error looking up user:", fetchErr);
      return NextResponse.json({ success: false, error: "Database lookup error." }, { status: 500 });
    }

    if (!targetUser) {
      return NextResponse.json({ success: false, error: "User account not found." }, { status: 404 });
    }

    // 2. Protection: Calling Admin cannot delete their own account
    if (
      auth.id === targetUser.id ||
      auth.email.toLowerCase() === targetUser.email.toLowerCase()
    ) {
      return NextResponse.json(
        { success: false, error: "You cannot delete your own account." },
        { status: 403 }
      );
    }

    // 3. Protection: Administrator accounts cannot be deleted
    if (
      targetUser.email.toLowerCase() === ADMIN_EMAIL.toLowerCase() ||
      (targetUser.role || "").toUpperCase() === "ADMIN"
    ) {
      return NextResponse.json(
        { success: false, error: "Administrator accounts cannot be deleted." },
        { status: 403 }
      );
    }

    // 4. Check for active/in-flight orders
    const { data: userOrders } = await supabaseAdmin
      .from("Order")
      .select("id, orderNumber, orderStatus")
      .or(`userId.eq.${targetUser.id},customerEmail.ilike.${targetUser.email}`);

    if (userOrders && userOrders.length > 0) {
      const activeOrders = userOrders.filter((o) =>
        ACTIVE_ORDER_STATUSES.has((o.orderStatus || "").toUpperCase())
      );

      if (activeOrders.length > 0) {
        const orderNumbers = activeOrders.map((o) => o.orderNumber).join(", ");
        return NextResponse.json(
          {
            success: false,
            error: `Cannot delete user account. User has ${activeOrders.length} active in-flight order(s) (${orderNumbers}). Please cancel or fulfill pending orders first.`,
          },
          { status: 400 }
        );
      }
    }

    // 5. Gracefully handle foreign keys and anonymize orders/warranties so financial/warranty history is preserved
    const anonymizedEmail = `deleted-${targetUser.id.slice(0, 8)}@deleted.vnmobiles.in`;

    // A. Anonymize Orders
    await supabaseAdmin
      .from("Order")
      .update({
        userId: null,
        customerName: `Former Customer (${targetUser.name})`,
        customerPhone: "0000000000",
        customerEmail: anonymizedEmail,
      })
      .or(`userId.eq.${targetUser.id},customerEmail.ilike.${targetUser.email}`);

    // B. Reassign Warranties (keep warranty valid for device hardware protection, detach user)
    await supabaseAdmin
      .from("Warranty")
      .update({
        userId: null,
      })
      .or(`userId.eq.${targetUser.id},customerEmail.ilike.${targetUser.email}`);

    // C. Clean up user-specific personal data
    await supabaseAdmin.from("Wishlist").delete().eq("userId", targetUser.id);
    await supabaseAdmin.from("Review").delete().eq("userId", targetUser.id);
    await supabaseAdmin.from("AccountDeletionRequest").delete().eq("userId", targetUser.id);

    try {
      await supabaseAdmin.from("UserPasswordResetToken").delete().eq("userId", targetUser.id);
    } catch {
      // Non-blocking
    }

    // D. Delete User row
    const { error: deleteErr } = await supabaseAdmin
      .from("User")
      .delete()
      .eq("id", targetUser.id);

    if (deleteErr) {
      console.error("[ADMIN_DELETE_USER] Failed to delete User record:", deleteErr);
      return NextResponse.json(
        { success: false, error: `Failed to delete user: ${deleteErr.message}` },
        { status: 500 }
      );
    }

    // 6. Audit Logging
    const ipAddress = getClientIp(request);
    const userAgent = request.headers.get("user-agent") || "unknown";

    logSecurityEvent("ADMIN_ACTION", "INFO", {
      userId: targetUser.id,
      email: targetUser.email,
      role: "ADMIN",
      route: `/api/admin/users/${targetUser.id}`,
      method: "DELETE",
      ip: ipAddress,
      userAgent,
      details: {
        action: "ADMIN_DELETE_USER",
        adminEmail: auth.email,
        deletedUserName: targetUser.name,
      },
    });

    try {
      await supabaseAdmin.from("UserAuditLog").insert({
        adminEmail: auth.email,
        targetUserId: targetUser.id,
        targetUserEmail: targetUser.email,
        action: "ADMIN_DELETE_USER",
        details: { deletedUserName: targetUser.name },
        ipAddress,
        userAgent,
      });
    } catch {
      // Non-blocking
    }

    try {
      await supabaseAdmin.from("AdminSecurityAudit").insert({
        userId: targetUser.id,
        action: `DELETED_USER ${targetUser.email} (by ${auth.email})`,
        ipAddress,
        userAgent,
      });
    } catch {
      // Non-blocking
    }

    return NextResponse.json({
      success: true,
      message: `User "${targetUser.name}" (${targetUser.email}) was deleted successfully.`,
    });
  } catch (error: any) {
    console.error("Delete user account error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to delete user account." },
      { status: 500 }
    );
  }
}
