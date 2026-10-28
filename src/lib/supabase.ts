import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Read environment variables for Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "";

/**
 * Returns true if Supabase URL and at least one API key are provided.
 */
export const isSupabaseConfigured = Boolean(
  supabaseUrl && (supabaseAnonKey || supabaseServiceKey)
);

/**
 * Public client for client-side / browser or anonymous interactions.
 * Safe to expose to the frontend.
 */
export const supabase: SupabaseClient = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder-anon-key",
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

/**
 * Elevated administrative client using SUPABASE_SERVICE_ROLE_KEY.
 * Bypasses Row Level Security (RLS) policies for full server-side control:
 * - Admin authentication & authorization
 * - User password resets & invitations
 * - Order & warranty creation
 * - System transactional email notifications & logs
 */
export const supabaseAdmin: SupabaseClient = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseServiceKey || supabaseAnonKey || "placeholder-service-key",
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

export default supabase;

