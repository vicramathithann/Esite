import { getBaseUrl } from "@/lib/env";

export { getBaseUrl };

/**
 * Backwards-compatible alias for getBaseUrl
 */
export function getAppUrl(request?: Request): string {
  return getBaseUrl(request);
}

export default getAppUrl;
