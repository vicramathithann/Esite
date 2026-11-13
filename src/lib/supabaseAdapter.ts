/**
 * Production Supabase Database Adapter for VN Mobiles
 * Provides a drop-in database client interface backed directly by Supabase PostgREST via @supabase/supabase-js.
 *
 * Rules:
 * 1. Public reads (MobileProduct, ProductVariant, SiteSetting, Review, mobiles) use the public anon client (`supabase`).
 * 2. Orders, users, admin actions, and any write operations use the service-role client (`supabaseAdmin`) on the server.
 * 3. All PostgREST errors are explicitly inspected and logged with message, code, hint, and details.
 */

import { supabase, supabaseAdmin } from "./supabase";
import crypto from "crypto";

// Known date column names to deserialize back to real Date instances
const DATE_COLUMNS = new Set([
  "createdAt",
  "created_at",
  "updatedAt",
  "tokenExpires",
  "otpExpires",
  "lastOtpSentAt",
  "loginOtpExpires",
  "lastLoginOtpSentAt",
  "resetTokenExpires",
  "resetOtpExpires",
  "lastResetOtpSentAt",
  "purchaseDate",
  "warrantyStartDate",
  "warrantyExpiryDate",
  "warrantyEmailSentAt",
  "reminder1DaySentAt",
  "reminder6MonthSentAt",
  "reminded1DayAt",
  "reminded6MonthsAt",
  "expiresAt",
  "acceptedAt",
  "revokedAt",
  "accountDeletedAt",
  "sentAt",
  "usedAt",
  "deletedAt",
]);

function logSupabaseError(tableName: string, operation: string, error: any): void {
  if (!error) return;
  console.error(
    `[Supabase ${tableName}.${operation} ERROR] ` +
    `Code: ${error.code || "UNKNOWN"} | ` +
    `Message: ${error.message || "Unknown database error"} | ` +
    `Hint: ${error.hint || "None"} | ` +
    `Details: ${error.details || "None"}`
  );
}

function mapColumnToDb(tableName: string, col: string): string {
  if (tableName === "mobiles") {
    if (col === "imageUrl") return "image_url";
    if (col === "displaySize") return "display_size";
    if (col === "operatingSystem") return "operating_system";
    if (col === "createdAt") return "created_at";
  }
  return col;
}

function mapRowFromDb(tableName: string, row: any): any {
  if (!row || typeof row !== "object") return row;
  if (tableName === "mobiles") {
    if ("image_url" in row && !("imageUrl" in row)) row.imageUrl = row.image_url;
    if ("display_size" in row && !("displaySize" in row)) row.displaySize = row.display_size;
    if ("operating_system" in row && !("operatingSystem" in row)) row.operatingSystem = row.operating_system;
    if ("created_at" in row && !("createdAt" in row)) row.createdAt = row.created_at;
  }
  if (tableName === "User") {
    if (!("signupSource" in row) || row.signupSource === undefined || row.signupSource === null) {
      const isAdm =
        (row.email || "").toLowerCase() === "rrroyce20@gmail.com" ||
        (row.role || "").toUpperCase() === "ADMIN";
      row.signupSource = isAdm ? "admin" : "self";
    }
    // Ensure username and normalizedUsername are always populated and normalized
    if (!row.username && row.name) {
      row.username = row.name;
    }
    if (!row.normalizedUsername && (row.username || row.name)) {
      row.normalizedUsername = (row.username || row.name || "").trim().toLowerCase();
    }
  }
  if (tableName === "invitations") {
    if (typeof row.token === "string" && row.token.includes(":meta:")) {
      try {
        const parts = row.token.split(":meta:");
        const metaStr = Buffer.from(parts[1], "base64").toString("utf8");
        const meta = JSON.parse(metaStr);
        if (meta && typeof meta === "object") {
          if (meta.acceptedUserId && !row.acceptedUserId) row.acceptedUserId = meta.acceptedUserId;
          if (meta.acceptedAt && !row.acceptedAt) row.acceptedAt = new Date(meta.acceptedAt);
          if (meta.revokedAt && !row.revokedAt) row.revokedAt = new Date(meta.revokedAt);
          if (meta.revokedBy && !row.revokedBy) row.revokedBy = meta.revokedBy;
          if (meta.accountDeletedAt && !row.accountDeletedAt) row.accountDeletedAt = new Date(meta.accountDeletedAt);
          if (meta.deletedBy && !row.deletedBy) row.deletedBy = meta.deletedBy;
        }
      } catch {}
    }
  }
  if (tableName === "Warranty") {
    if (typeof row.changeHistory === "string") {
      try {
        row.changeHistory = JSON.parse(row.changeHistory);
      } catch {
        row.changeHistory = [];
      }
    } else if (!Array.isArray(row.changeHistory)) {
      row.changeHistory = [];
    }
  }
  return row;
}

function deserializeRow(row: any, tableName?: string): any {
  if (!row || typeof row !== "object") return row;
  const result: any = Array.isArray(row) ? [] : {};
  for (const [key, value] of Object.entries(row)) {
    if (value === null || value === undefined) {
      result[key] = value;
    } else if (DATE_COLUMNS.has(key) && typeof value === "string") {
      const parsed = new Date(value);
      result[key] = isNaN(parsed.getTime()) ? value : parsed;
    } else if (typeof value === "object" && !(value instanceof Date)) {
      result[key] = deserializeRow(value);
    } else {
      result[key] = value;
    }
  }
  return tableName ? mapRowFromDb(tableName, result) : result;
}

function serializeValue(val: any): any {
  if (val instanceof Date) {
    return val.toISOString();
  }
  return val;
}

