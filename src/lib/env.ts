/**
 * Validated Environment Variables Configuration
 *
 * Exact required names:
 * - GMAIL_USER (sender Gmail address)
 * - GMAIL_APP_PASSWORD (16-char app password; spaces and quotes stripped in code)
 * - NEXT_PUBLIC_SUPABASE_URL
 * - NEXT_PUBLIC_SUPABASE_ANON_KEY
 * - SUPABASE_SERVICE_ROLE_KEY
 * - NEXT_PUBLIC_APP_URL
 */

function cleanString(val: string | undefined): string {
  if (!val) return "";
  return val.trim().replace(/^["']+|["']+$/g, "").trim();
}

function cleanPassword(val: string | undefined): string {
  if (!val) return "";
  return val.trim().replace(/^["']+|["']+$/g, "").replace(/\s+/g, "").trim();
}

function requireServerEnv(key: string, cleaner: (v: string | undefined) => string = cleanString): string {
  if (typeof window !== "undefined") {
    throw new Error(`Security Error: Cannot access server environment variable "${key}" on the client.`);
  }
  const val = cleaner(process.env[key]);
  if (!val) {
    throw new Error(`Missing required environment variable: ${key}. Please configure it in your Vercel Project Settings.`);
  }
  return val;
}

function requirePublicEnv(key: string): string {
  const val = cleanString(process.env[key]);
  if (!val && typeof window === "undefined" && process.env.NODE_ENV === "production") {
    // Only throw in production server runtime
    throw new Error(`Missing required environment variable: ${key}. Please configure it in your Vercel Project Settings.`);
  }
  return val;
}

export const env = {
  // Server-side Gmail credentials
  get GMAIL_USER(): string {
    return requireServerEnv("GMAIL_USER");
  },
  get GMAIL_APP_PASSWORD(): string {
    return requireServerEnv("GMAIL_APP_PASSWORD", cleanPassword);
  },

  // Server-side Supabase credentials
  get SUPABASE_SERVICE_ROLE_KEY(): string {
    return requireServerEnv("SUPABASE_SERVICE_ROLE_KEY");
  },

  // Public Supabase credentials
  get NEXT_PUBLIC_SUPABASE_URL(): string {
    return requirePublicEnv("NEXT_PUBLIC_SUPABASE_URL") || (typeof window !== "undefined" ? "" : "https://placeholder.supabase.co");
  },
  get NEXT_PUBLIC_SUPABASE_ANON_KEY(): string {
    return requirePublicEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY") || "placeholder-anon-key";
  },

  // Public Application URL
  get NEXT_PUBLIC_APP_URL(): string {
    if (typeof window !== "undefined") {
      return cleanString(process.env.NEXT_PUBLIC_APP_URL) || window.location.origin;
    }
    return requirePublicEnv("NEXT_PUBLIC_APP_URL") || "https://vnmobiles.vercel.app";
  },

  // Optional JWT Secret
  get SESSION_SECRET(): string {
    return cleanString(process.env.SESSION_SECRET) || cleanPassword(process.env.GMAIL_APP_PASSWORD) || "vn-mobiles-secure-session-secret-2026";
  },
};

/**
 * Checks presence of all 6 required variables without throwing.
 * Returns booleans only - NEVER reveals secret values.
 */
export function checkEnvStatus(): Record<string, boolean> {
  return {
    GMAIL_USER: Boolean(cleanString(process.env.GMAIL_USER)),
    GMAIL_APP_PASSWORD: Boolean(cleanPassword(process.env.GMAIL_APP_PASSWORD)),
    NEXT_PUBLIC_SUPABASE_URL: Boolean(cleanString(process.env.NEXT_PUBLIC_SUPABASE_URL)),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: Boolean(cleanString(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)),
    SUPABASE_SERVICE_ROLE_KEY: Boolean(cleanString(process.env.SUPABASE_SERVICE_ROLE_KEY)),
    NEXT_PUBLIC_APP_URL: Boolean(cleanString(process.env.NEXT_PUBLIC_APP_URL)),
  };
}

/**
 * Returns a list of the names of any missing required server environment variables.
 */
export function getMissingServerEnvVars(): string[] {
  const missing: string[] = [];
  if (!cleanString(process.env.GMAIL_USER)) missing.push("GMAIL_USER");
  if (!cleanPassword(process.env.GMAIL_APP_PASSWORD)) missing.push("GMAIL_APP_PASSWORD");
  if (!cleanString(process.env.NEXT_PUBLIC_SUPABASE_URL)) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!cleanString(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  if (!cleanString(process.env.SUPABASE_SERVICE_ROLE_KEY)) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  if (!cleanString(process.env.NEXT_PUBLIC_APP_URL)) missing.push("NEXT_PUBLIC_APP_URL");
  return missing;
}

export default env;

