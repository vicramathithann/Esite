"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
  AlertTriangle, 
  Trash2, 
  X, 
  Mail, 
  ShieldAlert, 
  Lock, 
  CheckCircle2, 
  RefreshCw, 
  ArrowRight,
  Loader2
} from "lucide-react";
import { useApp, UserProfile } from "@/context/AppContext";

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
}

export default function DeleteAccountModal({
  isOpen,
  onClose,
  currentUser,
}: DeleteAccountModalProps) {
  const router = useRouter();
  const { logout } = useApp();

  const [step, setStep] = useState<"email" | "otp">("email");
  const [typedEmail, setTypedEmail] = useState("");
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(60);

  const emailInputRef = useRef<HTMLInputElement>(null);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Reset state whenever modal is opened
  useEffect(() => {
    if (isOpen) {
      setStep("email");
      setTypedEmail("");
      setOtpDigits(["", "", "", "", "", ""]);
      setError(null);
      setInfoMessage(null);
      setResendCooldown(60);
      setTimeout(() => emailInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Focus first OTP input when transitioning to OTP step
  useEffect(() => {
    if (step === "otp") {
      setTimeout(() => otpInputRefs.current[0]?.focus(), 150);
    }
  }, [step]);

  // 60-second countdown timer for resending OTP
  useEffect(() => {
    if (step !== "otp" || resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [step, resendCooldown]);

  if (!isOpen) return null;

  const isEmailMatching =
    typedEmail.trim().toLowerCase() === (currentUser.email || "").trim().toLowerCase();

  const isOtpComplete = otpDigits.every((d) => d.length === 1 && /^\d$/.test(d));

  // Handler for Requesting Deletion OTP (Step 1 & Resend)
  const handleRequestOtp = async (isResend = false) => {
    setError(null);
    setInfoMessage(null);

    if (!isResend && !isEmailMatching) {
      setError("The email you entered does not match your registered account email.");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/account/delete/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: currentUser.email }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Failed to send verification code. Please try again.");
        return;
      }

      setStep("otp");
      setResendCooldown(60);
      setOtpDigits(["", "", "", "", "", ""]);
      setInfoMessage(
        isResend
          ? "A new verification code has been sent to your email."
          : "Verification code sent! Please check your inbox."
      );
    } catch (err) {
      console.error("Account deletion request failed:", err);
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handler for OTP input change with auto-advance
  const handleOtpChange = (index: number, value: string) => {
    // Only accept numeric digit
    const cleaned = value.replace(/\D/g, "");
    const lastChar = cleaned.slice(-1);

    const updated = [...otpDigits];
    updated[index] = lastChar;
    setOtpDigits(updated);
    setError(null);

    if (lastChar && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  // Handler for OTP backspace
  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  // Handler for pasting entire 6-digit OTP code
  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;

    const updated = [...otpDigits];
    for (let i = 0; i < 6; i++) {
      updated[i] = pasted[i] || "";
    }
    setOtpDigits(updated);
    setError(null);

    // Focus last filled index or next available
    const nextIndex = Math.min(pasted.length, 5);
    otpInputRefs.current[nextIndex]?.focus();
  };

  // Handler for Confirming Deletion (Step 2)
  const handleConfirmDeletion = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isOtpComplete) return;

    setError(null);
    setInfoMessage(null);

    const otpCode = otpDigits.join("");

    try {
      setLoading(true);
      const res = await fetch("/api/account/delete/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp: otpCode }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Failed to verify deletion code.");
        return;
      }

      // Successful deletion: clear client-side state and navigate
      await logout();
      onClose();
      router.push("/?accountDeleted=true");
    } catch (err) {
      console.error("Account deletion confirmation failed:", err);
      setError("Network error while deleting your account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-account-title"
    >
      <div 
        className="w-full max-w-lg bg-card text-foreground rounded-2xl border border-red-500/30 shadow-2xl overflow-hidden transition-all duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-red-500/10 dark:bg-red-950/30 border-b border-red-500/20">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-red-500/20 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h2 id="delete-account-title" className="text-base font-bold text-foreground">
                Delete Account Permanently
              </h2>
              <p className="text-[11px] text-muted">
                {step === "email" ? "Step 1 of 2: Confirm Identity" : "Step 2 of 2: Enter Email Verification Code"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1 text-muted hover:text-foreground rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            aria-label="Close deletion modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 text-xs sm:text-sm">
          {/* Inline Error Message */}
          {error && (
            <div 
              role="alert"
              className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-600 dark:text-red-400 flex items-start gap-2.5 animate-in fade-in"
            >
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{error}</div>
            </div>
          )}

          {/* Inline Success / Info Message */}
          {infoMessage && (
            <div 
              role="status"
              className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-600 dark:text-emerald-400 flex items-start gap-2.5 animate-in fade-in"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{infoMessage}</div>
            </div>
          )}

          {/* STEP 1: Email Confirmation */}
          {step === "email" && (
            <div className="space-y-4">
              <div className="p-3.5 bg-red-500/5 dark:bg-red-950/20 border border-red-500/20 rounded-xl space-y-2 text-xs text-muted">
                <div className="font-semibold text-red-600 dark:text-red-400 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4" /> Please read carefully before continuing:
                </div>
                <ul className="list-disc list-inside space-y-1 text-foreground/80 pl-1">
                  <li>Your user profile, address, and login credentials will be <strong>permanently erased</strong>.</li>
                  <li>Your active login sessions and saved wishlist items will be deleted immediately.</li>
                  <li>Historical orders and warranty records are <strong>detached and anonymized</strong> to comply with statutory accounting and warranty regulations.</li>
                  <li><strong>Active orders</strong> in progress or transit must be completed or cancelled before deletion.</li>
                </ul>
              </div>

              <div className="space-y-2">
                <label 
                  htmlFor="confirm-email-input" 
                  className="block font-medium text-foreground text-xs"
                >
                  To confirm, type your registered email address (
                  <span className="font-mono font-semibold text-[#8C6226] dark:text-[#E5CBA2]">
                    {currentUser.email}
                  </span>
                  ):
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="confirm-email-input"
                    ref={emailInputRef}
                    type="email"
                    value={typedEmail}
                    onChange={(e) => {
                      setTypedEmail(e.target.value);
                      setError(null);
                    }}
                    placeholder={currentUser.email}
                    disabled={loading}
                    className="w-full pl-9 pr-3 py-2.5 bg-tile text-foreground text-xs rounded-xl border border-border focus:border-red-500 focus:ring-2 focus:ring-red-500/20 focus:outline-none transition-all"
                    autoComplete="off"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: 6-Digit OTP Entry */}
          {step === "otp" && (
            <div className="space-y-4">
              <div className="text-center space-y-1">
                <p className="text-foreground text-xs">
                  We sent a 6-digit verification code to:
                </p>
                <p className="font-mono font-semibold text-xs text-[#8C6226] dark:text-[#E5CBA2]">
                  {currentUser.email}
                </p>
                <p className="text-[11px] text-muted">
                  Code expires in 10 minutes. Enter it below to authorize permanent deletion.
                </p>
              </div>

              {/* 6-Digit OTP Box Grid */}
              <div 
                className="flex items-center justify-center gap-2 sm:gap-2.5 py-2"
                onPaste={handleOtpPaste}
              >
                {otpDigits.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => { otpInputRefs.current[index] = el; }}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    disabled={loading}
                    className="w-10 h-12 sm:w-12 sm:h-14 text-center font-mono text-lg sm:text-xl font-bold rounded-xl bg-tile border border-border text-foreground focus:border-red-500 focus:ring-2 focus:ring-red-500/20 focus:outline-none transition-all disabled:opacity-50"
                    aria-label={`Digit ${index + 1} of verification code`}
                  />
                ))}
              </div>

              {/* Resend OTP Section */}
              <div className="flex items-center justify-between text-xs pt-1 border-t border-border">
                <span className="text-muted">Didn&apos;t receive the code?</span>
                {resendCooldown > 0 ? (
                  <span className="text-muted font-medium">
                    Resend in {resendCooldown}s
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleRequestOtp(true)}
                    disabled={loading}
                    className="text-[#8C6226] dark:text-[#E5CBA2] hover:underline font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className="w-3 h-3" /> Resend Code
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 bg-tile/50 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-xs font-semibold text-foreground hover:bg-tile rounded-xl border border-border transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>

          {step === "email" ? (
            <button
              type="button"
              onClick={() => handleRequestOtp(false)}
              disabled={!isEmailMatching || loading}
              className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-sm ${
                isEmailMatching && !loading
                  ? "bg-red-600 hover:bg-red-700 active:bg-red-800 text-white cursor-pointer"
                  : "bg-red-600/30 text-white/50 cursor-not-allowed"
              }`}
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Sending Code...</span>
                </>
              ) : (
                <>
                  <span>Continue</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleConfirmDeletion}
              disabled={!isOtpComplete || loading}
              className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-sm ${
                isOtpComplete && !loading
                  ? "bg-red-600 hover:bg-red-700 active:bg-red-800 text-white cursor-pointer"
                  : "bg-red-600/30 text-white/50 cursor-not-allowed"
              }`}
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Deleting Account...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete My Account Permanently</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