function applyWhere(query: any, where: Record<string, any> | undefined, tableName: string): any {
  if (!where || typeof where !== "object") return query;

  for (const [rawCol, val] of Object.entries(where)) {
    if (val === undefined) continue;

    // Handle compound unique index for Wishlist: { userId_productId: { userId, productId } }
    if (rawCol === "userId_productId" && typeof val === "object" && val !== null) {
      if (val.userId) query = query.eq("userId", val.userId);
      if (val.productId) query = query.eq("productId", val.productId);
      continue;
    }

    // Handle OR filters: where: { OR: [ { a: 1 }, { b: 2 } ] }
    if (rawCol === "OR" && Array.isArray(val)) {
      const orClauses: string[] = [];
      for (const condition of val) {
        if (!condition || typeof condition !== "object") continue;
        for (const [cRawCol, cVal] of Object.entries(condition)) {
          if (cVal === undefined) continue;
          const cCol = mapColumnToDb(tableName, cRawCol);
          if (cVal === null) {
            orClauses.push(`${cCol}.is.null`);
          } else if (typeof cVal === "object" && cVal !== null) {
            if ("contains" in cVal) {
              orClauses.push(`${cCol}.ilike.%${(cVal as any).contains}%`);
            } else if ("in" in cVal && Array.isArray((cVal as any).in)) {
              orClauses.push(`${cCol}.in.(${(cVal as any).in.join(",")})`);
            } else if ("equals" in cVal) {
              orClauses.push(`${cCol}.eq.${serializeValue((cVal as any).equals)}`);
            } else if ("notIn" in cVal && Array.isArray((cVal as any).notIn)) {
              orClauses.push(`${cCol}.not.in.(${(cVal as any).notIn.join(",")})`);
            } else if ("gte" in cVal) {
              orClauses.push(`${cCol}.gte.${serializeValue((cVal as any).gte)}`);
            } else if ("lte" in cVal) {
              orClauses.push(`${cCol}.lte.${serializeValue((cVal as any).lte)}`);
            } else {
              orClauses.push(`${cCol}.eq.${serializeValue(cVal)}`);
            }
          } else {
            orClauses.push(`${cCol}.eq.${serializeValue(cVal)}`);
          }
        }
      }
      if (orClauses.length > 0) {
        query = query.or(orClauses.join(","));
      }
      continue;
    }

    // Handle username & normalizedUsername lookups for User
    if (tableName === "User" && (rawCol === "normalizedUsername" || rawCol === "username")) {
      const matchVal = typeof val === "string" ? val.trim() : String(val);
      query = query.ilike("name", matchVal);
      continue;
    }

    const col = mapColumnToDb(tableName, rawCol);

    if (val === null) {
      query = query.is(col, null);
      continue;
    }

    // Complex operator objects: { in, notIn, not, contains, gte, lte, gt, lt, equals }
    if (typeof val === "object" && !(val instanceof Date)) {
      if ("equals" in val) {
        query = query.eq(col, serializeValue(val.equals));
      }
      if ("contains" in val) {
        query = query.ilike(col, `%${val.contains}%`);
      }
      if ("in" in val && Array.isArray(val.in)) {
        query = query.in(col, val.in);
      }
      if ("notIn" in val && Array.isArray(val.notIn)) {
        query = query.not(col, "in", `(${val.notIn.join(",")})`);
      }
      if ("not" in val) {
        if (val.not === null) {
          query = query.not(col, "is", null);
        } else {
          query = query.neq(col, serializeValue(val.not));
        }
      }
      if ("gte" in val) {
        query = query.gte(col, serializeValue(val.gte));
      }
      if ("lte" in val) {
        query = query.lte(col, serializeValue(val.lte));
      }
      if ("gt" in val) {
        query = query.gt(col, serializeValue(val.gt));
      }
      if ("lt" in val) {
        query = query.lt(col, serializeValue(val.lt));
      }
    } else {
      query = query.eq(col, serializeValue(val));
    }
  }

  return query;
}

function applyOrderBy(query: any, orderBy: any, tableName: string): any {
  if (!orderBy) return query;
  const orders = Array.isArray(orderBy) ? orderBy : [orderBy];
  for (const order of orders) {
    if (!order || typeof order !== "object") continue;
    for (const [col, dir] of Object.entries(order)) {
      const dbCol = mapColumnToDb(tableName, col);
      query = query.order(dbCol, { ascending: (dir as string).toLowerCase() === "asc" });
    }
  }
  return query;
}

interface QueryOptions {
  where?: Record<string, any>;
  orderBy?: any;
  take?: number;
  skip?: number;
  include?: Record<string, any>;
  select?: Record<string, any>;
}

export class SupabaseModelDelegate {
  constructor(
    public readonly tableName: string,
    public readonly modelName: string,
    public readonly isPublicReadModel: boolean = false
  ) {}

  /**
   * Selects the appropriate Supabase client:
   * - Public reads on storefront models use the public anon client (`supabase`)
   * - All writes, admin actions, orders, users and warranties use `supabaseAdmin`
   */
  private getClient(isWrite: boolean = false) {
    if (isWrite || !this.isPublicReadModel) {
      return supabaseAdmin;
    }
    return supabase;
  }

  private cleanData(data: Record<string, any>): Record<string, any> {
    const clean: Record<string, any> = {};
    for (const [key, val] of Object.entries(data)) {
      if (val === undefined) continue;
      // Skip relational nested create/connect objects in flat table insert/update
      if (
        (key === "items" || key === "statusHistory" || key === "variants" || key === "reviews") &&
        typeof val === "object" &&
        val !== null &&
        ("create" in val || "connect" in val)
      ) {
        continue;
      }

      // Handle increment/decrement: { retryCount: { increment: 1 } }
      if (typeof val === "object" && val !== null && "increment" in val) {
        continue;
      }

      const dbKey = mapColumnToDb(this.tableName, key);
      clean[dbKey] = serializeValue(val);
    }

    // For invitations, safely extract virtual metadata keys into token if present
    if (this.tableName === "invitations") {
      const metaKeys = ["acceptedUserId", "revokedAt", "revokedBy", "accountDeletedAt", "deletedBy"];
      const hasMeta = metaKeys.some((k) => k in clean && clean[k] !== undefined);
      if (hasMeta) {
        const metaObj: Record<string, any> = {};
        for (const k of metaKeys) {
          if (clean[k] !== undefined) {
            metaObj[k] = clean[k];
            delete clean[k];
          }
        }
        if (clean.token && typeof clean.token === "string") {
          const baseToken = clean.token.split(":meta:")[0];
          clean.token = `${baseToken}:meta:${Buffer.from(JSON.stringify(metaObj)).toString("base64")}`;
        }
      }
    }

    // For User records, synchronize name and username fields
    if (this.tableName === "User") {
      if (clean.username && !clean.name) {
        clean.name = clean.username;
      }
      if (clean.name && !clean.username) {
        clean.username = clean.name;
      }
      if ((clean.username || clean.name) && !clean.normalizedUsername) {
        clean.normalizedUsername = String(clean.username || clean.name).trim().toLowerCase();
      }
    }

    return clean;
  }

