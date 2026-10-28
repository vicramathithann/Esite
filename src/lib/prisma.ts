import { createSupabasePrismaClient, SupabaseDatabaseClient } from "./supabaseAdapter";

// Global cache for client instance in serverless and development hot-reloading
const globalForDb = globalThis as unknown as {
  prisma: SupabaseDatabaseClient | undefined;
};

/**
 * VN Mobiles Database Client (Supabase Engine)
 * Fully powered by Supabase PostgREST via @supabase/supabase-js.
 * Operates without Prisma engine binaries, SQLite locks, or DATABASE_URL requirements.
 */
export const prisma: SupabaseDatabaseClient =
  globalForDb.prisma ?? createSupabasePrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForDb.prisma = prisma;
}

export default prisma;
export type { SupabaseDatabaseClient };
