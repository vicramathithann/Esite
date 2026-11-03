import {
  escapeHtml,
  renderEmailLayout,
  renderPlainFooter,
} from "./layout";

export interface AccountDeletionData {
  recipientName: string;
  recipientEmail?: string;
  code?: string;
}

export function renderAccountDeletionOtpEmail(
  data: AccountDeletionData,
  siteUrl = "https://vnmobiles.in"
): {
  subject: string;
  html: string;
  text: string;
  preheader: string;
} {
  const cleanUrl = siteUrl.replace(/\/$/, "");
  const name = data.recipientName || "there";
  const code = (data.code || "").trim().slice(0, 6);

  const subject = "Account deletion authorization code";
  const preheader = "Authorization code to delete your VN Mobiles account.";

  const contentHtml = `
    <div style="background-color:#FEF2F2;border-left:4px solid #DC2626;padding:16px 20px;border-radius:8px;margin:0 0 24px 0;">
      <p style="margin:0;font-size:14px;line-height:1.6;color:#991B1B;font-weight:600;">
        Account deletion is permanent. All your order history, profile settings, and account data will be permanently removed.
      </p>
    </div>

    <p style="margin:0 0 20px 0;font-size:14px;line-height:1.6;color:#475569;">
      Hi ${escapeHtml(name)},<br>
      You requested to permanently delete your VN Mobiles account. To authorize this action, enter the 6-digit confirmation code below:
    </p>

    <!-- OTP Code Box -->
    <div style="background-color:#F8FAFC;border:2px solid #E2E8F0;border-radius:12px;padding:24px;text-align:center;margin:24px 0;">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#64748B;letter-spacing:1.5px;margin-bottom:8px;">
        Deletion Authorization Code
      </div>
      <div style="font-size:38px;font-weight:800;letter-spacing:10px;color:#0F172A;font-family:ui-monospace,SFMono-Regular,Consolas,'Liberation Mono',Menlo,monospace;padding:8px 0;">
        ${escapeHtml(code)}
      </div>
      <div style="margin-top:10px;font-size:12px;color:#DC2626;font-weight:600;">
        Valid for 5 minutes only
      </div>
    </div>

    <div style="background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:16px 20px;margin:24px 0;font-size:13px;line-height:1.6;color:#475569;">
      <strong style="color:#0F172A;">Important notice:</strong> If you did not initiate this deletion request, please log in immediately and change your account password to ensure your account remains safe.
    </div>
  `;

  const html = renderEmailLayout({
    preheader,
    badge: {
      text: "ACCOUNT ACTION",
      bg: "#FEF2F2",
      color: "#991B1B",
      border: "#FECACA",
    },
    headline: "Confirm account deletion.",
    subheadline: "A request was received to permanently close and delete your VN Mobiles account.",
    contentHtml,
    siteUrl: cleanUrl,
  });

  const text = [
    subject,
    "",
    `Hi ${name},`,
    "",
    "You requested to permanently delete your VN Mobiles account.",
    "",
    `AUTHORIZATION CODE: ${code}`,
    "Valid for 5 minutes only.",
    "",
    "Notice: Account deletion is permanent and cannot be reversed.",
    "If you did not request this, please change your password immediately.",
    "",
    renderPlainFooter(cleanUrl),
  ].join("\n");

  return { subject, html, text, preheader };
}

export function renderAccountDeletionConfirmedEmail(
  data: AccountDeletionData,
  siteUrl = "https://vnmobiles.in"
): {
  subject: string;
  html: string;
  text: string;
  preheader: string;
} {
  const cleanUrl = siteUrl.replace(/\/$/, "");
  const name = data.recipientName || "there";

  const subject = "Your VN Mobiles account has been deleted";
  const preheader = "Confirmation of permanent account deletion.";

  const contentHtml = `
    <p style="margin:0 0 20px 0;font-size:14px;line-height:1.6;color:#475569;">
      Hi ${escapeHtml(name)},<br>
      Your VN Mobiles account has been permanently deleted in accordance with your request.
    </p>

    <!-- Details Card -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;margin:24px 0;font-size:13px;line-height:1.6;">
      <tr>
        <td style="padding:16px 20px;border-bottom:1px solid #E2E8F0;">
          <div style="font-weight:700;color:#0F172A;margin-bottom:3px;">Account Status</div>
          <div style="color:#64748B;">Permanently closed. Profile information and session cookies have been deleted.</div>
        </td>
      </tr>
      <tr>
        <td style="padding:16px 20px;">
          <div style="font-weight:700;color:#0F172A;margin-bottom:3px;">Future Shopping</div>
          <div style="color:#64748B;">You are always welcome to register a new account on our platform anytime at ${escapeHtml(cleanUrl)}.</div>
        </td>
      </tr>
    </table>

    <p style="margin:20px 0 0 0;font-size:13px;color:#64748B;line-height:1.5;">
      If you did not authorize this action or believe your account was compromised, please contact our support team immediately at <a href="mailto:support@vnmobiles.in" style="color:#C9A66B;text-decoration:none;font-weight:600;">support@vnmobiles.in</a>.
    </p>
  `;

  const html = renderEmailLayout({
    preheader,
    badge: {
      text: "ACCOUNT CLOSED",
      bg: "#F1F5F9",
      color: "#475569",
      border: "#CBD5E1",
    },
    headline: "Account deleted.",
    subheadline: "Your personal data and account credentials have been removed.",
    contentHtml,
    cta: {
      label: "Visit VN Mobiles",
      url: cleanUrl,
    },
    siteUrl: cleanUrl,
  });

  const text = [
    subject,
    "",
    `Hi ${name},`,
    "",
    "Your VN Mobiles account has been permanently deleted in accordance with your request.",
    "",
    "All profile information and session credentials have been purged.",
    "If you ever wish to shop with us again in the future, you are always welcome to register a new account at vnmobiles.in.",
    "",
    renderPlainFooter(cleanUrl),
  ].join("\n");

  return { subject, html, text, preheader };
}