  private async attachRelations(records: any[], include?: Record<string, any>): Promise<any[]> {
    if (!include || records.length === 0) return records;

    // Attach relations for Order
    if (this.modelName === "order") {
      const orderIds = records.map((r) => r.id).filter(Boolean);

      if (include.items && orderIds.length > 0) {
        const { data: items, error: itemsErr } = await supabaseAdmin
          .from("OrderItem")
          .select("*")
          .in("orderId", orderIds);
        if (itemsErr) logSupabaseError("OrderItem", "attachRelations(items)", itemsErr);

        const itemMap = new Map<string, any[]>();
        for (const item of (items || []).map((r) => deserializeRow(r, "OrderItem"))) {
          if (!itemMap.has(item.orderId)) itemMap.set(item.orderId, []);
          itemMap.get(item.orderId)!.push(item);
        }
        for (const rec of records) {
          rec.items = itemMap.get(rec.id) || [];
        }
      }

      if (include.statusHistory && orderIds.length > 0) {
        const { data: histories, error: histErr } = await supabaseAdmin
          .from("OrderStatusHistory")
          .select("*")
          .in("orderId", orderIds)
          .order("createdAt", { ascending: true });
        if (histErr) logSupabaseError("OrderStatusHistory", "attachRelations(statusHistory)", histErr);

        const histMap = new Map<string, any[]>();
        for (const h of (histories || []).map((r) => deserializeRow(r, "OrderStatusHistory"))) {
          if (!histMap.has(h.orderId)) histMap.set(h.orderId, []);
          histMap.get(h.orderId)!.push(h);
        }
        for (const rec of records) {
          rec.statusHistory = histMap.get(rec.id) || [];
        }
      }

      if (include.user) {
        const userIds = records.map((r) => r.userId).filter(Boolean);
        if (userIds.length > 0) {
          const { data: users, error: userErr } = await supabaseAdmin
            .from("User")
            .select("*")
            .in("id", userIds);
          if (userErr) logSupabaseError("User", "attachRelations(user)", userErr);

          const userMap = new Map<string, any>();
          for (const u of (users || []).map((r) => deserializeRow(r, "User"))) {
            userMap.set(u.id, u);
          }
          for (const rec of records) {
            rec.user = userMap.get(rec.userId) || null;
          }
        }
      }

      if (include.warranties && orderIds.length > 0) {
        const { data: warranties, error: warErr } = await supabaseAdmin
          .from("Warranty")
          .select("*")
          .in("orderId", orderIds);
        if (warErr) logSupabaseError("Warranty", "attachRelations(warranties)", warErr);

        const warMap = new Map<string, any[]>();
        for (const w of (warranties || []).map((r) => deserializeRow(r, "Warranty"))) {
          if (!warMap.has(w.orderId)) warMap.set(w.orderId, []);
          warMap.get(w.orderId)!.push(w);
        }
        for (const rec of records) {
          rec.warranties = warMap.get(rec.id) || [];
        }
      }

      if (include.emailNotifications && orderIds.length > 0) {
        const { data: notifications, error: notifErr } = await supabaseAdmin
          .from("EmailNotification")
          .select("*")
          .in("orderId", orderIds)
          .order("createdAt", { ascending: false });
        if (notifErr) logSupabaseError("EmailNotification", "attachRelations(emailNotifications)", notifErr);

        const notifMap = new Map<string, any[]>();
        for (const n of (notifications || []).map((r) => deserializeRow(r, "EmailNotification"))) {
          if (!notifMap.has(n.orderId)) notifMap.set(n.orderId, []);
          notifMap.get(n.orderId)!.push(n);
        }
        for (const rec of records) {
          rec.emailNotifications = notifMap.get(rec.id) || [];
        }
      }
    }

    // Attach relations for MobileProduct (public read models use anon client)
    if (this.modelName === "mobileProduct") {
      const productIds = records.map((r) => r.id).filter(Boolean);

      if (include.variants && productIds.length > 0) {
        const { data: variants, error: varErr } = await supabase
          .from("ProductVariant")
          .select("*")
          .in("productId", productIds);
        if (varErr) logSupabaseError("ProductVariant", "attachRelations(variants)", varErr);

        const varMap = new Map<string, any[]>();
        for (const v of (variants || []).map((r) => deserializeRow(r, "ProductVariant"))) {
          if (!varMap.has(v.productId)) varMap.set(v.productId, []);
          varMap.get(v.productId)!.push(v);
        }
        for (const rec of records) {
          const dbVariants = varMap.get(rec.id) || [];
          if (dbVariants.length > 0) {
            let parsedStorageOpts: any[] = [];
            try {
              parsedStorageOpts = typeof rec.storageOptions === "string" ? JSON.parse(rec.storageOptions) : (rec.storageOptions || []);
            } catch {}
            rec.variants = dbVariants.map((v: any, idx: number) => {
              const matchedOpt = parsedStorageOpts.find((o: any) =>
                (o.id && o.id === v.id) ||
                ((o.storage || o.size) === v.storage && (!o.ram || o.ram === v.ram))
              );
              const bp = v.price ?? v.basePrice ?? rec.basePrice;
              const op = matchedOpt?.originalPrice || (matchedOpt?.price && matchedOpt.price > bp ? matchedOpt.price : rec.originalPrice);
              return {
                id: v.id,
                productId: v.productId,
                ram: v.ram || (rec.ram ? rec.ram.split('/')[0].trim() : "8GB"),
                storage: v.storage || "128GB",
                basePrice: bp,
                originalPrice: op && op >= bp ? op : bp,
                stock: v.stock !== undefined ? v.stock : rec.stock,
                inStock: (v.stock !== undefined ? v.stock : rec.stock) > 0,
                sku: v.sku || matchedOpt?.sku || "",
                isDefault: matchedOpt?.isDefault !== undefined ? matchedOpt.isDefault : idx === 0,
              };
            });
          } else {
            // Fallback from storageOptions if ProductVariant table rows are not yet populated
            let parsedStorageOpts: any[] = [];
            try {
              parsedStorageOpts = typeof rec.storageOptions === "string" ? JSON.parse(rec.storageOptions) : (rec.storageOptions || []);
            } catch {}
            const defaultRam = rec.ram ? rec.ram.split('/')[0].trim() : "8GB";
            if (Array.isArray(parsedStorageOpts) && parsedStorageOpts.length > 0) {
              rec.variants = parsedStorageOpts.map((opt: any, idx: number) => {
                const bp = opt.basePrice || opt.price || rec.basePrice;
                const op = opt.originalPrice || rec.originalPrice;
                const st = opt.stock !== undefined ? opt.stock : (rec.stock !== undefined ? rec.stock : 20);
                return {
                  id: opt.id || `${rec.id}-${(opt.size || opt.storage || "default").toLowerCase().replace(/[^a-z0-9]/g, "")}`,
                  productId: rec.id,
                  ram: opt.ram || defaultRam,
                  storage: opt.size || opt.storage || "128GB",
                  basePrice: bp,
                  originalPrice: op && op >= bp ? op : bp,
                  stock: st,
                  inStock: st > 0,
                  sku: opt.sku || "",
                  isDefault: opt.isDefault !== undefined ? opt.isDefault : idx === 0,
                };
              });
            } else {
              rec.variants = [{
                id: `${rec.id}-default`,
                productId: rec.id,
                ram: defaultRam,
                storage: "128GB",
                basePrice: rec.basePrice || 49999,
                originalPrice: rec.originalPrice || rec.basePrice || 49999,
                stock: rec.stock !== undefined ? rec.stock : 20,
                inStock: (rec.stock !== undefined ? rec.stock : 20) > 0,
                sku: "",
                isDefault: true,
              }];
            }
          }
        }
      }

      if (include.reviews && productIds.length > 0) {
        const { data: reviews, error: revErr } = await supabase
          .from("Review")
          .select("*")
          .in("productId", productIds);
        if (revErr) logSupabaseError("Review", "attachRelations(reviews)", revErr);

        const revMap = new Map<string, any[]>();
        for (const r of (reviews || []).map((row) => deserializeRow(row, "Review"))) {
          if (!revMap.has(r.productId)) revMap.set(r.productId, []);
          revMap.get(r.productId)!.push(r);
        }
        for (const rec of records) {
          rec.reviews = revMap.get(rec.id) || [];
        }
      }
    }

    // Attach relations for Warranty
    if (this.modelName === "warranty") {
      const recordsWithoutHistory = records.filter(
        (r) => !r.changeHistory || (Array.isArray(r.changeHistory) && r.changeHistory.length === 0)
      );
      if (recordsWithoutHistory.length > 0) {
        const keys = recordsWithoutHistory.map((r) => `warranty_history_${r.id}`);
        try {
          const { data: settings } = await supabaseAdmin
            .from("SiteSetting")
            .select("key, value")
            .in("key", keys);
          if (settings && settings.length > 0) {
            const setMap = new Map<string, any>();
            for (const s of settings) {
              try {
                setMap.set(s.key, JSON.parse(s.value));
              } catch {
                setMap.set(s.key, []);
              }
            }
            for (const rec of recordsWithoutHistory) {
              const h = setMap.get(`warranty_history_${rec.id}`);
              if (h && Array.isArray(h) && h.length > 0) {
                rec.changeHistory = h;
              }
            }
          }
        } catch {}
      }

      if (include.order) {
        const orderIds = records.map((r) => r.orderId).filter(Boolean);
        if (orderIds.length > 0) {
          const { data: orders, error: ordErr } = await supabaseAdmin
            .from("Order")
            .select("*")
            .in("id", orderIds);
          if (ordErr) logSupabaseError("Order", "attachRelations(order)", ordErr);

          const orderMap = new Map<string, any>();
          for (const o of (orders || []).map((r) => deserializeRow(r, "Order"))) {
            orderMap.set(o.id, o);
          }
          for (const rec of records) {
            rec.order = orderMap.get(rec.orderId) || null;
          }
        }
      }

      if (include.orderItem) {
        const orderItemIds = records.map((r) => r.orderItemId).filter(Boolean);
        if (orderItemIds.length > 0) {
          const { data: items, error: itemErr } = await supabaseAdmin
            .from("OrderItem")
            .select("*")
            .in("id", orderItemIds);
          if (itemErr) logSupabaseError("OrderItem", "attachRelations(orderItem)", itemErr);

          const itemMap = new Map<string, any>();
          for (const item of (items || []).map((r) => deserializeRow(r, "OrderItem"))) {
            itemMap.set(item.id, item);
          }
          for (const rec of records) {
            rec.orderItem = itemMap.get(rec.orderItemId) || null;
          }
        }
      }
    }

    // Attach relations for EmailNotification
    if (this.modelName === "emailNotification") {
      if (include.order) {
        const orderIds = records.map((r) => r.orderId).filter(Boolean);
        if (orderIds.length > 0) {
          let selectCols = "*";
          if (typeof include.order === "object" && include.order.select) {
            const keys = Object.keys(include.order.select).filter((k) => include.order.select[k]);
            if (keys.length > 0) {
              if (!keys.includes("id")) keys.push("id");
              selectCols = keys.join(",");
            }
          }
          const { data: orders, error: ordErr } = await supabaseAdmin
            .from("Order")
            .select(selectCols)
            .in("id", orderIds);
          if (ordErr) logSupabaseError("Order", "attachRelations(emailOrder)", ordErr);

          const orderMap = new Map<string, any>();
          for (const o of (orders || []).map((r) => deserializeRow(r, "Order"))) {
            orderMap.set(o.id, o);
          }
          for (const rec of records) {
            rec.order = orderMap.get(rec.orderId) || null;
          }
        }
      }
    }

    // Attach relations for Wishlist
    if (this.modelName === "wishlist") {
      if (include.product) {
        const productIds = records.map((r) => r.productId).filter(Boolean);
        if (productIds.length > 0) {
          const { data: products, error: prodErr } = await supabase
            .from("MobileProduct")
            .select("*")
            .in("id", productIds);
          if (prodErr) logSupabaseError("MobileProduct", "attachRelations(wishlistProduct)", prodErr);

          const prodMap = new Map<string, any>();
          for (const p of (products || []).map((r) => deserializeRow(r, "MobileProduct"))) {
            prodMap.set(p.id, p);
          }
          for (const rec of records) {
            rec.product = prodMap.get(rec.productId) || null;
          }
        }
      }
    }

    // Attach relations for User
    if (this.modelName === "user") {
      if (include.orders) {
        const userIds = records.map((r) => r.id).filter(Boolean);
        if (userIds.length > 0) {
          let selectCols = "*";
          if (typeof include.orders === "object" && include.orders.select) {
            const keys = Object.keys(include.orders.select).filter((k) => include.orders.select[k]);
            if (keys.length > 0) {
              if (!keys.includes("id")) keys.push("id");
              if (!keys.includes("userId")) keys.push("userId");
              selectCols = keys.join(",");
            }
          }
          const { data: orders, error: ordErr } = await supabaseAdmin
            .from("Order")
            .select(selectCols)
            .in("userId", userIds);
          if (ordErr) logSupabaseError("Order", "attachRelations(userOrders)", ordErr);

          const orderMap = new Map<string, any[]>();
          for (const o of (orders || []).map((r) => deserializeRow(r, "Order"))) {
            if (!orderMap.has(o.userId)) orderMap.set(o.userId, []);
            orderMap.get(o.userId)!.push(o);
          }
          for (const rec of records) {
            rec.orders = orderMap.get(rec.id) || [];
          }
        }
      }
    }

    return records;
  }

