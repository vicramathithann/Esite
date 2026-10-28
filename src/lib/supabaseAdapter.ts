/**
 * Production Supabase Database Adapter for VN Mobiles
 * Provides a drop-in Prisma-compatible interface backed directly by Supabase PostgREST via @supabase/supabase-js.
 * Eliminates local SQLite filesystem locks and connection limits for Vercel Serverless deployments.
 */

import { supabaseAdmin, isSupabaseConfigured } from "./supabase";
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
  "expiresAt",
  "sentAt",
]);

function deserializeRow(row: any): any {
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
  return result;
}

function serializeValue(val: any): any {
  if (val instanceof Date) {
    return val.toISOString();
  }
  return val;
}

function applyWhere(query: any, where?: Record<string, any>): any {
  if (!where || typeof where !== "object") return query;

  for (const [col, val] of Object.entries(where)) {
    if (val === undefined) continue;

    // Handle compound unique index for Wishlist: { userId_productId: { userId, productId } }
    if (col === "userId_productId" && typeof val === "object" && val !== null) {
      if (val.userId) query = query.eq("userId", val.userId);
      if (val.productId) query = query.eq("productId", val.productId);
      continue;
    }

    // Handle OR filters: where: { OR: [ { a: 1 }, { b: 2 } ] }
    if (col === "OR" && Array.isArray(val)) {
      const orClauses: string[] = [];
      for (const condition of val) {
        if (!condition || typeof condition !== "object") continue;
        for (const [cCol, cVal] of Object.entries(condition)) {
          if (cVal === undefined) continue;
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

function applyOrderBy(query: any, orderBy?: any): any {
  if (!orderBy) return query;
  const orders = Array.isArray(orderBy) ? orderBy : [orderBy];
  for (const order of orders) {
    if (!order || typeof order !== "object") continue;
    for (const [col, dir] of Object.entries(order)) {
      query = query.order(col, { ascending: (dir as string).toLowerCase() === "asc" });
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
    public readonly modelName: string
  ) {}

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
        // Will be resolved in update method
        continue;
      }

      clean[key] = serializeValue(val);
    }
    return clean;
  }

  private async attachRelations(records: any[], include?: Record<string, any>): Promise<any[]> {
    if (!include || records.length === 0) return records;

    // Attach relations for Order
    if (this.modelName === "order") {
      const orderIds = records.map((r) => r.id).filter(Boolean);

      if (include.items && orderIds.length > 0) {
        const { data: items } = await supabaseAdmin
          .from("OrderItem")
          .select("*")
          .in("orderId", orderIds);
        const itemMap = new Map<string, any[]>();
        for (const item of (items || []).map(deserializeRow)) {
          if (!itemMap.has(item.orderId)) itemMap.set(item.orderId, []);
          itemMap.get(item.orderId)!.push(item);
        }
        for (const rec of records) {
          rec.items = itemMap.get(rec.id) || [];
        }
      }

      if (include.statusHistory && orderIds.length > 0) {
        const { data: histories } = await supabaseAdmin
          .from("OrderStatusHistory")
          .select("*")
          .in("orderId", orderIds)
          .order("createdAt", { ascending: true });
        const histMap = new Map<string, any[]>();
        for (const h of (histories || []).map(deserializeRow)) {
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
          const { data: users } = await supabaseAdmin.from("User").select("*").in("id", userIds);
          const userMap = new Map<string, any>();
          for (const u of (users || []).map(deserializeRow)) {
            userMap.set(u.id, u);
          }
          for (const rec of records) {
            rec.user = userMap.get(rec.userId) || null;
          }
        }
      }
    }

    // Attach relations for MobileProduct
    if (this.modelName === "mobileProduct") {
      const productIds = records.map((r) => r.id).filter(Boolean);

      if (include.variants && productIds.length > 0) {
        const { data: variants } = await supabaseAdmin
          .from("ProductVariant")
          .select("*")
          .in("productId", productIds);
        const varMap = new Map<string, any[]>();
        for (const v of (variants || []).map(deserializeRow)) {
          if (!varMap.has(v.productId)) varMap.set(v.productId, []);
          varMap.get(v.productId)!.push(v);
        }
        for (const rec of records) {
          rec.variants = varMap.get(rec.id) || [];
        }
      }

      if (include.reviews && productIds.length > 0) {
        const { data: reviews } = await supabaseAdmin
          .from("Review")
          .select("*")
          .in("productId", productIds);
        const revMap = new Map<string, any[]>();
        for (const r of (reviews || []).map(deserializeRow)) {
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
          const { data: orders } = await supabaseAdmin.from("Order").select("*").in("id", orderIds);
          const orderMap = new Map<string, any>();
          for (const o of (orders || []).map(deserializeRow)) {
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
          const { data: orders } = await supabaseAdmin
            .from("Order")
            .select(selectCols)
            .in("id", orderIds);
          const orderMap = new Map<string, any>();
          for (const o of (orders || []).map(deserializeRow)) {
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
          const { data: products } = await supabaseAdmin
            .from("MobileProduct")
            .select("*")
            .in("id", productIds);
          const prodMap = new Map<string, any>();
          for (const p of (products || []).map(deserializeRow)) {
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
          const { data: orders } = await supabaseAdmin
            .from("Order")
            .select("id, userId")
            .in("userId", userIds);
          const orderMap = new Map<string, any[]>();
          for (const o of (orders || []).map(deserializeRow)) {
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
    let query = supabaseAdmin.from(this.tableName).select("*");
    query = applyWhere(query, options?.where);
    query = applyOrderBy(query, options?.orderBy);

    if (options?.skip !== undefined && options?.take !== undefined) {
      query = query.range(options.skip, options.skip + options.take - 1);
    } else if (options?.take !== undefined) {
      query = query.limit(options.take);
    }

    const { data, error } = await query;
    if (error) {
      console.error(`[Supabase ${this.tableName}.findMany Error]:`, error);
      throw error;
    }

    const records = (data || []).map(deserializeRow);
    return this.attachRelations(records, options?.include);
  }

  async findUnique(options: { where: Record<string, any>; include?: Record<string, any>; select?: Record<string, any> }): Promise<any | null> {
    return this.findFirst(options);
  }

  async findFirst(options?: QueryOptions): Promise<any | null> {
    let query = supabaseAdmin.from(this.tableName).select("*");
    query = applyWhere(query, options?.where);
    query = applyOrderBy(query, options?.orderBy);
    query = query.limit(1);

    const { data, error } = await query;
    if (error) {
      console.error(`[Supabase ${this.tableName}.findFirst Error]:`, error);
      throw error;
    }

    if (!data || data.length === 0) return null;
    const records = [deserializeRow(data[0])];
    const withRelations = await this.attachRelations(records, options?.include);
    return withRelations[0] || null;
  }

  async count(options?: { where?: Record<string, any> }): Promise<number> {
    let query = supabaseAdmin.from(this.tableName).select("*", { count: "exact", head: true });
    query = applyWhere(query, options?.where);

    const { count, error } = await query;
    if (error) {
      console.error(`[Supabase ${this.tableName}.count Error]:`, error);
      throw error;
    }
    return count || 0;
  }

  async create(options: {
    data: Record<string, any>;
    include?: Record<string, any>;
    select?: Record<string, any>;
  }): Promise<any> {
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

    const { data, error } = await supabaseAdmin
      .from(this.tableName)
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error(`[Supabase ${this.tableName}.create Error]:`, error);
      throw error;
    }

    const createdRecord = deserializeRow(data);

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
          const { data: insertedItems } = await supabaseAdmin
            .from("OrderItem")
            .insert(itemsToInsert)
            .select();
          createdRecord.items = (insertedItems || []).map(deserializeRow);
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
          const { data: insertedHistories } = await supabaseAdmin
            .from("OrderStatusHistory")
            .insert(historiesToInsert)
            .select();
          createdRecord.statusHistory = (insertedHistories || []).map(deserializeRow);
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
    const rawData = options.data || {};
    const updateData = this.cleanData(rawData);

    // Resolve atomic increments if specified (e.g. retryCount: { increment: 1 })
    for (const [key, val] of Object.entries(rawData)) {
      if (typeof val === "object" && val !== null && "increment" in val) {
        const current = await this.findFirst({ where: options.where });
        const currentNum = current && typeof current[key] === "number" ? current[key] : 0;
        updateData[key] = currentNum + ((val as any).increment || 1);
      }
    }

    let query = supabaseAdmin.from(this.tableName).update(updateData);
    query = applyWhere(query, options.where);
    const { data, error } = await query.select();

    if (error) {
      console.error(`[Supabase ${this.tableName}.update Error]:`, error);
      throw error;
    }

    const updatedRecord = (data && data.length > 0) ? deserializeRow(data[0]) : null;

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
        await supabaseAdmin.from("OrderStatusHistory").insert(historiesToInsert);
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
    const updateData = this.cleanData(options.data || {});
    let query = supabaseAdmin.from(this.tableName).update(updateData);
    query = applyWhere(query, options.where);
    const { data, error } = await query.select();

    if (error) {
      console.error(`[Supabase ${this.tableName}.updateMany Error]:`, error);
      throw error;
    }
    return { count: data?.length || 0 };
  }

  async delete(options: { where: Record<string, any> }): Promise<any> {
    let query = supabaseAdmin.from(this.tableName).delete();
    query = applyWhere(query, options.where);
    const { data, error } = await query.select();

    if (error) {
      console.error(`[Supabase ${this.tableName}.delete Error]:`, error);
      throw error;
    }
    return data && data.length > 0 ? deserializeRow(data[0]) : { success: true };
  }

  async deleteMany(options?: { where?: Record<string, any> }): Promise<{ count: number }> {
    let query = supabaseAdmin.from(this.tableName).delete();
    query = applyWhere(query, options?.where);
    const { data, error } = await query.select();

    if (error) {
      console.error(`[Supabase ${this.tableName}.deleteMany Error]:`, error);
      throw error;
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
  $transaction: (arg: any) => Promise<any>;
}

/**
 * Creates the complete database client interface backed directly by Supabase.
 */
export function createSupabasePrismaClient(): SupabaseDatabaseClient {
  const client: SupabaseDatabaseClient = {
    user: new SupabaseModelDelegate("User", "user"),
    mobileProduct: new SupabaseModelDelegate("MobileProduct", "mobileProduct"),
    productVariant: new SupabaseModelDelegate("ProductVariant", "productVariant"),
    order: new SupabaseModelDelegate("Order", "order"),
    orderItem: new SupabaseModelDelegate("OrderItem", "orderItem"),
    orderStatusHistory: new SupabaseModelDelegate("OrderStatusHistory", "orderStatusHistory"),
    warranty: new SupabaseModelDelegate("Warranty", "warranty"),
    emailNotification: new SupabaseModelDelegate("EmailNotification", "emailNotification"),
    wishlist: new SupabaseModelDelegate("Wishlist", "wishlist"),
    review: new SupabaseModelDelegate("Review", "review"),
    siteSetting: new SupabaseModelDelegate("SiteSetting", "siteSetting"),
    invitation: new SupabaseModelDelegate("invitations", "invitation"),
    mobile: new SupabaseModelDelegate("mobiles", "mobile"),

    // Transaction implementation: invokes callback passing client proxy
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

