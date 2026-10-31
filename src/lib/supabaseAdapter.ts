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
  "expiresAt",
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
          } else if (typeof cVal === "object" && "contains" in cVal) {
            orClauses.push(`${cCol}.ilike.%${(cVal as any).contains}%`);
          } else if (typeof cVal === "object" && "in" in cVal && Array.isArray((cVal as any).in)) {
            orClauses.push(`${cCol}.in.(${(cVal as any).in.join(",")})`);
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

    const col = mapColumnToDb(tableName, rawCol);

    if (val === null) {
      query = query.is(col, null);
      continue;
    }

    // Complex operator objects: { in, notIn, not, contains, gte, lte, gt, lt }
    if (typeof val === "object" && !(val instanceof Date)) {
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
          rec.variants = varMap.get(rec.id) || [];
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
    return this.attachRelations(records, options?.include);
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
    const withRelations = await this.attachRelations(records, options?.include);
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

    const { data, error } = await client
      .from(this.tableName)
      .insert(insertData)
      .select()
      .single();

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
          brand: item.brand || "",
          variantInfo: item.variantInfo || "",
          price: item.price,
          quantity: item.quantity || 1,
          imageUrl: item.imageUrl || "",
          imeiNumber: item.imeiNumber || "",
          warrantyMonths: item.warrantyMonths || 12,
          warrantyStartDate: item.warrantyStartDate ? serializeValue(item.warrantyStartDate) : new Date().toISOString(),
          warrantyExpiryDate: item.warrantyExpiryDate ? serializeValue(item.warrantyExpiryDate) : new Date().toISOString(),
          createdAt: new Date().toISOString(),
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

    let query = client.from(this.tableName).update(updateData);
    query = applyWhere(query, options.where, this.tableName);
    const { data, error } = await query.select();

    if (error) {
      logSupabaseError(this.tableName, "update", error);
      throw new Error(`Database error in ${this.tableName}.update: ${error.message} (${error.code})`);
    }

    const updatedRecord = (data && data.length > 0) ? deserializeRow(data[0], this.tableName) : null;

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
    const updateData = this.cleanData(options.data || {});
    let query = client.from(this.tableName).update(updateData);
    query = applyWhere(query, options.where, this.tableName);
    const { data, error } = await query.select();

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
