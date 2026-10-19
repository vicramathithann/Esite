"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { 
  User, 
  Lock, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  ShieldCheck, 
  Mail,
  ShoppingBag
} from "lucide-react";
import { useApp } from "@/context/AppContext";

function InviteAcceptanceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, refreshUser } = useApp();

  const token = searchParams.get("token") || "";

  // Token Verification State
  const [isVerifying, setIsVerifying] = useState(true);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [recipientEmail, setRecipientEmail] = useState<string>("");

  // Form State
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Live Username Validation State
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // 1. Verify Token on Mount
  useEffect(() => {
    if (!token) {
      setIsVerifying(false);
      setVerifyError("No invitation token was provided in the link. Please check your invitation email.");
      return;
    }

    let isMounted = true;
    async function verifyToken() {
      try {
        const res = await fetch(`/api/invite/verify?token=${encodeURIComponent(token)}`);
        const data = await res.json();

        if (!isMounted) return;

        if (res.ok && data.success && data.valid) {
          setRecipientEmail(data.email);
          setVerifyError(null);
        } else {
          setVerifyError(data.error || "Invalid or expired invitation link.");
        }
      } catch {
        if (isMounted) {
          setVerifyError("Unable to verify invitation link. Please check your network connection.");
        }
      } finally {
        if (isMounted) {
          setIsVerifying(false);
        }
      }
    }

    verifyToken();
    return () => {
      isMounted = false;
    };
  }, [token]);

  // 2. Debounced Live Username Check (Instagram style)
  useEffect(() => {
    const clean = name.trim();
    if (!clean) {
      setUsernameStatus("idle");
      return;
    }

    if (clean.length < 2) {
      setUsernameStatus("idle");
      return;
    }

    setUsernameStatus("checking");
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/invite/check-username?name=${encodeURIComponent(clean)}`);
        const data = await res.json();
        if (data.available) {
          setUsernameStatus("available");
        } else {
          setUsernameStatus("taken");
        }
      } catch {
        setUsernameStatus("idle");
      }
    }, 350);

    return () => clearTimeout(timeout);
  }, [name]);

  // 3. Form Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const cleanName = name.trim();

    if (!cleanName) {
      setSubmitError("Please enter your name/username.");
      return;
    }

    if (cleanName.length < 2) {
      setSubmitError("Username must be at least 2 characters long.");
      return;
    }

    if (usernameStatus === "taken") {
      setSubmitError("This name is already taken");
      return;
    }

    if (!password) {
      setSubmitError("Please enter a password.");
      return;
    }

    if (password.length < 6) {
      setSubmitError("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setSubmitError("Passwords do not match. Please verify your confirm password.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/invite/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          name: cleanName,
          password,
          confirmPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        if (data.error === "This name is already taken") {
          setUsernameStatus("taken");
        }
        setSubmitError(data.error || "Failed to accept invitation. Please try again.");
        setIsSubmitting(false);
        return;
      }

      // Successful registration!
      setIsSuccess(true);
      if (data.user) {
        login(data.user);
        await refreshUser();
      }

      // Redirect to storefront
      setTimeout(() => {
        router.push(data.redirectUrl || "/");
      }, 1500);
    } catch (err) {
      setSubmitError("Network error while creating account. Please try again.");
      setIsSubmitting(false);
    }
  };

  // State A: Verifying Token
  if (isVerifying) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-card border border-border rounded-2xl p-8 text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 border-3 border-[#C9A66B] border-t-transparent rounded-full animate-spin mx-auto" />
          <h2 className="text-lg font-bold text-foreground">Validating Invitation...</h2>
          <p className="text-xs text-muted">
            Please wait while we verify your exclusive VN Mobiles invitation key.
          </p>
        </div>
      </div>
    );
  }

  // State B: Token Invalid, Expired, or Revoked
  if (verifyError) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-card border border-rose-500/20 rounded-2xl p-8 text-center space-y-5 shadow-lg">
          <div className="w-14 h-14 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center justify-center mx-auto">
            <AlertCircle className="w-7 h-7" />
          </div>
          <div>
            <span className="text-[11px] font-bold tracking-wider uppercase text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2.5 py-0.5 rounded-full border border-rose-500/20">
              Invitation Error
            </span>
            <h2 className="text-xl font-bold text-foreground mt-3">Unable to Proceed</h2>
            <p className="text-xs text-muted mt-2 leading-relaxed">
              {verifyError}
            </p>
          </div>

          <div className="pt-2 space-y-2">
            <Link
              href="/"
              className="w-full py-2.5 px-4 bg-[#C9A66B] dark:bg-[#D4B483] hover:bg-[#B8914A] text-[#FFFCFA] font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Explore VN Mobiles Storefront</span>
            </Link>
            <Link
              href="/login"
              className="block text-xs text-muted hover:text-foreground pt-1 transition"
            >
              Already have an account? Sign In →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // State C: Successful Account Creation
  if (isSuccess) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-card border border-emerald-500/30 rounded-2xl p-8 text-center space-y-5 shadow-xl animate-in fade-in zoom-in-95 duration-300">
          <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-9 h-9" />
          </div>
          <div>
            <span className="text-[11px] font-bold tracking-wider uppercase text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
              Account Created
            </span>
            <h2 className="text-2xl font-bold text-foreground mt-3">Welcome to VN Mobiles!</h2>
            <p className="text-xs text-muted mt-2 leading-relaxed">
              Your member account (<strong className="text-foreground">@{name.trim()}</strong>) has been set up with immediate access. Redirecting you to the storefront...
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 text-xs text-muted">
            <div className="w-3.5 h-3.5 border-2 border-[#C9A66B] border-t-transparent rounded-full animate-spin" />
            <span>Redirecting now...</span>
          </div>
        </div>
      </div>
    );
  }

  // State D: Normal Invitation Acceptance Form
  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6">
      <div className="max-w-md w-full">
        {/* Header Monogram & Title */}
        <div className="text-center mb-6 space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#C9A66B] dark:bg-[#D4B483] text-[#FFFCFA] font-black text-xl shadow-md tracking-tight mb-1">
            VN
          </div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">
            Accept Your Invitation
          </h1>
          <p className="text-xs text-muted max-w-sm mx-auto">
            Create your account to unlock flagship smartphones, VIP deals, and automated brand protection.
          </p>

          {/* Email Badge */}
          {recipientEmail && (
            <div className="pt-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#C9A66B]/10 text-[#8C6226] dark:text-[#E5CBA2] border border-[#C9A66B]/25">
                <Mail className="w-3.5 h-3.5" />
                <span>Invited: <strong className="font-semibold">{recipientEmail}</strong></span>
              </span>
            </div>
          )}
        </div>

        {/* Form Card */}
        <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-sm">
          {submitError && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-600 dark:text-rose-400 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="font-medium">{submitError}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4.5">
            {/* 1. Name / Username (Instagram style) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-[#C9A66B]" />
                  <span>Name (Username)</span>
                </label>
                <span className="text-[10px] text-muted">Instagram-style unique handle</span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted font-bold text-xs">
                  @
                </div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. johndoe or techlover"
                  autoComplete="username"
                  required
                  className={`w-full pl-8 pr-10 py-2.5 text-xs bg-background border rounded-xl focus:outline-none transition-all ${
                    usernameStatus === "taken" || submitError === "This name is already taken"
                      ? "border-rose-500 focus:border-rose-500 ring-1 ring-rose-500/20"
                      : usernameStatus === "available"
                      ? "border-emerald-500 focus:border-emerald-500 ring-1 ring-emerald-500/20"
                      : "border-border focus:border-[#C9A66B]"
                  }`}
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  {usernameStatus === "checking" && (
                    <div className="w-3.5 h-3.5 border-2 border-[#C9A66B] border-t-transparent rounded-full animate-spin" />
                  )}
                  {usernameStatus === "available" && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  )}
                  {(usernameStatus === "taken" || submitError === "This name is already taken") && (
                    <AlertCircle className="w-4 h-4 text-rose-500" />
                  )}
                </div>
              </div>

              {/* Username feedback message */}
              {(usernameStatus === "taken" || submitError === "This name is already taken") ? (
                <p className="mt-1.5 text-[11px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                  <span>This name is already taken</span>
                </p>
              ) : usernameStatus === "available" ? (
                <p className="mt-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                  ✓ Username is available
                </p>
              ) : (
                <p className="mt-1 text-[10px] text-muted">
                  Must be unique across VN Mobiles. Letters, numbers, and underscores allowed.
                </p>
              )}
            </div>

            {/* 2. Password */}
            <div>
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5 mb-1.5">
                <Lock className="w-3.5 h-3.5 text-[#C9A66B]" />
                <span>Password</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  autoComplete="new-password"
                  required
                  minLength={6}
                  className="w-full pl-3.5 pr-10 py-2.5 text-xs bg-background border border-border rounded-xl focus:outline-none focus:border-[#C9A66B] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted hover:text-foreground transition cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* 3. Confirm Password */}
            <div>
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5 mb-1.5">
                <Lock className="w-3.5 h-3.5 text-[#C9A66B]" />
                <span>Confirm Password</span>
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  autoComplete="new-password"
                  required
                  minLength={6}
                  className={`w-full pl-3.5 pr-10 py-2.5 text-xs bg-background border rounded-xl focus:outline-none transition-all ${
                    confirmPassword && password !== confirmPassword
                      ? "border-rose-500 focus:border-rose-500 ring-1 ring-rose-500/20"
                      : confirmPassword && password === confirmPassword
                      ? "border-emerald-500 focus:border-emerald-500 ring-1 ring-emerald-500/20"
                      : "border-border focus:border-[#C9A66B]"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted hover:text-foreground transition cursor-pointer"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {confirmPassword && password !== confirmPassword && (
                <p className="mt-1 text-[11px] font-medium text-rose-500">
                  Passwords do not match
                </p>
              )}
            </div>

            {/* Account Privilege Note */}
            <div className="p-3 rounded-xl bg-tile border border-border text-[11px] text-muted flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#C9A66B] shrink-0" />
              <span>You will receive immediate Member access to shop, manage orders, and view device warranties.</span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || usernameStatus === "checking" || usernameStatus === "taken"}
              className="w-full py-3 px-4 bg-[#C9A66B] dark:bg-[#D4B483] hover:bg-[#B8914A] active:bg-[#A67C3D] disabled:opacity-50 text-[#FFFCFA] font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <span>Create Account & Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer links */}
        <div className="text-center mt-6">
          <Link
            href="/"
            className="text-xs text-muted hover:text-foreground transition"
          >
            ← Return to VN Mobiles Storefront
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function InvitePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[75vh] flex items-center justify-center p-4">
          <div className="w-8 h-8 border-3 border-[#C9A66B] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <InviteAcceptanceContent />
    </Suspense>
  );
}