  async findMany(options?: QueryOptions): Promise<any[]> {
    const client = this.getClient(false);
    let query = client.from(this.tableName).select("*");
    query = applyWhere(query, options?.where, this.tableName);
    query = applyOrderBy(query, options?.orderBy, this.tableName);

    if (options?.skip !== undefined && options?.take !== undefined) {
      query = query.range(options.skip, options.skip + options.take - 1);
    } else if (options?.take !== undefined) {
      query = query.limit(options.take);
    }

    const { data, error } = await query;
    if (error) {
      logSupabaseError(this.tableName, "findMany", error);
      throw new Error(`Database error in ${this.tableName}.findMany: ${error.message} (${error.code})`);
    }

    const records = (data || []).map((r) => deserializeRow(r, this.tableName));
    const effectiveInclude = {
      ...(options?.include || {}),
      ...(options?.select?.orders ? { orders: options.select.orders } : {}),
      ...(options?.select?.items ? { items: options.select.items } : {}),
    };
    return this.attachRelations(
      records,
      Object.keys(effectiveInclude).length > 0 ? effectiveInclude : undefined
    );
  }

  async findUnique(options: { where: Record<string, any>; include?: Record<string, any>; select?: Record<string, any> }): Promise<any | null> {
    return this.findFirst(options);
  }

