"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import { User, Mail, CheckCircle2, AlertCircle, Save, RefreshCw, Camera, Trash2 } from "lucide-react";
import { useApp } from "@/context/AppContext";
import AccountLayout from "@/components/AccountLayout";
import AvatarCropModal from "@/components/AvatarCropModal";

export default function ProfilePage() {
  const { currentUser, login } = useApp();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [selectedCropFile, setSelectedCropFile] = useState<File | null>(null);
  const [avatarSuccess, setAvatarSuccess] = useState<string | null>(null);

  const [name, setName] = useState(currentUser?.name || "");
  const [email, setEmail] = useState(currentUser?.email || "");
  const [phone, setPhone] = useState(currentUser?.phone || "");
  const [address, setAddress] = useState(currentUser?.address || "");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [resending, setResending] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    setErrorMessage(null);
    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.trim().replace(/[^0-9]/g, "");
    const cleanAddress = address.trim();

    if (!cleanName || cleanName.length < 2) {
      setErrorMessage("Please enter a valid full name (at least 2 characters).");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    if (!cleanPhone || cleanPhone.length < 10) {
      setErrorMessage("Please enter a valid 10-digit mobile number.");
      return;
    }

    setSaving(true);
    setSavedSuccess(false);

    try {
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          name: cleanName,
          email: cleanEmail,
          phone: cleanPhone,
          address: cleanAddress,
        }),
      });

      const data = await res.json();
      if (data.success && data.user) {
        login(data.user);
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
      } else {
        setErrorMessage(data.error || "Failed to update profile.");
      }
    } catch {
      setErrorMessage("Error updating profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleResendVerification = async () => {
    if (!currentUser?.email) return;

    setResending(true);
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: currentUser.email }),
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message || `Verification link resent to ${currentUser.email}!`);
      } else {
        alert(data.error || "Failed to resend verification email.");
      }
    } catch {
      alert("Error contacting verification service.");
    } finally {
      setResending(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
          <p className="text-slate-300 text-sm mb-4">Please log in to manage your profile.</p>
          <Link
            href="/login"
            className="inline-block px-5 py-2.5 bg-[#C9A66B] hover:bg-[#B8914A] active:bg-[#A67C3D] text-[#FFFCFA] rounded-xl text-xs font-semibold shadow-sm transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  const isVerified = currentUser.emailVerified;

  return (
    <AccountLayout>
      <div className="max-w-3xl space-y-6">
        {/* Email Verification Banner */}
        {!isVerified ? (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-300">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold">Your email is unverified</p>
                <p className="text-xs text-amber-300/80">
                  Please verify your email ({currentUser.email}) to unlock all account capabilities.
                </p>
              </div>
            </div>
            <button
              onClick={handleResendVerification}
              disabled={resending}
              className="px-3 py-1.5 bg-[#C9A66B] dark:bg-[#D4B483] hover:bg-[#B8914A] dark:hover:bg-[#C49A5A] active:bg-[#A67C3D] text-[#FFFCFA] text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-xs"
            >
              {resending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
              Send Verification Email
            </button>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3 text-emerald-400">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <div className="text-xs">
              <span className="font-semibold text-sm block text-emerald-300">Verified Customer Account</span>
              Your email ({currentUser.email}) is officially verified and secured with VN Mobiles.
            </div>
          </div>
        )}

        {/* Hidden File Input for Avatar */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              setSelectedCropFile(file);
              setCropModalOpen(true);
            }
            e.target.value = "";
          }}
          className="hidden"
          aria-hidden="true"
        />

        {/* Profile Picture Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row items-center sm:items-start justify-between gap-5">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
            <div
              className="relative group shrink-0 cursor-pointer"
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files?.[0];
                if (file) {
                  setSelectedCropFile(file);
                  setCropModalOpen(true);
                }
              }}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => {
                if (currentUser.avatar) {
                  setCropModalOpen(true);
                } else {
                  fileInputRef.current?.click();
                }
              }}
              title="Click or drag photo to edit profile picture"
            >
              {currentUser.avatar ? (
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name || "Customer"}
                  className="w-20 h-20 rounded-full object-cover border-2 border-[#C9A66B] dark:border-[#D4B483] shadow-md group-hover:opacity-90 transition-opacity"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-[#C9A66B] to-[#E2C799] text-[#0B1220] flex items-center justify-center text-3xl font-extrabold shadow-md group-hover:opacity-90 transition-opacity">
                  {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : "U"}
                </div>
              )}
              <div className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-[#C9A66B] text-[#FFFCFA] flex items-center justify-center shadow-md border-2 border-slate-900">
                <Camera className="w-3.5 h-3.5" />
              </div>
            </div>

            <div>
              <h2 className="text-base font-bold text-white">Profile Photo</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Upload a clear photo to personalize your VN Mobiles account.
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                JPG, PNG or WEBP • Drag & drop supported
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-[#C9A66B] dark:bg-[#D4B483] hover:bg-[#B8914A] active:bg-[#A67C3D] text-[#FFFCFA] text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              {currentUser.avatar ? "Change Photo" : "Upload Photo"}
            </button>
            {currentUser.avatar && (
              <button
                type="button"
                onClick={() => setCropModalOpen(true)}
                className="px-3 py-2 border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Edit / Crop
              </button>
            )}
          </div>
        </div>

        {avatarSuccess && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" /> {avatarSuccess}
          </div>
        )}

        <AvatarCropModal
          isOpen={cropModalOpen}
          onClose={() => {
            setCropModalOpen(false);
            setSelectedCropFile(null);
          }}
          initialFile={selectedCropFile}
          currentAvatarUrl={currentUser.avatar}
          userInitial={currentUser.name ? currentUser.name.charAt(0).toUpperCase() : "U"}
          onSuccess={(newAvatarUrl) => {
            login({ ...currentUser, avatar: newAvatarUrl });
            setAvatarSuccess("Profile picture updated successfully!");
            setTimeout(() => setAvatarSuccess(null), 4000);
          }}
          onRemoveSuccess={() => {
            login({ ...currentUser, avatar: undefined });
            setAvatarSuccess("Profile photo removed.");
            setTimeout(() => setAvatarSuccess(null), 3000);
          }}
        />

        {/* Profile Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center gap-3 border-b border-slate-800/80 pb-5 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <User className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Profile Information</h1>
              <p className="text-xs text-slate-400">Manage your contact details and communication preferences.</p>
            </div>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-[#C9A66B] dark:focus:border-[#D4B483]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={currentUser.role === "ADMIN" && (currentUser.email || "").toLowerCase() === "rrroyce20@gmail.com"}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-[#C9A66B] dark:focus:border-[#D4B483] disabled:opacity-60 disabled:cursor-not-allowed"
                  required
                />
                <span className="absolute right-3 top-2.5 text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                  {isVerified ? <CheckCircle2 className="w-3.5 h-3.5" /> : null}
                  {isVerified ? "Verified" : "Unverified"}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Mobile Number
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="10-digit mobile number"
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-[#C9A66B] dark:focus:border-[#D4B483]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Delivery Address
              </label>
              <textarea
                rows={3}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Flat/House no., Street, Area, City, State, PIN code"
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-[#C9A66B] dark:focus:border-[#D4B483] resize-none"
              />
            </div>

            {errorMessage && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" /> {errorMessage}
              </div>
            )}

            {savedSuccess && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" /> Profile updated successfully!
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full py-2.5 bg-[#C9A66B] dark:bg-[#D4B483] hover:bg-[#B8914A] dark:hover:bg-[#C49A5A] active:bg-[#A67C3D] text-[#FFFCFA] font-semibold text-sm rounded-xl flex items-center justify-center gap-2 transition-all shadow-xs"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Changes
            </button>
          </form>
        </div>
      </div>
    </AccountLayout>
  );
}
