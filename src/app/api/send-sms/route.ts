import { NextResponse } from "next/server";

export async function POST(_request: Request) {
  return NextResponse.json(
    {
      success: false,
      error: "SMS gateway (MSG91) has been removed. All communications are sent via Gmail SMTP.",
    },
    { status: 410 }
  );
}

export async function GET() {
  return NextResponse.json({
    success: false,
    service: "SMS Gateway",
    configured: false,
    message: "MSG91 SMS Gateway has been disabled and removed. Email authentication uses Gmail SMTP.",
  });
}