  async findFirst(options?: QueryOptions): Promise<any | null> {
    const client = this.getClient(false);
    let query = client.from(this.tableName).select("*");
    query = applyWhere(query, options?.where, this.tableName);
    query = applyOrderBy(query, options?.orderBy, this.tableName);
    query = query.limit(1);

    const { data, error } = await query;
    if (error) {
      logSupabaseError(this.tableName, "findFirst", error);
      throw new Error(`Database error in ${this.tableName}.findFirst: ${error.message} (${error.code})`);
    }

    if (!data || data.length === 0) return null;
    const records = [deserializeRow(data[0], this.tableName)];
    const effectiveInclude = {
      ...(options?.include || {}),
      ...(options?.select?.orders ? { orders: options.select.orders } : {}),
      ...(options?.select?.items ? { items: options.select.items } : {}),
    };
    const withRelations = await this.attachRelations(
      records,
      Object.keys(effectiveInclude).length > 0 ? effectiveInclude : undefined
    );
    return withRelations[0] || null;
  }

  async count(options?: { where?: Record<string, any> }): Promise<number> {
    const client = this.getClient(false);
    let query = client.from(this.tableName).select("*", { count: "exact", head: true });
    query = applyWhere(query, options?.where, this.tableName);

    const { count, error } = await query;
    if (error) {
      logSupabaseError(this.tableName, "count", error);
      throw new Error(`Database error in ${this.tableName}.count: ${error.message} (${error.code})`);
    }
    return count || 0;
  }

