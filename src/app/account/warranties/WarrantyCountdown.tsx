"use client";

import React, { useState, useEffect } from "react";
import { Clock } from "lucide-react";

interface WarrantyCountdownProps {
  startDate: string;
  expiryDate: string;
  isExpiringSoon: boolean;
  isExpired: boolean;
}

interface RemainingTime {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  percentUsed: number;
  isExpired: boolean;
  isExpiringSoon: boolean;
}

function calculateRemaining(startStr: string, expiryStr: string): RemainingTime {
  const now = Date.now();
  const start = new Date(startStr).getTime();
  const expiry = new Date(expiryStr).getTime();

  const total = Math.max(1, expiry - start);
  const elapsed = Math.max(0, now - start);
  const remainingMs = Math.max(0, expiry - now);

  const percentUsed = Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
  const isExpired = remainingMs <= 0;
  const days = Math.floor(remainingMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((remainingMs / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((remainingMs / (1000 * 60)) % 60);
  const seconds = Math.floor((remainingMs / 1000) % 60);

  return {
    days,
    hours,
    minutes,
    seconds,
    percentUsed,
    isExpired,
    isExpiringSoon: !isExpired && days <= 30,
  };
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "N/A";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return String(dateStr);
  }
}

export default function WarrantyCountdown({
  startDate,
  expiryDate,
  isExpiringSoon: initialExpiringSoon,
  isExpired: initialExpired,
}: WarrantyCountdownProps) {
  const [mounted, setMounted] = useState(false);
  const [time, setTime] = useState<RemainingTime>(() =>
    calculateRemaining(startDate, expiryDate)
  );

  useEffect(() => {
    setMounted(true);
    const interval = setInterval(() => {
      setTime(calculateRemaining(startDate, expiryDate));
    }, 1000);
    return () => clearInterval(interval);
  }, [startDate, expiryDate]);

  const expired = initialExpired || time.isExpired;
  const expiringSoon = !expired && (initialExpiringSoon || time.isExpiringSoon);

  const progressColor = expired
    ? "bg-slate-400"
    : expiringSoon
    ? "bg-amber-500"
    : "bg-emerald-500";

  return (
    <div className="space-y-2.5 bg-background border border-border rounded-xl p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="text-muted font-medium flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-[#C9A66B]" />
          <span>Coverage Countdown:</span>
        </span>

        <div className="font-mono font-bold text-foreground">
          {expired ? (
            <span className="text-slate-500 font-sans">Official 1-Year Coverage Has Expired</span>
          ) : !mounted ? (
            <span className="text-muted">Calculating time remaining...</span>
          ) : (
            <span className={expiringSoon ? "text-amber-500" : "text-emerald-500"}>
              {time.days}d {time.hours}h {time.minutes}m {time.seconds}s remaining
            </span>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1">
        <div className="w-full bg-tile border border-border rounded-full h-2 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${progressColor}`}
            style={{ width: `${time.percentUsed}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-muted font-mono">
          <span>Started {formatDate(startDate)}</span>
          <span>{time.percentUsed}% Duration Used</span>
          <span>Expires {formatDate(expiryDate)}</span>
        </div>
      </div>
    </div>
  );
}

