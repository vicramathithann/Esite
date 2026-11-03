import {
  escapeHtml,
  renderEmailLayout,
  renderPlainFooter,
  BadgeConfig,
} from "./layout";

export type OtpPurpose =
  | "registration"
  | "login"
  | "password_reset"
  | "admin_login"
  | "admin_verification"
  | "verification"
  | "general";

export interface OtpEmailData {
  recipientName?: string;
  recipientEmail?: string;
  code: string;
  purpose?: OtpPurpose | string;
  expiresInMinutes?: number;
}

export function renderOtpEmail(
  data: OtpEmailData,
  siteUrl = "https://vnmobiles.in"
): {
  subject: string;
  html: string;
  text: string;
  preheader: string;
} {
  const cleanUrl = siteUrl.replace(/\/$/, "");
  const code = (data.code || "").trim().slice(0, 6);
  const minutes = data.expiresInMinutes || 5;
  const name = data.recipientName || "there";
  const purpose = data.purpose || "general";

  let subject = "VN Mobiles verification code";
  let preheader = "Your single-use security code for VN Mobiles.";
  let badge: BadgeConfig = { text: "SECURITY CODE", bg: "#F1F5F9", color: "#0F172A", border: "#CBD5E1" };
  let headline = "Your verification code.";
  let description = "Enter the 6-digit security code below to complete your request:";
  let securityNote = "This code expires in 5 minutes. Never share this code with anyone.";

  if (purpose === "registration") {
    subject = "Verify your email for VN Mobiles";
    preheader = "Your single-use verification code to complete your registration.";
    badge = { text: "REGISTRATION", bg: "#ECFDF5", color: "#065F46", border: "#A7F3D0" };
    headline = "Verify your email address.";
    description = "Welcome to VN Mobiles. Enter this 6-digit code to verify your email and activate your account:";
  } else if (purpose === "login") {
    subject = "VN Mobiles sign-in code";
    preheader = "Your single-use sign-in code for VN Mobiles.";
    badge = { text: "SIGN IN", bg: "#EFF6FF", color: "#1E40AF", border: "#BFDBFE" };
    headline = "Your sign-in code.";
    description = "Use this 6-digit code to log in to your VN Mobiles account:";
  } else if (purpose === "password_reset") {
    subject = "VN Mobiles password recovery code";
    preheader = "Your single-use password recovery code.";
    badge = { text: "PASSWORD RECOVERY", bg: "#FFFBEB", color: "#92400E", border: "#FDE68A" };
    headline = "Reset your password.";
    description = "We received a request to recover your password. Enter this code to proceed:";
    securityNote = "If you did not request a password reset, you can safely ignore this email. Your account remains secure.";
  } else if (purpose === "admin_login" || purpose === "admin_verification") {
    subject = "VN Mobiles administrator verification code";
    preheader = "Single-use administrative security code.";
    badge = { text: "RESTRICTED ACCESS", bg: "#FEF2F2", color: "#991B1B", border: "#FECACA" };
    headline = "Administrator control desk verification.";
    description = "A sign-in attempt was initiated for the VN Mobiles admin portal. Enter this authorization code to continue:";
    securityNote = "This code grants administrative access. VN Mobiles staff will never ask for this code. Do not share it under any circumstances.";
  }

  const contentHtml = `
    <p style="margin:0 0 20px 0;font-size:14px;line-height:1.6;color:#475569;">
      Hi ${escapeHtml(name)},<br>
      ${escapeHtml(description)}
    </p>

    <!-- Large Monospace OTP Box -->
    <div style="background-color:#F8FAFC;border:2px solid #E2E8F0;border-radius:12px;padding:24px;text-align:center;margin:24px 0;">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#64748B;letter-spacing:1.5px;margin-bottom:8px;">
        Single-Use Verification Code
      </div>
      <div style="font-size:38px;font-weight:800;letter-spacing:10px;color:#0F172A;font-family:ui-monospace,SFMono-Regular,Consolas,'Liberation Mono',Menlo,monospace;padding:8px 0;">
        ${escapeHtml(code)}
      </div>
      <div style="margin-top:10px;font-size:12px;color:#DC2626;font-weight:600;">
        Valid for ${minutes} minutes only
      </div>
    </div>

    <!-- Security Information Card -->
    <div style="background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:16px 20px;margin:24px 0;font-size:13px;line-height:1.6;color:#475569;">
      <strong style="color:#0F172A;">Security notice:</strong> ${escapeHtml(securityNote)}
    </div>

    <p style="margin:16px 0 0 0;font-size:12px;color:#94A3B8;line-height:1.5;">
      If you did not request this verification code, please ignore this email. No changes will take effect without entering this code.
    </p>
  `;

  const html = renderEmailLayout({
    preheader,
    badge,
    headline,
    subheadline: "Here is your requested security code.",
    contentHtml,
    siteUrl: cleanUrl,
  });

  const text = [
    subject,
    "",
    `Hi ${name},`,
    "",
    description,
    "",
    `VERIFICATION CODE: ${code}`,
    `Expires in ${minutes} minutes.`,
    "",
    securityNote,
    "",
    "If you did not request this code, no action is needed.",
    "",
    renderPlainFooter(cleanUrl),
  ].join("\n");

  return { subject, html, text, preheader };
}

