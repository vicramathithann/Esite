import {
  escapeHtml,
  renderEmailLayout,
  renderPlainFooter,
} from "./layout";

export interface AdminInvitationData {
  inviteLink: string;
  recipientEmail: string;
  invitedByName?: string;
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
  const invitedBy = data.invitedByName || "A Store Administrator";
  const expiresAt = data.expiresAtFormatted || "7 days";

  const subject = "You have been invited to join VN Mobiles";
  const preheader = "Accept your invitation to join the administrator team.";

  const contentHtml = `
    <p style="margin:0 0 20px 0;font-size:14px;line-height:1.6;color:#475569;">
      Hello,<br>
      <strong style="color:#0F172A;">${escapeHtml(invitedBy)}</strong> has invited you to join the <strong>VN Mobiles Store Administration Portal</strong> as an authorized team member.
    </p>

    <!-- Invitation Details Card -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;margin:20px 0;font-size:13px;">
      <tr>
        <td style="padding:14px 18px;border-bottom:1px solid #E2E8F0;color:#64748B;width:38%;">Assigned Email</td>
        <td style="padding:14px 18px;border-bottom:1px solid #E2E8F0;color:#0F172A;font-weight:700;">${escapeHtml(data.recipientEmail)}</td>
      </tr>
      <tr>
        <td style="padding:14px 18px;border-bottom:1px solid #E2E8F0;color:#64748B;">Invited By</td>
        <td style="padding:14px 18px;border-bottom:1px solid #E2E8F0;color:#0F172A;font-weight:600;">${escapeHtml(invitedBy)}</td>
      </tr>
      <tr>
        <td style="padding:14px 18px;border-bottom:1px solid #E2E8F0;color:#64748B;">Security Policy</td>
        <td style="padding:14px 18px;border-bottom:1px solid #E2E8F0;color:#0F172A;">Single-use invitation token</td>
      </tr>
      <tr>
        <td style="padding:14px 18px;color:#64748B;">Link Expiration</td>
        <td style="padding:14px 18px;color:#0F172A;font-weight:600;">Valid for ${escapeHtml(expiresAt)}</td>
      </tr>
    </table>

    <div style="background-color:#FFFFFF;border:1px solid #E2E8F0;border-radius:8px;padding:16px 20px;margin:20px 0;font-size:13px;line-height:1.6;color:#475569;">
      <strong style="color:#0F172A;">Next steps:</strong> Click the button below to accept your invitation, verify your credentials, and configure your password to access the store administration desk.
    </div>

    <div style="margin:24px 0 0 0;padding-top:16px;border-top:1px solid #E2E8F0;font-size:12px;color:#64748B;line-height:1.5;">
      If the button above does not work, copy and paste this link into your browser:<br>
      <a href="${escapeHtml(data.inviteLink)}" style="color:#C9A66B;word-break:break-all;text-decoration:underline;">${escapeHtml(data.inviteLink)}</a>
    </div>
  `;

  const html = renderEmailLayout({
    preheader,
    badge: {
      text: "ADMIN INVITATION",
      bg: "#FEF3C7",
      color: "#92400E",
      border: "#FDE68A",
    },
    headline: "You are invited.",
    subheadline: "Join the VN Mobiles store administration team.",
    contentHtml,
    cta: {
      label: "Accept Invitation & Register",
      url: data.inviteLink,
    },
    siteUrl: cleanUrl,
  });

  const text = [
    subject,
    "",
    "Hello,",
    "",
    `${invitedBy} has invited you to join the VN Mobiles Store Administration Portal.`,
    "",
    "INVITATION DETAILS:",
    `- Assigned Email: ${data.recipientEmail}`,
    `- Invited By: ${invitedBy}`,
    `- Link Expiration: ${expiresAt}`,
    "- Security Policy: Single-use invitation link",
    "",
    "To accept your invitation and configure your account, open this link:",
    data.inviteLink,
    "",
    "If you did not expect this invitation, please ignore this email or contact support@vnmobiles.in.",
    "",
    renderPlainFooter(cleanUrl),
  ].join("\n");

  return { subject, html, text, preheader };
}

