/**
 * Enterprise CSV Formula Injection Neutralizer
 * Complies with OWASP Top 10:2025 (A05:2025 - Injection)
 *
 * Prevents Dynamic Data Exchange (DDE) formula execution in Microsoft Excel,
 * Google Sheets, and LibreOffice by prefixing formula triggers (=, +, -, @, \t, \r)
 * with a single apostrophe.
 */

export function sanitizeForCSV(value: unknown): string {
  if (value === null || value === undefined) return '""';
  let str = String(value);
  if (/^[\s]*[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  return `"${str.replace(/"/g, '""')}"`;
}
