import {
  escapeHtml,
  renderEmailLayout,
  renderPlainFooter,
} from "./layout";

export interface AdminInvitationData {
  inviteLink: string;
  recipientEmail: string;
  role?: string;
  expiresAtFormatted?: string;
}

export function renderAdminInvitationEmail(
  data: AdminInvitationData,
  siteUrl = "https://vnmobiles.in"
): {
  subject: string;
  html: string;
  text: string;
  preheader: string;
} {
  const cleanUrl = siteUrl.replace(/\/$/, "");
  let cleanDomain = "vnmobiles.in";
  try {
    cleanDomain = new URL(cleanUrl).hostname;
  } catch {}

  const subject = "You're invited to join VN Mobiles";
  const preheader = "You have been invited to create an account at VN Mobiles.";
  const validityText = data.expiresAtFormatted || "48 hours";

  const contentHtml = `
    <p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;color:#334155;">
      Hello,
    </p>

    <p style="margin:0 0 20px 0;font-size:14px;line-height:1.6;color:#334155;">
      You have been invited to create an account at VN Mobiles. Click the button below to complete your registration and get started.
    </p>

    <!-- Invitation Details Table -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#F8FAFC;border:1px solid #E2E8F0;border-top:2px solid #C9A66B;border-radius:10px;margin:20px 0;font-size:13px;border-collapse:separate;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
      <tbody>
        <tr>
          <td style="padding:14px 18px;border-bottom:1px solid #E2E8F0;color:#64748B;font-weight:600;width:38%;">Invited email</td>
          <td style="padding:14px 18px;border-bottom:1px solid #E2E8F0;color:#0F172A;font-weight:700;">${escapeHtml(data.recipientEmail)}</td>
        </tr>
        <tr>
          <td style="padding:14px 18px;border-bottom:1px solid #E2E8F0;color:#64748B;font-weight:600;">Access level</td>
          <td style="padding:14px 18px;border-bottom:1px solid #E2E8F0;color:#0F172A;font-weight:600;">Member</td>
        </tr>
        <tr>
          <td style="padding:14px 18px;color:#64748B;font-weight:600;">Link validity</td>
          <td style="padding:14px 18px;color:#0F172A;font-weight:600;">${escapeHtml(validityText)}</td>
        </tr>
      </tbody>
    </table>

    <p style="margin:24px 0 0 0;font-size:12px;line-height:1.6;color:#64748B;">
      Or open <a href="${cleanUrl}/invite" style="color:#C9A66B;text-decoration:underline;font-weight:600;">${cleanDomain}/invite</a> in your browser.
    </p>
  `;

  const inviteDisclaimer =
    "You received this because an administrator invited this address to create a VN Mobiles account. If you were not expecting it, ignore this email.";

  const html = renderEmailLayout({
    preheader,
    badge: {
      text: "INVITATION",
      bg: "#FEF3C7",
      color: "#92400E",
      border: "#FDE68A",
    },
    headline: "You're invited to VN Mobiles",
    contentHtml,
    cta: {
      label: "Accept Invitation",
      url: data.inviteLink,
    },
    siteUrl: cleanUrl,
    footerDisclaimer: inviteDisclaimer,
  });

  const text = [
    subject,
    "",
    "Hello,",
    "",
    "You have been invited to create an account at VN Mobiles. Click the link below to accept your invitation:",
    data.inviteLink,
    "",
    `Or open ${cleanDomain}/invite in your browser.`,
    "",
    "INVITATION DETAILS:",
    `- Invited email: ${data.recipientEmail}`,
    "- Access level: Owner",
    `- Link validity: ${validityText}`,
    "",
    renderPlainFooter(cleanUrl, { footerDisclaimer: inviteDisclaimer }),
  ].join("\n");

  return { subject, html, text, preheader };
}
