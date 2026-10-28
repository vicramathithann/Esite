/**
 * Resolves the canonical public application URL.
 * Automatically handles:
 * 1. Explicit NEXT_PUBLIC_APP_URL (production custom domain)
 * 2. Vercel deployment URL (process.env.VERCEL_URL)
 * 3. Incoming request host/forwarded headers
 * 4. Fallback for production (https://vnmobiles.in)
 */
export function getAppUrl(request?: Request): string {
  // 1. Explicit production URL configured by user
  if (process.env.NEXT_PUBLIC_APP_URL && !process.env.NEXT_PUBLIC_APP_URL.includes("localhost")) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }

  // 2. Incoming request headers (handles custom domains or preview deployments dynamically)
  if (request) {
    const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
    const proto = request.headers.get("x-forwarded-proto") || (host?.includes("localhost") ? "http" : "https");
    if (host && !host.includes("localhost")) {
      return `${proto}://${host}`.replace(/\/$/, "");
    }
  }

  // 3. Vercel System Environment Variable (provided by Vercel for all production/preview deployments)
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`.replace(/\/$/, "");
  }

  // 4. Configured NEXT_PUBLIC_APP_URL (including local development)
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }

  // 5. Request host for local development
  if (request) {
    const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
    if (host) {
      return `http://${host}`.replace(/\/$/, "");
    }
  }

  return process.env.NODE_ENV === "production" ? "https://vnmobiles.in" : "http://localhost:3000";
}

