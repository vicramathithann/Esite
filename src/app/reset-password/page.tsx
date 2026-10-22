"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Lock,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  RefreshCw,
  KeyRound,
  ShieldCheck,
  Mail,
  Clock,
} from "lucide-react";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = (searchParams.get("token") || "").trim();
  const emailParam = (searchParams.get("email") || "").trim();

  // Verification & Token State
  const [checkingToken, setCheckingToken] = useState(true);
  const [tokenStatus, setTokenStatus] = useState<"VALID" | "EXPIRED" | "INVALID" | "MISSING">("VALID");
  const [tokenErrorMessage, setTokenErrorMessage] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState(emailParam);

  // Form Fields State
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // Verify the reset token on mount
  useEffect(() => {
    if (!token) {
      setCheckingToken(false);
      setTokenStatus("MISSING");
      setTokenErrorMessage("No password reset token was found in this link. Please use the exact link sent to your email.");
      return;
    }

    let isMounted = true;

    const verifyToken = async () => {
      try {
        setCheckingToken(true);
        const res = await fetch(`/api/auth/reset-password?token=${encodeURIComponent(token)}`);
        const data = await res.json();

        if (!isMounted) return;

        if (data.valid) {
          setTokenStatus("VALID");
          if (data.email) {
            setUserEmail(data.email);
          }
          setTokenErrorMessage(null);
        } else {
          setTokenStatus(data.status || "INVALID");
          setTokenErrorMessage(data.error || "This password reset link is invalid or has expired.");
        }
      } catch (err) {
        console.error("Token verification check error:", err);
        // Fallback: allow submission if network verification fails
        if (isMounted) {
          setTokenStatus("VALID");
        }
      } finally {
        if (isMounted) {
          setCheckingToken(false);
        }
      }
    };

    verifyToken();

    return () => {
      isMounted = false;
    };
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!token) {
      setFormError("Missing reset token. Please request a new link.");
      return;
    }

    if (newPassword.length < 6) {
      setFormError("Password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setFormError("Passwords do not match. Please verify and re-enter.");
      return;
    }

    try {
      setSubmitting(true);

      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          newPassword,
          confirmPassword,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setIsSuccess(true);
        setTimeout(() => {
          router.push("/login");
        }, 1800);
      } else {
        setFormError(data.error || "Failed to reset password. The link may have expired or already been used.");
        if (data.expired) {
          setTokenStatus("EXPIRED");
        }
      }
    } catch {
      setFormError("Network error while resetting password. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const isPasswordValid = newPassword.length >= 6;
  const doPasswordsMatch = isPasswordValid && newPassword === confirmPassword;

  return (
    <div className="w-full max-w-md mx-auto py-8 sm:py-14 px-4 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-[#161618] border border-border rounded-2xl p-6 sm:p-8 shadow-sm transition-colors duration-200">
        
        {/* ========================================================= */}
        {/* VIEW 1: TOKEN VERIFICATION IN PROGRESS                   */}
        {/* ========================================================= */}
        {checkingToken && (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
            <RefreshCw className="w-7 h-7 text-[#C9A66B] animate-spin" />
            <p className="text-sm font-semibold text-foreground">
              Verifying your secure reset link...
            </p>
            <p className="text-xs text-muted">
              Checking link validity and security tokens.
            </p>
          </div>
        )}

        {/* ========================================================= */}
        {/* VIEW 2: SUCCESS STATE                                    */}
        {/* ========================================================= */}
        {!checkingToken && isSuccess && (
          <div className="py-6 text-center space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-xl font-bold text-foreground">
                Password Updated Successfully!
              </h2>
              <p className="text-xs text-muted mt-1.5 leading-relaxed">
                Your new password has been securely saved. You can now sign in to your VN Mobiles account.
              </p>
            </div>

            <div className="p-3 bg-tile border border-border rounded-xl text-xs text-muted">
              Redirecting to sign in page...
            </div>

            <Link
              href="/login"
              className="w-full py-3 bg-[#C9A66B] hover:bg-[#B8914A] active:bg-[#A67C3D] text-[#FFFCFA] text-xs font-semibold rounded-xl flex items-center justify-center gap-2 shadow-xs transition"
            >
              <span>Go to Sign In Now</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {/* ========================================================= */}
        {/* VIEW 3: INVALID OR EXPIRED TOKEN ERROR                   */}
        {/* ========================================================= */}
        {!checkingToken && !isSuccess && tokenStatus !== "VALID" && (
          <div className="space-y-5 animate-in fade-in">
            <div className="flex items-center gap-3 pb-4 border-b border-border">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-base font-bold text-foreground">
                  {tokenStatus === "EXPIRED" ? "Reset Link Expired" : "Invalid Reset Link"}
                </h1>
                <p className="text-xs text-muted">
                  Password security verification
                </p>
              </div>
            </div>

            <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl space-y-2 text-xs">
              <p className="font-semibold text-rose-800 dark:text-rose-300">
                {tokenStatus === "EXPIRED"
                  ? "This password reset link has expired."
                  : "Unable to verify this password reset link."}
              </p>
              <p className="text-[11px] text-muted leading-relaxed">
                {tokenErrorMessage ||
                  "Password reset links are valid for 1 hour and can only be used once for security. Please ask an administrator to send a fresh reset link."}
              </p>
            </div>

            <div className="pt-2">
              <Link
                href="/login"
                className="w-full py-3 bg-[#C9A66B] hover:bg-[#B8914A] active:bg-[#A67C3D] text-[#FFFCFA] text-xs font-semibold rounded-xl flex items-center justify-center gap-2 shadow-xs transition"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                <span>Return to Sign In</span>
              </Link>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* VIEW 4: CLEAN PASSWORD RESET FORM                        */}
        {/* ========================================================= */}
        {!checkingToken && !isSuccess && tokenStatus === "VALID" && (
          <div className="space-y-6">
            {/* Header */}
            <div>
              <div className="w-12 h-12 rounded-2xl bg-[#C9A66B]/15 text-[#8C6226] dark:text-[#E5CBA2] border border-[#C9A66B]/30 flex items-center justify-center mb-3">
                <KeyRound className="w-6 h-6" />
              </div>

              <h1 className="text-xl font-bold text-foreground">
                Set New Password
              </h1>
              <p className="text-xs text-muted mt-1 leading-relaxed">
                Choose a strong password with at least 6 characters.
              </p>

              {userEmail && (
                <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 bg-tile border border-border rounded-full text-xs text-muted font-mono">
                  <Mail className="w-3.5 h-3.5 text-[#C9A66B]" />
                  <span>{userEmail}</span>
                </div>
              )}
            </div>

            {/* Error Message */}
            {formError && (
              <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-600 dark:text-rose-400 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="font-medium leading-relaxed">{formError}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* Field 1: Enter New Password */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="font-semibold text-foreground">
                    Enter New Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="text-[11px] text-muted hover:text-foreground flex items-center gap-1 cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{showNewPassword ? "Hide" : "Show"}</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter at least 6 characters..."
                    className="w-full bg-tile border border-border rounded-xl pl-9 pr-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-[#C9A66B] focus:ring-2 focus:ring-[#C9A66B]/20 transition-all placeholder:text-muted"
                  />
                  <Lock className="w-4 h-4 text-muted absolute left-3 top-2.5" />
                </div>
                {newPassword.length > 0 && (
                  <div className="flex items-center gap-1 text-[11px] pt-0.5">
                    {isPasswordValid ? (
                      <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                        <CheckCircle2 className="w-3 h-3" /> Password meets minimum length
                      </span>
                    ) : (
                      <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1 font-medium">
                        <AlertCircle className="w-3 h-3" /> Minimum 6 characters required ({newPassword.length}/6)
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Field 2: Confirm New Password */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="font-semibold text-foreground">
                    Confirm New Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="text-[11px] text-muted hover:text-foreground flex items-center gap-1 cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{showConfirmPassword ? "Hide" : "Show"}</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your new password..."
                    className="w-full bg-tile border border-border rounded-xl pl-9 pr-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-[#C9A66B] focus:ring-2 focus:ring-[#C9A66B]/20 transition-all placeholder:text-muted"
                  />
                  <Lock className="w-4 h-4 text-muted absolute left-3 top-2.5" />
                </div>
                {confirmPassword.length > 0 && (
                  <div className="flex items-center gap-1 text-[11px] pt-0.5">
                    {doPasswordsMatch ? (
                      <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                        <CheckCircle2 className="w-3 h-3" /> Passwords match
                      </span>
                    ) : (
                      <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1 font-medium">
                        <AlertCircle className="w-3 h-3" /> Passwords do not match
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting || !doPasswordsMatch}
                className="w-full py-3 bg-[#C9A66B] hover:bg-[#B8914A] active:bg-[#A67C3D] text-[#FFFCFA] text-xs font-semibold rounded-xl mt-3 flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <>
                    <span>Submit & Update Password</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>

            {/* Back to Login link */}
            <div className="pt-4 border-t border-border text-center">
              <Link
                href="/login"
                className="text-xs text-muted hover:text-foreground font-medium transition-colors"
              >
                ← Return to Sign In
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="py-20 flex items-center justify-center text-xs font-bold text-muted">
          Loading password recovery...
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
