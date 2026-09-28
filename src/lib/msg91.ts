/**
 * MSG91 SMS Gateway Integration (Backend Only)
 * 
 * Secure wrapper for MSG91 Flow API:
 * Endpoint: https://control.msg91.com/api/v5/flow
 * 
 * Never expose MSG91 Authkey or sensitive credentials to client-side code.
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
 * Mask an Authkey for safe server logging without leaking secrets.
 */
export function maskSecret(secret?: string | null): string {
  if (!secret) return "[NOT_SET]";
  const trimmed = secret.trim();
  if (trimmed.length <= 8) return "[MASKED]";
  return `${trimmed.slice(0, 4)}...${trimmed.slice(-4)}`;
}

/**
 * Validates and formats Indian mobile numbers to standard MSG91 format (91XXXXXXXXXX).
 * 
 * MSG91 requires Indian numbers to be prefixed with country code 91 without '+' or spaces.
 */
export function formatIndianMobileNumber(input: string): {
  valid: boolean;
  formatted: string;
  error?: string;
} {
  if (!input || typeof input !== "string") {
    return { valid: false, formatted: "", error: "Mobile number is required." };
  }

  // Strip all non-digit characters
  const digits = input.replace(/\D/g, "");

  // Scenario 1: Standard 10-digit Indian mobile (e.g., 9876543210)
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

  // Scenario 2: 11-digit with leading zero (e.g., 09876543210)
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

  // Scenario 3: 12-digit with country code 91 (e.g., 919876543210)
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
 * Sends SMS via MSG91 Flow API v5.
 * 
 * @param params {SendMsg91Params} Parameters including mobile, templateId, and template variables
 * @returns {Promise<Msg91Response>} Safe response object (Authkey is strictly omitted)
 */
export async function sendMsg91Sms(params: SendMsg91Params): Promise<Msg91Response> {
  const authKey = process.env.MSG91_AUTHKEY?.trim();
  const defaultTemplateId = process.env.MSG91_TEMPLATE_ID?.trim();
  const templateId = params.templateId?.trim() || defaultTemplateId;

  // 1. Validate Authkey existence
  if (!authKey || authKey === "your_msg91_authkey_here") {
    const errMsg = "MSG91_AUTHKEY is not configured in backend environment variables.";
    console.error(`[MSG91 ERROR] ${errMsg}`);
    return {
      success: false,
      statusCode: 500,
      message: errMsg,
      error: "SMS gateway authentication is not configured.",
    };
  }

  // 2. Validate Template ID
  if (!templateId || templateId === "your_msg91_flow_template_id_here") {
    const errMsg = "MSG91_TEMPLATE_ID is missing or not configured.";
    console.error(`[MSG91 ERROR] ${errMsg}`);
    return {
      success: false,
      statusCode: 400,
      message: errMsg,
      error: "MSG91 Flow template ID is required.",
    };
  }

  // 3. Format & validate Indian mobile number
  const mobileCheck = formatIndianMobileNumber(params.mobile);
  if (!mobileCheck.valid) {
    console.warn(`[MSG91 VALIDATION] ${mobileCheck.error} (Input: "${params.mobile}")`);
    return {
      success: false,
      statusCode: 400,
      message: mobileCheck.error || "Invalid mobile number.",
      error: mobileCheck.error,
    };
  }

  // 4. Construct MSG91 Flow Payload
  // MSG91 v5 Flow schema:
  // {
  //   "template_id": "...",
  //   "short_url": "0",
  //   "recipients": [
  //     {
  //       "mobiles": "91XXXXXXXXXX",
  //       ...variables
  //     }
  //   ]
  // }
  const recipientObject: Record<string, unknown> = {
    mobiles: mobileCheck.formatted,
    ...(params.variables || {}),
  };

  const payload = {
    template_id: templateId,
    short_url: params.shortUrl === "1" ? "1" : "0",
    recipients: [recipientObject],
  };

  // Safe logging without leaking auth key
  console.log(
    `[MSG91] Dispatching Flow SMS | Mobile: ${mobileCheck.formatted} | Template: ${templateId} | AuthKey: ${maskSecret(authKey)}`
  );

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000); // 12-second timeout

    const response = await fetch("https://control.msg91.com/api/v5/flow", {
      method: "POST",
      headers: {
        authkey: authKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const rawText = await response.text();
    let parsedData: unknown = null;

    try {
      parsedData = JSON.parse(rawText);
    } catch {
      parsedData = { raw: rawText };
    }

    // MSG91 returns JSON such as:
    // { "type": "success", "message": "flow executed successfully" }
    // or { "type": "error", "message": "Invalid Auth Key" }
    const isSuccessStatus = response.status >= 200 && response.status < 300;
    const msg91Type = typeof parsedData === "object" && parsedData !== null && "type" in parsedData
      ? (parsedData as { type: string }).type
      : "";
    const isMsg91Success = isSuccessStatus && msg91Type !== "error";

    if (!isMsg91Success) {
      const errorMsg =
        (typeof parsedData === "object" && parsedData !== null && "message" in parsedData
          ? (parsedData as { message: string }).message
          : null) ||
        `MSG91 returned HTTP ${response.status}`;

      console.error(`[MSG91 API ERROR] Status ${response.status}: ${errorMsg}`);

      return {
        success: false,
        statusCode: response.status,
        message: errorMsg,
        error: errorMsg,
        data: parsedData,
      };
    }

    console.log(`[MSG91 SUCCESS] SMS successfully accepted by MSG91 Gateway (HTTP ${response.status})`);

    return {
      success: true,
      statusCode: response.status,
      message: "SMS dispatched successfully via MSG91 Flow API.",
      data: parsedData,
    };
  } catch (err: unknown) {
    const isAbort = err instanceof Error && err.name === "AbortError";
    const errorMessage = isAbort
      ? "Connection to MSG91 timed out after 12 seconds."
      : err instanceof Error
      ? err.message
      : "Unknown error communicating with MSG91.";

    console.error(`[MSG91 NETWORK ERROR] ${errorMessage}`);

    return {
      success: false,
      statusCode: 504,
      message: errorMessage,
      error: errorMessage,
    };
  }
}
