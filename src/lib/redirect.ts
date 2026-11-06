/**
 * Safely validates an internal application redirect URL to prevent open-redirect vulnerabilities.
 */
export function isValidInternalRedirect(url?: string | null): string {
  if (!url || typeof url !== "string") return "/";
  const trimmed = url.trim();
  if (
    trimmed.startsWith("/") &&
    !trimmed.startsWith("//") &&
    !trimmed.startsWith("/\\") &&
    !trimmed.includes("://")
  ) {
    return trimmed;
  }
  return "/";
}
