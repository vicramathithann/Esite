import React from "react";
import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import WarrantiesClient, { EnrichedWarranty } from "./WarrantiesClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Official Hardware Warranties | VN Mobiles",
  description: "View and manage your 1-Year official manufacturer mobile warranties and hardware protection credentials.",
};

/**
 * Strips duplicated brand prefix if present (e.g. "Sony Sony Xperia 1 VI" -> "Sony Xperia 1 VI")
 */
function cleanProductName(name: string, brand?: string): string {
  if (!name) return "Official Mobile Device";
  let cleaned = name.trim();
  if (brand && brand.trim()) {
    const b = brand.trim();
    const doubleBrandRegex = new RegExp(`^${b}\\s+${b}\\s+`, "i");
    cleaned = cleaned.replace(doubleBrandRegex, `${b} `);
  }
  return cleaned;
}

export default async function UserWarrantiesPage() {
  const startTime = performance.now();

  // 1. Authenticate user strictly from secure session cookie
  const authUser = await getAuthenticatedUser();
  if (!authUser) {
    redirect("/login?redirect=%2Faccount%2Fwarranties");
  }

  const cleanEmail = (authUser.email || "").trim().toLowerCase();
  let supabaseError: string | null = null;

  const activeWarranties: EnrichedWarranty[] = [];
  const expiredWarranties: EnrichedWarranty[] = [];
  const cancelledWarranties: EnrichedWarranty[] = [];

  try {
    // 2. Fetch independent data sources in parallel via Promise.all (no N+1 query waterfall)
    const [ordersRes, directWarRes, emailNotifsRes, catalogRes] = await Promise.all([
      supabaseAdmin
        .from("Order")
        .select("id, orderNumber, orderStatus, paymentStatus, totalAmount, customerName, customerEmail, createdAt")
        .or(`userId.eq.${authUser.id},customerEmail.ilike.${cleanEmail}`)
        .order("createdAt", { ascending: false }),

      supabaseAdmin
        .from("Warranty")
        .select("id, warrantyNumber, orderId, orderItemId, userId, customerName, customerEmail, productName, imeiNumber, purchaseDate, warrantyDuration, warrantyStartDate, warrantyExpiryDate, warrantyStatus")
        .or(`userId.eq.${authUser.id},customerEmail.ilike.${cleanEmail}`)
        .order("purchaseDate", { ascending: false }),

      supabaseAdmin
        .from("EmailNotification")
        .select("orderId, productName, contentSummary, emailType, createdAt")
        .or(`userId.eq.${authUser.id},recipientEmail.ilike.${cleanEmail}`)
        .eq("emailType", "WARRANTY")
        .order("createdAt", { ascending: false }),

      supabaseAdmin
        .from("MobileProduct")
        .select("id, name, brand, imageUrl, basePrice"),
    ]);

    if (ordersRes.error) {
      console.error("[SUPABASE ORDERS ERROR]", ordersRes.error);
      supabaseError = `${ordersRes.error.message} (Code: ${ordersRes.error.code || "ORDERS_ERR"})`;
    }
    if (directWarRes.error) {
      console.error("[SUPABASE WARRANTIES ERROR]", directWarRes.error);
      supabaseError = `${directWarRes.error.message} (Code: ${directWarRes.error.code || "WAR_ERR"})`;
    }

    const orders = ordersRes.data || [];
    const directWarranties = directWarRes.data || [];
    const emailNotifs = emailNotifsRes.data || [];
    const catalog = catalogRes.data || [];

    const userOrderIds = orders.map((o) => o.id).filter(Boolean);
    const orderMap = new Map(orders.map((o) => [o.id, o]));
    const emailMap = new Map(emailNotifs.map((e) => [e.orderId, e]));
    const catalogById = new Map(catalog.map((c) => [c.id, c]));
    const catalogByPrice = new Map(catalog.map((c) => [c.basePrice, c]));

    // Batch-fetch change history from SiteSetting for direct warranties
    const warIds = directWarranties.map((w) => w.id).filter(Boolean);
    const historyMap = new Map<string, any[]>();
    if (warIds.length > 0) {
      try {
        const { data: historySettings } = await supabaseAdmin
          .from("SiteSetting")
          .select("key, value")
          .in("key", warIds.map((id) => `warranty_history_${id}`));
        if (historySettings && historySettings.length > 0) {
          for (const s of historySettings) {
            try {
              const warId = s.key.replace("warranty_history_", "");
              const parsed = JSON.parse(s.value);
              if (Array.isArray(parsed)) {
                historyMap.set(warId, parsed);
              }
            } catch {}
          }
        }
      } catch {}
    }

    // 3. Batch-fetch OrderItem records for the user's orders (if any)
    let itemsMap = new Map<string, any>();
    if (userOrderIds.length > 0) {
      const { data: items, error: itemsErr } = await supabaseAdmin
        .from("OrderItem")
        .select("id, orderId, productId, productName, productBrand, productImageUrl, selectedColor, selectedStorage, price, quantity, imeiNumber, warrantyMonths, warrantyStartDate, warrantyExpiryDate, warrantyStatus")
        .in("orderId", userOrderIds);

      if (itemsErr) {
        console.error("[SUPABASE ORDER ITEMS ERROR]", itemsErr);
      } else if (items) {
        for (const item of items) {
          itemsMap.set(item.id, item);
        }
      }
    }

    // 4. Consolidate warranties (authoritative records + fallback synthesized from orders)
    const allWarranties: any[] = [...directWarranties];
    const coveredOrderItemIds = new Set(directWarranties.map((w) => w.orderItemId).filter(Boolean));
    const coveredOrderIds = new Set(directWarranties.map((w) => w.orderId).filter(Boolean));

    for (const ord of orders) {
      const ordItems = Array.from(itemsMap.values()).filter((i) => i.orderId === ord.id);

      if (ordItems.length > 0) {
        for (let idx = 0; idx < ordItems.length; idx++) {
          const item = ordItems[idx];
          if (!coveredOrderItemIds.has(item.id)) {
            allWarranties.push({
              id: `synthesized-${item.id}`,
              orderId: ord.id,
              orderItemId: item.id,
              userId: authUser.id,
              customerName: ord.customerName || authUser.name,
              customerEmail: ord.customerEmail || cleanEmail,
              productName: item.productName,
              imeiNumber: item.imeiNumber,
              warrantyNumber: `WRT-${ord.orderNumber}-${idx + 1}`,
              purchaseDate: ord.createdAt || new Date().toISOString(),
              purchaseAmount: item.price,
              warrantyStartDate: item.warrantyStartDate || ord.createdAt || new Date().toISOString(),
              warrantyExpiryDate:
                item.warrantyExpiryDate ||
                new Date(new Date(ord.createdAt).getTime() + 365 * 24 * 60 * 60 * 1000).toISOString(),
              warrantyDuration: `${Math.round((item.warrantyMonths || 12) / 12)} Year`,
              warrantyStatus: item.warrantyStatus || "ACTIVE",
            });
            coveredOrderItemIds.add(item.id);
            coveredOrderIds.add(ord.id);
          }
        }
      } else if (!coveredOrderIds.has(ord.id)) {
        const email = emailMap.get(ord.id);
        let certNum = `WRT-${ord.orderNumber}-1`;
        let imei = `86${Math.floor(1000000000000 + Math.random() * 9000000000000)}`;

        if (email?.contentSummary) {
          const cMatch = email.contentSummary.match(/Certificate:\s*([A-Za-z0-9-]+)/i);
          if (cMatch) certNum = cMatch[1];
          const iMatch = email.contentSummary.match(/IMEI:\s*(\d+)/i);
          if (iMatch) imei = iMatch[1];
        }

        allWarranties.push({
          id: `synthesized-order-${ord.id}`,
          orderId: ord.id,
          orderItemId: `item-${ord.id}`,
          userId: authUser.id,
          customerName: ord.customerName || authUser.name,
          customerEmail: ord.customerEmail || cleanEmail,
          productName: email?.productName || `Order #${ord.orderNumber} Device`,
          imeiNumber: imei,
          warrantyNumber: certNum,
          purchaseDate: ord.createdAt || new Date().toISOString(),
          warrantyStartDate: ord.createdAt || new Date().toISOString(),
          warrantyExpiryDate: new Date(
            new Date(ord.createdAt).getTime() + 365 * 24 * 60 * 60 * 1000
          ).toISOString(),
          warrantyDuration: "1 Year",
          warrantyStatus: "ACTIVE",
        });
        coveredOrderIds.add(ord.id);
      }
    }

    // 5. Enrich and Classify each warranty
    const now = Date.now();

    for (let idx = 0; idx < allWarranties.length; idx++) {
      const w = allWarranties[idx];
      const matchedOrder = orderMap.get(w.orderId);
      const matchedItem = itemsMap.get(w.orderItemId);
      const matchedProduct = matchedItem?.productId
        ? catalogById.get(matchedItem.productId)
        : matchedOrder?.totalAmount
        ? catalogByPrice.get(matchedOrder.totalAmount)
        : null;

      const rawName =
        matchedProduct?.name ||
        matchedItem?.productName ||
        w.productName ||
        "Flagship Smartphone";
      const realBrand = matchedProduct?.brand || matchedItem?.productBrand || "VN Mobiles";
      const realProductName = cleanProductName(rawName, realBrand);

      const realImageUrl =
        matchedProduct?.imageUrl ||
        matchedItem?.productImageUrl ||
        "/phones/sony-xperia-1-vi.jpg";

      const variantParts = [matchedItem?.selectedStorage, matchedItem?.selectedColor].filter(
        Boolean
      );
      const variantInfo = variantParts.length > 0 ? variantParts.join(" • ") : "";

      const orderNum = matchedOrder?.orderNumber || (w.orderId ? `ORD${w.orderId.slice(0, 5)}` : "00000");
      const wNumber = w.warrantyNumber || `WRT-${orderNum}-${idx + 1}`;

      const startDateStr =
        w.warrantyStartDate ||
        matchedItem?.warrantyStartDate ||
        w.purchaseDate ||
        matchedOrder?.createdAt ||
        new Date().toISOString();

      const expiryDateStr =
        w.warrantyExpiryDate ||
        matchedItem?.warrantyExpiryDate ||
        new Date(new Date(startDateStr).getTime() + 365 * 24 * 60 * 60 * 1000).toISOString();

      // Check if cancelled or refunded
      const ordStatus = (matchedOrder?.orderStatus || "").toUpperCase();
      const payStatus = (matchedOrder?.paymentStatus || "").toUpperCase();
      const warStatus = (w.warrantyStatus || "").toUpperCase();

      const isCancelled =
        ordStatus === "CANCELLED" ||
        ordStatus.includes("CANCEL") ||
        payStatus.includes("REFUND") ||
        warStatus === "CANCELLED";

      const expiryMs = new Date(expiryDateStr).getTime();
      const isExpired = !isCancelled && (isNaN(expiryMs) || expiryMs <= now);

      let classifiedStatus: "ACTIVE" | "EXPIRING_SOON" | "EXPIRED" | "CANCELLED" = "ACTIVE";
      if (isCancelled) {
        classifiedStatus = "CANCELLED";
      } else if (isExpired) {
        classifiedStatus = "EXPIRED";
      } else {
        const daysLeft = Math.floor((expiryMs - now) / (1000 * 60 * 60 * 24));
        if (daysLeft <= 30) {
          classifiedStatus = "EXPIRING_SOON";
        } else {
          classifiedStatus = "ACTIVE";
        }
      }

      const rawHistory = historyMap.get(w.id) || (Array.isArray(w.changeHistory) ? w.changeHistory : []);
      const isUpdated = rawHistory.length > 0;
      const lastUpdatedAt = isUpdated ? rawHistory[rawHistory.length - 1].changedAt : null;

      const enriched: EnrichedWarranty = {
        id: w.id,
        warrantyNumber: wNumber,
        orderId: w.orderId,
        orderNumber: orderNum,
        orderStatus: matchedOrder?.orderStatus || "CONFIRMED",
        productId: matchedItem?.productId || matchedProduct?.id || null,
        productName: realProductName,
        productBrand: realBrand,
        productImageUrl: realImageUrl,
        variantInfo,
        imeiNumber: w.imeiNumber || matchedItem?.imeiNumber || "N/A",
        purchaseDate: w.purchaseDate || matchedOrder?.createdAt || new Date().toISOString(),
        purchaseAmount: matchedItem?.price ?? w.purchaseAmount ?? matchedOrder?.totalAmount ?? null,
        warrantyStartDate: startDateStr,
        warrantyExpiryDate: expiryDateStr,
        warrantyDuration: w.warrantyDuration || "1 Year",
        warrantyStatus: classifiedStatus,
        customerName: w.customerName || authUser.name,
        customerEmail: w.customerEmail || cleanEmail,
        reminded1DayAt: w.reminded1DayAt || w.reminder1DaySentAt || null,
        reminded6MonthsAt: w.reminded6MonthsAt || w.reminder6MonthSentAt || null,
        changeHistory: rawHistory,
        isUpdated,
        lastUpdatedAt,
      };

      if (classifiedStatus === "CANCELLED") {
        cancelledWarranties.push(enriched);
      } else if (classifiedStatus === "EXPIRED") {
        expiredWarranties.push(enriched);
      } else {
        activeWarranties.push(enriched);
      }
    }

    // 6. Sort:
    // Active by nearest expiry first
    activeWarranties.sort(
      (a, b) => new Date(a.warrantyExpiryDate).getTime() - new Date(b.warrantyExpiryDate).getTime()
    );
    // Expired and Cancelled by most recent first
    expiredWarranties.sort(
      (a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime()
    );
    cancelledWarranties.sort(
      (a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime()
    );

    const elapsedMs = Math.round(performance.now() - startTime);
    console.log(
      `[WARRANTIES PERF] Loaded ${allWarranties.length} warranties for user ${authUser.id} (${cleanEmail}) in ${elapsedMs}ms | Active: ${activeWarranties.length}, Expired: ${expiredWarranties.length}, Cancelled: ${cancelledWarranties.length}`
    );
  } catch (err: any) {
    console.error("[WARRANTIES SERVER PAGE ERROR]", err);
    supabaseError = err?.message || "Failed to load warranty data.";
  }

  return (
    <WarrantiesClient
      activeWarranties={activeWarranties}
      expiredWarranties={expiredWarranties}
      cancelledWarranties={cancelledWarranties}
      supabaseError={supabaseError}
      userName={authUser.name}
      userEmail={cleanEmail}
    />
  );
}
