import type { PrismaClient } from "@prisma/client";
import { createSupabasePrismaClient } from "./supabaseAdapter";
import { isSupabaseConfigured } from "./supabase";

// Global cache for client instance in serverless and development hot-reloading
const globalForDb = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function getDatabaseClient(): PrismaClient {
  // 1. Production on Vercel & Supabase integration:
  // When NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or anon key) are set,
  // execute all queries via the high-performance Supabase PostgREST client.
  if (isSupabaseConfigured || process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return createSupabasePrismaClient() as unknown as PrismaClient;
  }

  // 2. Local fallback if DATABASE_URL is set and Supabase keys are not present
  if (process.env.DATABASE_URL) {
    try {
      const { PrismaClient: LocalPrismaClient } = require("@prisma/client");
      return new LocalPrismaClient({
        log: ["warn", "error"],
      });
    } catch {
      return createSupabasePrismaClient() as unknown as PrismaClient;
    }
  }

  // 3. Default to Supabase adapter
  return createSupabasePrismaClient() as unknown as PrismaClient;
}

export const prisma: PrismaClient = globalForDb.prisma ?? getDatabaseClient();

if (process.env.NODE_ENV !== "production") {
  globalForDb.prisma = prisma;
}

export default prisma;
