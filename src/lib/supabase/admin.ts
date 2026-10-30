import "server-only";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

let adminClientInstance: SupabaseClient | null = null;

/**
 * Server-only Supabase Administrative Client.
 * Uses SUPABASE_SERVICE_ROLE_KEY to bypass Row Level Security (RLS) for server actions,
 * transactional emails, and OTP verification records.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (!adminClientInstance) {
    adminClientInstance = createClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );
  }
  return adminClientInstance;
}

/**
 * Lazy proxy to ensure client is instantiated only when accessed at runtime.
 */
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabaseAdmin();
    const value = (client as any)[prop];
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
});

export default supabaseAdmin;

