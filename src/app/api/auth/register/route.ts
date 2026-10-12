import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, generateSecureOtp, hashOtp, isValidEmail } from "@/lib/auth";
import { sendUserVerificationEmail } from "@/lib/email";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, phone, password, confirmPassword } = body;

    // 1. Validate required fields
    if (!name || !email || !password) {
      return NextResponse.json(
        { success: false, error: "Please provide your name, email, and password." },
        { status: 400 }
      );
    }

    // 2. Validate confirm password if supplied
    if (confirmPassword !== undefined && password !== confirmPassword) {
      return NextResponse.json(
        { success: false, error: "Passwords do not match. Please verify your confirm password." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: "Password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    // 3. Strict Email Format Validation
    const cleanEmail = email.toLowerCase().trim();
    if (!isValidEmail(cleanEmail)) {
      return NextResponse.json(
        { success: false, error: "Invalid email format. Please provide a valid email address." },
        { status: 400 }
      );
    }

    // 4. Default friendly phone if omitted
    const cleanPhone = (phone && phone.trim()) || `+91 ${Math.floor(6000000000 + Math.random() * 3999999999)}`;

    // 5. Check whether the email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existingUser && existingUser.emailVerified) {
      return NextResponse.json(
        { success: false, error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    // 6. Generate cryptographically secure OTP (6 digits) & expiring token
    const otp = generateSecureOtp();
    const otpHash = hashOtp(otp);
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    const hashedPassword = hashPassword(password);

    let user;

    if (existingUser && !existingUser.emailVerified) {
      // Unverified account: Update credentials, reset OTP attempts and issue new code
      user = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          name: name.trim(),
          password: hashedPassword,
          phone: cleanPhone,
          emailVerified: false,
          verificationToken,
          tokenExpires,
          otpHash,
          otpExpires,
          otpAttempts: 0,
          lastOtpSentAt: new Date(),
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          emailVerified: true,
          createdAt: true,
        },
      });
    } else {
      // New account: Check unique phone collision
      const existingPhone = await prisma.user.findUnique({
        where: { phone: cleanPhone },
      });
      if (existingPhone) {
        return NextResponse.json(
          { success: false, error: "An account with this phone number already exists." },
          { status: 409 }
        );
      }

      // Create new account with emailVerified = false
      user = await prisma.user.create({
        data: {
          name: name.trim(),
          email: cleanEmail,
          phone: cleanPhone,
          password: hashedPassword,
          role: "USER",
          emailVerified: false,
          verificationToken,
          tokenExpires,
          otpHash,
          otpExpires,
          otpAttempts: 0,
          lastOtpSentAt: new Date(),
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          emailVerified: true,
          createdAt: true,
        },
      });
    }

    // 7. Send the verification email through Gmail SMTP
    try {
      await sendUserVerificationEmail(
        { id: user.id, name: user.name, email: user.email },
        verificationToken,
        otp
      );
    } catch (emailErr) {
      console.error("[EMAIL DISPATCH WARNING] Could not send verification email immediately:", emailErr);
    }

    // Never return the OTP or token in the public JSON response
    return NextResponse.json({
      success: true,
      email: cleanEmail,
      message: `Account created! We've sent a 6-digit verification code to ${cleanEmail}. Please enter the code to complete verification.`,
    });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create account. Please try again." },
      { status: 500 }
    );
  }
}
