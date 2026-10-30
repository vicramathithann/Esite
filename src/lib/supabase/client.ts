import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

let browserClientInstance: SupabaseClient | null = null;

/**
 * Public Supabase client for browser and anonymous frontend interactions.
 * Safe to expose to the client side.
 */
export function getSupabaseBrowserClient(): SupabaseClient {
  if (!browserClientInstance) {
    const url = env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
    const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

    browserClientInstance = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }
  return browserClientInstance;
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabaseBrowserClient();
    const value = (client as any)[prop];
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
});

export default supabase;