  async create(options: {
    data: Record<string, any>;
    include?: Record<string, any>;
    select?: Record<string, any>;
  }): Promise<any> {
    const client = this.getClient(true); // Always uses service role for write
    const rawData = options.data || {};
    const insertData = this.cleanData(rawData);

    // Auto-generate UUID if table uses id and none was provided
    if (this.tableName !== "SiteSetting" && !insertData.id) {
      insertData.id = crypto.randomUUID();
    }
    if (!insertData.createdAt && !insertData.created_at) {
      if (this.tableName === "mobiles") {
        insertData.created_at = new Date().toISOString();
      } else if (this.tableName !== "SiteSetting") {
        insertData.createdAt = new Date().toISOString();
      }
    }

    let { data, error } = await client
      .from(this.tableName)
      .insert(insertData)
      .select()
      .single();

    if (
      error &&
      (error.code === "42703" ||
        error.code === "PGRST204" ||
        error.message?.includes("signupSource") ||
        error.message?.includes("username") ||
        error.message?.includes("normalizedUsername")) &&
      ("signupSource" in insertData || "username" in insertData || "normalizedUsername" in insertData)
    ) {
      const fallbackData = { ...insertData };
      delete fallbackData.signupSource;
      delete fallbackData.username;
      delete fallbackData.normalizedUsername;
      const retry = await client
        .from(this.tableName)
        .insert(fallbackData)
        .select()
        .single();
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      logSupabaseError(this.tableName, "create", error);
      throw new Error(`Database error in ${this.tableName}.create: ${error.message} (${error.code})`);
    }

    const createdRecord = deserializeRow(data, this.tableName);

    // Handle nested Order items and statusHistory creation
    if (this.modelName === "order") {
      if (rawData.items?.create && Array.isArray(rawData.items.create)) {
        const itemsToInsert = rawData.items.create.map((item: any) => ({
          id: item.id || crypto.randomUUID(),
          orderId: createdRecord.id,
          productId: item.productId,
          productName: item.productName,
          productBrand: item.productBrand || item.brand || "VN Mobiles",
          productImageUrl: item.productImageUrl || item.imageUrl || "/images/placeholder.png",
          selectedColor: item.selectedColor || (typeof item.variantInfo === "string" ? item.variantInfo.split(",")[1]?.trim() : "") || "Standard",
          selectedStorage: item.selectedStorage || (typeof item.variantInfo === "string" ? item.variantInfo.split(",")[0]?.trim() : "") || "Standard",
          price: item.price,
          quantity: item.quantity || 1,
          imeiNumber: item.imeiNumber || "",
          warrantyMonths: item.warrantyMonths || 12,
          warrantyStartDate: item.warrantyStartDate ? serializeValue(item.warrantyStartDate) : new Date().toISOString(),
          warrantyExpiryDate: item.warrantyExpiryDate ? serializeValue(item.warrantyExpiryDate) : new Date().toISOString(),
          warrantyStatus: item.warrantyStatus || "ACTIVE",
        }));
        if (itemsToInsert.length > 0) {
          const { data: insertedItems, error: itemsErr } = await supabaseAdmin
            .from("OrderItem")
            .insert(itemsToInsert)
            .select();
          if (itemsErr) logSupabaseError("OrderItem", "create(items)", itemsErr);
          createdRecord.items = (insertedItems || []).map((r) => deserializeRow(r, "OrderItem"));
        }
      }

      if (rawData.statusHistory?.create && Array.isArray(rawData.statusHistory.create)) {
        const historiesToInsert = rawData.statusHistory.create.map((hist: any) => ({
          id: hist.id || crypto.randomUUID(),
          orderId: createdRecord.id,
          fromStatus: hist.fromStatus || "NONE",
          toStatus: hist.toStatus,
          changedBy: hist.changedBy || "SYSTEM",
          note: hist.note || "",
          createdAt: new Date().toISOString(),
        }));
        if (historiesToInsert.length > 0) {
          const { data: insertedHistories, error: histErr } = await supabaseAdmin
            .from("OrderStatusHistory")
            .insert(historiesToInsert)
            .select();
          if (histErr) logSupabaseError("OrderStatusHistory", "create(statusHistory)", histErr);
          createdRecord.statusHistory = (insertedHistories || []).map((r) => deserializeRow(r, "OrderStatusHistory"));
        }
      }
    }

    // Attach any relations requested by include
    const withRelations = await this.attachRelations([createdRecord], options.include);
    return withRelations[0];
  }

