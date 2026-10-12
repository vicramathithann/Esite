/**
 * MSG91 SMS Gateway Integration - Removed
 * 
 * SMS and email integrations for MSG91 have been removed per project configuration.
 * All email verification and transactional notices are delivered via Gmail SMTP.
 */

export interface Msg91RecipientVariables {
  [key: string]: string | number | undefined;
}

export interface SendMsg91Params {
  mobile: string;
  templateId?: string;
  variables?: Msg91RecipientVariables;
  shortUrl?: "0" | "1" | string;
}

export interface Msg91Response {
  success: boolean;
  statusCode: number;
  message: string;
  data?: unknown;
  error?: string;
}

/**
 * Mask a secret string for safe server logging.
 */
export function maskSecret(secret?: string | null): string {
  if (!secret) return "[NOT_SET]";
  const trimmed = secret.trim();
  if (trimmed.length <= 8) return "[MASKED]";
  return `${trimmed.slice(0, 4)}...${trimmed.slice(-4)}`;
}

/**
 * Validates and formats Indian mobile numbers to standard format (91XXXXXXXXXX).
 */
export function formatIndianMobileNumber(input: string): {
  valid: boolean;
  formatted: string;
  error?: string;
} {
  if (!input || typeof input !== "string") {
    return { valid: false, formatted: "", error: "Mobile number is required." };
  }

  const digits = input.replace(/\D/g, "");

  if (digits.length === 10) {
    if (!/^[6-9]/.test(digits)) {
      return {
        valid: false,
        formatted: "",
        error: "Indian mobile numbers must start with digits 6, 7, 8, or 9.",
      };
    }
    return { valid: true, formatted: `91${digits}` };
  }

  if (digits.length === 11 && digits.startsWith("0")) {
    const core = digits.slice(1);
    if (!/^[6-9]/.test(core)) {
      return {
        valid: false,
        formatted: "",
        error: "Indian mobile numbers must start with digits 6, 7, 8, or 9.",
      };
    }
    return { valid: true, formatted: `91${core}` };
  }

  if (digits.length === 12 && digits.startsWith("91")) {
    const core = digits.slice(2);
    if (!/^[6-9]/.test(core)) {
      return {
        valid: false,
        formatted: "",
        error: "Indian mobile numbers must start with digits 6, 7, 8, or 9.",
      };
    }
    return { valid: true, formatted: digits };
  }

  return {
    valid: false,
    formatted: "",
    error: `Invalid Indian mobile number format ("${input}"). Expected 10-digit mobile number.`,
  };
}

/**
 * Stub implementation for MSG91 SMS dispatch (MSG91 gateway removed).
 */
export async function sendMsg91Sms(params?: SendMsg91Params): Promise<Msg91Response> {
  void params;
  return {
    success: false,
    statusCode: 410,
    message: "MSG91 SMS gateway has been removed.",
    error: "SMS gateway removed",
  };
}
