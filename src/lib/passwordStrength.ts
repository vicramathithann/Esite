/**
 * Enterprise Password Strength Validator (NIST SP 800-63B Compliant)
 * Complies with OWASP Top 10:2025 (A07:2025 - Authentication Failures)
 *
 * Rules:
 * - Length: 8-128 characters
 * - Requires character diversity (letters + numbers/special characters)
 * - Blocks known common/breached dictionary passwords
 * - Rejects passwords containing user's name or email address prefix
 */

export const COMMON_WEAK_PASSWORDS = new Set([
  "password",
  "password1",
  "password123",
  "12345678",
  "123456789",
  "1234567890",
  "qwerty123",
  "admin123",
  "admin1234",
  "welcome123",
  "vnmobiles",
  "vnmobiles123",
  "iloveyou1",
  "changeme1",
  "pass1234",
  "letmein123",
  "master123",
  "secret123",
]);

export function validatePasswordStrength(
  password: unknown,
  userContext?: { email?: string; name?: string }
): { valid: boolean; error?: string } {
  if (typeof password !== "string" || !password) {
    return { valid: false, error: "Password is required." };
  }

  if (password.length < 8) {
    return {
      valid: false,
      error: "Password must be at least 8 characters long.",
    };
  }

  if (password.length > 128) {
    return {
      valid: false,
      error: "Password cannot exceed 128 characters.",
    };
  }

  // Check character diversity (at least one letter and at least one digit/symbol)
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasDigitOrSymbol = /[^a-zA-Z]/.test(password);

  if (!hasLetter || !hasDigitOrSymbol) {
    return {
      valid: false,
      error: "Password must contain both letters and at least one number or special character.",
    };
  }

  // Check common weak password dictionary
  const lower = password.toLowerCase();
  if (COMMON_WEAK_PASSWORDS.has(lower)) {
    return {
      valid: false,
      error: "This password is too common or easily guessable. Please choose a stronger password.",
    };
  }

  // Check user context (email prefix or first name)
  if (userContext?.email) {
    const localPart = userContext.email.split("@")[0].toLowerCase();
    if (localPart.length >= 4 && lower.includes(localPart)) {
      return {
        valid: false,
        error: "Password must not contain parts of your email address.",
      };
    }
  }

  if (userContext?.name) {
    const firstName = userContext.name.trim().split(/\s+/)[0].toLowerCase();
    if (firstName.length >= 4 && lower.includes(firstName)) {
      return {
        valid: false,
        error: "Password must not contain your name.",
      };
    }
  }

  return { valid: true };
}
