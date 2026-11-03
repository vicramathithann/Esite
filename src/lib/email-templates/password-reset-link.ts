import {
  escapeHtml,
  renderEmailLayout,
  renderPlainFooter,
} from "./layout";

export interface PasswordResetLinkData {
  recipientName?: string;
  recipientEmail: string;
  resetUrl: string;
  expiresInMinutes?: number;
}

export function renderPasswordResetLinkEmail(
  data: PasswordResetLinkData,
  siteUrl = "https://vnmobiles.in"
): {
  subject: string;
  html: string;
  text: string;
  preheader: string;
} {
  const cleanUrl = siteUrl.replace(/\/$/, "");
  const name = data.recipientName || "Administrator";
  const minutes = data.expiresInMinutes || 15;

  const subject = "VN Mobiles administrator password reset";
  const preheader = "Secure password reset link for your administrator account.";

  const contentHtml = `
    <p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;color:#475569;">
      Hi ${escapeHtml(name)},<br>
      We received a request to reset the password for your VN Mobiles administrator account associated with <strong style="color:#0F172A;">${escapeHtml(data.recipientEmail)}</strong>.
    </p>

    <p style="margin:0 0 24px 0;font-size:14px;line-height:1.6;color:#475569;">
      Click the button below to choose a new password. For security reasons, this link can only be used once and expires in ${minutes} minutes.
    </p>

    <div style="background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:18px 20px;margin:24px 0;font-size:13px;line-height:1.6;color:#475569;">
      <div style="font-weight:700;color:#0F172A;margin-bottom:6px;text-transform:uppercase;font-size:11px;letter-spacing:0.8px;">
        Security Advisory
      </div>
      <div>
        &bull; This link grants access to modify store administrator credentials.<br>
        &bull; If you did not make this request, please review your account activity immediately.<br>
        &bull; Your current password will remain unchanged until you complete the reset.
      </div>
    </div>

    <div style="margin:24px 0 0 0;padding-top:16px;border-top:1px solid #E2E8F0;font-size:12px;color:#64748B;line-height:1.5;">
      If the button above does not work, copy and paste this link into your browser:<br>
      <a href="${escapeHtml(data.resetUrl)}" style="color:#C9A66B;word-break:break-all;text-decoration:underline;">${escapeHtml(data.resetUrl)}</a>
    </div>
  `;

  const html = renderEmailLayout({
    preheader,
    badge: {
      text: "RESTRICTED ACCESS",
      bg: "#FEF2F2",
      color: "#991B1B",
      border: "#FECACA",
    },
    headline: "Reset your administrator password.",
    subheadline: "A password reset request was initiated for your administrator profile.",
    contentHtml,
    cta: {
      label: "Reset Administrator Password",
      url: data.resetUrl,
    },
    siteUrl: cleanUrl,
  });

  const text = [
    subject,
    "",
    `Hi ${name},`,
    "",
    `We received a request to reset the password for your administrator account (${data.recipientEmail}).`,
    "",
    "Click the link below to set a new password. This link is valid for 15 minutes and can be used once only:",
    data.resetUrl,
    "",
    "If you did not request this, you can safely ignore this email. Your password will remain unchanged.",
    "",
    renderPlainFooter(cleanUrl),
  ].join("\n");

  return { subject, html, text, preheader };
}

