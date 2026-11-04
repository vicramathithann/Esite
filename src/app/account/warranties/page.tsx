import React from "react";
import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import WarrantiesClient, { EnrichedWarranty } from "./WarrantiesClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Device Shield Warranties | VN Mobiles",
  description: "View and manage your 1-Year Device Shield mobile warranties and hardware protection credentials.",
};

export default async function UserWarrantiesPage() {
  // 1. Authenticate user from secure HTTP-only session cookie
  const authUser = await getAuthenticatedUser();
  if (!authUser) {
    redirect("/login?redirect=%2Faccount%2Fwarranties");
  }

  const cleanEmail = authUser.email.trim().toLowerCase();
  let supabaseError: string | null = null;
  const enrichedList: EnrichedWarranty[] = [];

  try {
    // 2. Load warranties using service-role client strictly filtered by session identity
    const { data: rawWarranties, error: warError } = await supabaseAdmin
      .from("Warranty")
      .select("*")
      .or(`userId.eq.${authUser.id},customerEmail.ilike.${cleanEmail}`)
      .order("purchaseDate", { ascending: false });

    if (warError) {
      console.error("[SUPABASE WARRANTIES ERROR]", {
        code: warError.code,
        message: warError.message,
        details: warError.details,
        hint: warError.hint,
      });
      supabaseError = `${warError.message} (Code: ${warError.code || "DB_ERR"})`;
    }

    let warranties = rawWarranties || [];

    // 3. Fallback: If no Warranty rows found, check if user has Orders with items having IMEIs
    if (warranties.length === 0 && !supabaseError) {
      const { data: userOrders } = await supabaseAdmin
        .from("Order")
        .select("id, orderNumber, orderStatus, createdAt")
        .or(`userId.eq.${authUser.id},customerEmail.ilike.${cleanEmail}`)
        .order("createdAt", { ascending: false });

      if (userOrders && userOrders.length > 0) {
        const orderIds = userOrders.map((o) => o.id);
        const { data: orderItems } = await supabaseAdmin
          .from("OrderItem")
          .select("*")
          .in("orderId", orderIds);

        if (orderItems && orderItems.length > 0) {
          const orderMap = new Map<string, any>(userOrders.map((o) => [o.id, o]));
          for (const item of orderItems) {
            const ord = orderMap.get(item.orderId);
            warranties.push({
              id: `synthesized-${item.id}`,
              orderId: item.orderId,
              orderItemId: item.id,
              userId: authUser.id,
              customerName: authUser.name,
              customerEmail: cleanEmail,
              productName: item.productName,
              imeiNumber: item.imeiNumber,
              warrantyNumber: `WRT-${ord?.orderNumber || "REG"}-1`,
              purchaseDate: ord?.createdAt || new Date().toISOString(),
              warrantyStartDate: item.warrantyStartDate || ord?.createdAt || new Date().toISOString(),
              warrantyExpiryDate: item.warrantyExpiryDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
              warrantyDuration: `${Math.round((item.warrantyMonths || 12) / 12)} Year`,
              warrantyStatus: item.warrantyStatus || "ACTIVE",
            });
          }
        }
      }
    }

    if (warranties.length > 0) {
      // 4. Batch fetch related Orders, OrderItems, and MobileProducts
      const orderIds = Array.from(new Set(warranties.map((w) => w.orderId).filter(Boolean)));
      const itemIds = Array.from(new Set(warranties.map((w) => w.orderItemId).filter(Boolean)));

      let ordersMap = new Map<string, any>();
      if (orderIds.length > 0) {
        const { data: orders } = await supabaseAdmin
          .from("Order")
          .select("id, orderNumber, orderStatus, createdAt")
          .in("id", orderIds);
        if (orders) {
          ordersMap = new Map(orders.map((o) => [o.id, o]));
        }
      }

      let itemsMap = new Map<string, any>();
      if (itemIds.length > 0) {
        const { data: items } = await supabaseAdmin
          .from("OrderItem")
          .select("*")
          .in("id", itemIds);
        if (items) {
          itemsMap = new Map(items.map((i) => [i.id, i]));
        }
      }

      // Collect productIds for catalog lookup to guarantee real product names and images
      const productIds = Array.from(
        new Set(
          Array.from(itemsMap.values())
            .map((i) => i.productId)
            .filter(Boolean)
        )
      );

      let productsMap = new Map<string, any>();
      if (productIds.length > 0) {
        const { data: products } = await supabaseAdmin
          .from("MobileProduct")
          .select("id, name, brand, imageUrl")
          .in("id", productIds);
        if (products) {
          productsMap = new Map(products.map((p) => [p.id, p]));
        }
      }

      // 5. Build rich, authoritative warranty records
      for (let idx = 0; idx < warranties.length; idx++) {
        const w = warranties[idx];
        const matchedOrder = ordersMap.get(w.orderId);
        const matchedItem = itemsMap.get(w.orderItemId);
        const matchedProduct = matchedItem?.productId
          ? productsMap.get(matchedItem.productId)
          : null;

        const realProductName =
          matchedProduct?.name || matchedItem?.productName || w.productName || "Flagship Smartphone";
        const realBrand = matchedProduct?.brand || matchedItem?.productBrand || "VN Mobiles";
        const realImageUrl =
          matchedProduct?.imageUrl ||
          matchedItem?.productImageUrl ||
          "/images/placeholder.png";

        const variantParts = [matchedItem?.selectedStorage, matchedItem?.selectedColor].filter(
          Boolean
        );
        const variantInfo = variantParts.length > 0 ? variantParts.join(" • ") : "";

        const orderNum = matchedOrder?.orderNumber || `ORD${w.orderId?.slice(0, 5) || "00000"}`;
        const wNumber = w.warrantyNumber || `WRT-${orderNum}-${idx + 1}`;

        enrichedList.push({
          id: w.id,
          warrantyNumber: wNumber,
          orderId: w.orderId,
          orderNumber: orderNum,
          orderStatus: matchedOrder?.orderStatus || "CONFIRMED",
          productId: matchedItem?.productId || null,
          productName: realProductName,
          productBrand: realBrand,
          productImageUrl: realImageUrl,
          variantInfo,
          imeiNumber: w.imeiNumber || matchedItem?.imeiNumber || "N/A",
          purchaseDate: w.purchaseDate || matchedOrder?.createdAt || new Date().toISOString(),
          warrantyStartDate:
            w.warrantyStartDate ||
            matchedItem?.warrantyStartDate ||
            w.purchaseDate ||
            new Date().toISOString(),
          warrantyExpiryDate:
            w.warrantyExpiryDate ||
            matchedItem?.warrantyExpiryDate ||
            new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          warrantyDuration: w.warrantyDuration || "1 Year",
          warrantyStatus: w.warrantyStatus || "ACTIVE",
          customerName: w.customerName || authUser.name,
          customerEmail: w.customerEmail || cleanEmail,
          reminded1DayAt: w.reminded1DayAt || w.reminder1DaySentAt || null,
          reminded6MonthsAt: w.reminded6MonthsAt || w.reminder6MonthSentAt || null,
        });
      }
    }
  } catch (err: any) {
    console.error("[WARRANTIES SERVER PAGE ERROR]", err);
    supabaseError = err?.message || "Failed to load warranty data.";
  }

  return (
    <WarrantiesClient
      initialWarranties={enrichedList}
      supabaseError={supabaseError}
      userName={authUser.name}
      userEmail={cleanEmail}
    />
  );
}
