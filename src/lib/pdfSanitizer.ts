/**
 * Enterprise PDF Text Sanitizer for pdf-lib WinAnsi Standard Fonts
 * Complies with OWASP Top 10:2025 (A05:2025 - Injection & A10:2025 - Exceptional Conditions)
 *
 * Normalizes unicode quotes/dashes to ASCII and strips unencodable/control characters
 * to prevent pdf-lib stream crashes.
 */

export function sanitizePdfText(input: unknown): string {
  if (input === null || input === undefined) return "";
  const str = String(input);
  const normalized = str
    .replace(/₹/g, "Rs. ")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2026/g, "...");

  // WinAnsi supported range: \x20-\x7E and common extended Latin \xA0-\xFF
  return normalized.replace(/[^\x20-\x7E\xA0-\xFF]/g, " ").trim();
}
