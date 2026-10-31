"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { 
  Lock, 
  ArrowRight, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  Eye, 
  EyeOff, 
  Sparkles, 
  User, 
  Mail, 
  KeyRound, 
  RefreshCw, 
  Loader2,
  X
} from "lucide-react";

function LoginForm() {
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect") || "";
  const forgotVerifiedParam = searchParams.get("forgotVerified") === "true";
  const verifiedEmailParam = searchParams.get("email") || "";
  const resetTokenParam = searchParams.get("token") || "";

  const { currentUser, login, logout } = useApp();

  const otpCodeParam = searchParams.get("code") || searchParams.get("otp") || "";

  // Mode: "password" vs "otp"
  const [loginMode, setLoginMode] = useState<"password" | "otp">(otpCodeParam ? "otp" : "password");

  // Password Login State
  const [emailOrPhone, setEmailOrPhone] = useState(verifiedEmailParam || "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);

  // OTP Login State
  const [otpStep, setOtpStep] = useState<"email" | "code">(otpCodeParam ? "code" : "email");
  const [otpEmail, setOtpEmail] = useState(verifiedEmailParam || "");
  const [otpCode, setOtpCode] = useState(otpCodeParam.slice(0, 6));
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [resendingOtp, setResendingOtp] = useState(false);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);
  const otpInputRefs = React.useRef<(HTMLInputElement | null)[]>([]);

  // Common UI State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{ name: string; role: string; message: string } | null>(null);

  // Forgot Password Post-Verification Popup State (Applies ONLY to Forgot Password)
  const [showForgotPrompt, setShowForgotPrompt] = useState(forgotVerifiedParam && !!resetTokenParam);
  const [forgotPromptView, setForgotPromptView] = useState<"choice" | "reset">("choice");
  const [forgotResetToken, setForgotResetToken] = useState(resetTokenParam);
  const [forgotResetEmail, setForgotResetEmail] = useState(verifiedEmailParam);
  const [newResetPassword, setNewResetPassword] = useState("");
  const [confirmResetPassword, setConfirmResetPassword] = useState("");
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  // Initialize popup if URL params present
  useEffect(() => {
    if (forgotVerifiedParam && resetTokenParam) {
      setShowForgotPrompt(true);
      setForgotPromptView("choice");
      setForgotResetToken(resetTokenParam);
      setForgotResetEmail(verifiedEmailParam);
      if (verifiedEmailParam) {
        setEmailOrPhone(verifiedEmailParam);
      }
    }
  }, [forgotVerifiedParam, resetTokenParam, verifiedEmailParam]);

  // Cooldown timer ticker for OTP resends
  useEffect(() => {
    if (otpCooldown <= 0) return;
    const interval = setInterval(() => {
      setOtpCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [otpCooldown]);

  function getSafeRedirect(url?: string | null): string {
    if (!url || typeof url !== "string") return "/";
    const trimmed = url.trim();
    if (
      trimmed.startsWith("/") &&
      !trimmed.startsWith("//") &&
      !trimmed.startsWith("/\\") &&
      !trimmed.includes("://")
    ) {
      return trimmed;
    }
    return "/";
  }

  // Clean URL parameters when popup dismissed or completed
  const cleanUrlParams = () => {
    if (typeof window !== "undefined") {
      const cleanPath = redirectParam ? `/login?redirect=${encodeURIComponent(redirectParam)}` : "/login";
      window.history.replaceState({}, "", cleanPath);
    }
  };

  // Popup Option 2: "No, Continue with Existing Password"
  // Keep existing password unchanged, log in automatically, and redirect to storefront or intended destination
  const [continueSubmitting, setContinueSubmitting] = useState(false);

  const handleDismissPrompt = () => {
    setShowForgotPrompt(false);
    cleanUrlParams();
    if (forgotResetEmail) {
      setEmailOrPhone(forgotResetEmail);
    }
  };

  const handleContinueWithExistingPassword = async () => {
    if (!forgotResetToken) {
      handleDismissPrompt();
      return;
    }

    try {
      setContinueSubmitting(true);
      setResetError(null);

      const res = await fetch("/api/auth/forgot-password/continue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: forgotResetToken }),
      });

      const data = await res.json();
      if (data.success && data.user) {
        // Authenticate user in React Context
        login(data.user);
        setShowForgotPrompt(false);
        cleanUrlParams();

        const targetUrl = redirectParam && redirectParam !== "/admin"
          ? getSafeRedirect(redirectParam)
          : "/";

        setSuccessInfo({
          name: data.user.name,
          role: data.user.role,
          message: `✓ Welcome back, ${data.user.name}! Logging you in...`,
        });

        // Instant seamless redirect with valid session, no second prompt
        setTimeout(() => {
          window.location.href = targetUrl;
        }, 300);
      } else {
        setResetError(data.error || "Recovery session expired. Please request a new code.");
        setTimeout(() => {
          setShowForgotPrompt(false);
          cleanUrlParams();
        }, 1500);
      }
    } catch {
      setResetError("Network error logging in. Please try again.");
    } finally {
      setContinueSubmitting(false);
    }
  };

  // Popup Option 1: "Yes, Update Password" -> Form Submit
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newResetPassword.length < 6) {
      setResetError("Password must be at least 6 characters long.");
      return;
    }
    if (newResetPassword !== confirmResetPassword) {
      setResetError("Passwords do not match. Please re-enter.");
      return;
    }

    try {
      setResetSubmitting(true);
      setResetError(null);

      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: forgotResetToken,
          newPassword: newResetPassword,
          confirmPassword: confirmResetPassword,
        }),
      });

      const data = await res.json();
      if (data.success) {
        if (data.user) {
          login(data.user);
        }
        setShowForgotPrompt(false);
        cleanUrlParams();

        const targetUrl = redirectParam && redirectParam !== "/admin"
          ? getSafeRedirect(redirectParam)
          : "/";

        setSuccessInfo({
          name: data.user?.name || forgotResetEmail,
          role: "USER",
          message: "✓ Password updated successfully! Accessing your account...",
        });

        setTimeout(() => {
          window.location.href = targetUrl;
        }, 400);
      } else {
        setResetError(data.error || "Failed to update password. Link may have expired.");
      }
    } catch {
      setResetError("Network error updating password. Please try again.");
    } finally {
      setResetSubmitting(false);
    }
  };

  // Handle Password-based Sign In
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const identifier = emailOrPhone.trim();
    if (!identifier || !password) {
      setError("Please enter your username/email and password.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setUnverifiedEmail(null);

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailOrPhone: identifier, password }),
      });

      const data = await res.json();
      if (data.success && data.user) {
        login(data.user);
        const isAdmin =
          data.user.role === "ADMIN" &&
          (data.user.email || "").toLowerCase() === "rrroyce20@gmail.com";

        setSuccessInfo({
          name: data.user.name,
          role: isAdmin ? "ADMIN" : "USER",
          message: isAdmin
            ? "👑 Administrator verified! Opening Admin Control Center..."
            : `✓ Welcome, ${data.user.name}! Accessing your account...`,
        });

        setTimeout(() => {
          const targetUrl = isAdmin
            ? (redirectParam && redirectParam.startsWith("/admin") ? redirectParam : "/admin/dashboard")
            : (redirectParam && redirectParam !== "/admin" && !redirectParam.startsWith("/admin")
                ? redirectParam
                : "/user");
          window.location.href = targetUrl;
        }, 500);

      } else {
        if (data.requiresVerification || res.status === 403) {
          setError("Please verify your email address before logging in.");
          setUnverifiedEmail(data.email || identifier);
        } else {
          setError(data.error || "Login failed. Please check your credentials.");
        }
      }
    } catch (err) {
      console.error(err);
      setError("Unable to connect to the server. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  // Handle OTP Step 1: Send OTP to Email
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanEmail = otpEmail.trim().toLowerCase();
    if (!cleanEmail) {
      setError("Please enter your registered email address.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setInfoMessage(null);
      setRemainingAttempts(null);

      const res = await fetch("/api/auth/login-otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail }),
      });

      const data = await res.json();
      if (data.success) {
        setOtpStep("code");
        setOtpCooldown(data.cooldown || 60);
        setInfoMessage(data.message || `A 6-digit login code has been sent to ${cleanEmail}.`);
      } else {
        setError(data.error || "Failed to send login code. Please try again.");
        if (data.cooldown) {
          setOtpCooldown(data.cooldown);
        }
      }
    } catch (err) {
      console.error(err);
      setError("Network error sending login code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handle OTP Step 2: Resend Code
  const handleResendOtp = async () => {
    if (otpCooldown > 0 || resendingOtp) return;
    const cleanEmail = otpEmail.trim().toLowerCase();
    if (!cleanEmail) return;

    try {
      setResendingOtp(true);
      setError(null);
      const res = await fetch("/api/auth/login-otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail }),
      });

      const data = await res.json();
      if (data.success) {
        setOtpCooldown(data.cooldown || 60);
        setInfoMessage("A fresh 6-digit login code has been sent to your email.");
        setRemainingAttempts(null);
      } else {
        setError(data.error || "Unable to resend login code.");
        if (data.cooldown) {
          setOtpCooldown(data.cooldown);
        }
      }
    } catch {
      setError("Failed to resend code due to network error.");
    } finally {
      setResendingOtp(false);
    }
  };

  // OTP 6-Box Input Helpers
  const handleOtpDigitChange = (index: number, value: string) => {
    const raw = value.replace(/\D/g, "");
    if (!raw) {
      const currentArr = Array.from({ length: 6 }, (_, i) => otpCode[i] || "");
      currentArr[index] = "";
      setOtpCode(currentArr.join("").trimEnd());
      return;
    }

    if (raw.length > 1) {
      const pastedDigits = raw.slice(0, 6);
      setOtpCode(pastedDigits);
      const nextFocus = Math.min(pastedDigits.length, 5);
      otpInputRefs.current[nextFocus]?.focus();
      return;
    }

    const currentArr = Array.from({ length: 6 }, (_, i) => otpCode[i] || "");
    currentArr[index] = raw;
    const newCode = currentArr.join("").slice(0, 6);
    setOtpCode(newCode);

    if (index < 5 && raw) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!otpCode[index] && index > 0) {
        const currentArr = Array.from({ length: 6 }, (_, i) => otpCode[i] || "");
        currentArr[index - 1] = "";
        setOtpCode(currentArr.join("").trimEnd());
        otpInputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      otpInputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      e.preventDefault();
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted) {
      setOtpCode(pasted);
      const nextFocus = Math.min(pasted.length, 5);
      otpInputRefs.current[nextFocus]?.focus();
    }
  };

  // Allow global Ctrl+V pasting across the entire window when on OTP step
  useEffect(() => {
    if (loginMode !== "otp" || otpStep !== "code") return;

    const handleGlobalPaste = (e: ClipboardEvent) => {
      const text = e.clipboardData?.getData("text") || "";
      const digits = text.replace(/\D/g, "").slice(0, 6);
      if (digits.length === 6) {
        setOtpCode(digits);
        otpInputRefs.current[5]?.focus();
      }
    };

    window.addEventListener("paste", handleGlobalPaste);
    return () => window.removeEventListener("paste", handleGlobalPaste);
  }, [loginMode, otpStep]);

  // Handle OTP Step 2: Verify OTP and Establish Session
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = otpEmail.trim().toLowerCase();
    const cleanCode = otpCode.trim();

    if (!cleanEmail || cleanCode.length !== 6) {
      setError("Please enter the complete 6-digit verification code.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setRemainingAttempts(null);

      const res = await fetch("/api/auth/login-otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, otp: cleanCode }),
      });

      const data = await res.json();
      if (data.success && data.user) {
        // Successful OTP login: establish session without altering password
        login(data.user);
        setSuccessInfo({
          name: data.user.name,
          role: data.user.role,
          message: `✓ Welcome, ${data.user.name}! Sign-in successful.`,
        });

        setTimeout(() => {
          const targetUrl = redirectParam && redirectParam !== "/admin" ? redirectParam : "/user";
          window.location.href = targetUrl;
        }, 500);
      } else {
        setError(data.error || "Invalid verification code.");
        if (typeof data.remainingAttempts === "number") {
          setRemainingAttempts(data.remainingAttempts);
        }
      }
    } catch (err) {
      console.error(err);
      setError("Failed to verify login code. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center pt-8 pb-16 px-4 relative">
      {/* ============================================================ */}
      {/* POPUP: "Would you like to update your password?"             */}
      {/* APPLIES STRICTLY AND ONLY TO FORGOT PASSWORD RECOVERY FLOW   */}
      {/* ============================================================ */}
      {showForgotPrompt && (
        <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6 sm:p-7 shadow-2xl relative animate-in zoom-in-95 duration-200">
            {/* Close Button triggers "No, Continue" */}
            <button
              type="button"
              onClick={handleDismissPrompt}
              className="absolute right-4 top-4 text-muted hover:text-foreground p-1 rounded-lg transition cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            {/* View A: The Choice Dialog */}
            {forgotPromptView === "choice" && (
              <div className="text-center">
                <div className="w-14 h-14 rounded-full bg-[#C9A66B]/15 text-[#8C6226] dark:text-[#E5CBA2] border border-[#C9A66B]/30 flex items-center justify-center mx-auto mb-4">
                  <KeyRound className="w-7 h-7" />
                </div>

                <h2 className="text-xl font-bold text-foreground mb-2">
                  Would you like to update your password?
                </h2>

                <p className="text-xs text-muted leading-relaxed mb-6">
                  Your identity has been verified via the recovery code for{" "}
                  <strong className="text-foreground">{forgotResetEmail}</strong>.
                  <br className="hidden sm:inline" />
                  You can set a new password now, or continue using your current password.
                </p>

                <div className="space-y-2.5">
                  {/* Option 1: Yes, Update Password */}
                  <button
                    type="button"
                    onClick={() => {
                      setForgotPromptView("reset");
                      setResetError(null);
                    }}
                    className="w-full py-3 px-4 bg-[#C9A66B] dark:bg-[#D4B483] hover:bg-[#B8914A] dark:hover:bg-[#C49A5A] active:bg-[#A67C3D] text-[#FFFCFA] text-xs font-semibold rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                  >
                    <span>Yes, Update Password</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  {/* Option 2: No, Continue with Existing Password */}
                  <button
                    type="button"
                    disabled={continueSubmitting}
                    onClick={handleContinueWithExistingPassword}
                    className="w-full py-2.5 px-4 bg-tile hover:bg-tile/80 border border-border text-foreground text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {continueSubmitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-accent" />
                        <span>Logging in with existing password...</span>
                      </>
                    ) : (
                      <span>No, Continue with Existing Password</span>
                    )}
                  </button>
                </div>

                <p className="text-[11px] text-muted mt-4">
                  Your password remains unchanged unless you choose to update it.
                </p>
              </div>
            )}

            {/* View B: Password Reset Form */}
            {forgotPromptView === "reset" && (
              <div>
                <div className="flex items-center gap-3 mb-4 pb-3 border-b border-border">
                  <div className="w-10 h-10 rounded-full bg-[#C9A66B]/15 text-[#8C6226] dark:text-[#E5CBA2] border border-[#C9A66B]/30 flex items-center justify-center shrink-0">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-foreground">Set New Password</h2>
                    <p className="text-[11px] text-muted truncate max-w-[240px]">
                      Account: {forgotResetEmail}
                    </p>
                  </div>
                </div>

                {resetError && (
                  <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-500 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                    <span>{resetError}</span>
                  </div>
                )}

                <form onSubmit={handleUpdatePassword} className="space-y-4 text-xs">
                  {/* New Password */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="font-semibold text-foreground">New Password</label>
                      <button
                        type="button"
                        onClick={() => setShowResetPassword(!showResetPassword)}
                        className="text-[11px] text-muted hover:text-foreground flex items-center gap-1 cursor-pointer"
                      >
                        {showResetPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        {showResetPassword ? "Hide" : "Show"}
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showResetPassword ? "text" : "password"}
                        required
                        minLength={6}
                        value={newResetPassword}
                        onChange={(e) => setNewResetPassword(e.target.value)}
                        placeholder="At least 6 characters"
                        className="w-full bg-tile border border-border rounded-xl pl-9 pr-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:border-[#C9A66B] dark:focus:border-[#D4B483] focus:ring-2 focus:ring-[#C9A66B]/20 dark:focus:ring-[#D4B483]/20 transition-all placeholder:text-muted"
                      />
                      <Lock className="w-4 h-4 text-muted absolute left-3 top-3" />
                    </div>
                  </div>

                  {/* Confirm New Password */}
                  <div className="space-y-1.5">
                    <label className="font-semibold text-foreground">Confirm New Password</label>
                    <div className="relative">
                      <input
                        type={showResetPassword ? "text" : "password"}
                        required
                        minLength={6}
                        value={confirmResetPassword}
                        onChange={(e) => setConfirmResetPassword(e.target.value)}
                        placeholder="Re-enter your new password"
                        className="w-full bg-tile border border-border rounded-xl pl-9 pr-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:border-[#C9A66B] dark:focus:border-[#D4B483] focus:ring-2 focus:ring-[#C9A66B]/20 dark:focus:ring-[#D4B483]/20 transition-all placeholder:text-muted"
                      />
                      <Lock className="w-4 h-4 text-muted absolute left-3 top-3" />
                    </div>
                  </div>

                  <div className="space-y-2 pt-1">
                    <button
                      type="submit"
                      disabled={resetSubmitting || newResetPassword.length < 6 || !confirmResetPassword}
                      className="w-full py-3 bg-[#C9A66B] dark:bg-[#D4B483] hover:bg-[#B8914A] dark:hover:bg-[#C49A5A] active:bg-[#A67C3D] text-[#FFFCFA] text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                    >
                      {resetSubmitting ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Saving New Password...</span>
                        </>
                      ) : (
                        <>
                          <span>Save & Update Password</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setForgotPromptView("choice")}
                      className="w-full py-2.5 text-xs text-muted hover:text-foreground transition cursor-pointer"
                    >
                      ← Back to choices
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Brand Header */}
      <Link href="/" className="mb-6 flex flex-col items-center group">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-foreground text-background flex items-center justify-center font-bold text-xs tracking-tight transition-transform duration-200 group-hover:scale-105">
            VN
          </div>
          <span className="text-xl font-bold tracking-tight text-foreground">
            VN <span className="text-muted font-normal">Mobiles</span>
          </span>
        </div>
        <span className="text-[11px] font-semibold text-muted uppercase tracking-widest mt-1">
          Universal Sign In
        </span>
      </Link>

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="flex items-center justify-between mb-5 pb-3 border-b border-border">
          <h1 className="text-2xl font-bold text-foreground">Sign In</h1>
          <span className="text-[11px] px-2.5 py-1 bg-tile text-muted rounded-full font-medium flex items-center gap-1 border border-border">
            <Sparkles className="w-3 h-3 text-accent" /> All Accounts
          </span>
        </div>

        {/* Informative Guidance Banner */}
        <div className="mb-4 p-3.5 bg-tile border border-border rounded-xl text-xs text-muted flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-accent shrink-0 mt-0.5" />
          <div>
            <strong className="text-foreground">Single Unified Portal:</strong> Log in as an <strong>Administrator</strong> or <strong>Customer</strong>. Your permissions and access are automatically routed!
          </div>
        </div>

        {/* Already Logged In Notice */}
        {currentUser && (
          <div className="mb-4 p-3.5 bg-accent/10 border border-accent/20 rounded-xl text-xs text-accent flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-accent" />
              <span>Signed in as <strong className="text-foreground">{currentUser.name}</strong> ({currentUser.role})</span>
            </div>
            <div className="flex items-center gap-2">
              {currentUser.role === "ADMIN" ? (
                <Link href="/admin" className="text-[11px] font-bold text-accent underline">
                  Admin Panel →
                </Link>
              ) : (
                <>
                  <Link href="/account" className="text-[11px] font-bold text-accent underline">
                    My Account →
                  </Link>
                  <Link href="/" className="text-[11px] font-bold text-accent underline">
                    Shop Mobiles →
                  </Link>
                </>
              )}
              <button
                type="button"
                onClick={logout}
                className="text-[11px] text-[#8C6226] dark:text-[#E5CBA2] hover:underline ml-2 cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          </div>
        )}

        {/* Login Method Tabs */}
        <div className="flex rounded-xl bg-tile p-1 mb-5 border border-border">
          <button
            type="button"
            onClick={() => {
              setLoginMode("password");
              setError(null);
              setInfoMessage(null);
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              loginMode === "password"
                ? "bg-card text-foreground shadow-xs border border-border/60"
                : "text-muted hover:text-foreground"
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Password Login</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setLoginMode("otp");
              setError(null);
              setInfoMessage(null);
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              loginMode === "otp"
                ? "bg-card text-foreground shadow-xs border border-border/60"
                : "text-muted hover:text-foreground"
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Login with OTP</span>
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-500 flex flex-col gap-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
              <div className="flex-1">
                <span className="font-semibold">{error}</span>
                {remainingAttempts !== null && remainingAttempts > 0 && (
                  <p className="mt-1 font-semibold text-[#8C6226] dark:text-[#E5CBA2]">
                    Remaining attempts: {remainingAttempts}
                  </p>
                )}
              </div>
            </div>
            {unverifiedEmail && (
              <div className="mt-1 pt-2 border-t border-red-500/20 flex items-center justify-between gap-2">
                <span className="text-[11px] text-red-500">
                  Received code in email?
                </span>
                <Link
                  href={`/verify-email?email=${encodeURIComponent(unverifiedEmail)}`}
                  className="px-2.5 py-1 bg-[#C9A66B] dark:bg-[#D4B483] hover:bg-[#B8914A] text-[#FFFCFA] rounded-lg font-semibold text-xs transition-all"
                >
                  Verify Email Now →
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Info Alert */}
        {infoMessage && (
          <div className="mb-4 p-3.5 bg-[#C9A66B]/10 border border-[#C9A66B]/25 rounded-xl text-xs text-[#8C6226] dark:text-[#E5CBA2] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-[#C9A66B]" />
            <span>{infoMessage}</span>
          </div>
        )}

        {/* Success Alert */}
        {successInfo && (
          <div className={`mb-4 p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${
            successInfo.role === "ADMIN"
              ? "bg-[#C9A66B]/15 text-[#8C6226] dark:text-[#E5CBA2] border border-[#C9A66B]/30"
              : "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
          }`}>
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
            <span>{successInfo.message}</span>
          </div>
        )}

        {/* TAB 1: Password-Based Sign In Form */}
        {loginMode === "password" && (
          <form onSubmit={handlePasswordSubmit} className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">
                Email, Mobile number, or Admin Username
              </label>
              <input
                type="text"
                required
                value={emailOrPhone}
                onChange={(e) => setEmailOrPhone(e.target.value)}
                placeholder="e.g. customer@example.com, phone, or admin"
                className="w-full bg-tile border border-border rounded-xl px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:border-[#C9A66B] dark:focus:border-[#D4B483] focus:ring-2 focus:ring-[#C9A66B]/20 dark:focus:ring-[#D4B483]/20 transition-all placeholder:text-muted"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="font-semibold text-foreground">Password</label>
                <div className="flex items-center gap-3">
                  <Link
                    href="/forgot-password"
                    className="text-[11px] text-[#8C6226] dark:text-[#E5CBA2] hover:underline font-medium cursor-pointer"
                  >
                    Forgot Password?
                  </Link>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[11px] text-muted hover:text-foreground flex items-center gap-1 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full bg-tile border border-border rounded-xl px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:border-[#C9A66B] dark:focus:border-[#D4B483] focus:ring-2 focus:ring-[#C9A66B]/20 dark:focus:ring-[#D4B483]/20 transition-all placeholder:text-muted"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#C9A66B] dark:bg-[#D4B483] hover:bg-[#B8914A] dark:hover:bg-[#C49A5A] active:bg-[#A67C3D] text-[#FFFCFA] text-xs font-semibold rounded-xl mt-3 flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? "Authenticating..." : "Sign In"}
              {!loading && <ArrowRight className="w-3.5 h-3.5" />}
            </button>
          </form>
        )}

        {/* TAB 2: Login with Email OTP */}
        {loginMode === "otp" && (
          <div className="text-xs">
            {otpStep === "email" ? (
              /* OTP Step 1: Enter Email */
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="font-semibold text-foreground">
                      Registered Email Address
                    </label>
                    <span className="text-[10px] text-muted">Customer Accounts</span>
                  </div>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      value={otpEmail}
                      onChange={(e) => setOtpEmail(e.target.value)}
                      placeholder="e.g. customer@example.com"
                      className="w-full bg-tile border border-border rounded-xl pl-9 pr-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:border-[#C9A66B] dark:focus:border-[#D4B483] focus:ring-2 focus:ring-[#C9A66B]/20 dark:focus:ring-[#D4B483]/20 transition-all placeholder:text-muted"
                    />
                    <Mail className="w-4 h-4 text-muted absolute left-3 top-3" />
                  </div>
                  <p className="text-[11px] text-muted leading-relaxed">
                    We will send a 6-digit one-time code to your inbox. No password needed!
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading || !otpEmail.trim()}
                  className="w-full py-3 bg-[#C9A66B] dark:bg-[#D4B483] hover:bg-[#B8914A] dark:hover:bg-[#C49A5A] active:bg-[#A67C3D] text-[#FFFCFA] text-xs font-semibold rounded-xl mt-3 flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Sending Login Code...</span>
                    </>
                  ) : (
                    <>
                      <span>Send 6-Digit Code</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              /* OTP Step 2: Enter 6-Digit Code */
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="p-3 bg-[#F9F9FB] dark:bg-[#1A1A1E] border border-[#E8E8ED] dark:border-[#2C2C30] rounded-xl flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 overflow-hidden mr-2">
                    <Mail className="w-3.5 h-3.5 text-[#C9A66B] shrink-0" />
                    <span className="text-foreground/80 font-mono truncate">{otpEmail}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setOtpStep("email");
                      setOtpCode("");
                      setError(null);
                      setInfoMessage(null);
                    }}
                    className="text-[11px] text-[#8C6226] dark:text-[#E5CBA2] hover:underline font-semibold cursor-pointer shrink-0"
                  >
                    Change
                  </button>
                </div>

                {/* 6-Digit Separate Boxes Container - Light, Clean & Premium */}
                <div className="bg-[#FAFAFC] dark:bg-[#161619] border border-[#EBEBF0] dark:border-[#2A2A2E] rounded-2xl p-4 sm:p-5 text-center">
                  <div className="flex justify-between items-center mb-3">
                    <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                      Enter 6-Digit Code
                    </label>
                    <span className="text-[10px] text-[#8C6226] dark:text-[#E5CBA2] font-semibold bg-[#F4EBD9]/60 dark:bg-[#382D1C]/60 px-2 py-0.5 rounded-full">
                      Valid for 5 mins
                    </span>
                  </div>

                  {/* 6 Clean Input Boxes */}
                  <div className="flex items-center justify-center gap-2 sm:gap-2.5">
                    {[0, 1, 2, 3, 4, 5].map((index) => {
                      const digit = otpCode[index] || "";
                      const isFilled = digit.length > 0;
                      return (
                        <input
                          key={index}
                          ref={(el) => {
                            otpInputRefs.current[index] = el;
                          }}
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          autoComplete={index === 0 ? "one-time-code" : "off"}
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleOtpDigitChange(index, e.target.value)}
                          onKeyDown={(e) => handleOtpKeyDown(index, e)}
                          onPaste={handleOtpPaste}
                          aria-label={`Digit ${index + 1} of verification code`}
                          className={`w-11 h-13 sm:w-12 sm:h-14 text-center font-mono text-xl sm:text-2xl font-bold rounded-xl transition-all select-none
                            ${
                              isFilled
                                ? "bg-white dark:bg-[#202024] text-foreground border-2 border-[#C9A66B] shadow-xs"
                                : "bg-white dark:bg-[#1C1C20] text-foreground border-2 border-[#E2E2E8] dark:border-[#2E2E34] hover:border-[#C9A66B]/50"
                            }
                            focus:outline-none focus:border-[#C9A66B] focus:ring-4 focus:ring-[#C9A66B]/15 dark:focus:border-[#D4B483] dark:focus:ring-[#D4B483]/20`}
                        />
                      );
                    })}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || otpCode.length !== 6}
                  className="w-full py-3 bg-[#C9A66B] dark:bg-[#D4B483] hover:bg-[#B8914A] dark:hover:bg-[#C49A5A] active:bg-[#A67C3D] text-[#FFFCFA] text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Verifying Code...</span>
                    </>
                  ) : (
                    <>
                      <span>Verify Code & Sign In</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>

                {/* Resend Cooldown Counter */}
                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resendingOtp || otpCooldown > 0}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#8C6226] dark:text-[#E5CBA2] hover:underline disabled:text-muted disabled:cursor-not-allowed transition cursor-pointer"
                  >
                    {resendingOtp ? (
                      <>
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        <span>Sending code...</span>
                      </>
                    ) : otpCooldown > 0 ? (
                      <span>Resend code in {otpCooldown}s</span>
                    ) : (
                      <>
                        <RefreshCw className="w-3 h-3" />
                        <span>Resend 6-Digit Code</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Security Note */}
        <p className="text-[11px] text-muted mt-5 text-center leading-relaxed">
          {loginMode === "otp"
            ? "Signing in with OTP creates your secure customer session. Your existing password is never modified."
            : "Authorized store administrator logins route directly to the Admin Dashboard. Customer accounts access personal orders, cart, and profile."}
        </p>
      </div>

      {/* New to VN Mobiles Section */}
      <div className="w-full max-w-md mt-6">
        <div className="relative flex py-2 items-center">
          <div className="flex-grow border-t border-border"></div>
          <span className="flex-shrink mx-3 text-xs text-muted font-medium">New to VN Mobiles?</span>
          <div className="flex-grow border-t border-border"></div>
        </div>

        <Link
          href="/register"
          className="block w-full text-center py-2.5 px-4 bg-[#C9A66B]/10 dark:bg-[#D4B483]/10 hover:bg-[#C9A66B]/20 dark:hover:bg-[#D4B483]/20 border border-[#C9A66B]/30 dark:border-[#D4B483]/30 rounded-xl text-xs font-semibold text-[#8C6226] dark:text-[#E5CBA2] shadow-2xs transition-all"
        >
          Create your VN Mobiles customer account
        </Link>

        <div className="text-center mt-4">
          <Link href="/" className="text-xs text-[#8C6226] dark:text-[#E5CBA2] hover:underline font-medium">
            ← Continue shopping as guest
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center text-sm font-bold text-muted">
        Loading Universal Sign In...
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
