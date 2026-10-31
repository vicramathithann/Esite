/**
 * Validated Environment Variables Configuration
 *
 * Required environment variables for email OTP and database operations:
 * - GMAIL_USER (sender Gmail address)
 * - GMAIL_APP_PASSWORD (16-char app password; spaces and quotes stripped in code)
 * - NEXT_PUBLIC_SUPABASE_URL
 * - NEXT_PUBLIC_SUPABASE_ANON_KEY
 * - SUPABASE_SERVICE_ROLE_KEY
 *
 * Optional environment variables:
 * - NEXT_PUBLIC_APP_URL (optional: automatically falls back to VERCEL_URL, request host, or localhost:3000)
 * - DEBUG_KEY (optional: for /api/debug-email)
 * - SESSION_SECRET (optional: falls back to GMAIL_APP_PASSWORD)
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

function getPublicEnv(key: string): string {
  return cleanString(process.env[key]);
}

/**
 * Resolves application base URL safely across local, preview, and production environments.
 * Order of precedence:
 * 1. process.env.NEXT_PUBLIC_APP_URL
 * 2. https://${process.env.VERCEL_URL} (or VERCEL_PROJECT_PRODUCTION_URL)
 * 3. Incoming request origin / host header
 * 4. http://localhost:3000
 */
export function getBaseUrl(req?: Request): string {
  // 1. Explicit NEXT_PUBLIC_SITE_URL or NEXT_PUBLIC_APP_URL if set
  const configured = cleanString(process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL).replace(/\/$/, "");
  if (configured) {
    return configured;
  }

  // 2. Vercel deployment URL
  const vercelUrl = cleanString(process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL).replace(/\/$/, "");
  if (vercelUrl) {
    return vercelUrl.startsWith("http") ? vercelUrl : `https://${vercelUrl}`;
  }

  // 3. Request origin / host header
  if (req) {
    const origin = req.headers.get("origin");
    if (origin) {
      return origin.trim().replace(/\/$/, "");
    }
    const forwardedHost = req.headers.get("x-forwarded-host");
    const forwardedProto = req.headers.get("x-forwarded-proto") || "https";
    if (forwardedHost) {
      return `${forwardedProto}://${forwardedHost}`.trim().replace(/\/$/, "");
    }
    const host = req.headers.get("host");
    if (host) {
      const proto = host.includes("localhost") || host.includes("127.0.0.1") ? "http" : "https";
      return `${proto}://${host}`.trim().replace(/\/$/, "");
    }
  }

  if (typeof window !== "undefined" && window.location.origin) {
    return window.location.origin.replace(/\/$/, "");
  }

  // 4. Localhost fallback
  return "http://localhost:3000";
}

export const env = {
  // Required Server-side Gmail credentials
  get GMAIL_USER(): string {
    return requireServerEnv("GMAIL_USER");
  },
  get GMAIL_APP_PASSWORD(): string {
    return requireServerEnv("GMAIL_APP_PASSWORD", cleanPassword);
  },

  // Required Server-side Supabase credentials
  get SUPABASE_SERVICE_ROLE_KEY(): string {
    return requireServerEnv("SUPABASE_SERVICE_ROLE_KEY");
  },

  // Required Public Supabase credentials
  get NEXT_PUBLIC_SUPABASE_URL(): string {
    const val = getPublicEnv("NEXT_PUBLIC_SUPABASE_URL");
    if (!val && typeof window === "undefined" && process.env.NODE_ENV === "production") {
      throw new Error("Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL. Please configure it in your Vercel Project Settings.");
    }
    return val || (typeof window !== "undefined" ? "" : "https://placeholder.supabase.co");
  },
  get NEXT_PUBLIC_SUPABASE_ANON_KEY(): string {
    const val = getPublicEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
    if (!val && typeof window === "undefined" && process.env.NODE_ENV === "production") {
      throw new Error("Missing required environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY. Please configure it in your Vercel Project Settings.");
    }
    return val || "placeholder-anon-key";
  },

  // OPTIONAL Application URL (Never throws: automatically falls back to getBaseUrl)
  get NEXT_PUBLIC_APP_URL(): string {
    return getBaseUrl();
  },

  // Optional JWT Secret
  get SESSION_SECRET(): string {
    return cleanString(process.env.SESSION_SECRET) || cleanPassword(process.env.GMAIL_APP_PASSWORD) || "vn-mobiles-secure-session-secret-2026";
  },
};

/**
 * Checks presence of all required and optional variables without throwing.
 * Returns booleans only - NEVER reveals secret values.
 */
export function checkEnvStatus(): Record<string, boolean> {
  return {
    GMAIL_USER: Boolean(cleanString(process.env.GMAIL_USER)),
    GMAIL_APP_PASSWORD: Boolean(cleanPassword(process.env.GMAIL_APP_PASSWORD)),
    NEXT_PUBLIC_SUPABASE_URL: Boolean(cleanString(process.env.NEXT_PUBLIC_SUPABASE_URL)),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: Boolean(cleanString(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)),
    SUPABASE_SERVICE_ROLE_KEY: Boolean(cleanString(process.env.SUPABASE_SERVICE_ROLE_KEY)),
    NEXT_PUBLIC_APP_URL: Boolean(cleanString(process.env.NEXT_PUBLIC_APP_URL)), // Optional
  };
}

/**
 * Returns a list of any missing REQUIRED server environment variables.
 * Only the 5 critical credentials are required; NEXT_PUBLIC_APP_URL is completely optional.
 */
export function getMissingServerEnvVars(): string[] {
  const missing: string[] = [];
  if (!cleanString(process.env.GMAIL_USER)) missing.push("GMAIL_USER");
  if (!cleanPassword(process.env.GMAIL_APP_PASSWORD)) missing.push("GMAIL_APP_PASSWORD");
  if (!cleanString(process.env.NEXT_PUBLIC_SUPABASE_URL)) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!cleanString(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  if (!cleanString(process.env.SUPABASE_SERVICE_ROLE_KEY)) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  return missing;
}

export default env;
