import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyOtp, createSessionToken } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/rateLimit";

export async function GET(request: Request) {
  try {
    const rateLimitError = enforceRateLimit(request, {
      keyPrefix: "auth_verify_email_get",
      maxRequests: 10,
      windowSeconds: 60,
    });
    if (rateLimitError) return rateLimitError;

    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token")?.trim();

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Verification token is required." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findFirst({
      where: { verificationToken: token },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Invalid or already used verification link." },
        { status: 404 }
      );
    }

    if (user.tokenExpires && user.tokenExpires < new Date()) {
      return NextResponse.json(
        {
          success: false,
          error: "Verification link has expired. Please request a new verification code.",
          expired: true,
          email: user.email,
        },
        { status: 410 }
      );
    }

    // Mark user as verified and clear OTP & token
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        verificationToken: null,
        tokenExpires: null,
        otpHash: null,
        otpExpires: null,
        otpAttempts: 0,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        emailVerified: true,
      },
    });

    const sessionToken = createSessionToken(updatedUser);
    const response = NextResponse.json({
      success: true,
      user: updatedUser,
      message: "Email verified successfully! You are now logged in.",
    });

    response.cookies.set("vn_session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });

    return response;
  } catch (error) {
    console.error("Email verification error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to verify email." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const rateLimitError = enforceRateLimit(request, {
      keyPrefix: "auth_verify_email_post",
      maxRequests: 10,
      windowSeconds: 60,
    });
    if (rateLimitError) return rateLimitError;

    const body = await request.json();
    const { email, otp, token } = body;

    // A. 6-Digit OTP Verification Flow
    if (otp !== undefined) {
      const cleanEmail = (email || "").trim().toLowerCase();
      const cleanOtp = String(otp).trim();

      if (!cleanEmail) {
        return NextResponse.json(
          { success: false, error: "Email address is required." },
          { status: 400 }
        );
      }

      if (!cleanOtp || cleanOtp.length !== 6 || !/^\d{6}$/.test(cleanOtp)) {
        return NextResponse.json(
          { success: false, error: "Please enter a valid 6-digit verification code." },
          { status: 400 }
        );
      }

      const user = await prisma.user.findUnique({
        where: { email: cleanEmail },
      });

      if (!user) {
        return NextResponse.json(
          { success: false, error: "No account found with this email address." },
          { status: 404 }
        );
      }

      if (user.emailVerified) {
        const sessionToken = createSessionToken(user);
        const response = NextResponse.json({
          success: true,
          alreadyVerified: true,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role,
            emailVerified: true,
          },
          message: "Your email is already verified. You are now logged in.",
        });

        response.cookies.set("vn_session", sessionToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: 30 * 24 * 60 * 60,
        });

        return response;
      }

      // Check max failed verification attempts
      if (user.otpAttempts >= 5) {
        return NextResponse.json(
          {
            success: false,
            error: "Too many failed attempts. For your security, please request a new verification code.",
            code: "TOO_MANY_ATTEMPTS",
          },
          { status: 429 }
        );
      }

      // Check OTP expiration (5 minutes)
      if (!user.otpHash || !user.otpExpires || user.otpExpires < new Date()) {
        return NextResponse.json(
          {
            success: false,
            error: "Verification code has expired. Please request a new code.",
            expired: true,
          },
          { status: 410 }
        );
      }

      // Secure cryptographic OTP check against PBKDF2 hash
      const isValid = verifyOtp(cleanOtp, user.otpHash);

      if (!isValid) {
        const newAttempts = user.otpAttempts + 1;
        await prisma.user.update({
          where: { id: user.id },
          data: { otpAttempts: newAttempts },
        });

        const remaining = Math.max(0, 5 - newAttempts);
        return NextResponse.json(
          {
            success: false,
            error:
              remaining > 0
                ? `Invalid verification code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`
                : "Too many failed attempts. Please request a new verification code.",
            remainingAttempts: remaining,
          },
          { status: 400 }
        );
      }

      // Correct OTP: Mark email verified and establish authenticated session
      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerified: true,
          otpHash: null,
          otpExpires: null,
          otpAttempts: 0,
          verificationToken: null,
          tokenExpires: null,
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          emailVerified: true,
        },
      });

      const sessionToken = createSessionToken(updatedUser);
      const response = NextResponse.json({
        success: true,
        user: updatedUser,
        message: "Email verified successfully! You are now logged in.",
      });

      response.cookies.set("vn_session", sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 30 * 24 * 60 * 60,
      });

      return response;
    }

    // B. Token Verification Flow (e.g. from verification link POST)
    const cleanToken = token?.trim();
    if (!cleanToken) {
      return NextResponse.json(
        { success: false, error: "Verification code or token is required." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findFirst({
      where: { verificationToken: cleanToken },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Invalid or already used verification link." },
        { status: 404 }
      );
    }

    if (user.tokenExpires && user.tokenExpires < new Date()) {
      return NextResponse.json(
        {
          success: false,
          error: "Verification link has expired. Please request a new verification email.",
          expired: true,
          email: user.email,
        },
        { status: 410 }
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        verificationToken: null,
        tokenExpires: null,
        otpHash: null,
        otpExpires: null,
        otpAttempts: 0,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        emailVerified: true,
      },
    });

    const sessionToken = createSessionToken(updatedUser);
    const response = NextResponse.json({
      success: true,
      user: updatedUser,
      message: "Email verified successfully! You are now logged in.",
    });

    response.cookies.set("vn_session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });

    return response;
  } catch (error) {
    console.error("POST verify email error:", error);
    return NextResponse.json(
      { success: false, error: "An error occurred while verifying email." },
      { status: 500 }
    );
  }
}
