import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    // 1. Shared Admin Authorization Check
    const auth = await requireAdmin(request);
    if (auth instanceof Response) {
      return auth;
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";
    const roleParam = searchParams.get("role")?.trim().toUpperCase() || "ALL";
    const sortBy = searchParams.get("sortBy")?.trim().toLowerCase() || "newest";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));

    // 2. Build User Query on Supabase "User" Table
    // Safe columns only — NEVER expose password, token, or OTP hashes to client
    let query = supabaseAdmin
      .from("User")
      .select("id, name, email, phone, role, emailVerified, createdAt", { count: "exact" });

    // Explicit Role Filtering: "ALL" shows all registered users (including Administrators)
    if (roleParam === "ADMIN") {
      query = query.eq("role", "ADMIN");
    } else if (roleParam === "CUSTOMER" || roleParam === "USER") {
      query = query.or("role.eq.USER,role.eq.CUSTOMER,role.is.null");
    }

    // Debounced or direct search across name, email, or mobile phone
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    // Default DB ordering (orders & spend will be sorted in memory if selected)
    if (sortBy === "oldest") {
      query = query.order("createdAt", { ascending: true });
    } else if (sortBy === "name") {
      query = query.order("name", { ascending: true });
    } else {
      query = query.order("createdAt", { ascending: false });
    }

    const { data: users, error: userError, count: totalCount } = await query;

    if (userError) {
      console.error("[ADMIN_USERS_FETCH_ERROR] Supabase User query failed:", {
        message: userError.message,
        code: userError.code,
        hint: userError.hint,
        details: userError.details,
      });
      return NextResponse.json(
        { success: false, error: `Failed to fetch users: ${userError.message}` },
        { status: 500 }
      );
    }

    if (!users || users.length === 0) {
      return NextResponse.json({
        success: true,
        count: 0,
        totalPages: 1,
        page: 1,
        users: [],
        customers: [],
      });
    }

    // 3. Batch Query Orders for Metrics (Single Aggregation Batch - Prevents N+1 queries)
    const userIds = users.map((u) => u.id).filter(Boolean);
    const userEmails = users.map((u) => (u.email || "").toLowerCase()).filter(Boolean);

    // Query Order table matching by userId or customerEmail
    let orderMap = new Map<string, { count: number; totalSpent: number }>();

    try {
      let orderQuery = supabaseAdmin
        .from("Order")
        .select("id, userId, customerEmail, totalAmount, orderStatus");

      // Build batch lookup clause
      const idFilter = userIds.map((id) => `userId.eq.${id}`);
      const emailFilter = userEmails.map((email) => `customerEmail.ilike.${email}`);
      const allFilters = [...idFilter, ...emailFilter];

      if (allFilters.length > 0) {
        orderQuery = orderQuery.or(allFilters.join(","));
      }

      const { data: orders, error: orderError } = await orderQuery;

      if (orderError) {
        console.warn("[ADMIN_USERS_ORDERS_NOTICE] Supabase Order fetch warning:", {
          message: orderError.message,
          code: orderError.code,
          hint: orderError.hint,
        });
      } else if (orders) {
        for (const o of orders) {
          const matchedUser = users.find(
            (u) =>
              (o.userId && o.userId === u.id) ||
              (o.customerEmail && o.customerEmail.toLowerCase() === (u.email || "").toLowerCase())
          );

          if (matchedUser) {
            if (!orderMap.has(matchedUser.id)) {
              orderMap.set(matchedUser.id, { count: 0, totalSpent: 0 });
            }
            const stats = orderMap.get(matchedUser.id)!;
            stats.count += 1;
            const statusUpper = (o.orderStatus || "").toUpperCase();
            if (statusUpper !== "CANCELLED") {
              stats.totalSpent += Number(o.totalAmount || 0);
            }
          }
        }
      }
    } catch (orderBatchErr) {
      console.warn("[ADMIN_USERS_ORDERS_BATCH_EXCEPTION]", orderBatchErr);
    }

    // 4. Map into clean, safe directory record models
    let userRecords = users.map((u) => {
      const stats = orderMap.get(u.id) || { count: 0, totalSpent: 0 };
      const rawRole = (u.role || "USER").toUpperCase();
      const role = rawRole === "ADMIN" ? "ADMIN" : "USER";

      return {
        id: u.id,
        name: u.name || "Unnamed User",
        email: u.email || "",
        phone: u.phone || "-",
        role,
        emailVerified: Boolean(u.emailVerified),
        orderCount: stats.count,
        totalSpent: stats.totalSpent,
        registeredAt: u.createdAt,
      };
    });

    // 5. In-Memory Sorting for aggregate fields
    if (sortBy === "orders") {
      userRecords.sort((a, b) => b.orderCount - a.orderCount);
    } else if (sortBy === "spent") {
      userRecords.sort((a, b) => b.totalSpent - a.totalSpent);
    }

    // 6. Pagination
    const total = totalCount ?? userRecords.length;
    const totalPages = Math.max(1, Math.ceil(userRecords.length / limit));
    const startIndex = (page - 1) * limit;
    const paginatedRecords = userRecords.slice(startIndex, startIndex + limit);

    return NextResponse.json({
      success: true,
      count: total,
      totalPages,
      page,
      users: paginatedRecords,
      customers: paginatedRecords,
    });
  } catch (error: any) {
    console.error("[ADMIN_USERS_FATAL_ERROR] Unexpected error fetching user list:", {
      message: error?.message,
      stack: error?.stack,
    });
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to fetch user directory.",
      },
      { status: 500 }
    );
  }
}
