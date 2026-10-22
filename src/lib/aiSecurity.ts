/**
 * AI Security & Protection Module for VN Mobiles
 * Protects both User and Admin AI Agents against:
 * 1. Prompt Injection attacks
 * 2. Jailbreak / DAN mode exploits
 * 3. System prompt extraction & leakage
 * 4. Role confusion & privilege escalation attacks
 * 5. Unauthorized admin data access attempts from storefront users
 */

// Patterns indicating prompt injection, jailbreaks, or attempts to override system instructions
const PROMPT_INJECTION_PATTERNS = [
  /ignore\s+(all|previous|above|prior)\s+(instructions|prompts|rules|commands)/i,
  /disregard\s+(all|previous|above|prior)\s+(instructions|prompts|rules)/i,
  /forget\s+(all|previous|above|prior)\s+(instructions|rules|constraints)/i,
  /override\s+(system|rules|safety|instructions|prompt)/i,
  /system\s+override/i,
  /bypass\s+(filters|rules|safety|guardrails)/i,
  /you\s+are\s+now\s+(a|an|in|the)\s+(unrestricted|jailbroken|dan|developer|god|admin|root)/i,
  /mode:\s*(developer|jailbreak|unrestricted|god|admin)/i,
  /enable\s+(developer|jailbreak|god|dan)\s+mode/i,
  /dan\s+mode/i,
  /jailbreak/i,
  /roleplay\s+as\s+(an?\s+)?(unfiltered|evil|jailbroken|admin|superadmin)/i,
  /pretend\s+(you\s+have\s+no\s+rules|you\s+are\s+unrestricted|to\s+be\s+an?\s+admin)/i,
  /act\s+as\s+(an?\s+)?(superadmin|database\s+admin|root\s+user|system\s+prompt)/i,
  /simulate\s+(admin|root|unrestricted|jailbreak)/i,
  /sudo\s+/i
];

// Patterns attempting to exfiltrate hidden system prompts or internal configuration
const SYSTEM_PROMPT_EXTRACTION_PATTERNS = [
  /(reveal|print|show|display|output|repeat|dump|tell\s+me)\s+(your\s+)?(system\s+prompt|initial\s+prompt|hidden\s+prompt|instructions|rules|guidelines)/i,
  /what\s+(are\s+your|is\s+your)\s+(exact\s+)?(system\s+prompt|internal\s+instructions|secret\s+instructions|base\s+instructions)/i,
  /show\s+me\s+the\s+text\s+above/i,
  /repeat\s+everything\s+(above|prior)/i,
  /expose\s+(system\s+prompt|internal\s+config)/i
];

// Patterns attempting to extract server secrets, env vars, or raw database queries
const DATA_EXFILTRATION_PATTERNS = [
  /process\.env/i,
  /database_url/i,
  /gmail_app_password/i,
  /select\s+\*\s+from/i,
  /drop\s+table/i,
  /union\s+select/i,
  /dump\s+(the\s+)?database/i,
  /show\s+(all\s+)?(env|passwords|api\s*keys|credentials|hashes)/i
];

// Specific topics that storefront normal users must NEVER be able to query
const ADMIN_DOMAIN_KEYWORDS = [
  "revenue", "profit", "turnover", "gross margin", "total sales amount", "daily revenue",
  "monthly revenue", "annual revenue", "company earnings", "how much money did we make",
  "invite accepted", "invites accepted", "accepted my invites", "invitation stats",
  "invites sent", "how many invites", "invite tokens", "who was invited", "invited users",
  "registered users count", "how many users are registered", "user database", "all customers list",
  "admin dashboard", "admin portal", "admin settings", "store controls", "admin login",
  "admin password", "admin credentials", "site settings table", "cancellation rate",
  "top selling products stats", "financial report", "sales metrics", "internal metrics",
  "audit log", "admin audit", "backend statistics"
];

/**
 * Sanitizes input text by removing null bytes, excessive whitespace, and zero-width characters
 */
export function sanitizeInput(input: string, maxLength: number = 800): string {
  if (!input || typeof input !== "string") return "";
  return input
    .replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007F-\u009F\u200B-\u200D\uFEFF]/g, "")
    .trim()
    .slice(0, maxLength);
}

/**
 * Checks for prompt injection, jailbreaks, system prompt extractions, or exfiltration attacks.
 */
export function detectLlmAttack(input: string): { isAttack: boolean; reason?: string } {
  const sanitized = sanitizeInput(input);

  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    if (pattern.test(sanitized)) {
      return { isAttack: true, reason: "PROMPT_INJECTION" };
    }
  }

  for (const pattern of SYSTEM_PROMPT_EXTRACTION_PATTERNS) {
    if (pattern.test(sanitized)) {
      return { isAttack: true, reason: "SYSTEM_PROMPT_EXTRACTION" };
    }
  }

  for (const pattern of DATA_EXFILTRATION_PATTERNS) {
    if (pattern.test(sanitized)) {
      return { isAttack: true, reason: "DATA_EXFILTRATION" };
    }
  }

  return { isAttack: false };
}

/**
 * Checks if a customer/storefront query is attempting to access admin-only topics.
 */
export function isCustomerAskingAdminInfo(input: string): boolean {
  const q = sanitizeInput(input).toLowerCase();

  // Explicit check for admin keywords
  for (const kw of ADMIN_DOMAIN_KEYWORDS) {
    if (q.includes(kw)) {
      return true;
    }
  }

  // Regex checks for financial & userbase queries
  if (/\b(total|store|monthly|today's?)\s+(revenue|sales|profit|turnover|earnings)\b/i.test(q)) {
    return true;
  }
  if (/\bhow\s+many\s+(users|customers|people|accounts)\s+(are\s+there|registered|signed\s+up)\b/i.test(q)) {
    return true;
  }
  if (/\b(cancellation\s+rate|invite\s+acceptance|invitation\s+stats)\b/i.test(q)) {
    return true;
  }
  if (/\b(admin\s+portal|admin\s+panel|admin\s+dashboard|admin\s+controls)\b/i.test(q)) {
    return true;
  }

  return false;
}

