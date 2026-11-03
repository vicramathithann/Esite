import {
  escapeHtml,
  renderEmailLayout,
  renderPlainFooter,
} from "./layout";

export interface AccountWelcomeData {
  recipientName: string;
  recipientEmail?: string;
}

export function renderWelcomeEmail(
  data: AccountWelcomeData,
  siteUrl = "https://vnmobiles.in"
): {
  subject: string;
  html: string;
  text: string;
  preheader: string;
} {
  const cleanUrl = siteUrl.replace(/\/$/, "");
  const name = data.recipientName || "there";

  const subject = "Welcome to VN Mobiles";
  const preheader = "Your account is ready. Discover the latest flagship drops.";

  const contentHtml = `
    <p style="margin:0 0 20px 0;font-size:15px;line-height:1.6;color:#475569;">
      Hi <strong style="color:#0F172A;">${escapeHtml(name)}</strong>,<br>
      Your VN Mobiles account is official. You now have full access to our curated catalog of brand new flagship smartphones, express pan-India delivery, and automated warranty certificates.
    </p>

    <!-- Perks Card -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;margin:24px 0;font-size:13px;line-height:1.6;">
      <tr>
        <td style="padding:16px 20px;border-bottom:1px solid #E2E8F0;">
          <div style="font-weight:700;color:#0F172A;margin-bottom:3px;">100% Genuine Devices</div>
          <div style="color:#64748B;">Factory sealed smartphones with official Indian manufacturer guarantees.</div>
        </td>
      </tr>
      <tr>
        <td style="padding:16px 20px;border-bottom:1px solid #E2E8F0;">
          <div style="font-weight:700;color:#0F172A;margin-bottom:3px;">Automated 1-Year Brand Warranty</div>
          <div style="color:#64748B;">Digital warranty certificates issued instantly to your account with every order.</div>
        </td>
      </tr>
      <tr>
        <td style="padding:16px 20px;">
          <div style="font-weight:700;color:#0F172A;margin-bottom:3px;">Express Insured Delivery</div>
          <div style="color:#64748B;">Fast doorstep delivery with tamper-proof packaging and live tracking.</div>
        </td>
      </tr>
    </table>

    <p style="margin:20px 0 0 0;font-size:13px;color:#64748B;line-height:1.5;">
      Ready to upgrade? Check out the latest smartphone arrivals and exclusive online deals.
    </p>
  `;

  const html = renderEmailLayout({
    preheader,
    badge: {
      text: "MEMBER WELCOME",
      bg: "#FEF3C7",
      color: "#92400E",
      border: "#FDE68A",
    },
    headline: "Welcome to the club.",
    subheadline: "Your account is live. Premium phones, official warranties, and zero hassle.",
    contentHtml,
    cta: {
      label: "Explore Flagship Phones",
      url: `${cleanUrl}/products`,
    },
    siteUrl: cleanUrl,
  });

  const text = [
    subject,
    "",
    `Hi ${name},`,
    "",
    "Welcome to the club. Your VN Mobiles account is official.",
    "",
    "WHAT YOU GET:",
    "- 100% genuine factory sealed flagship smartphones",
    "- Automated 1-Year brand warranty certificates on every order",
    "- Express insured delivery across India with tamper-proof seals",
    "",
    `Explore smartphones now: ${cleanUrl}/products`,
    "",
    renderPlainFooter(cleanUrl),
  ].join("\n");

  return { subject, html, text, preheader };
}

