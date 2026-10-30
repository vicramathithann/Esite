import { POST as resendOtpHandler } from "@/app/api/auth/resend-otp/route";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: Request) {
  return resendOtpHandler(request);
}
