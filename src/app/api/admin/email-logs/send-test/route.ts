import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { sendSharedMail } from "@/lib/email-sender";
import {
  renderOrderConfirmedEmail,
  renderOrderStatusEmail,
  renderOrderCancelledEmail,
  renderWarrantyActivationEmail,
  renderWarrantyUpdatedEmail,
  renderWarrantyExpiringEmail,
  renderOtpEmail,
  renderPasswordResetLinkEmail,
  renderAdminInvitationEmail,
  renderWelcomeEmail,
  renderAccountDeletionOtpEmail,
} from "@/lib/email-templates";
import { generateWarrantyCertificatePdf } from "@/lib/warranty-pdf";
import { getAppUrl } from "@/lib/appUrl";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    const auth = await requireAdmin(request);
    if (auth instanceof Response) return auth;

    const body = await request.json().catch(() => ({}));
    const { templateKey, recipientEmail } = body;

    if (!recipientEmail || typeof recipientEmail !== "string") {
      return NextResponse.json(
        { success: false, error: "Recipient email is required." },
        { status: 400 }
      );
    }

    const cleanEmail = recipientEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return NextResponse.json(
        { success: false, error: "Please provide a valid recipient email address." },
        { status: 400 }
      );
    }

    const siteUrl = getAppUrl(request);
    const sampleCustomer = {
      name: "Alex Rivera",
      email: cleanEmail,
      address: "Flat 402, Prestige Tower, Indiranagar 100ft Road",
      city: "Bengaluru",
      state: "Karnataka",
      pincode: "560038",
    };

    const sampleProduct = "Samsung Galaxy S24";
    const sampleItem = {
      productName: sampleProduct,
      selectedStorage: "256GB",
      selectedColor: "Onyx Black",
      quantity: 1,
      price: 74999,
      imeiNumber: "867493019485721",
    };

    let subject = "";
    let html = "";
    let text = "";
    let emailType = "TEST_DISPATCH";
    let attachments: Array<{ filename: string; content: Buffer; contentType: string }> = [];

    switch (templateKey) {
      case "order_confirmed": {
        emailType = "ORDER_CONFIRMATION";
        const res = renderOrderConfirmedEmail(
          {
            orderNumber: "ORD-94821",
            customerName: sampleCustomer.name,
            customerEmail: cleanEmail,
            totalAmount: 74999,
            items: [sampleItem],
            address: sampleCustomer.address,
            city: sampleCustomer.city,
            state: sampleCustomer.state,
            pincode: sampleCustomer.pincode,
            createdAt: new Date(),
            paymentMethod: "UPI",
            paymentStatus: "PAID",
          },
          siteUrl
        );
        subject = res.subject;
        html = res.html;
        text = res.text;
        break;
      }

      case "order_cancelled": {
        emailType = "ORDER_CANCELLED";
        const res = renderOrderCancelledEmail(
          {
            orderNumber: "ORD-94821",
            customerName: sampleCustomer.name,
            customerEmail: cleanEmail,
            totalAmount: 74999,
            items: [sampleItem],
          },
          "Customer requested cancellation before dispatch.",
          undefined,
          siteUrl
        );
        subject = res.subject;
        html = res.html;
        text = res.text;
        break;
      }

      case "order_shipped": {
        emailType = "ORDER_STATUS";
        const res = renderOrderStatusEmail(
          {
            orderNumber: "ORD-94821",
            customerName: sampleCustomer.name,
            customerEmail: cleanEmail,
            totalAmount: 74999,
            orderStatus: "SHIPPED",
            shippingCarrier: "BlueDart Express",
            trackingNumber: "BD98472910IN",
            items: [sampleItem],
          },
          "SHIPPED",
          "Tamper-proof package dispatched from Bengaluru Central Warehouse.",
          undefined,
          siteUrl
        );
        subject = res.subject;
        html = res.html;
        text = res.text;
        break;
      }

      case "order_out_for_delivery": {
        emailType = "ORDER_STATUS";
        const res = renderOrderStatusEmail(
          {
            orderNumber: "ORD-94821",
            customerName: sampleCustomer.name,
            customerEmail: cleanEmail,
            totalAmount: 74999,
            orderStatus: "OUT_FOR_DELIVERY",
            items: [sampleItem],
          },
          "OUT_FOR_DELIVERY",
          "Courier agent is out for delivery in your neighborhood.",
          undefined,
          siteUrl
        );
        subject = res.subject;
        html = res.html;
        text = res.text;
        break;
      }

      case "order_delivered": {
        emailType = "ORDER_STATUS";
        const res = renderOrderStatusEmail(
          {
            orderNumber: "ORD-94821",
            customerName: sampleCustomer.name,
            customerEmail: cleanEmail,
            totalAmount: 74999,
            orderStatus: "DELIVERED",
            items: [sampleItem],
          },
          "DELIVERED",
          "Package delivered and verified at doorstep.",
          undefined,
          siteUrl
        );
        subject = res.subject;
        html = res.html;
        text = res.text;
        break;
      }

      case "warranty_certificate": {
        emailType = "WARRANTY";
        const now = new Date();
        const expiry = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

        // Generate official PDF certificate
        try {
          const pdf = await generateWarrantyCertificatePdf({
            customerName: sampleCustomer.name,
            customerEmail: cleanEmail,
            orderNumber: "ORD-94821",
            devices: [
              {
                productName: sampleProduct,
                productBrand: "Samsung",
                variantInfo: "256GB, Onyx Black",
                warrantyNumber: "WRT-TEST-001",
                imeiNumber: sampleItem.imeiNumber,
                coveragePeriod: "1 Year Brand Warranty",
                warrantyStartDate: now,
                warrantyExpiryDate: expiry,
                purchaseDate: now,
                orderNumber: "ORD-94821",
                status: "ACTIVE",
              },
            ],
          });
          attachments.push({
            filename: "VN-Mobiles-Warranty-Certificate.pdf",
            content: pdf.pdfBuffer,
            contentType: "application/pdf",
          });
        } catch (pdfErr) {
          console.warn("[TEST DISPATCH PDF WARNING]", pdfErr);
        }

        const res = renderWarrantyActivationEmail(
          {
            orderNumber: "ORD-94821",
            customerName: sampleCustomer.name,
            customerEmail: cleanEmail,
            items: [
              {
                productName: sampleProduct,
                variantInfo: "256GB, Onyx Black",
                warrantyNumber: "WRT-TEST-001",
                imeiNumber: sampleItem.imeiNumber,
                coveragePeriod: "1 Year Brand Warranty",
                startDateStr: now.toLocaleDateString("en-IN"),
                expiryDateStr: expiry.toLocaleDateString("en-IN"),
                status: "ACTIVE",
              },
            ],
          },
          siteUrl
        );
        subject = res.subject;
        html = res.html;
        text = res.text;
        break;
      }

      case "warranty_updated": {
        emailType = "WARRANTY_NOTIFICATION";
        const now = new Date();
        const oldExpiry = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
        const newExpiry = new Date(now.getTime() + 730 * 24 * 60 * 60 * 1000);

        try {
          const pdf = await generateWarrantyCertificatePdf({
            customerName: sampleCustomer.name,
            customerEmail: cleanEmail,
            orderNumber: "ORD-94821",
            devices: [
              {
                productName: sampleProduct,
                productBrand: "Samsung",
                variantInfo: "256GB, Onyx Black",
                warrantyNumber: "WRT-TEST-001",
                imeiNumber: sampleItem.imeiNumber,
                coveragePeriod: "2 Years Brand Warranty",
                warrantyStartDate: now,
                warrantyExpiryDate: newExpiry,
                purchaseDate: now,
                orderNumber: "ORD-94821",
                status: "ACTIVE",
              },
            ],
          });
          attachments.push({
            filename: "VN-Mobiles-Warranty-Certificate.pdf",
            content: pdf.pdfBuffer,
            contentType: "application/pdf",
          });
        } catch (pdfErr) {
          console.warn("[TEST DISPATCH PDF WARNING]", pdfErr);
        }

        const res = renderWarrantyUpdatedEmail(
          {
            customerName: sampleCustomer.name,
            customerEmail: cleanEmail,
            productName: sampleProduct,
            variantInfo: "256GB, Onyx Black",
            oldDuration: "1 Year",
            newDuration: "2 Years",
            oldExpiryDate: oldExpiry,
            newExpiryDate: newExpiry,
            updatedAt: new Date(),
            isExtended: true,
          },
          siteUrl
        );
        subject = res.subject;
        html = res.html;
        text = res.text;
        break;
      }

      case "warranty_reminder_6m": {
        emailType = "WARRANTY_REMINDER_6M";
        const now = new Date();
        const expiry = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000);
        const res = renderWarrantyExpiringEmail(
          {
            customerName: sampleCustomer.name,
            customerEmail: cleanEmail,
            productName: sampleProduct,
            warrantyNumber: "WRT-TEST-001",
            imeiNumber: sampleItem.imeiNumber,
            warrantyStartDate: new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000),
            warrantyExpiryDate: expiry,
          },
          "6_MONTHS",
          siteUrl
        );
        subject = res.subject;
        html = res.html;
        text = res.text;
        break;
      }

      case "warranty_reminder_1d": {
        emailType = "WARRANTY_REMINDER_1D";
        const now = new Date();
        const expiry = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        const res = renderWarrantyExpiringEmail(
          {
            customerName: sampleCustomer.name,
            customerEmail: cleanEmail,
            productName: sampleProduct,
            warrantyNumber: "WRT-TEST-001",
            imeiNumber: sampleItem.imeiNumber,
            warrantyStartDate: new Date(now.getTime() - 364 * 24 * 60 * 60 * 1000),
            warrantyExpiryDate: expiry,
          },
          "1_DAY",
          siteUrl
        );
        subject = res.subject;
        html = res.html;
        text = res.text;
        break;
      }

      case "otp_registration": {
        emailType = "REGISTRATION_OTP";
        const res = renderOtpEmail(
          {
            recipientName: sampleCustomer.name,
            recipientEmail: cleanEmail,
            code: "582910",
            purpose: "registration",
            expiresInMinutes: 5,
          },
          siteUrl
        );
        subject = res.subject;
        html = res.html;
        text = res.text;
        break;
      }

      case "otp_login": {
        emailType = "LOGIN_OTP";
        const res = renderOtpEmail(
          {
            recipientName: sampleCustomer.name,
            recipientEmail: cleanEmail,
            code: "948201",
            purpose: "login",
            expiresInMinutes: 5,
          },
          siteUrl
        );
        subject = res.subject;
        html = res.html;
        text = res.text;
        break;
      }

      case "password_reset": {
        emailType = "PASSWORD_RESET";
        const res = renderPasswordResetLinkEmail(
          {
            recipientName: sampleCustomer.name,
            recipientEmail: cleanEmail,
            resetUrl: `${siteUrl}/reset-password?token=sample_test_token_demo`,
            expiresInMinutes: 30,
            isAdmin: false,
          },
          siteUrl
        );
        subject = res.subject;
        html = res.html;
        text = res.text;
        break;
      }

      case "admin_invitation": {
        emailType = "ADMIN_INVITATION";
        const res = renderAdminInvitationEmail(
          {
            inviteLink: `${siteUrl}/invite?token=sample_invite_token_demo`,
            recipientEmail: cleanEmail,
            role: "ADMIN",
            expiresAtFormatted: "Expires in 48 hours",
          },
          siteUrl
        );
        subject = res.subject;
        html = res.html;
        text = res.text;
        break;
      }

      case "account_welcome": {
        emailType = "WELCOME_EMAIL";
        const res = renderWelcomeEmail(
          {
            recipientName: sampleCustomer.name,
            recipientEmail: cleanEmail,
          },
          siteUrl
        );
        subject = res.subject;
        html = res.html;
        text = res.text;
        break;
      }

      case "account_deletion": {
        emailType = "ACCOUNT_DELETION_OTP";
        const res = renderAccountDeletionOtpEmail(
          {
            recipientName: sampleCustomer.name,
            recipientEmail: cleanEmail,
            code: "392018",
          },
          siteUrl
        );
        subject = res.subject;
        html = res.html;
        text = res.text;
        break;
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown template key "${templateKey}".` },
          { status: 400 }
        );
    }

    const sendResult = await sendSharedMail({
      recipientName: sampleCustomer.name,
      recipientEmail: cleanEmail,
      subject,
      html,
      text,
      emailType,
      productName: sampleProduct,
      attachments: attachments.length > 0 ? attachments : undefined,
    });

    if (sendResult.success) {
      return NextResponse.json({
        success: true,
        message: `Test email (${templateKey}) successfully delivered to ${cleanEmail}.`,
        messageId: sendResult.messageId,
        provider: sendResult.provider,
      });
    }

    return NextResponse.json({
      success: false,
      error: sendResult.error || "Failed to dispatch test email.",
      status: sendResult.status,
      provider: sendResult.provider,
    });
  } catch (error: any) {
    console.error("[ADMIN SEND TEST EMAIL ERROR]", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to send test email" },
      { status: 500 }
    );
  }
}
