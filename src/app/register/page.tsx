"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { ArrowRight, AlertCircle, CheckCircle2, ShieldCheck } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const { login } = useApp();

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone || !formData.email || !formData.password) {
      setError("Please fill in all required fields.");
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (data.success) {
        login(data.user);
        router.push("/");
      } else {
        setError(data.error || "Registration failed.");
      }
    } catch (err) {
      console.error(err);
      setError("An unexpected error occurred during account creation.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#eaeded] flex flex-col items-center pt-8 pb-16 px-4">
      {/* Brand Header */}
      <Link href="/" className="mb-6 flex items-baseline">
        <span className="text-3xl font-black text-[#131921]">vm<span className="text-[#febd69]">mobiles</span></span>
        <span className="text-sm text-[#febd69] font-bold">.in</span>
      </Link>

      {/* Registration Box */}
      <div className="w-full max-w-sm bg-white border border-gray-300 rounded-md p-6 sm:p-7 shadow-xs">
        <h1 className="text-2xl font-normal text-[#0f1111] mb-4">Create Account</h1>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div className="space-y-1">
            <label className="font-bold text-[#0f1111]">Your name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="First and last name"
              className="w-full border border-gray-400 rounded-xs px-2.5 py-1.5 text-sm focus:outline-none focus:border-[#e77600] focus:ring-1 focus:ring-[#e77600]"
            />
          </div>

          <div className="space-y-1">
            <label className="font-bold text-[#0f1111]">Mobile number</label>
            <input
              type="tel"
              required
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="10-digit mobile number"
              className="w-full border border-gray-400 rounded-xs px-2.5 py-1.5 text-sm focus:outline-none focus:border-[#e77600] focus:ring-1 focus:ring-[#e77600]"
            />
          </div>

          <div className="space-y-1">
            <label className="font-bold text-[#0f1111]">Email</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="name@example.com"
              className="w-full border border-gray-400 rounded-xs px-2.5 py-1.5 text-sm focus:outline-none focus:border-[#e77600] focus:ring-1 focus:ring-[#e77600]"
            />
          </div>

          <div className="space-y-1">
            <label className="font-bold text-[#0f1111]">Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="At least 6 characters"
              className="w-full border border-gray-400 rounded-xs px-2.5 py-1.5 text-sm focus:outline-none focus:border-[#e77600] focus:ring-1 focus:ring-[#e77600]"
            />
            <span className="text-[10px] text-gray-500 block">Passwords must be at least 6 characters.</span>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-amazon-yellow py-2 text-xs font-bold rounded-sm mt-3 flex items-center justify-center gap-1"
          >
            {loading ? "Creating Account..." : "Verify mobile & Create Account"}
            {!loading && <ArrowRight className="w-3.5 h-3.5" />}
          </button>
        </form>

        <p className="text-[11px] text-gray-600 mt-4 leading-relaxed">
          By enrolling your mobile phone number, you consent to receive automated warranty & order alerts from VM Mobiles.
        </p>

        <div className="mt-5 pt-4 border-t border-gray-200 text-xs">
          <p className="text-gray-700">
            Already have an account?{" "}
            <Link href="/login" className="text-[#007185] hover:underline font-bold">
              Sign in →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