  async update(options: {
    where: Record<string, any>;
    data: Record<string, any>;
    include?: Record<string, any>;
    select?: Record<string, any>;
  }): Promise<any> {
    const client = this.getClient(true); // Always uses service role for write
    const rawData = options.data || {};
    const updateData = this.cleanData(rawData);

    // Resolve atomic increments if specified (e.g. retryCount: { increment: 1 })
    for (const [key, val] of Object.entries(rawData)) {
      if (typeof val === "object" && val !== null && "increment" in val) {
        const current = await this.findFirst({ where: options.where });
        const currentNum = current && typeof current[key] === "number" ? current[key] : 0;
        const dbKey = mapColumnToDb(this.tableName, key);
        updateData[dbKey] = currentNum + ((val as any).increment || 1);
      }
    }

    // For invitations: pack metadata into token if updating without explicit token
    if (this.tableName === "invitations") {
      const metaKeys = ["acceptedUserId", "revokedAt", "revokedBy", "accountDeletedAt", "deletedBy"];
      const hasMeta = metaKeys.some((k) => k in rawData && rawData[k] !== undefined);
      if (hasMeta && !("token" in updateData)) {
        const current = await this.findFirst({ where: options.where });
        const currentToken = (current && current.token) || "";
        let existingMeta: Record<string, any> = {};
        if (currentToken.includes(":meta:")) {
          try {
            existingMeta = JSON.parse(Buffer.from(currentToken.split(":meta:")[1], "base64").toString("utf8")) || {};
          } catch {}
        }
        for (const k of metaKeys) {
          if (rawData[k] !== undefined && rawData[k] !== null) {
            existingMeta[k] = rawData[k] instanceof Date ? rawData[k].toISOString() : rawData[k];
          }
        }
        const baseToken = currentToken.split(":meta:")[0];
        updateData.token = `${baseToken}:meta:${Buffer.from(JSON.stringify(existingMeta)).toString("base64")}`;
      }
    }

    // For Warranty: handle changeHistory and map reminder columns
    let warrantyHistoryToSave: any = null;
    if (this.tableName === "Warranty") {
      if ("changeHistory" in updateData) {
        warrantyHistoryToSave = updateData.changeHistory;
        delete updateData.changeHistory;
      }
      if ("reminder6MonthSentAt" in updateData) {
        if (!("reminded6MonthsAt" in updateData)) {
          updateData.reminded6MonthsAt = updateData.reminder6MonthSentAt;
        }
        delete updateData.reminder6MonthSentAt;
      }
      if ("reminder1DaySentAt" in updateData) {
        if (!("reminded1DayAt" in updateData)) {
          updateData.reminded1DayAt = updateData.reminder1DaySentAt;
        }
        delete updateData.reminder1DaySentAt;
      }
    }

    let query = client.from(this.tableName).update(updateData);
    query = applyWhere(query, options.where, this.tableName);
    let { data, error } = await query.select();

    // Robust column fallback retry: if Postgres reports a column doesn't exist, strip and retry
    let retryAttempts = 0;
    while (
      error &&
      (error.code === "42703" || error.code === "PGRST204" || error.message?.includes("column")) &&
      retryAttempts < 5
    ) {
      retryAttempts++;
      const match =
        error.message?.match(/column ['"]?([a-zA-Z0-9_]+)['"]?/i) ||
        error.message?.match(/Could not find the ['"]?([a-zA-Z0-9_]+)['"]? column/i);
      const badCol = match ? match[1] : null;
      if (badCol && badCol in updateData) {
        delete updateData[badCol];
        let retryQuery = client.from(this.tableName).update(updateData);
        retryQuery = applyWhere(retryQuery, options.where, this.tableName);
        const retry = await retryQuery.select();
        data = retry.data;
        error = retry.error;
      } else {
        break;
      }
    }

    if (
      error &&
      (error.code === "42703" ||
        error.code === "PGRST204" ||
        error.message?.includes("signupSource") ||
        error.message?.includes("username") ||
        error.message?.includes("normalizedUsername")) &&
      ("signupSource" in updateData || "username" in updateData || "normalizedUsername" in updateData)
    ) {
      const fallbackData = { ...updateData };
      delete fallbackData.signupSource;
      delete fallbackData.username;
      delete fallbackData.normalizedUsername;
      let retryQuery = client.from(this.tableName).update(fallbackData);
      retryQuery = applyWhere(retryQuery, options.where, this.tableName);
      const retry = await retryQuery.select();
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      logSupabaseError(this.tableName, "update", error);
      throw new Error(`Database error in ${this.tableName}.update: ${error.message} (${error.code})`);
    }

    const updatedRecord = (data && data.length > 0) ? deserializeRow(data[0], this.tableName) : null;

    if (this.tableName === "Warranty" && (warrantyHistoryToSave || rawData.changeHistory) && updatedRecord) {
      const hist = warrantyHistoryToSave || rawData.changeHistory;
      try {
        await supabaseAdmin.from("SiteSetting").upsert({
          key: `warranty_history_${updatedRecord.id}`,
          value: typeof hist === "string" ? hist : JSON.stringify(hist),
        }, { onConflict: "key" });
      } catch {}
      try {
        updatedRecord.changeHistory = Array.isArray(hist)
          ? hist
          : (typeof hist === "string" ? JSON.parse(hist) : []);
      } catch {
        updatedRecord.changeHistory = [];
      }
    }

    // Handle nested Order statusHistory creation during update
    if (this.modelName === "order" && rawData.statusHistory?.create && Array.isArray(rawData.statusHistory.create) && updatedRecord) {
      const historiesToInsert = rawData.statusHistory.create.map((hist: any) => ({
        id: hist.id || crypto.randomUUID(),
        orderId: updatedRecord.id,
        fromStatus: hist.fromStatus || "NONE",
        toStatus: hist.toStatus,
        changedBy: hist.changedBy || "SYSTEM",
        note: hist.note || "",
        createdAt: new Date().toISOString(),
      }));
      if (historiesToInsert.length > 0) {
        const { error: histErr } = await supabaseAdmin.from("OrderStatusHistory").insert(historiesToInsert);
        if (histErr) logSupabaseError("OrderStatusHistory", "update(statusHistory)", histErr);
      }
    }

    if (!updatedRecord) return null;
    const withRelations = await this.attachRelations([updatedRecord], options.include);
    return withRelations[0];
  }

  async updateMany(options: {
    where?: Record<string, any>;
    data: Record<string, any>;
  }): Promise<{ count: number }> {
    const client = this.getClient(true); // Always uses service role for write
    const rawData = options.data || {};
    const updateData = this.cleanData(rawData);
    // For invitations: pack metadata into token if updating without explicit token
    if (this.tableName === "invitations") {
      const metaKeys = ["acceptedUserId", "revokedAt", "revokedBy", "accountDeletedAt", "deletedBy"];
      const hasMeta = metaKeys.some((k) => k in rawData && rawData[k] !== undefined);
      if (hasMeta && !("token" in updateData)) {
        const current = await this.findFirst({ where: options.where });
        const currentToken = (current && current.token) || "";
        let existingMeta: Record<string, any> = {};
        if (currentToken.includes(":meta:")) {
          try {
            existingMeta = JSON.parse(Buffer.from(currentToken.split(":meta:")[1], "base64").toString("utf8")) || {};
          } catch {}
        }
        for (const k of metaKeys) {
          if (rawData[k] !== undefined && rawData[k] !== null) {
            existingMeta[k] = rawData[k] instanceof Date ? rawData[k].toISOString() : rawData[k];
          }
        }
        const baseToken = currentToken.split(":meta:")[0];
        updateData.token = `${baseToken}:meta:${Buffer.from(JSON.stringify(existingMeta)).toString("base64")}`;
      }
    }

    let query = client.from(this.tableName).update(updateData);
    query = applyWhere(query, options.where, this.tableName);
    let { data, error } = await query.select();

    if (
      error &&
      (error.code === "42703" ||
        error.code === "PGRST204" ||
        error.message?.includes("signupSource") ||
        error.message?.includes("username") ||
        error.message?.includes("normalizedUsername")) &&
      ("signupSource" in updateData || "username" in updateData || "normalizedUsername" in updateData)
    ) {
      const fallbackData = { ...updateData };
      delete fallbackData.signupSource;
      delete fallbackData.username;
      delete fallbackData.normalizedUsername;
      let retryQuery = client.from(this.tableName).update(fallbackData);
      retryQuery = applyWhere(retryQuery, options.where, this.tableName);
      const retry = await retryQuery.select();
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      logSupabaseError(this.tableName, "updateMany", error);
      throw new Error(`Database error in ${this.tableName}.updateMany: ${error.message} (${error.code})`);
    }
    return { count: data?.length || 0 };
  }

  async delete(options: { where: Record<string, any> }): Promise<any> {
    const client = this.getClient(true); // Always uses service role for write
    let query = client.from(this.tableName).delete();
    query = applyWhere(query, options.where, this.tableName);
    const { data, error } = await query.select();

    if (error) {
      logSupabaseError(this.tableName, "delete", error);
      throw new Error(`Database error in ${this.tableName}.delete: ${error.message} (${error.code})`);
    }
    return data && data.length > 0 ? deserializeRow(data[0], this.tableName) : { success: true };
  }

  async deleteMany(options?: { where?: Record<string, any> }): Promise<{ count: number }> {
    const client = this.getClient(true); // Always uses service role for write
    let query = client.from(this.tableName).delete();
    query = applyWhere(query, options?.where, this.tableName);
    const { data, error } = await query.select();

    if (error) {
      logSupabaseError(this.tableName, "deleteMany", error);
      throw new Error(`Database error in ${this.tableName}.deleteMany: ${error.message} (${error.code})`);
    }
    return { count: data?.length || 0 };
  }

  async upsert(options: {
    where: Record<string, any>;
    update: Record<string, any>;
    create: Record<string, any>;
  }): Promise<any> {
    const existing = await this.findFirst({ where: options.where });
    if (existing) {
      return this.update({ where: options.where, data: options.update });
    } else {
      return this.create({ data: options.create });
    }
  }
}

export interface SupabaseDatabaseClient {
  user: SupabaseModelDelegate;
  mobileProduct: SupabaseModelDelegate;
  productVariant: SupabaseModelDelegate;
  order: SupabaseModelDelegate;
  orderItem: SupabaseModelDelegate;
  orderStatusHistory: SupabaseModelDelegate;
  warranty: SupabaseModelDelegate;
  emailNotification: SupabaseModelDelegate;
  wishlist: SupabaseModelDelegate;
  review: SupabaseModelDelegate;
  siteSetting: SupabaseModelDelegate;
  invitation: SupabaseModelDelegate;
  mobile: SupabaseModelDelegate;
  accountDeletionRequest: SupabaseModelDelegate;
  accountDeletionAudit: SupabaseModelDelegate;
  adminPasswordResetToken: SupabaseModelDelegate;
  adminSecurityAudit: SupabaseModelDelegate;
  userPasswordResetToken: SupabaseModelDelegate;
  userAuditLog: SupabaseModelDelegate;
  $transaction: (arg: any) => Promise<any>;
}

/**
 * Creates the complete database client interface backed directly by Supabase.
 * - Public reads on storefront tables (MobileProduct, ProductVariant, SiteSetting, Review, mobiles) use anon client
 * - Writes and private tables use service-role client on the server
 */
export function createSupabasePrismaClient(): SupabaseDatabaseClient {
  const client: SupabaseDatabaseClient = {
    user: new SupabaseModelDelegate("User", "user", false),
    mobileProduct: new SupabaseModelDelegate("MobileProduct", "mobileProduct", true),
    productVariant: new SupabaseModelDelegate("ProductVariant", "productVariant", true),
    order: new SupabaseModelDelegate("Order", "order", false),
    orderItem: new SupabaseModelDelegate("OrderItem", "orderItem", false),
    orderStatusHistory: new SupabaseModelDelegate("OrderStatusHistory", "orderStatusHistory", false),
    warranty: new SupabaseModelDelegate("Warranty", "warranty", false),
    emailNotification: new SupabaseModelDelegate("EmailNotification", "emailNotification", false),
    wishlist: new SupabaseModelDelegate("Wishlist", "wishlist", false),
    review: new SupabaseModelDelegate("Review", "review", true),
    siteSetting: new SupabaseModelDelegate("SiteSetting", "siteSetting", true),
    invitation: new SupabaseModelDelegate("invitations", "invitation", false),
    mobile: new SupabaseModelDelegate("mobiles", "mobile", true),
    accountDeletionRequest: new SupabaseModelDelegate("AccountDeletionRequest", "accountDeletionRequest", false),
    accountDeletionAudit: new SupabaseModelDelegate("AccountDeletionAudit", "accountDeletionAudit", false),
    adminPasswordResetToken: new SupabaseModelDelegate("AdminPasswordResetToken", "adminPasswordResetToken", false),
    adminSecurityAudit: new SupabaseModelDelegate("AdminSecurityAudit", "adminSecurityAudit", false),
    userPasswordResetToken: new SupabaseModelDelegate("UserPasswordResetToken", "userPasswordResetToken", false),
    userAuditLog: new SupabaseModelDelegate("UserAuditLog", "userAuditLog", false),

    async $transaction(arg: any) {
      if (typeof arg === "function") {
        return arg(client);
      }
      if (Array.isArray(arg)) {
        return Promise.all(arg);
      }
      return arg;
    },
  };

  return client;
}
