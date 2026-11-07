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
  const expiresAt = data.expiresAtFormatted || "Expires in 48 hours";
  const accessLabel = (data.role || "").toUpperCase() === "ADMIN" ? "Team Member" : "Member";

  const subject = "You're invited to join VN Mobiles";
  const preheader = "You've been invited to join VN Mobiles. Set up your account and get started.";

  const contentHtml = `
    <p style="margin:0 0 20px 0;font-size:14px;line-height:1.6;color:#475569;">
      You've been invited to join VN Mobiles. Click the button below to set up your account and get started.
    </p>

    <!-- Invitation Details Table -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#F8FAFC;border:1px solid #E2E8F0;border-top:2px solid #C9A66B;border-radius:10px;margin:20px 0;font-size:13px;border-collapse:separate;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
      <tbody>
        <tr>
          <td style="padding:14px 18px;border-bottom:1px solid #E2E8F0;color:#64748B;font-weight:600;width:38%;">Invited email</td>
          <td style="padding:14px 18px;border-bottom:1px solid #E2E8F0;color:#0F172A;font-weight:700;">${escapeHtml(data.recipientEmail)}</td>
        </tr>
        <tr>
          <td style="padding:14px 18px;border-bottom:1px solid #E2E8F0;color:#64748B;font-weight:600;">Access</td>
          <td style="padding:14px 18px;border-bottom:1px solid #E2E8F0;color:#0F172A;font-weight:600;">${escapeHtml(accessLabel)}</td>
        </tr>
        <tr>
          <td style="padding:14px 18px;color:#64748B;font-weight:600;">Link validity</td>
          <td style="padding:14px 18px;color:#0F172A;font-weight:600;">${escapeHtml(expiresAt)}</td>
        </tr>
      </tbody>
    </table>

    <p style="margin:20px 0 0 0;font-size:12px;line-height:1.5;color:#64748B;">
      If you weren't expecting this invitation, you can safely ignore this email.
    </p>
  `;

  const html = renderEmailLayout({
    preheader,
    badge: {
      text: "INVITATION",
      bg: "#FEF3C7",
      color: "#92400E",
      border: "#FDE68A",
    },
    headline: "You're invited.",
    contentHtml,
    cta: {
      label: "Accept Invitation",
      url: data.inviteLink,
    },
    siteUrl: cleanUrl,
  });

  const text = [
    subject,
    "",
    "Hello,",
    "",
    "You've been invited to join VN Mobiles. Click the link below to set up your account and get started:",
    data.inviteLink,
    "",
    "INVITATION DETAILS:",
    `- Invited email: ${data.recipientEmail}`,
    `- Access: ${accessLabel}`,
    `- Link validity: ${expiresAt}`,
    "",
    "If you weren't expecting this invitation, you can safely ignore this email.",
    "",
    renderPlainFooter(cleanUrl),
  ].join("\n");

  return { subject, html, text, preheader };
}
